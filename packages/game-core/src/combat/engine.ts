import { ItemEffectExecutor } from './item-effects';
import type { ItemSource } from '@tft/shared';
import { CombatMechanics, type Emit, type DamageContext, type MechanicSignal } from './mechanics';
import { advancedRules, effectAmount, criticalRoll } from './stats';
import { prepareTraitProfiles } from './traits';
import { activeAbility, abilityConditions } from './abilities';
import {
  CombatInputSchema,
  MECHANICS_RULES,
  CHARACTER_RULES,
  COMPOSITE_RULES,
  P11C_RULES,
  P11H_RULES,
  isFlorinRules,
  isMechanicEffect,
  type ChainContext,
  CombatStateSchema,
  COMBAT_PROTOCOL,
  MAX_COMBAT_TICKS,
  OVERTIME_START_TICK,
  type CombatInput,
  type CombatState,
  type CombatUnit,
  type CombatStatus,
  type CombatEventV3,
  type CombatEffect,
  type CombatReplay,
  type CombatResult,
  type DamageType,
} from '@tft/shared';
import { overtimeModifiers, scaleCombatAmount } from './overtime';
import { hexDistance } from '../hex';
import { chooseTarget } from './pathfinding';
import {
  compareIds,
  effectiveStat,
  isAlive,
  isPresent,
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
  context?: ChainContext | undefined;
  attackId?: string | undefined;
  powerMilli?: number | undefined;
  projectileId?: string;
  itemSource?: ItemSource;
};
/** Local mutable implementation with exclusive ownership; public snapshots/events are deep copies. */
export class CombatEngine {
  private readonly input: CombatInput;
  private state: CombatState;
  private events: CombatEventV3[] = [];
  private order = 0;
  private mechanics?: CombatMechanics;
  private items?: ItemEffectExecutor;
  private triggers: MechanicSignal[] = [];
  private flushPassives(): void {
    while (this.triggers.length) {
      const signal = this.triggers.shift()!;
      const unit = signal.unit,
        main = unit.profile.championAbility;
      if (!isPresent(unit)) continue;
      const context = this.mechanics ? (signal.context ?? this.mechanics.root()) : undefined;
      if (this.mechanics && !this.mechanics.budget('signals', unit, context!)) {
        this.triggers = [];
        break;
      }
      const entries =
        this.mechanics?.rules(unit) ??
        (main?.passive?.rules ?? []).map((rule) => ({
          rule,
          abilityId: main!.id,
          runtime: (unit.passiveState ??= {}),
          progress: undefined,
        }));
      const tasks: EffectTask[] = [];
      for (const entry of entries) {
        const rule = entry.rule;
        if (rule.trigger.kind !== signal.trigger) continue;
        const runtime = (entry.runtime[rule.id] ??= {
          count: 0,
          seen: 0,
          lastTick: -450,
        });
        runtime.seen++;
        if (
          runtime.count >= rule.maxActivations ||
          (!this.mechanics && runtime.lastTick === this.state.tick) ||
          this.state.tick - runtime.lastTick < rule.cooldownTicks
        )
          continue;
        if (
          (rule.trigger.kind === 'attack' || rule.trigger.kind === 'attack_hit') &&
          runtime.seen % rule.trigger.every !== 0
        )
          continue;
        if (
          rule.trigger.kind === 'ability_cast' &&
          rule.trigger.every &&
          (!context?.countAsCast ||
            (entry.progress
              ? (signal.castCounts?.traits[entry.progress.traitId] ?? entry.progress.casts)
              : (signal.castCounts?.unit ?? unit.mechanics?.casts ?? runtime.seen)) %
              rule.trigger.every !==
              0)
        )
          continue;
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
        const nextContext = this.mechanics ? this.mechanics.child(context!, unit) : undefined;
        if (this.mechanics && !nextContext) continue;
        if (nextContext) {
          nextContext.trigger = signal.trigger;
          nextContext.conditions = rule.conditions;
        }
        runtime.count++;
        runtime.lastTick = this.state.tick;
        this.emit('passive_trigger', {
          unitId: unit.id,
          abilityId: entry.abilityId,
          ruleId: rule.id,
          trigger: signal.trigger,
          activation: runtime.count,
        });
        for (const effect of rule.effects)
          tasks.push(
            ...this.effectTasks(unit, signal.target ?? unit, effect, 'passive').map((task) => ({
              ...task,
              ...(nextContext ? { context: nextContext } : {}),
            })),
          );
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
    if (
      this.input.rulesVersion === MECHANICS_RULES ||
      this.input.rulesVersion === CHARACTER_RULES ||
      this.input.rulesVersion === COMPOSITE_RULES ||
      isFlorinRules(input.rulesVersion)
    )
      this.mechanics = new CombatMechanics({
        input: this.input,
        state: () => this.state,
        emit: this.emit.bind(this),
        apply: (source, target, effects, context, powerMilli, origin = 'active') =>
          this.resolveEffects(
            effects.flatMap((effect) =>
              this.effectTasks(source, target, effect, origin).map((task) => ({
                ...task,
                context,
                powerMilli,
              })),
            ),
          ),
        signal: (signal) => this.triggers.push(signal),
        damage: (source, target, amount, type, meta) =>
          this.damage(source, target, amount, type, 'ability', false, meta),
        attack: (source, target, context) => this.immediateAttack(source, target, context),
        cancel: (unit, reason) => this.cancel(unit, reason),
      });
    if (advancedRules(this.input.rulesVersion))
      for (const u of this.state.units) u.hp = effectiveStat(u, 'maxHp');
    if (this.input.units.some((u) => u.profile.itemLoadout))
      this.items = new ItemEffectExecutor({
        input: this.input,
        state: () => this.state,
        emit: this.emit,
        parentEvent: () => {
          const e = this.events.at(-1);
          return e ? { tick: e.tick, order: e.order } : null;
        },
        effect: (source, target, effect, itemSource) =>
          this.resolveEffects([
            { source, target, effect, cause: 'ability', origin: 'active', itemSource },
          ]),
        damage: (source, target, amount, type, itemSource) =>
          this.damage(source, target, amount, type, 'ability', false, {
            itemSource,
            context: {
              ...this.mechanics!.root(),
              allowSourceProcs: false,
              allowKillChain: false,
              grantMana: false,
            },
          }),
        mana: (u, n) => this.gainMana(u, n),
        cancel: (u) => this.cancel(u, 'invalid-target'),
      });
    this.emit('combat_start', {
      rulesVersion: this.input.rulesVersion,
      seed: this.input.seed,
      maxTicks: this.input.maxTicks,
      overtime: this.input.overtime,
      units: this.snapshot().units,
      obstacles: this.input.obstacles,
    });
    this.items?.start();
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
  private emit: Emit = (type, payload) => {
    const entry = {
      protocolVersion: COMBAT_PROTOCOL,
      tick: this.state.tick,
      order: this.order++,
      type,
      payload,
    } as CombatEventV3;
    this.events.push(JSON.parse(JSON.stringify(entry)) as CombatEventV3);
    if (
      type === 'ability_cast' &&
      (entry as Extract<CombatEventV3, { type: 'ability_cast' }>).payload.stage === 'start'
    ) {
      const p = (entry as Extract<CombatEventV3, { type: 'ability_cast' }>).payload;
      const u = this.getUnit(p.unitId),
        t = this.getUnit(p.targetId);
      if (u && t)
        this.items?.cast(u, t, p.additional ? 0 : (activeAbility(u.profile)?.manaCost ?? 0));
    }
    return entry;
  };
  private getUnit(id: string): CombatUnit | undefined {
    return this.state.units.find((u) => u.id === id);
  }
  private cancel(
    unit: CombatUnit,
    reason: 'stun' | 'death' | 'invalid-target' | 'combat-end',
  ): void {
    if (!unit.action) return;
    this.mechanics?.cancelAction(unit);
    this.emit('action_cancel', { unitId: unit.id, action: unit.action.kind, reason });
    unit.action = null;
  }
  private beginCast(
    unit: CombatUnit,
    target: CombatUnit,
    ability: NonNullable<ReturnType<typeof activeAbility>>,
  ): void {
    unit.mana -= ability.manaCost;
    const context = this.mechanics?.root();
    if (context) {
      context.trigger = 'ability_cast';
      context.conditions = ability.conditions;
    }
    const castCounts = this.mechanics?.count(unit, 'casts');
    this.triggers.push({
      unit,
      trigger: 'ability_cast',
      target,
      ...(context ? { context } : {}),
      ...(castCounts ? { castCounts } : {}),
    });
    const endTick = this.state.tick + ability.castTicks;
    unit.action = {
      kind: 'cast',
      startTick: this.state.tick,
      endTick,
      targetId: target.id,
      abilityId: ability.id,
      ...(context ? { castId: context.causalId, context } : {}),
    };
    this.emit('ability_cast', {
      unitId: unit.id,
      targetId: target.id,
      abilityId: ability.id,
      stage: 'start',
      ...(context ? { castId: context.causalId, additional: false } : {}),
      endTick,
      manaAfter: unit.mana,
      center: ability.targeting === 'current_enemy' ? target.position : unit.position,
    });
  }
  private gainMana(unit: CombatUnit, amount: number): void {
    if (!isAlive(unit)) return;
    const gained = Math.min(
      this.items?.manaAmount(unit, amount) ?? amount,
      unit.profile.stats.maxMana - unit.mana,
    );
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
                isPresent(u) &&
                (!('excludePrimary' in effect) || !effect.excludePrimary || u.id !== target.id) &&
                (effect.target === 'allies'
                  ? u.owner === source.owner &&
                    hexDistance(u.position, source.position) <= effect.radius
                  : u.owner !== source.owner &&
                    hexDistance(
                      u.position,
                      'center' in effect && effect.center === 'source'
                        ? source.position
                        : target.position,
                    ) <=
                      ('radiusByStars' in effect && effect.radiusByStars
                        ? effect.radiusByStars[(source.profile.starLevel ?? 1) - 1]!
                        : effect.radius)),
            );
    return targets
      .filter(isAlive)
      .sort((a, b) => compareIds(a.id, b.id))
      .map((u) => ({ source, target: u, effect, cause: 'ability', origin }));
  }
  private resolveEffects(tasks: EffectTask[]): void {
    // All actions finishing this tick are committed before any damage. Support first; deaths last.
    const eligible = new Set(this.state.units.filter(isAlive).map((u) => u.id));
    const priority = (task: EffectTask) =>
      'timing' in task.effect && task.effect.timing === 'after_damage'
        ? 2
        : task.effect.kind === 'damage'
          ? 1
          : 0;
    const recovery: { source: CombatUnit; amount: number }[] = [];
    const recover = () => {
      for (const { source, amount } of recovery.splice(0))
        if (isAlive(source))
          this.resolveEffects([
            {
              source,
              target: source,
              effect: { kind: 'heal', target: 'self', radius: 0, amount },
              cause: 'ability',
            },
          ]);
    };
    const sorted = tasks
      .map((task, index) => ({ task, index }))
      .sort((a, b) => priority(a.task) - priority(b.task) || a.index - b.index);
    for (const { task } of sorted) {
      const { source, target, effect, cause } = task;
      if (priority(task) === 2) {
        recover();
        if (!isAlive(target)) continue;
      }
      if (!eligible.has(target.id)) continue;
      let context = this.mechanics ? (task.context ?? this.mechanics.root()) : undefined;
      if (this.mechanics && !this.mechanics.budget('effects', source, context!)) continue;
      if (isMechanicEffect(effect)) {
        this.mechanics?.apply(source, target, effect, context!);
        continue;
      }
      const amountValue =
        task.powerMilli === undefined
          ? effectAmount(effect, source, target)
          : Math.max(
              -1000000,
              Math.min(
                1000000,
                Math.floor((effectAmount(effect, source, target) * task.powerMilli) / 1000),
              ),
            );
      if (effect.kind === 'damage') {
        if (effect.oncePerTarget) {
          if (target.receivedEffects?.includes(effect.oncePerTarget)) continue;
          (target.receivedEffects ??= []).push(effect.oncePerTarget);
          if (context) {
            context = {
              ...context,
              allowSourceProcs: false,
              allowKillChain: false,
              grantMana: false,
            };
          }
        }
        let amount = amountValue;
        let critical = task.critical;
        if (advancedRules(this.input.rulesVersion)) {
          critical ??= false;
          if (
            cause === 'ability' &&
            !task.itemSource &&
            !(this.input.rulesVersion === P11H_RULES && effect.canCrit === false) &&
            (effect.canCrit === true ||
              (task.origin !== 'passive' &&
                task.origin !== 'trait' &&
                this.items?.canCrit(source))) &&
            target.hp > 0
          ) {
            const roll = criticalRoll(source, amount, this.state.rngState);
            this.state.rngState = roll.rngState;
            amount = roll.amount;
            critical = roll.critical;
          }
        }
        const beforeHp = target.hp;
        this.damage(source, target, amount, effect.damageType, cause, critical, {
          ...(context ? { context } : {}),
          ...(task.attackId ? { attackId: task.attackId } : {}),
          ...(task.projectileId ? { projectileId: task.projectileId } : {}),
          ...(task.itemSource
            ? {
                itemSource: task.itemSource,
                context: {
                  ...this.mechanics!.root(),
                  allowSourceProcs: false,
                  allowKillChain: false,
                  grantMana: false,
                },
              }
            : {}),
        });
        if (effect.healFromDamageMilli !== undefined) {
          const ratio =
            typeof effect.healFromDamageMilli === 'number'
              ? effect.healFromDamageMilli
              : effect.healFromDamageMilli[(source.profile.starLevel ?? 1) - 1]!;
          recovery.push({ source, amount: Math.floor(((beforeHp - target.hp) * ratio) / 1000) });
        }
      } else if (effect.kind === 'heal') {
        const multiplier = overtimeModifiers(this.state.tick, this.input.overtime).healMilli;
        const requested = scaleCombatAmount(amountValue, multiplier);
        const adjusted = scaleCombatAmount(
          this.items?.healAmount(target, amountValue) ?? amountValue,
          multiplier,
        );
        const healed = Math.min(adjusted, effectiveStat(target, 'maxHp') - target.hp);
        if (
          healed > 0 ||
          ([P11C_RULES, P11H_RULES].includes(
            this.input.rulesVersion as typeof P11C_RULES | typeof P11H_RULES,
          ) &&
            requested > 0)
        ) {
          target.hp += healed;
          this.items?.healthChanged(target);
          this.emit('heal', {
            sourceId: source.id,
            targetId: target.id,
            amount: healed,
            hpAfter: target.hp,
            ...([P11C_RULES, P11H_RULES].includes(
              this.input.rulesVersion as typeof P11C_RULES | typeof P11H_RULES,
            )
              ? {
                  accounting: {
                    version: 1 as const,
                    requested,
                    prevented: Math.max(0, requested - adjusted),
                    overheal: adjusted - healed,
                  },
                }
              : {}),
            ...(task.itemSource ? { itemSource: task.itemSource } : {}),
          });
        }
      } else if (effect.kind === 'armor_reduction') {
        // Equal strengths refresh globally; unequal strengths coexist until expiry.
        // The stat selector takes the strongest, never their sum.
        const existing = target.statuses.find(
          (s) => s.group === 'armor-reduction' && s.amount === amountValue,
        );
        if (existing) {
          target.statuses = target.statuses.filter((s) => s.id !== existing.id);
          this.emit('status_expire', {
            unitId: target.id,
            statusId: existing.id,
            reason: 'consumed',
          });
        }
        const status = {
          id: `effect-${this.state.effectCounter++}`,
          sourceId: source.id,
          kind: 'modifier' as const,
          group: 'armor-reduction' as const,
          stat: 'armor' as const,
          mode: 'percent_milli' as const,
          amount: amountValue,
          expiresTick: this.state.tick + effect.duration,
        };
        target.statuses.push(status);
        this.emit('status_apply', { unitId: target.id, status });
      } else {
        if (effect.kind === 'stun' && this.items?.immune(target)) continue;
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
          ...(task.itemSource ? { itemSource: task.itemSource } : {}),
          ...(effect.key ? { key: effect.key } : {}),
          kind: effect.kind,
          stat: effect.kind === 'modifier' ? effect.stat : null,
          amount,
          expiresTick:
            effect.duration === null
              ? null
              : this.state.tick +
                ((effect.kind === 'modifier' || effect.kind === 'stun') && effect.durationByStars
                  ? effect.durationByStars[(source.profile.starLevel ?? 1) - 1]!
                  : effect.duration),
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
    recover();
  }
  private damage(
    source: CombatUnit,
    target: CombatUnit,
    raw: number,
    type: DamageType,
    cause: 'attack' | 'ability',
    critical?: boolean,
    meta: DamageContext = {},
  ): void {
    if (target.hp <= 0 || !isPresent(target) || source.mechanics?.recovery?.away) return;
    if (cause === 'attack')
      type =
        source.mechanics?.recovery?.basicDamageTypeOnReturn && !source.mechanics.recovery.away
          ? source.mechanics.recovery.basicDamageTypeOnReturn
          : type;
    const ghostMilli =
      this.input.ghost?.side === source.owner ? this.input.ghost.damageMultiplierMilli : 1000;
    const requested = [P11C_RULES, P11H_RULES].includes(
      this.input.rulesVersion as typeof P11C_RULES | typeof P11H_RULES,
    )
      ? scaleCombatAmount(
          this.items?.outgoingDamage(source, target, raw, type) ?? raw,
          overtimeModifiers(this.state.tick, this.input.overtime).damageMilli,
        )
      : undefined;
    raw = this.items?.damageAmount(source, target, raw, type, cause) ?? raw;
    let remaining = mitigateDamage(
      scaleCombatAmount(raw, overtimeModifiers(this.state.tick, this.input.overtime).damageMilli),
      type,
      effectiveStat(target, 'armor'),
      effectiveStat(target, 'magicResist'),
    );
    // One final outgoing multiplier after defenses and before shields/HP. All damage paths
    // (including item procs, periodic effects and projectile impacts) converge here.
    if (ghostMilli !== 1000) remaining = Math.floor((remaining * ghostMilli) / 1000);
    const postDefense = remaining;
    let absorbed = 0;
    const broken: CombatStatus[] = [];
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
        broken.push(shield);
      }
      if (remaining === 0) break;
    }
    const beforeHp = target.hp;
    const damage = Math.min(target.hp, remaining);
    target.hp -= damage;
    const damageEvent = this.emit('damage', {
      sourceId: source.id,
      targetId: target.id,
      ...(meta.itemSource ? { itemSource: meta.itemSource } : {}),
      amount: damage,
      ...(requested !== undefined
        ? {
            accounting: {
              version: 1 as const,
              requested: Math.floor((requested * ghostMilli) / 1000),
              mitigated: Math.max(0, Math.floor((requested * ghostMilli) / 1000) - postDefense),
              defenseAmplification: Math.max(
                0,
                postDefense - Math.floor((requested * ghostMilli) / 1000),
              ),
              overkill: remaining - damage,
            },
          }
        : {}),
      absorbed,
      hpAfter: target.hp,
      shieldAfter: shieldTotal(target),
      damageType: type,
      cause,
      ...(meta.projectileId ? { projectileId: meta.projectileId } : {}),
      impact: target.position,
      ...(critical !== undefined ? { critical } : {}),
      ...(this.mechanics
        ? {
            causalId: meta.context?.causalId ?? `damage-${this.state.tick}-${this.order}`,
            responsibleId: meta.responsibleId === undefined ? source.id : meta.responsibleId,
            ...(meta.attackId ? { attackId: meta.attackId } : {}),
            ...(meta.origin ? { origin: meta.origin } : {}),
          }
        : {}),
    });
    const cycle = source.profile.championAbility?.passive?.attackCycle;
    if (cause === 'attack' && cycle && isFlorinRules(this.input.rulesVersion)) {
      const count = (source.mechanics!.basicAttacks ?? 0) + 1;
      source.mechanics!.basicAttacks = count;
      const star = (source.profile.starLevel ?? 1) - 1;
      if (count % (cycle.afterAttacks[star]! + 1) === 0) {
        this.emit('passive_trigger', {
          unitId: source.id,
          abilityId: source.profile.championAbility!.id,
          ruleId: 'suela-reforzada',
          trigger: 'attack_hit',
          activation: Math.floor(count / (cycle.afterAttacks[star]! + 1)),
        });
        if (cycle.slowMoveMilli[star] && isPresent(target))
          this.resolveEffects(
            this.effectTasks(
              source,
              target,
              {
                kind: 'modifier',
                target: 'target',
                radius: 0,
                stat: 'moveSpeedMilli',
                mode: 'percent_milli',
                amount: -cycle.slowMoveMilli[star]!,
                duration: cycle.slowTicks,
                key: 'suela-slow',
                stacking: 'refresh',
              },
              'passive',
            ),
          );
      }
    }
    for (const shield of broken) this.items?.expired(target, shield, 'consumed');
    if (this.mechanics) {
      if (cause === 'attack') this.mechanics.confirm(source, target, damageEvent, meta);
      if (damage > 0 && (meta.context?.allowSourceProcs ?? true))
        this.triggers.push({
          unit: source,
          target,
          trigger: 'damage_dealt',
          context: meta.context,
        });
      if (target.hp <= 0)
        this.mechanics.lethalDamage(
          source,
          target,
          damageEvent as Extract<CombatEventV3, { type: 'damage' }>,
          meta,
        );
    }
    this.items?.afterDamage(
      source,
      target,
      damage,
      absorbed,
      type,
      cause,
      !!meta.itemSource || meta.origin === 'periodic',
      critical ?? false,
    );
    this.items?.healthChanged(target);
    this.items?.healthChanged(source);
    if (damage > 0)
      this.triggers.push({
        unit: target,
        trigger: 'hp_crossed',
        beforeHp,
        target: source,
        ...(meta.context ? { context: meta.context } : {}),
      });
    if (damage + absorbed > 0) {
      this.triggers.push({
        unit: target,
        trigger: 'damage_received',
        target: source,
        ...(meta.context ? { context: meta.context } : {}),
      });
      if (!this.mechanics && target.hp <= 0)
        this.triggers.push({ unit: source, trigger: 'kill', target });
      if (cause === 'attack' && (meta.context?.grantMana ?? true)) this.gainMana(source, 10);
      if (meta.context?.grantMana ?? true) this.gainMana(target, 5);
    }
  }
  private settleDeaths(): void {
    const dead: CombatUnit[] = [];
    for (const unit of this.state.units)
      if (unit.hp <= 0 && unit.deathTick === null) {
        dead.push(unit);
        unit.deathTick = this.state.tick;
        this.cancel(unit, 'death');
        for (const status of unit.statuses)
          this.emit('status_expire', { unitId: unit.id, statusId: status.id, reason: 'death' });
        unit.statuses = [];
        unit.targetId = null;
        this.emit('unit_death', { unitId: unit.id, position: unit.position });
      }
    this.mechanics?.settleDeaths(dead);
    if (dead.length) this.items?.refreshAuras();
  }
  private stabilize(): void {
    if (!this.mechanics) return;
    for (
      let i = 0;
      i < 1024 &&
      (this.triggers.length || this.state.units.some((u) => u.hp <= 0 && u.deathTick === null));
      i++
    ) {
      this.settleDeaths();
      this.flushPassives();
    }
    this.settleDeaths();
  }
  private moveDuration(unit: CombatUnit) {
    if (!isFlorinRules(this.input.rulesVersion)) return unit.profile.stats.moveTicks;
    const speed = effectiveStat(unit, 'moveSpeedMilli');
    const numerator = unit.profile.stats.moveTicks * 1000 + (unit.mechanics?.moveRemainder ?? 0);
    unit.mechanics!.moveRemainder = numerator % speed;
    return Math.max(1, Math.floor(numerator / speed));
  }
  private basicAttackPower(source: CombatUnit, raw: number) {
    const cycle = source.profile.championAbility?.passive?.attackCycle;
    if (!cycle || !isFlorinRules(this.input.rulesVersion)) return raw;
    const star = (source.profile.starLevel ?? 1) - 1;
    return ((source.mechanics?.basicAttacks ?? 0) + 1) % (cycle.afterAttacks[star]! + 1) === 0
      ? Math.min(
          1_000_000,
          raw + Math.floor((effectiveStat(source, 'attack') * cycle.bonusAdMilli[star]!) / 1000),
        )
      : raw;
  }
  private immediateAttack(source: CombatUnit, target: CombatUnit, context: ChainContext): void {
    if (!isPresent(source) || !isPresent(target)) return;
    const random = randomUint32(this.state.rngState);
    this.state.rngState = random.state;
    const raw = Math.min(
      1000000,
      Math.floor((effectiveStat(source, 'attack') * (950 + (random.value % 101))) / 1000),
    );
    const roll = criticalRoll(source, this.basicAttackPower(source, raw), this.state.rngState);
    this.state.rngState = roll.rngState;
    const attackId = `chain-${this.state.effectCounter++}`;
    this.emit('chain_attack', {
      unitId: source.id,
      targetId: target.id,
      attackId,
      causalId: context.causalId,
    });
    this.damage(source, target, roll.amount, 'physical', 'attack', roll.critical, {
      context,
      attackId,
    });
  }
  private checkEnd(): void {
    this.stabilize();
    this.mechanics?.recoveries();
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
    this.mechanics?.finish();
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
    this.mechanics?.expireStacks();
    // 1. Expiration, then charge accumulation. A stun ending now no longer blocks this tick.
    for (const unit of this.state.units.filter(isAlive)) {
      for (const status of unit.statuses.filter(
        (s) => s.expiresTick !== null && s.expiresTick <= this.state.tick,
      )) {
        this.emit('status_expire', { unitId: unit.id, statusId: status.id, reason: 'duration' });
        this.items?.expired(unit, status, 'duration');
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
      if (isPresent(unit) && !isStunned(unit) && unit.attackCharge < 10000)
        unit.attackCharge += Math.floor(
          (effectiveStat(unit, 'attackSpeedMilli') *
            overtimeModifiers(this.state.tick, this.input.overtime).attackSpeedMilli) /
            1000,
        );
    }
    this.mechanics?.recoveries(true);
    this.items?.tick();
    this.mechanics?.periodics();
    this.flushPassives();
    this.settleDeaths();
    this.stabilize();
    // 2. Arrivals. Each destination was exclusively reserved; origins stay occupied in transit.
    for (const unit of this.state.units.filter(isPresent))
      if (unit.action?.kind === 'move' && unit.action.endTick <= this.state.tick) {
        const action = unit.action;
        unit.position = { ...action.to };
        unit.action = null;
        this.emit('move_end', { unitId: unit.id, from: action.from, to: action.to });
      }
    this.items?.refreshAuras();
    // 3. Collect committed impacts/casts/releases from living sources before applying any effect.
    const tasks: EffectTask[] = [];
    for (const projectile of this.state.projectiles.filter(
      (p) => p.impactTick <= this.state.tick,
    )) {
      const source = this.getUnit(projectile.sourceId);
      const target = this.getUnit(projectile.targetId);
      if (source && target && isPresent(target) && !source.mechanics?.recovery?.away) {
        const effects: CombatEffect[] = projectile.effects ?? [
          {
            kind: 'damage',
            target: 'target',
            radius: 0,
            amount: projectile.rawDamage,
            damageType: projectile.damageType,
          },
        ];
        for (const effect of effects)
          tasks.push({
            source,
            target,
            effect,
            cause: projectile.cause ?? 'attack',
            ...(this.input.rulesVersion === COMPOSITE_RULES ||
            isFlorinRules(this.input.rulesVersion)
              ? { projectileId: projectile.id }
              : {}),
            ...(projectile.critical !== undefined ? { critical: projectile.critical } : {}),
            ...(projectile.itemSource ? { itemSource: projectile.itemSource } : {}),
            ...(projectile.context
              ? { context: projectile.context, attackId: projectile.attackId }
              : {}),
          });
      }
    }
    this.state.projectiles = this.state.projectiles.filter((p) => p.impactTick > this.state.tick);
    for (const unit of this.state.units.filter(isPresent)) {
      const action = unit.action;
      if (
        !action ||
        action.kind === 'move' ||
        action.kind === 'jump' ||
        action.endTick > this.state.tick
      )
        continue;
      if (isStunned(unit)) {
        this.cancel(unit, 'stun');
        continue;
      }
      const target = this.getUnit(action.targetId);
      if (
        !target ||
        !isPresent(target) ||
        this.items?.untargetable(target) ||
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
        this.items?.attack(unit, target, action.critical ?? false);
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
            ...(action.context ? { context: action.context, attackId: action.attackId } : {}),
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
            ...(action.context ? { context: action.context, attackId: action.attackId } : {}),
          });
      } else {
        const ability = activeAbility(unit.profile);
        if (!ability) continue;
        this.emit('ability_cast', {
          unitId: unit.id,
          targetId: target.id,
          abilityId: ability.id,
          stage: 'resolve',
          ...(action.context ? { castId: action.castId, additional: false } : {}),
          endTick: this.state.tick,
          manaAfter: unit.mana,
          center:
            ability.targeting === 'adjacent_enemies' || ability.targeting === 'self'
              ? unit.position
              : target.position,
        });
        if ('delivery' in ability && ability.delivery === 'projectile') {
          const effects = ability.effects
            .filter((e) => !isMechanicEffect(e))
            .map((e) => {
              if (!('amount' in e)) return e;
              const {
                powerScaling: _power,
                scaling: _scaling,
                amountByStars: _stars,
                ...fixed
              } = e as typeof e & {
                powerScaling?: unknown;
                scaling?: unknown;
                amountByStars?: unknown;
              };
              void _power;
              void _scaling;
              void _stars;
              return { ...fixed, amount: effectAmount(e, unit, target) };
            });
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
            rawDamage: 0,
            damageType: 'physical' as const,
            cause: 'ability' as const,
            effects,
            ...(action.context ? { context: action.context } : {}),
          };
          this.state.projectiles.push(projectile);
          this.emit('projectile_launch', projectile);
          continue;
        }
        for (const effect of [...ability.effects, ...(action.empower?.extraEffects ?? [])])
          tasks.push(
            ...this.effectTasks(unit, target, effect).map((task) => ({
              ...task,
              ...(action.context
                ? { context: action.context, powerMilli: action.empower?.powerMilli ?? 1000 }
                : {}),
            })),
          );
      }
    }
    this.resolveEffects(tasks);
    this.stabilize();
    this.mechanics?.arrivals();
    this.stabilize();
    this.mechanics?.repeats();
    this.flushPassives();
    this.settleDeaths();
    this.checkEnd();
    if (this.state.result)
      return JSON.parse(JSON.stringify(this.events.slice(start))) as CombatEventV3[];
    // 4. New decisions. Rotate stable ID order for fair, reproducible reservation conflicts.
    const units = this.state.units;
    const offset = (this.state.tick - 1) % Math.max(1, units.length);
    for (const unit of [...units.slice(offset), ...units.slice(0, offset)]) {
      if (!isPresent(unit) || isStunned(unit) || unit.action) continue;
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
            isPresent(u) && u.owner !== unit.owner && hexDistance(u.position, unit.position) <= 1,
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
        const endTick = this.state.tick + this.moveDuration(unit);
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
        rawDamage = this.basicAttackPower(unit, rawDamage);
        let critical: boolean | undefined;
        if (advancedRules(this.input.rulesVersion)) {
          const roll = criticalRoll(unit, rawDamage, this.state.rngState);
          this.state.rngState = roll.rngState;
          rawDamage = roll.amount;
          critical = roll.critical;
        }
        const context = this.mechanics?.root();
        if (context) context.trigger = 'attack_hit';
        const ranged = unit.profile.stats.range > 1;
        const endTick = this.state.tick + unit.profile.stats.attackWindupTicks;
        unit.action = {
          kind: 'attack',
          startTick: this.state.tick,
          endTick,
          targetId: target.id,
          rawDamage,
          ranged,
          ...(context ? { context, attackId: context.causalId } : {}),
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
    this.items?.refreshAuras();
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
