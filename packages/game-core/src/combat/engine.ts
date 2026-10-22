import {
  CombatInputSchema,
  CombatStateSchema,
  COMBAT_PROTOCOL,
  COMBAT_RULES,
  type CombatInput,
  type CombatState,
  type CombatUnit,
  type CombatEventV2,
  type CombatEffect,
  type CombatReplay,
  type CombatResult,
  type DamageType,
} from '@tft/shared';
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
};
/** Local mutable implementation with exclusive ownership; public snapshots/events are deep copies. */
export class CombatEngine {
  private readonly input: CombatInput;
  private state: CombatState;
  private events: CombatEventV2[] = [];
  private order = 0;
  constructor(input: CombatInput) {
    this.input = CombatInputSchema.parse(input);
    this.input.units.sort((a, b) => compareIds(a.id, b.id));
    this.state = {
      protocolVersion: COMBAT_PROTOCOL,
      rulesVersion: COMBAT_RULES,
      tick: 0,
      rngState: this.input.seed,
      effectCounter: 0,
      projectiles: [],
      result: null,
      units: this.input.units.map((u) => ({
        ...u,
        hp: u.profile.stats.maxHp,
        mana: u.profile.stats.startingMana,
        attackCharge: 10000,
        statuses: [],
        action: null,
        targetId: null,
        deathTick: null,
      })),
    };
    this.emit('combat_start', {
      rulesVersion: COMBAT_RULES,
      seed: this.input.seed,
      maxTicks: this.input.maxTicks,
      units: this.snapshot().units,
      obstacles: this.input.obstacles,
    });
    const tasks: EffectTask[] = [];
    for (const u of this.state.units)
      for (const effect of u.profile.passive?.effects ?? [])
        tasks.push(...this.effectTasks(u, u, effect));
    this.resolveEffects(tasks);
    this.settleDeaths();
    this.checkEnd();
  }
  snapshot(): CombatState {
    return CombatStateSchema.parse(this.state);
  }
  allEvents(): CombatEventV2[] {
    return JSON.parse(JSON.stringify(this.events)) as CombatEventV2[];
  }
  private emit<T extends CombatEventV2['type']>(
    type: T,
    payload: Extract<CombatEventV2, { type: T }>['payload'],
  ): void {
    const entry = {
      protocolVersion: COMBAT_PROTOCOL,
      tick: this.state.tick,
      order: this.order++,
      type,
      payload,
    } as CombatEventV2;
    this.events.push(JSON.parse(JSON.stringify(entry)) as CombatEventV2);
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
  private gainMana(unit: CombatUnit, amount: number): void {
    if (!isAlive(unit)) return;
    const gained = Math.min(amount, unit.profile.stats.maxMana - unit.mana);
    if (gained <= 0) return;
    unit.mana += gained;
    this.emit('mana_gain', { unitId: unit.id, amount: gained, manaAfter: unit.mana });
  }
  private effectTasks(source: CombatUnit, target: CombatUnit, effect: CombatEffect): EffectTask[] {
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
                    hexDistance(u.position, target.position) <= effect.radius),
            );
    return targets
      .filter(isAlive)
      .sort((a, b) => compareIds(a.id, b.id))
      .map((u) => ({ source, target: u, effect, cause: 'ability' }));
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
      if (!eligible.has(target.id)) continue;
      if (effect.kind === 'damage')
        this.damage(source, target, effect.amount, effect.damageType, cause);
      else if (effect.kind === 'heal') {
        const healed = Math.min(effect.amount, target.profile.stats.maxHp - target.hp);
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
        const amount =
          effect.kind === 'stun'
            ? 0
            : effect.kind === 'shield'
              ? Math.min(effect.amount, 1_000_000 - shieldTotal(target))
              : effect.amount;
        const status = {
          id: `effect-${this.state.effectCounter++}`,
          sourceId: source.id,
          kind: effect.kind,
          stat: effect.kind === 'modifier' ? effect.stat : null,
          amount,
          expiresTick: this.state.tick + effect.duration,
        };
        target.statuses.push(status);
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
  ): void {
    if (target.hp <= 0) return;
    let remaining = mitigateDamage(
      raw,
      type,
      effectiveStat(target, 'armor'),
      effectiveStat(target, 'magicResist'),
    );
    let absorbed = 0;
    const shields = target.statuses
      .filter((s) => s.kind === 'shield')
      .sort((a, b) => a.expiresTick - b.expiresTick || compareIds(a.id, b.id));
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
    });
    if (damage + absorbed > 0) {
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
        winner: sides.values().next().value ?? null,
        reason: this.input.units.length === 0 ? 'empty' : 'elimination',
        tick: this.state.tick,
      };
    else if (this.state.tick >= this.input.maxTicks)
      result = { winner: null, reason: 'timeout', tick: this.state.tick };
    if (!result) return;
    for (const unit of this.state.units) this.cancel(unit, 'combat-end');
    this.state.projectiles = [];
    this.state.result = result;
    this.emit('combat_end', result);
  }
  step(): CombatEventV2[] {
    if (this.state.result) return [];
    const start = this.events.length;
    this.state.tick++;
    this.order = 0;
    // 1. Expiration, then charge accumulation. A stun ending now no longer blocks this tick.
    for (const unit of this.state.units.filter(isAlive)) {
      for (const status of unit.statuses.filter((s) => s.expiresTick <= this.state.tick))
        this.emit('status_expire', { unitId: unit.id, statusId: status.id, reason: 'duration' });
      unit.statuses = unit.statuses.filter((s) => s.expiresTick > this.state.tick);
      if (!isStunned(unit) && unit.attackCharge < 10000)
        unit.attackCharge += effectiveStat(unit, 'attackSpeedMilli');
    }
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
        hexDistance(unit.position, target.position) > unit.profile.stats.range
      ) {
        this.cancel(unit, 'invalid-target');
        continue;
      }
      unit.action = null;
      if (action.kind === 'attack') {
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
          });
      } else {
        const ability = unit.profile.ability;
        if (!ability) continue;
        this.emit('ability_cast', {
          unitId: unit.id,
          targetId: target.id,
          abilityId: ability.id,
          stage: 'resolve',
          endTick: this.state.tick,
          manaAfter: unit.mana,
          center: target.position,
        });
        for (const effect of ability.effects) tasks.push(...this.effectTasks(unit, target, effect));
      }
    }
    this.resolveEffects(tasks);
    this.settleDeaths();
    this.checkEnd();
    if (this.state.result)
      return JSON.parse(JSON.stringify(this.events.slice(start))) as CombatEventV2[];
    // 4. New decisions. Rotate stable ID order for fair, reproducible reservation conflicts.
    const units = this.state.units;
    const offset = (this.state.tick - 1) % Math.max(1, units.length);
    for (const unit of [...units.slice(offset), ...units.slice(0, offset)]) {
      if (!isAlive(unit) || isStunned(unit) || unit.action) continue;
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
      const ability = unit.profile.ability;
      if (ability && unit.mana >= ability.manaCost) {
        unit.mana -= ability.manaCost;
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
          center: target.position,
        });
      } else if (unit.attackCharge >= 10000) {
        unit.attackCharge -= 10000;
        const random = randomUint32(this.state.rngState);
        this.state.rngState = random.state;
        const rawDamage = Math.min(
          1_000_000,
          Math.floor((effectiveStat(unit, 'attack') * (950 + (random.value % 101))) / 1000),
        );
        const ranged = unit.profile.stats.range > 1;
        const endTick = this.state.tick + unit.profile.stats.attackWindupTicks;
        unit.action = {
          kind: 'attack',
          startTick: this.state.tick,
          endTick,
          targetId: target.id,
          rawDamage,
          ranged,
        };
        this.emit('attack_start', {
          unitId: unit.id,
          targetId: target.id,
          releaseTick: endTick,
          ranged,
        });
      }
    }
    return JSON.parse(JSON.stringify(this.events.slice(start))) as CombatEventV2[];
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
