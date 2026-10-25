import type {
  ChainContext,
  CombatEffect,
  CombatEventV3,
  CombatInput,
  CombatState,
  CombatUnit,
  KillAttribution,
  MechanicEffect,
  PassiveRule,
  PassiveTrigger,
  RuleRuntime,
  StackDefinition,
  StackState,
  TraitProgress,
} from '@tft/shared';
import { MECHANICS_LIMITS, CHARACTER_RULES, COMPOSITE_RULES } from '@tft/shared';
import { analyzeTraits } from './traits';
import { activeAbility } from './abilities';
import { effectiveStat, isAlive, isStunned, compareIds } from './math';
import { blockedCells } from './pathfinding';
import { boardNeighbors, hexDistance, hexKey, sameHex } from '../hex';
import { effectAmount } from './stats';
export type Emit = <T extends CombatEventV3['type']>(
  type: T,
  payload: Extract<CombatEventV3, { type: T }>['payload'],
) => CombatEventV3;
export interface MechanicSignal {
  unit: CombatUnit;
  trigger: PassiveTrigger['kind'];
  beforeHp?: number;
  target?: CombatUnit;
  key?: string;
  context?: ChainContext | undefined;
  castCounts?: { unit: number; traits: Record<string, number> };
}
export interface DamageContext {
  projectileId?: string;
  context?: ChainContext | undefined;
  attackId?: string;
  responsibleId?: string | null;
  origin?: 'periodic' | 'environment';
}
interface Host {
  input: CombatInput;
  state: () => CombatState;
  emit: Emit;
  apply: (
    source: CombatUnit,
    target: CombatUnit,
    effects: CombatEffect[],
    context: ChainContext,
    powerMilli?: number,
    origin?: 'active' | 'passive',
  ) => void;
  signal: (signal: MechanicSignal) => void;
  damage: (
    source: CombatUnit,
    target: CombatUnit,
    amount: number,
    type: 'physical' | 'magic' | 'true',
    meta: DamageContext,
  ) => void;
  attack: (source: CombatUnit, target: CombatUnit, context: ChainContext) => void;
  cancel: (unit: CombatUnit, reason: 'invalid-target') => void;
}
export interface RuleEntry {
  rule: PassiveRule;
  abilityId: string;
  runtime: Record<string, RuleRuntime>;
  progress?: TraitProgress;
}
/** Version-gated operations; all triggers are still executed by CombatEngine.flushPassives. */
export class CombatMechanics {
  private lethal = new Map<string, { attribution: KillAttribution; context: ChainContext }>();
  private confirmed = new Set<string>();
  private traitEntries = new Map<string, RuleEntry[]>();
  private traitCounters = new Map<string, TraitProgress[]>();
  private budgetTick = -1;
  private effects = 0;
  private signals = 0;
  private limited = new Set<string>();
  constructor(private host: Host) {
    const state = this.state;
    state.mechanics = {
      version: 1,
      combatId: host.input.combatId!,
      traits: [],
      attributions: [],
      actions: [],
      pendingRepeats: [],
    };
    for (const unit of state.units) {
      unit.mechanics = { version: 1, casts: 0, kills: 0, stacks: [], periodics: [] };
      unit.passiveState ??= {};
      for (const d of unit.profile.mechanics?.stacks ?? [])
        unit.mechanics.stacks.push({
          id: d.id,
          definitionId: d.id,
          sourceId: unit.id,
          ownerId: unit.id,
          targetId: unit.id,
          trigger: d.trigger.kind,
          count: 0,
          maxStacks: d.maxStacks,
          expiresTick: null,
          firedThresholds: [],
        });
    }
    for (const side of ['north', 'south'] as const) {
      const team = state.units.filter((u) => u.owner === side);
      const traits = analyzeTraits(
        team.map((u) => ({
          definitionId: u.definitionId,
          traits: u.profile.traits ?? [],
          deployed: true,
        })),
        host.input.traits ?? [],
      );
      for (const { trait, count, active } of traits) {
        if (!active || !trait.progress) continue;
        const recipients = team.filter(
          (u) => trait.recipients === 'team' || u.profile.traits?.includes(trait.id),
        );
        const make = (unitId: string | null): TraitProgress => ({
          traitId: trait.id,
          side,
          scope: trait.progress!.scope,
          unitId,
          casts: 0,
          kills: 0,
          runtime: {},
        });
        const shared = trait.progress.scope === 'team' ? make(null) : null;
        if (shared) state.mechanics.traits.push(shared);
        for (const unit of recipients) {
          const progress = shared ?? make(unit.id);
          if (!shared) state.mechanics.traits.push(progress);
          this.traitCounters.set(unit.id, [...(this.traitCounters.get(unit.id) ?? []), progress]);
          const entries = this.traitEntries.get(unit.id) ?? [];
          entries.push(
            ...trait.progress.rules
              .filter((r) => count >= r.memberThreshold)
              .map((rule) => ({ rule, abilityId: trait.id, runtime: progress.runtime, progress })),
          );
          this.traitEntries.set(unit.id, entries);
        }
      }
    }
  }
  private get state() {
    return this.host.state();
  }
  root(id?: string): ChainContext {
    return {
      causalId: id ?? `cause-${this.state.tick}-${this.state.effectCounter++}`,
      remaining: 8,
      depth: 0,
      additional: false,
      allowSourceProcs: true,
      grantMana: true,
      countAsCast: true,
      allowKillChain: true,
    };
  }
  limit(
    unit: CombatUnit | null,
    reason: 'tick_budget' | 'chain_budget' | 'pending_limit',
    context: ChainContext,
  ) {
    const key = `${this.state.tick}:${reason}:${context.causalId}`;
    if (this.limited.has(key)) return;
    this.limited.add(key);
    this.host.emit('mechanics_limit', {
      unitId: unit?.id ?? null,
      reason,
      causalId: context.causalId,
    });
  }
  budget(kind: 'effects' | 'signals', unit: CombatUnit, context: ChainContext): boolean {
    if (this.budgetTick !== this.state.tick) {
      this.budgetTick = this.state.tick;
      this.effects = 0;
      this.signals = 0;
      this.limited.clear();
    }
    const count = kind === 'effects' ? ++this.effects : ++this.signals;
    if (
      count <=
      (kind === 'effects' ? MECHANICS_LIMITS.effectsPerTick : MECHANICS_LIMITS.signalsPerTick)
    )
      return true;
    this.limit(unit, 'tick_budget', context);
    return false;
  }
  child(context: ChainContext, unit: CombatUnit, max = 8): ChainContext | null {
    if (context.remaining <= 0 || context.depth >= 8) {
      this.limit(unit, 'chain_budget', context);
      return null;
    }
    return {
      ...context,
      remaining: Math.min(context.remaining, max) - 1,
      depth: context.depth + 1,
    };
  }
  rules(unit: CombatUnit): RuleEntry[] {
    const main = unit.profile.championAbility;
    const entries: RuleEntry[] = (main?.passive?.rules ?? []).map((rule) => ({
      rule,
      abilityId: main!.id,
      runtime: unit.passiveState!,
    }));
    for (const [index, stack] of (unit.profile.mechanics?.stacks ?? []).entries())
      if (stack.automatic !== false)
        entries.push({
          abilityId: stack.id,
          runtime: unit.passiveState!,
          rule: {
            id: `@stack:${index}`,
            trigger: stack.trigger,
            conditions: stack.conditions,
            effects: [
              { kind: 'stack_gain', target: 'self', radius: 0, stackId: stack.id, amount: 1 },
            ],
            maxActivations: 450,
            cooldownTicks: 0,
          },
        });
    return [...entries, ...(this.traitEntries.get(unit.id) ?? [])];
  }
  count(unit: CombatUnit, kind: 'casts' | 'kills') {
    unit.mechanics![kind]++;
    const unique = new Set(
      this.host.input.rulesVersion === CHARACTER_RULES ||
      this.host.input.rulesVersion === COMPOSITE_RULES
        ? (this.traitCounters.get(unit.id) ?? [])
        : (this.traitEntries.get(unit.id) ?? []).map((e) => e.progress!),
    );
    for (const progress of unique) progress[kind]++;
    return {
      unit: unit.mechanics![kind],
      traits: Object.fromEntries([...unique].map((p) => [p.traitId, p[kind]])),
    };
  }
  private stackDefinition(unit: CombatUnit, id: string) {
    return unit.profile.mechanics?.stacks.find((d) => d.id === id);
  }
  private syncStack(unit: CombatUnit, definition: StackDefinition, stack: StackState) {
    const before = effectiveStat(unit, 'maxHp');
    const prefix = `stack:${unit.profile.mechanics!.stacks.findIndex((d) => d.id === definition.id)}:`;
    unit.statuses = unit.statuses.filter((s) => !s.key?.startsWith(prefix));
    if (stack.count)
      for (const [index, m] of definition.modifiers.entries())
        unit.statuses.push({
          id: `stack-${unit.id}-${definition.id}-${index}`.slice(0, 80),
          sourceId: stack.sourceId,
          key: `${prefix}${index}`,
          kind: 'modifier',
          stat: m.stat,
          mode: m.mode,
          origin: 'passive',
          amount: Math.max(-1000000, Math.min(1000000, m.amount * stack.count)),
          expiresTick: stack.expiresTick,
        });
    if (isAlive(unit))
      unit.hp = Math.max(
        1,
        Math.min(effectiveStat(unit, 'maxHp'), unit.hp + effectiveStat(unit, 'maxHp') - before),
      );
  }
  private consume(
    unit: CombatUnit,
    d: StackDefinition,
    stack: StackState,
    amount: number,
    reason: 'manual' | 'threshold' | 'duration' | 'death',
    context: ChainContext,
  ) {
    const consumed = Math.min(amount, stack.count);
    if (!consumed) return;
    stack.count -= consumed;
    if (!stack.count) stack.expiresTick = null;
    this.syncStack(unit, d, stack);
    this.host.emit('stack_consume', {
      unitId: unit.id,
      sourceId: stack.sourceId,
      stackId: d.id,
      amount: consumed,
      count: stack.count,
      reason,
      causalId: context.causalId,
    });
  }
  private gain(
    source: CombatUnit,
    target: CombatUnit,
    e: Extract<MechanicEffect, { kind: 'stack_gain' }>,
    context: ChainContext,
  ) {
    const d = this.stackDefinition(target, e.stackId),
      s = target.mechanics?.stacks.find((s) => s.definitionId === e.stackId);
    if (!d || !s) return;
    const before = s.count;
    s.count = Math.min(d.maxStacks, s.count + e.amount);
    // Ownership stays on the target; the latest granting source owns this lifetime.
    s.sourceId = source.id;
    if (d.durationTicks !== null && (d.refresh === 'on_gain' || s.expiresTick === null))
      s.expiresTick = this.state.tick + d.durationTicks;
    this.syncStack(target, d, s);
    this.host.emit('stack_gain', {
      unitId: target.id,
      sourceId: source.id,
      stackId: d.id,
      name: d.name,
      amount: s.count - before,
      count: s.count,
      maxStacks: d.maxStacks,
      expiresTick: s.expiresTick,
      causalId: context.causalId,
    });
    for (const threshold of [...d.thresholds].sort(
      (a, b) => a.count - b.count || compareIds(a.id, b.id),
    )) {
      if (
        before >= threshold.count ||
        s.count < threshold.count ||
        (!threshold.repeatable && s.firedThresholds.includes(threshold.id))
      )
        continue;
      const next = this.child(context, target);
      if (!next) break;
      if (!threshold.repeatable) s.firedThresholds.push(threshold.id);
      this.host.emit('stack_threshold', {
        unitId: target.id,
        sourceId: source.id,
        stackId: d.id,
        thresholdId: threshold.id,
        count: s.count,
        causalId: context.causalId,
      });
      if (threshold.consume) this.consume(target, d, s, threshold.consume, 'threshold', context);
      this.host.apply(target, target, threshold.effects, next, undefined, 'passive');
    }
  }
  private record(
    id: string,
    source: CombatUnit,
    target: CombatUnit,
    kind: 'repeat' | 'jump',
    context: ChainContext,
  ) {
    const records = this.state.mechanics!.actions;
    if (records.length >= 64) records.splice(0, records.length - 63);
    records.push({
      id,
      sourceId: source.id,
      targetId: target.id,
      trigger: context.trigger ?? (kind === 'repeat' ? 'ability_cast' : 'kill'),
      conditions: context.conditions ?? [],
      priority: 'after_impacts',
      kind,
      state: 'scheduled',
      context,
    });
  }
  private resolveRecord(id: string, state: 'resolved' | 'cancelled', targetId?: string) {
    const r = this.state.mechanics!.actions.find((r) => r.id === id);
    if (r) {
      r.state = state;
      if (targetId) r.targetId = targetId;
    }
  }
  apply(source: CombatUnit, target: CombatUnit, e: MechanicEffect, context: ChainContext) {
    switch (e.kind) {
      case 'stack_gain':
        this.gain(source, target, e, context);
        break;
      case 'stack_consume': {
        const d = this.stackDefinition(target, e.stackId),
          s = target.mechanics?.stacks.find((s) => s.definitionId === e.stackId);
        if (d && s && d.consumption === 'manual')
          this.consume(target, d, s, e.amount, 'manual', context);
        break;
      }
      case 'cooldown': {
        const entries = this.rules(target).filter(
          (r) => r.rule.id === e.ruleId && (!e.abilityId || r.abilityId === e.abilityId),
        );
        for (const entry of entries) {
          const r = entry.runtime[e.ruleId];
          if (r) r.lastTick = e.mode === 'reset' ? -450 : Math.max(-450, r.lastTick - e.ticks);
        }
        break;
      }
      case 'ability_empower': {
        const action = target.action;
        if (action?.kind !== 'cast' || !action.castId || context.additional) break;
        const previous = action.empower ?? { powerMilli: 1000, extraEffects: [] };
        action.empower = {
          powerMilli: Math.min(4000, Math.floor((previous.powerMilli * e.powerMilli) / 1000)),
          extraEffects: [...previous.extraEffects, ...e.extraEffects].slice(0, 8),
        };
        this.host.emit('ability_empowered', {
          unitId: target.id,
          castId: action.castId,
          powerMilli: action.empower.powerMilli,
          extraEffects: action.empower.extraEffects.length,
          causalId: context.causalId,
        });
        break;
      }
      case 'ability_repeat': {
        const action = target.action;
        if (context.additional || action?.kind !== 'cast' || !action.castId) break;
        const pending = this.state.mechanics!.pendingRepeats;
        if (pending.length >= 64) {
          this.limit(target, 'pending_limit', context);
          break;
        }
        const next = this.child(context, target, e.maxChain);
        if (!next) break;
        Object.assign(next, {
          additional: true,
          allowSourceProcs: e.allowSourceProcs,
          grantMana: e.grantMana,
          countAsCast: e.countAsCast,
        });
        const id = `repeat-${this.state.effectCounter++}`;
        const victim = this.state.units.find((u) => u.id === action.targetId) ?? target;
        pending.push({
          id,
          sourceId: target.id,
          targetId: action.targetId,
          executeTick: action.endTick + e.delayTicks,
          targetPolicy: e.targetPolicy,
          powerMilli: e.powerMilli,
          extraEffects: e.extraEffects,
          parentCastId: action.castId,
          context: next,
        });
        this.record(id, target, victim, 'repeat', next);
        this.host.emit('ability_repeat', {
          unitId: target.id,
          targetId: action.targetId,
          actionId: id,
          parentCastId: action.castId,
          stage: 'scheduled',
          causalId: context.causalId,
        });
        break;
      }
      case 'jump':
        this.jump(target, e, context);
        break;
      case 'periodic': {
        if (target.mechanics!.periodics.length >= 256) {
          this.limit(target, 'pending_limit', context);
          break;
        }
        const id = `periodic-${this.state.effectCounter++}`,
          amount = effectAmount(e, source, target),
          responsibleId = e.responsible === 'source' ? source.id : null;
        target.mechanics!.periodics.push({
          id,
          sourceId: source.id,
          responsibleId,
          amount,
          damageType: e.damageType,
          intervalTicks: e.intervalTicks,
          nextTick: this.state.tick + e.intervalTicks,
          expiresTick: this.state.tick + e.duration,
          context,
        });
        this.host.emit('periodic_apply', {
          unitId: target.id,
          sourceId: source.id,
          statusId: id,
          expiresTick: this.state.tick + e.duration,
          amount,
          responsibleId,
          causalId: context.causalId,
        });
        break;
      }
    }
  }
  confirm(source: CombatUnit, target: CombatUnit, event: CombatEventV3, meta: DamageContext) {
    if (!meta.attackId || this.confirmed.has(meta.attackId)) return;
    this.confirmed.add(meta.attackId);
    const context = meta.context ?? this.root(meta.attackId);
    this.host.emit('attack_confirmed', {
      unitId: source.id,
      targetId: target.id,
      attackId: meta.attackId,
      damageEvent: { tick: event.tick, order: event.order },
      causalId: context.causalId,
    });
    if (context.allowSourceProcs)
      this.host.signal({ unit: source, target, trigger: 'attack_hit', context });
  }
  lethalDamage(
    source: CombatUnit,
    target: CombatUnit,
    event: Extract<CombatEventV3, { type: 'damage' }>,
    meta: DamageContext,
  ) {
    if (
      this.lethal.has(target.id) ||
      this.state.mechanics!.attributions.some((a) => a.victimId === target.id)
    )
      return;
    const context = meta.context ?? this.root();
    const responsibleId = meta.responsibleId === undefined ? source.id : meta.responsibleId;
    this.lethal.set(target.id, {
      context,
      attribution: {
        combatId: this.host.input.combatId!,
        victimId: target.id,
        killerId: responsibleId,
        sourceId: meta.origin === 'environment' ? null : source.id,
        damageType: event.payload.damageType,
        cause: meta.origin ?? event.payload.cause,
        damageEvent: { tick: event.tick, order: event.order },
        causalId: context.causalId,
      },
    });
  }
  settleDeaths(dead: CombatUnit[]) {
    for (const unit of dead) {
      const lethal = this.lethal.get(unit.id);
      if (!lethal) continue;
      this.lethal.delete(unit.id);
      this.state.mechanics!.attributions.push(lethal.attribution);
      this.host.emit('kill_attributed', lethal.attribution);
      const killer = this.state.units.find((u) => u.id === lethal.attribution.killerId);
      if (killer) {
        this.count(killer, 'kills');
        if (isAlive(killer) && lethal.context.allowSourceProcs && lethal.context.allowKillChain)
          this.host.signal({
            unit: killer,
            target: unit,
            trigger: 'kill',
            context: lethal.context,
          });
      }
    }
    for (const unit of this.state.units)
      for (const s of unit.mechanics!.stacks) {
        if (!s.count || !dead.some((d) => d.id === unit.id || d.id === s.sourceId)) continue;
        const d = this.stackDefinition(unit, s.definitionId)!;
        this.consume(unit, d, s, s.count, 'death', this.root());
      }
  }
  expireStacks() {
    for (const unit of this.state.units.filter(isAlive))
      for (const s of unit.mechanics!.stacks)
        if (s.expiresTick !== null && s.expiresTick <= this.state.tick) {
          const d = this.stackDefinition(unit, s.definitionId)!;
          this.consume(unit, d, s, s.count, 'duration', this.root());
          this.host.signal({ unit, trigger: 'effect_expired', key: d.id });
        }
  }
  periodics() {
    for (const target of this.state.units.filter(isAlive)) {
      for (const p of target.mechanics!.periodics) {
        if (p.expiresTick <= this.state.tick || p.nextTick > this.state.tick) continue;
        p.nextTick += p.intervalTicks;
        const source = this.state.units.find((u) => u.id === p.sourceId)!;
        if (source)
          this.host.damage(source, target, p.amount, p.damageType, {
            context: p.context,
            responsibleId: p.responsibleId,
            origin: p.responsibleId === null ? 'environment' : 'periodic',
          });
      }
      for (const p of target.mechanics!.periodics.filter((p) => p.expiresTick <= this.state.tick))
        this.host.signal({ unit: target, trigger: 'effect_expired', key: p.id });
      target.mechanics!.periodics = target.mechanics!.periodics.filter(
        (p) => p.expiresTick > this.state.tick,
      );
    }
  }
  repeats() {
    const pending = this.state.mechanics!.pendingRepeats;
    const due = pending.filter((p) => p.executeTick <= this.state.tick);
    this.state.mechanics!.pendingRepeats = pending.filter((p) => p.executeTick > this.state.tick);
    for (const p of due) {
      const unit = this.state.units.find((u) => u.id === p.sourceId)!;
      const ability = activeAbility(unit.profile);
      const valid = (u: CombatUnit) =>
        isAlive(u) &&
        (ability?.targeting === 'self'
          ? u.id === unit.id
          : u.owner !== unit.owner &&
            hexDistance(u.position, unit.position) <=
              (ability?.targeting === 'adjacent_enemies' ? 1 : unit.profile.stats.range));
      let target =
        p.targetPolicy === 'nearest'
          ? undefined
          : this.state.units.find((u) => u.id === p.targetId && valid(u));
      if (!target && p.targetPolicy !== 'same_only')
        target = ability?.targeting === 'self' ? unit : this.enemies(unit).filter(valid)[0];
      if (!isAlive(unit) || isStunned(unit) || !ability || !target || !isAlive(target)) {
        this.resolveRecord(p.id, 'cancelled');
        this.host.emit('ability_repeat', {
          unitId: unit.id,
          targetId: p.targetId,
          actionId: p.id,
          parentCastId: p.parentCastId,
          stage: 'cancel',
          causalId: p.context.causalId,
        });
        continue;
      }
      this.resolveRecord(p.id, 'resolved', target.id);
      const castCounts = p.context.countAsCast ? this.count(unit, 'casts') : undefined;
      this.host.emit('ability_repeat', {
        unitId: unit.id,
        targetId: target.id,
        actionId: p.id,
        parentCastId: p.parentCastId,
        stage: 'resolve',
        causalId: p.context.causalId,
      });
      const payload = {
        unitId: unit.id,
        targetId: target.id,
        abilityId: ability.id,
        endTick: this.state.tick,
        manaAfter: unit.mana,
        center: ability.targeting === 'current_enemy' ? target.position : unit.position,
        castId: p.id,
        additional: true,
        parentCastId: p.parentCastId,
      };
      this.host.emit('ability_cast', { ...payload, stage: 'start' });
      if (p.context.allowSourceProcs)
        this.host.signal({
          unit,
          target,
          trigger: 'ability_cast',
          context: p.context,
          ...(castCounts ? { castCounts } : {}),
        });
      this.host.emit('ability_cast', { ...payload, stage: 'resolve' });
      this.host.apply(
        unit,
        target,
        [...ability.effects, ...p.extraEffects],
        p.context,
        p.powerMilli,
      );
    }
  }
  private enemies(unit: CombatUnit) {
    return this.state.units
      .filter((u) => isAlive(u) && u.owner !== unit.owner)
      .sort(
        (a, b) =>
          hexDistance(unit.position, a.position) - hexDistance(unit.position, b.position) ||
          compareIds(a.id, b.id),
      );
  }
  private jump(
    unit: CombatUnit,
    e: Extract<MechanicEffect, { kind: 'jump' }>,
    context: ChainContext,
  ) {
    const next = this.child(context, unit, e.maxChain);
    if (!next) return;
    Object.assign(next, {
      allowSourceProcs: e.allowSourceProcs,
      grantMana: e.grantMana,
      allowKillChain: e.allowKillChain,
    });
    const blocked = blockedCells(this.state.units, this.host.input.obstacles, unit.id);
    for (const target of this.enemies(unit)) {
      const to = boardNeighbors(target.position)
        .filter((h) => !blocked.has(hexKey(h)) && !sameHex(h, unit.position))
        .sort(
          (a, b) =>
            hexDistance(unit.position, a) - hexDistance(unit.position, b) || a.r - b.r || a.q - b.q,
        )[0];
      if (!to) continue;
      this.host.cancel(unit, 'invalid-target');
      const id = `jump-${this.state.effectCounter++}`,
        endTick = this.state.tick + e.duration;
      unit.targetId = target.id;
      unit.action = {
        kind: 'jump',
        id,
        startTick: this.state.tick,
        endTick,
        from: { ...unit.position },
        to: { ...to },
        targetId: target.id,
        immediateAttack: e.immediateAttack,
        retarget: e.retarget,
        context: next,
      };
      this.record(id, unit, target, 'jump', next);
      this.host.emit('jump_start', {
        unitId: unit.id,
        targetId: target.id,
        actionId: id,
        from: unit.position,
        to,
        endTick,
        causalId: next.causalId,
      });
      return;
    }
  }
  cancelAction(unit: CombatUnit) {
    const action = unit.action;
    if (action?.kind === 'cast' && action.castId) {
      const pending = this.state.mechanics!.pendingRepeats;
      for (const p of pending.filter((p) => p.parentCastId === action.castId)) {
        this.resolveRecord(p.id, 'cancelled');
        this.host.emit('ability_repeat', {
          unitId: unit.id,
          targetId: p.targetId,
          actionId: p.id,
          parentCastId: p.parentCastId,
          stage: 'cancel',
          causalId: p.context.causalId,
        });
      }
      this.state.mechanics!.pendingRepeats = pending.filter(
        (p) => p.parentCastId !== action.castId,
      );
    }
    const a = unit.action;
    if (a?.kind !== 'jump') return;
    this.resolveRecord(a.id, 'cancelled');
    this.host.emit('jump_end', {
      unitId: unit.id,
      targetId: a.targetId,
      actionId: a.id,
      position: unit.position,
      outcome: 'cancelled',
      causalId: a.context.causalId,
    });
  }
  arrivals() {
    for (const unit of this.state.units.filter(isAlive)) {
      const a = unit.action;
      if (a?.kind !== 'jump' || a.endTick > this.state.tick) continue;
      let target = this.state.units.find(
        (u) => u.id === a.targetId && isAlive(u) && hexDistance(u.position, a.to) <= 1,
      );
      if (!target && a.retarget === 'adjacent')
        target = this.enemies(unit).filter((u) => hexDistance(u.position, a.to) <= 1)[0];
      const blocked = blockedCells(this.state.units, this.host.input.obstacles, unit.id);
      if (isStunned(unit) || !target || blocked.has(hexKey(a.to))) {
        this.host.cancel(unit, 'invalid-target');
        continue;
      }
      unit.position = { ...a.to };
      unit.action = null;
      unit.targetId = target.id;
      this.resolveRecord(a.id, 'resolved', target.id);
      this.host.emit('jump_end', {
        unitId: unit.id,
        targetId: target.id,
        actionId: a.id,
        position: unit.position,
        outcome: 'landed',
        causalId: a.context.causalId,
      });
      if (a.immediateAttack) this.host.attack(unit, target, a.context);
    }
  }
  finish() {
    for (const p of this.state.mechanics!.pendingRepeats) {
      this.resolveRecord(p.id, 'cancelled');
      this.host.emit('ability_repeat', {
        unitId: p.sourceId,
        targetId: p.targetId,
        actionId: p.id,
        parentCastId: p.parentCastId,
        stage: 'cancel',
        causalId: p.context.causalId,
      });
    }
    this.state.mechanics!.pendingRepeats = [];
  }
}
