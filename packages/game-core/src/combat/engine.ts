import { advancedRules, effectAmount, criticalRoll } from './stats';
import { prepareTraitProfiles } from './traits';
import { activeAbility, abilityConditions } from './abilities';
import {
  CombatInputSchema,
  CombatStateSchema,
  COMBAT_PROTOCOL,
  MAX_COMBAT_TICKS,
  OVERTIME_START_TICK,
  type CombatInput,
  type CombatState,
  type CombatUnit,
  type CombatEventV3,
  type CombatEffect,
  type CombatReplay,
  type CombatResult,
  type DamageType,
  type PassiveTrigger,
} from '@tft/shared';
import { overtimeModifiers, scaleCombatAmount } from './overtime';
import { hexDistance } from '../hex';
import { chooseTarget } from './pathfinding';
import {
  compareIds,
  effectiveStat,
  isAlive,
  isStunned,
  mitigateDamage,
  randomUint32,
  shieldTotal,
} from './math';
type EffectTask = {
  source: CombatUnit;
  target: CombatUnit;
  effect: CombatEffect;
  cause: 'attack' | 'ability';
  critical?: boolean;
  origin?: 'active' | 'passive' | 'trait';
};
/** Local mutable implementation with exclusive ownership; public snapshots/events are deep copies. */
export class CombatEngine {
  private readonly input: CombatInput;
  private state: CombatState;
  private events: CombatEventV3[] = [];
  private order = 0;
  private triggers: {
    unit: CombatUnit;
    trigger: PassiveTrigger['kind'];
    beforeHp?: number;
    target?: CombatUnit;
    key?: string;
  }[] = [];
  private flushPassives(): void {
    while (this.triggers.length) {
      const signal = this.triggers.shift()!;
      const unit = signal.unit,
        main = unit.profile.championAbility;
      if (!isAlive(unit) || !main?.passive) continue;
      const tasks: EffectTask[] = [];
      for (const rule of main.passive.rules) {
        if (rule.trigger.kind !== signal.trigger) continue;
        const runtime = ((unit.passiveState ??= {})[rule.id] ??= {
          count: 0,
          seen: 0,
          lastTick: -450,
        });
        runtime.seen++;
        if (
          runtime.count >= rule.maxActivations ||
          runtime.lastTick === this.state.tick ||
          this.state.tick - runtime.lastTick < rule.cooldownTicks
        )
          continue;
        if (rule.trigger.kind === 'attack' && runtime.seen % rule.trigger.every !== 0) continue;
        if (
          rule.trigger.kind === 'effect_expired' &&
          rule.trigger.key &&
          rule.trigger.key !== signal.key
        )
          continue;
        if (
          rule.trigger.kind === 'hp_crossed' &&
          !(
            signal.beforeHp !== undefined &&
            signal.beforeHp * 1000 >= effectiveStat(unit, 'maxHp') * rule.trigger.thresholdMilli &&
            unit.hp * 1000 < effectiveStat(unit, 'maxHp') * rule.trigger.thresholdMilli
          )
        )
          continue;
        if (!abilityConditions(unit, this.state.units, rule.conditions)) continue;
        runtime.count++;
        runtime.lastTick = this.state.tick;
        this.emit('passive_trigger', {
          unitId: unit.id,
          abilityId: main.id,
          ruleId: rule.id,
          trigger: signal.trigger,
          activation: runtime.count,
        });
        for (const effect of rule.effects)
          tasks.push(...this.effectTasks(unit, signal.target ?? unit, effect, 'passive'));
      }
      this.resolveEffects(tasks);
    }
  }
  constructor(input: CombatInput) {
    this.input = CombatInputSchema.parse(input);
    this.input.units.sort((a, b) => compareIds(a.id, b.id));
    const prepared = prepareTraitProfiles(this.input);
    this.state = {
      protocolVersion: COMBAT_PROTOCOL,
      rulesVersion: this.input.rulesVersion,
      tick: 0,
      rngState: this.input.seed,
      effectCounter: 0,
      projectiles: [],
      result: null,
      units: prepared.units.map((u) => ({
        ...u,
        ...(u.profile.championAbility ? { passiveState: {} } : {}),
        hp: u.profile.stats.maxHp,
        mana: u.profile.stats.startingMana,
        attackCharge: 10000,
        statuses: prepared.modifiers.filter((m) => m.unitId === u.id).map((m) => m.status),
        action: null,
        targetId: null,
        deathTick: null,
      })),
    };
    if (advancedRules(this.input.rulesVersion))
      for (const u of this.state.units) u.hp = effectiveStat(u, 'maxHp');
    this.emit('combat_start', {
      rulesVersion: this.input.rulesVersion,
      seed: this.input.seed,
      maxTicks: this.input.maxTicks,
      overtime: this.input.overtime,
      units: this.snapshot().units,
      obstacles: this.input.obstacles,
    });
    for (const activation of prepared.activations) this.emit('trait_activate', activation);
    const tasks: EffectTask[] = [];
    for (const { unitId, effect } of prepared.effects) {
      const u = this.getUnit(unitId)!;
      tasks.push(...this.effectTasks(u, u, effect, 'trait'));
    }
    for (const u of this.state.units)
      for (const effect of u.profile.passive?.effects ?? [])
        tasks.push(...this.effectTasks(u, u, effect, 'passive'));
    this.resolveEffects(tasks);
    if (this.state.tick === 0)
      for (const unit of this.state.units) this.triggers.push({ unit, trigger: 'combat_start' });
    this.flushPassives();
    this.settleDeaths();
    this.flushPassives();
    this.settleDeaths();
    this.checkEnd();
  }
  snapshot(): CombatState {
    return CombatStateSchema.parse(this.state);
  }
  allEvents(): CombatEventV3[] {
    return JSON.parse(JSON.stringify(this.events)) as CombatEventV3[];
  }
  private emit<T extends CombatEventV3['type']>(
    type: T,
    payload: Extract<CombatEventV3, { type: T }>['payload'],
  ): void {
    const entry = {
      protocolVersion: COMBAT_PROTOCOL,
      tick: this.state.tick,
      order: this.order++,
      type,
      payload,
    } as CombatEventV3;
    this.events.push(JSON.parse(JSON.stringify(entry)) as CombatEventV3);
  }
  private getUnit(id: string): CombatUnit | undefined {
    return this.state.units.find((u) => u.id === id);
  }
  private cancel(
    unit: CombatUnit,
    reason: 'stun' | 'death' | 'invalid-target' | 'combat-end',
  ): void {
    if (!unit.action) return;
    this.emit('action_cancel', { unitId: unit.id, action: unit.action.kind, reason });
    unit.action = null;
  }
  private beginCast(
    unit: CombatUnit,
    target: CombatUnit,
    ability: NonNullable<ReturnType<typeof activeAbility>>,
  ): void {
    unit.mana -= ability.manaCost;
    this.triggers.push({ unit, trigger: 'ability_cast', target });
    const endTick = this.state.tick + ability.castTicks;
    unit.action = {
      kind: 'cast',
      startTick: this.state.tick,
      endTick,
      targetId: target.id,
      abilityId: ability.id,
    };
    this.emit('ability_cast', {
      unitId: unit.id,
      targetId: target.id,
      abilityId: ability.id,
      stage: 'start',
      endTick,
      manaAfter: unit.mana,
      center: ability.targeting === 'current_enemy' ? target.position : unit.position,
    });
  }
  private gainMana(unit: CombatUnit, amount: number): void {
    if (!isAlive(unit)) return;
    const gained = Math.min(amount, unit.profile.stats.maxMana - unit.mana);
    if (gained <= 0) return;
    unit.mana += gained;
    this.emit('mana_gain', { unitId: unit.id, amount: gained, manaAfter: unit.mana });
  }
  private effectTasks(
    source: CombatUnit,
    target: CombatUnit,
    effect: CombatEffect,
    origin: 'active' | 'passive' | 'trait' = 'active',
  ): EffectTask[] {
    const targets =
      effect.target === 'self'
        ? [source]
        : effect.target === 'target'
          ? [target]
          : this.state.units.filter(
              (u) =>
                isAlive(u) &&
                (effect.target === 'allies'
                  ? u.owner === source.owner &&
                    hexDistance(u.position, source.position) <= effect.radius
                  : u.owner !== source.owner &&
                    hexDistance(
                      u.position,
                      effect.center === 'source' ? source.position : target.position,
                    ) <= effect.radius),
            );
    return targets
      .filter(isAlive)
      .sort((a, b) => compareIds(a.id, b.id))
      .map((u) => ({ source, target: u, effect, cause: 'ability', origin }));
  }
  private resolveEffects(tasks: EffectTask[]): void {
    // All actions finishing this tick are committed before any damage. Support first; deaths last.
    const eligible = new Set(this.state.units.filter(isAlive).map((u) => u.id));
    const priority = (task: EffectTask) => (task.effect.kind === 'damage' ? 1 : 0);
    const sorted = tasks
      .map((task, index) => ({ task, index }))
      .sort((a, b) => priority(a.task) - priority(b.task) || a.index - b.index);
    for (const { task } of sorted) {
      const { source, target, effect, cause } = task;
      const amountValue = effectAmount(effect, source, target);
      if (!eligible.has(target.id)) continue;
      if (effect.kind === 'damage') {
        let amount = amountValue;
        let critical = task.critical;
        if (advancedRules(this.input.rulesVersion)) {
          critical ??= false;
          if (cause === 'ability' && effect.canCrit === true && target.hp > 0) {
            const roll = criticalRoll(source, amount, this.state.rngState);
            this.state.rngState = roll.rngState;
            amount = roll.amount;
            critical = roll.critical;
          }
        }
        this.damage(source, target, amount, effect.damageType, cause, critical);
      } else if (effect.kind === 'heal') {
        const healed = Math.min(
          scaleCombatAmount(
            amountValue,
            overtimeModifiers(this.state.tick, this.input.overtime).healMilli,
          ),
          effectiveStat(target, 'maxHp') - target.hp,
        );
        if (healed > 0) {
          target.hp += healed;
          this.emit('heal', {
            sourceId: source.id,
            targetId: target.id,
            amount: healed,
            hpAfter: target.hp,
          });
        }
      } else {
        const previousMaxHp = effectiveStat(target, 'maxHp');
        if (effect.stacking === 'refresh' && effect.key) {
          for (const old of target.statuses.filter(
            (s) => s.sourceId === source.id && s.key === effect.key,
          ))
            this.emit('status_expire', { unitId: target.id, statusId: old.id, reason: 'consumed' });
          target.statuses = target.statuses.filter(
            (s) => s.sourceId !== source.id || s.key !== effect.key,
          );
        }
        const amount =
          effect.kind === 'stun'
            ? 0
            : effect.kind === 'shield'
              ? Math.min(
                  scaleCombatAmount(
                    amountValue,
                    overtimeModifiers(this.state.tick, this.input.overtime).shieldMilli,
                  ),
                  1_000_000 - shieldTotal(target),
                )
              : Math.max(-1_000_000, Math.min(1_000_000, amountValue));
        const status = {
          id: `effect-${this.state.effectCounter++}`,
          sourceId: source.id,
          ...(effect.key ? { key: effect.key } : {}),
          kind: effect.kind,
          stat: effect.kind === 'modifier' ? effect.stat : null,
          amount,
          expiresTick: effect.duration === null ? null : this.state.tick + effect.duration,
          ...(advancedRules(this.input.rulesVersion) && effect.kind === 'modifier'
            ? { mode: effect.mode ?? ('flat' as const), origin: task.origin ?? ('active' as const) }
            : {}),
        };
        target.statuses.push(status);
        if (effect.kind === 'modifier' && effect.stat === 'maxHp')
          target.hp = Math.max(
            1,
            Math.min(
              effectiveStat(target, 'maxHp'),
              target.hp + effectiveStat(target, 'maxHp') - previousMaxHp,
            ),
          );
        if (effect.kind === 'shield')
          this.emit('shield_apply', {
            unitId: target.id,
            status,
            shieldAfter: shieldTotal(target),
          });
        else this.emit('status_apply', { unitId: target.id, status });
        if (effect.kind === 'stun') this.cancel(target, 'stun');
      }
    }
  }
  private damage(
    source: CombatUnit,
    target: CombatUnit,
    raw: number,
    type: DamageType,
    cause: 'attack' | 'ability',
    critical?: boolean,
  ): void {
    if (target.hp <= 0) return;
    let remaining = mitigateDamage(
      scaleCombatAmount(raw, overtimeModifiers(this.state.tick, this.input.overtime).damageMilli),
      type,
      effectiveStat(target, 'armor'),
      effectiveStat(target, 'magicResist'),
    );
    let absorbed = 0;
    const shields = target.statuses
      .filter((s) => s.kind === 'shield')
      .sort(
        (a, b) =>
          (a.expiresTick ?? Number.MAX_SAFE_INTEGER) - (b.expiresTick ?? Number.MAX_SAFE_INTEGER) ||
          compareIds(a.id, b.id),
      );
    for (const shield of shields) {
      const take = Math.min(remaining, shield.amount);
      shield.amount -= take;
      remaining -= take;
      absorbed += take;
      if (shield.amount === 0) {
        target.statuses = target.statuses.filter((s) => s.id !== shield.id);
        this.emit('status_expire', { unitId: target.id, statusId: shield.id, reason: 'consumed' });
      }
      if (remaining === 0) break;
    }
    const beforeHp = target.hp;
    const damage = Math.min(target.hp, remaining);
    target.hp -= damage;
    this.emit('damage', {
      sourceId: source.id,
      targetId: target.id,
      amount: damage,
      absorbed,
      hpAfter: target.hp,
      shieldAfter: shieldTotal(target),
      damageType: type,
      cause,
      impact: target.position,
      ...(critical !== undefined ? { critical } : {}),
    });
    if (damage > 0)
      this.triggers.push({ unit: target, trigger: 'hp_crossed', beforeHp, target: source });
    if (damage + absorbed > 0) {
      this.triggers.push({ unit: target, trigger: 'damage_received', target: source });
      if (target.hp <= 0) this.triggers.push({ unit: source, trigger: 'kill', target });
      if (cause === 'attack') this.gainMana(source, 10);
      this.gainMana(target, 5);
    }
  }
  private settleDeaths(): void {
    for (const unit of this.state.units)
      if (unit.hp <= 0 && unit.deathTick === null) {
        unit.deathTick = this.state.tick;
        this.cancel(unit, 'death');
        for (const status of unit.statuses)
          this.emit('status_expire', { unitId: unit.id, statusId: status.id, reason: 'death' });
        unit.statuses = [];
        unit.targetId = null;
        this.emit('unit_death', { unitId: unit.id, position: unit.position });
      }
  }
  private checkEnd(): void {
    const sides = new Set(this.state.units.filter(isAlive).map((u) => u.owner));
    let result: CombatResult | null = null;
    if (sides.size <= 1)
      result = {
        outcome: sides.size === 1 ? 'win' : 'double_loss',
        winner: sides.values().next().value ?? null,
        reason: this.input.units.length === 0 ? 'empty' : 'elimination',
        tick: this.state.tick,
      };
    else if (this.state.tick >= this.input.maxTicks)
      result = { outcome: 'double_loss', winner: null, reason: 'timeout', tick: this.state.tick };
    if (!result) return;
    for (const unit of this.state.units) this.cancel(unit, 'combat-end');
    this.state.projectiles = [];
    this.state.result = result;
    this.emit('combat_end', result);
  }
  step(): CombatEventV3[] {
    if (this.state.result) return [];
    const start = this.events.length;
    this.state.tick++;
    this.order = 0;
    // The terminal tick is a check only: no impacts, movement, expiry, charge or decisions.
    if (this.state.tick >= this.input.maxTicks) {
      this.checkEnd();
      return JSON.parse(JSON.stringify(this.events.slice(start))) as CombatEventV3[];
    }
    if (this.state.tick === OVERTIME_START_TICK)
      this.emit('overtime_start', {
        rulesVersion: this.input.rulesVersion,
        startTick: OVERTIME_START_TICK,
        endTick: MAX_COMBAT_TICKS,
        modifiers: this.input.overtime,
      });
    // 1. Expiration, then charge accumulation. A stun ending now no longer blocks this tick.
    for (const unit of this.state.units.filter(isAlive)) {
      for (const status of unit.statuses.filter(
        (s) => s.expiresTick !== null && s.expiresTick <= this.state.tick,
      )) {
        this.emit('status_expire', { unitId: unit.id, statusId: status.id, reason: 'duration' });
        this.triggers.push({
          unit,
          trigger: 'effect_expired',
          ...(status.key ? { key: status.key } : {}),
        });
      }
      unit.statuses = unit.statuses.filter(
        (s) => s.expiresTick === null || s.expiresTick > this.state.tick,
      );
      unit.hp = Math.min(unit.hp, effectiveStat(unit, 'maxHp'));
      if (!isStunned(unit) && unit.attackCharge < 10000)
        unit.attackCharge += Math.floor(
          (effectiveStat(unit, 'attackSpeedMilli') *
            overtimeModifiers(this.state.tick, this.input.overtime).attackSpeedMilli) /
            1000,
        );
    }
    this.flushPassives();
    this.settleDeaths();
    // 2. Arrivals. Each destination was exclusively reserved; origins stay occupied in transit.
    for (const unit of this.state.units.filter(isAlive))
      if (unit.action?.kind === 'move' && unit.action.endTick <= this.state.tick) {
        const action = unit.action;
        unit.position = { ...action.to };
        unit.action = null;
        this.emit('move_end', { unitId: unit.id, from: action.from, to: action.to });
      }
    // 3. Collect committed impacts/casts/releases from living sources before applying any effect.
    const tasks: EffectTask[] = [];
    for (const projectile of this.state.projectiles.filter(
      (p) => p.impactTick <= this.state.tick,
    )) {
      const source = this.getUnit(projectile.sourceId);
      const target = this.getUnit(projectile.targetId);
      if (source && target && isAlive(target))
        tasks.push({
          source,
          target,
          effect: {
            kind: 'damage',
            target: 'target',
            radius: 0,
            amount: projectile.rawDamage,
            damageType: projectile.damageType,
          },
          cause: 'attack',
          ...(projectile.critical !== undefined ? { critical: projectile.critical } : {}),
        });
    }
    this.state.projectiles = this.state.projectiles.filter((p) => p.impactTick > this.state.tick);
    for (const unit of this.state.units.filter(isAlive)) {
      const action = unit.action;
      if (!action || action.kind === 'move' || action.endTick > this.state.tick) continue;
      if (isStunned(unit)) {
        this.cancel(unit, 'stun');
        continue;
      }
      const target = this.getUnit(action.targetId);
      if (
        !target ||
        !isAlive(target) ||
        hexDistance(unit.position, target.position) >
          (action.kind === 'cast' && activeAbility(unit.profile)?.targeting === 'adjacent_enemies'
            ? 1
            : unit.profile.stats.range)
      ) {
        this.cancel(unit, 'invalid-target');
        continue;
      }
      unit.action = null;
      if (action.kind === 'attack') {
        this.triggers.push({ unit, trigger: 'attack', target });
        if (action.ranged) {
          const projectile = {
            id: `projectile-${this.state.effectCounter++}`,
            sourceId: unit.id,
            targetId: target.id,
            launchTick: this.state.tick,
            impactTick:
              this.state.tick +
              Math.max(2, Math.ceil((hexDistance(unit.position, target.position) * 2) / 3)),
            from: { ...unit.position },
            to: { ...target.position },
            rawDamage: action.rawDamage,
            damageType: 'physical' as const,
            ...(action.critical !== undefined ? { critical: action.critical } : {}),
          };
          this.state.projectiles.push(projectile);
          this.emit('projectile_launch', projectile);
        } else
          tasks.push({
            source: unit,
            target,
            effect: {
              kind: 'damage',
              target: 'target',
              radius: 0,
              amount: action.rawDamage,
              damageType: 'physical',
            },
            cause: 'attack',
            ...(action.critical !== undefined ? { critical: action.critical } : {}),
          });
      } else {
        const ability = activeAbility(unit.profile);
        if (!ability) continue;
        this.emit('ability_cast', {
          unitId: unit.id,
          targetId: target.id,
          abilityId: ability.id,
          stage: 'resolve',
          endTick: this.state.tick,
          manaAfter: unit.mana,
          center:
            ability.targeting === 'adjacent_enemies' || ability.targeting === 'self'
              ? unit.position
              : target.position,
        });
        for (const effect of ability.effects) tasks.push(...this.effectTasks(unit, target, effect));
      }
    }
    this.resolveEffects(tasks);
    this.flushPassives();
    this.settleDeaths();
    this.checkEnd();
    if (this.state.result)
      return JSON.parse(JSON.stringify(this.events.slice(start))) as CombatEventV3[];
    // 4. New decisions. Rotate stable ID order for fair, reproducible reservation conflicts.
    const units = this.state.units;
    const offset = (this.state.tick - 1) % Math.max(1, units.length);
    for (const unit of [...units.slice(offset), ...units.slice(0, offset)]) {
      if (!isAlive(unit) || isStunned(unit) || unit.action) continue;
      const ability = activeAbility(unit.profile);
      const canCast =
        ability &&
        unit.mana >= ability.manaCost &&
        abilityConditions(unit, units, ability.conditions);
      if (canCast && ability.targeting === 'self') {
        this.beginCast(unit, unit, ability);
        continue;
      }
      if (canCast && ability.targeting === 'adjacent_enemies') {
        const adjacent = units.find(
          (u) =>
            isAlive(u) && u.owner !== unit.owner && hexDistance(u.position, unit.position) <= 1,
        );
        if (adjacent) {
          unit.targetId = adjacent.id;
          this.beginCast(unit, adjacent, ability);
          continue;
        }
      }
      const choice = chooseTarget(unit, units, this.input.obstacles);
      unit.targetId = choice?.target.id ?? null;
      if (!choice) continue;
      const { target, path } = choice;
      if (path.length) {
        const to = path[0]!;
        const endTick = this.state.tick + unit.profile.stats.moveTicks;
        unit.action = {
          kind: 'move',
          startTick: this.state.tick,
          endTick,
          from: { ...unit.position },
          to: { ...to },
        };
        this.emit('move_start', { unitId: unit.id, from: unit.position, to, endTick });
        continue;
      }
      if (canCast && ability.targeting === 'current_enemy') {
        this.beginCast(unit, target, ability);
      } else if (unit.attackCharge >= 10000) {
        unit.attackCharge -= 10000;
        const random = randomUint32(this.state.rngState);
        this.state.rngState = random.state;
        let rawDamage = Math.min(
          1_000_000,
          Math.floor((effectiveStat(unit, 'attack') * (950 + (random.value % 101))) / 1000),
        );
        let critical: boolean | undefined;
        if (advancedRules(this.input.rulesVersion)) {
          const roll = criticalRoll(unit, rawDamage, this.state.rngState);
          this.state.rngState = roll.rngState;
          rawDamage = roll.amount;
          critical = roll.critical;
        }
        const ranged = unit.profile.stats.range > 1;
        const endTick = this.state.tick + unit.profile.stats.attackWindupTicks;
        unit.action = {
          kind: 'attack',
          startTick: this.state.tick,
          endTick,
          targetId: target.id,
          rawDamage,
          ranged,
          ...(critical !== undefined ? { critical } : {}),
        };
        this.emit('attack_start', {
          unitId: unit.id,
          targetId: target.id,
          releaseTick: endTick,
          ranged,
        });
      }
    }
    this.flushPassives();
    this.settleDeaths();
    this.checkEnd();
    return JSON.parse(JSON.stringify(this.events.slice(start))) as CombatEventV3[];
  }
}
export function runCombat(input: CombatInput): CombatReplay {
  const validated = CombatInputSchema.parse(input);
  const engine = new CombatEngine(validated);
  const snapshots = [engine.snapshot()];
  while (!snapshots[snapshots.length - 1]!.result) {
    engine.step();
    snapshots.push(engine.snapshot());
  }
  return {
    input: validated,
    events: engine.allEvents(),
    snapshots,
    result: snapshots[snapshots.length - 1]!.result!,
  };
}
