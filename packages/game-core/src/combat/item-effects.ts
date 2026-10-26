import {
  EXECUTABLE_ITEM_CATALOG as catalog,
  ITEM_EXECUTION_POLICY as policy,
} from '@tft/game-data';
import type {
  CombatUnit,
  CombatState,
  CombatInput,
  CombatEffect,
  CombatStatus,
  DamageType,
  ItemSource,
  ItemRuntimeEntry,
  PlannedItemEffect,
  ItemBonus,
} from '@tft/shared';
import type { Emit } from './mechanics';
import { hexDistance } from '../hex';
import { compareIds, effectiveStat, isAlive, randomUint32 } from './math';
import { activeAbility } from './abilities';
type Entry = ItemRuntimeEntry;
interface Host {
  state: () => CombatState;
  parentEvent: () => { tick: number; order: number } | null;
  input: CombatInput;
  emit: Emit;
  effect: (s: CombatUnit, t: CombatUnit, e: CombatEffect, source: ItemSource) => void;
  damage: (s: CombatUnit, t: CombatUnit, n: number, type: DamageType, source: ItemSource) => void;
  mana: (u: CombatUnit, n: number) => void;
  cancel: (u: CombatUnit) => void;
}
const hash = (text: string) => {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
/** Item operations use the existing damage/effect host. No independent simulation or rendering. */
export class ItemEffectExecutor {
  private signal = 'combat_start';
  private withSignal<T>(signal: string, fn: () => T): T {
    const prior = this.signal;
    this.signal = signal;
    try {
      return fn();
    } finally {
      this.signal = prior;
    }
  }
  attack(...args: Parameters<ItemEffectExecutor['attackInternal']>) {
    return this.withSignal('attack_release', () => this.attackInternal(...args));
  }
  cast(...args: Parameters<ItemEffectExecutor['castInternal']>) {
    return this.withSignal('ability_cast', () => this.castInternal(...args));
  }
  afterDamage(...args: Parameters<ItemEffectExecutor['afterDamageInternal']>) {
    return this.withSignal('damage', () => this.afterDamageInternal(...args));
  }
  tick(...args: Parameters<ItemEffectExecutor['tickInternal']>) {
    return this.withSignal('periodic', () => this.tickInternal(...args));
  }
  expired(...args: Parameters<ItemEffectExecutor['expiredInternal']>) {
    return this.withSignal('shield_expire', () => this.expiredInternal(...args));
  }
  refreshAuras(...args: Parameters<ItemEffectExecutor['refreshAurasInternal']>) {
    return this.withSignal('targeting_change', () => this.refreshAurasInternal(...args));
  }
  private budgetTick = -1;
  private derived = 0;
  constructor(private host: Host) {
    const state = this.state;
    state.items = { version: 1, entries: [], sequence: 0, contributors: {}, settled: [] };
    for (const u of state.units) {
      const loadout = u.profile.itemLoadout?.instances ?? [];
      if (new Set(loadout.map((i) => i.instanceId)).size !== loadout.length)
        throw Error('Duplicate equipped instance');
      let slots = 0;
      const seen = new Set<string>();
      for (const item of loadout) {
        const d = catalog.definitions.find((d) => d.id === item.definitionId);
        if (!d) throw Error('Unknown equipped item');
        slots += d.content?.slotCost ?? 1;
        if (d.kind === 'completed' && d.stacking === 'unique' && seen.has(d.id))
          throw Error('Duplicate unique item');
        seen.add(d.id);
      }
      if (slots > 3) throw Error('Equipment slot overflow');
    }
    for (const u of state.units)
      for (const item of u.profile.itemLoadout?.instances ?? []) {
        const d = catalog.definitions.find((d) => d.id === item.definitionId);
        if (!d || d.availability !== 'available') throw Error('Unexecutable item');
        this.entries.push({
          unitId: u.id,
          ...item,
          counts: {},
          last: {},
          chosen: [],
          front: u.owner === 'south' ? u.position.r <= 5 : u.position.r >= 2,
        });
      }
  }
  private get state() {
    return this.host.state();
  }
  private get entries() {
    return this.state.items!.entries;
  }
  private unit(r: Entry) {
    return this.state.units.find((u) => u.id === r.unitId)!;
  }
  private effects(r: Entry): PlannedItemEffect[] {
    const d = catalog.definitions.find((d) => d.id === r.definitionId)!;
    return d.kind === 'completed'
      ? d.effects.filter((e): e is PlannedItemEffect => e.implementation === 'executable-v1')
      : [];
  }
  private source(
    r: Entry,
    e: PlannedItemEffect,
    kind: ItemSource['damageClass'] = 'root',
  ): ItemSource {
    return {
      unitId: r.unitId,
      instanceId: r.instanceId,
      definitionId: r.definitionId,
      effectId: e.id,
      causalId: `item-${this.state.tick}-${this.state.items!.sequence++}`,
      trigger: this.signal,
      parentEvent: ['periodic', 'targeting_change'].includes(this.signal)
        ? null
        : this.host.parentEvent(),
      tick: this.state.tick,
      damageClass: kind,
    };
  }
  private event(_r: Entry, e: PlannedItemEffect, t: CombatUnit, source: ItemSource) {
    if (this.budgetTick !== this.state.tick) {
      this.budgetTick = this.state.tick;
      this.derived = 0;
    }
    if (++this.derived > policy.maximumDerivedPerTick)
      throw Error('Item effect causal budget exceeded');
    this.host.emit('item_effect', { source, operation: e.operation.kind, targetId: t.id });
  }
  private nearby(u: CombatUnit, allies: boolean, radius = 14) {
    return this.state.units
      .filter(
        (t) =>
          isAlive(t) &&
          !t.statuses.some((s) => !allies && s.group === 'item-untargetable') &&
          (allies ? t.owner === u.owner : t.owner !== u.owner) &&
          hexDistance(u.position, t.position) <= radius,
      )
      .sort(
        (a, b) =>
          hexDistance(u.position, a.position) - hexDistance(u.position, b.position) ||
          compareIds(a.id, b.id),
      );
  }
  private modifier(
    u: CombatUnit,
    r: Entry,
    e: PlannedItemEffect,
    stat: Exclude<ItemBonus['stat'], 'startingMana'>,
    amount: number,
    mode: 'flat' | 'percent_milli' = 'flat',
    duration: number | null = null,
    suffix: string = stat,
  ) {
    this.host.effect(
      this.unit(r),
      u,
      {
        kind: 'modifier',
        target: 'target',
        radius: 0,
        stat,
        amount,
        mode,
        duration,
        key: `i:${this.entries.indexOf(r)}:${e.id}:${suffix}`,
        stacking: 'refresh',
      },
      this.source(r, e),
    );
  }
  private marker(
    u: CombatUnit,
    r: Entry,
    e: PlannedItemEffect,
    group: NonNullable<CombatStatus['group']>,
    amount: number,
    duration: number | null,
    suffix = group,
  ) {
    const key = `i:${this.entries.indexOf(r)}:${e.id}:${suffix}`;
    const old = u.statuses.find((s) => s.key === key);
    const until = duration === null ? null : this.state.tick + duration;
    if (old && old.amount === amount && old.expiresTick === until) return;
    if (old) {
      u.statuses = u.statuses.filter((s) => s !== old);
      this.host.emit('status_expire', { unitId: u.id, statusId: old.id, reason: 'consumed' });
    }
    const status: CombatStatus = {
      id: `effect-${this.state.effectCounter++}`,
      sourceId: r.unitId,
      itemSource: this.source(r, e),
      kind: 'modifier',
      stat: null,
      amount,
      expiresTick: until,
      key,
      group,
      origin: 'item',
    };
    u.statuses.push(status);
    this.host.emit('status_apply', { unitId: u.id, status });
  }
  private heal(u: CombatUnit, target: CombatUnit, n: number, r: Entry, e: PlannedItemEffect) {
    if (isAlive(target))
      this.host.effect(
        u,
        target,
        { kind: 'heal', target: 'target', radius: 0, amount: Math.max(0, Math.floor(n)) },
        this.source(r, e),
      );
  }
  private hurt(
    u: CombatUnit,
    t: CombatUnit,
    n: number,
    type: DamageType,
    r: Entry,
    e: PlannedItemEffect,
    kind: 'secondary' | 'periodic' = 'secondary',
  ) {
    if (!isAlive(t)) return;
    const source = this.source(r, e, kind);
    this.event(r, e, t, source);
    this.host.damage(u, t, Math.min(1000000, Math.max(0, Math.floor(n))), type, source);
  }
  start() {
    // Selection is round/instance seeded and does not consume the combat or shop random stream.
    for (const r of [...this.entries]) {
      const u = this.unit(r);
      let rng = hash(
        `${u.profile.itemLoadout!.seed}/${r.instanceId}/${u.profile.itemLoadout!.round}`,
      );
      for (const e of this.effects(r))
        if (e.operation.kind === 'random_items') {
          let pool = catalog.definitions
            .filter(
              (d) =>
                d.kind === 'completed' &&
                d.availability === 'available' &&
                !d.effects.some(
                  (e) =>
                    e.implementation === 'executable-v1' && e.operation.kind === 'random_items',
                ),
            )
            .sort((a, b) => compareIds(a.id, b.id));
          for (let i = 0; i < e.operation.count; i++) {
            const roll = randomUint32(rng);
            rng = roll.state;
            const d = pool[roll.value % pool.length]!;
            pool = pool.filter((p) => p.id !== d.id);
            r.chosen.push(d.id);
            const child: Entry = {
              ...r,
              instanceId: `${r.instanceId}/r${i}`,
              definitionId: d.id,
              counts: {},
              last: {},
              chosen: [],
            };
            this.entries.push(child);
            for (const b of d.bonuses) this.bonus(u, b, child, e);
            this.event(r, e, u, this.source(r, e));
          }
        }
    }
    for (const r of this.entries) {
      const u = this.unit(r);
      for (const e of this.effects(r)) {
        if (e.operation.kind === 'random_items') continue;
        if (e.trigger === 'round_start' || e.trigger === 'combat_start') this.execute(r, e, u);
      }
    }
    this.refreshAuras();
    for (const u of this.state.units) u.hp = effectiveStat(u, 'maxHp');
  }
  private bonus(u: CombatUnit, b: ItemBonus, r: Entry, e: PlannedItemEffect) {
    if (b.stat === 'startingMana') {
      u.profile.stats.startingMana = Math.min(
        u.profile.stats.maxMana,
        u.profile.stats.startingMana + b.amount,
      );
      u.mana = u.profile.stats.startingMana;
      if (u.profile.championAbility?.active) u.profile.championAbility.active.initialMana = u.mana;
    } else this.modifier(u, r, e, b.stat, b.amount, b.mode, null, `bonus-${b.stat}-${b.mode}`);
  }
  private execute(r: Entry, e: PlannedItemEffect, target: CombatUnit) {
    const u = this.unit(r),
      o = e.operation;
    if (!isAlive(u)) return;
    if (
      e.condition?.duringFirstTicks !== undefined &&
      (policy.includeFinalInterval
        ? this.state.tick > e.condition.duringFirstTicks
        : this.state.tick >= e.condition.duringFirstTicks)
    )
      return;
    if (e.condition?.afterEffectId && !r.counts[e.condition.afterEffectId]) return;
    if (e.cooldownTicks && this.state.tick - (r.last[e.id] ?? -10000) < e.cooldownTicks) return;
    const once =
      e.stacking === 'unique' ||
      ('oncePerCombat' in o && o.oncePerCombat) ||
      e.condition?.oncePerCombat;
    if (once && r.counts[e.id]) return;
    if (o.kind === 'chain_magic') {
      r.counts[e.id] = (r.counts[e.id] ?? 0) + 1;
      if (r.counts[e.id]! % o.everyAttacks !== 0) return;
      r.counts[e.id]!--;
    }
    r.counts[e.id] = (r.counts[e.id] ?? 0) + 1;
    r.last[e.id] = this.state.tick;
    const source = this.source(r, e);
    this.event(r, e, target, source);
    switch (o.kind) {
      case 'damage_amp':
        if (e.trigger !== 'damage_dealt')
          this.marker(u, r, e, 'item-amp', o.ratioMilli, e.durationTicks);
        break;
      case 'ability_critical': {
        const prior = this.entries
          .filter((x) => x.unitId === u.id)
          .flatMap((x) =>
            this.effects(x).filter(
              (f) =>
                f.operation.kind === 'ability_critical' && (x !== r || f !== e) && !!x.counts[f.id],
            ),
          );
        const original = activeAbility(u.profile)?.effects.some(
          (f) => f.kind === 'damage' && f.canCrit,
        );
        if (original || prior.length)
          this.modifier(u, r, e, 'critMultiplierMilli', o.alreadyCriticalBonusMilli);
        break;
      }
      case 'shield':
        this.host.effect(
          u,
          u,
          {
            kind: 'shield',
            target: 'self',
            radius: 0,
            amount: Math.floor((effectiveStat(u, 'maxHp') * o.maxHpRatioMilli) / 1000),
            duration: e.durationTicks ?? 450,
            key: `i:${this.entries.indexOf(r)}:${e.id}`,
            stacking: 'refresh',
          },
          source,
        );
        break;
      case 'resists':
        this.modifier(u, r, e, 'armor', o.armor, 'flat', e.durationTicks);
        this.modifier(u, r, e, 'magicResist', o.magicResist, 'flat', e.durationTicks);
        break;
      case 'heal':
        for (const t of e.target === 'allies_in_radius' ? this.nearby(u, true, o.radius ?? 1) : [u])
          this.heal(
            u,
            t,
            Math.min(
              o.cap ?? 1000000,
              ((effectiveStat(t, 'maxHp') - (o.basis === 'missing_hp' ? t.hp : 0)) * o.ratioMilli) /
                1000,
            ),
            r,
            e,
          );
        break;
      case 'damage_reduction':
        if (e.target === 'allies_in_radius')
          for (const t of this.nearby(u, true, 1))
            this.marker(t, r, e, 'item-reduction', o.ratioMilli, e.durationTicks);
        break;
      case 'attack_speed_stacks': {
        const count = Math.min(o.stackCap ?? 10000, r.counts[e.id]!);
        r.counts[e.id] = count;
        this.modifier(u, r, e, 'attackSpeedMilli', count * o.perStackMilli, 'percent_milli', null);
        break;
      }
      case 'resistance_reduction':
        if (e.trigger !== 'aura')
          this.marker(
            target,
            r,
            e,
            o.stat === 'armor' ? 'armor-reduction' : 'magic-reduction',
            o.ratioMilli,
            e.durationTicks,
          );
        break;
      case 'cast_punishment':
        if (hexDistance(u.position, target.position) <= o.radius)
          this.hurt(
            u,
            target,
            (target.profile.stats.maxMana * o.targetMaxManaRatioMilli) / 1000,
            'magic',
            r,
            e,
          );
        break;
      case 'health_ad_surge':
        this.modifier(u, r, e, 'maxHp', o.maxHpRatioMilli, 'percent_milli');
        this.modifier(u, r, e, 'attack', o.adRatioMilli, 'percent_milli');
        break;
      case 'targeting_resists':
        this.refreshTargeting(r, e);
        break;
      case 'retaliation':
        for (const t of this.nearby(u, false, o.radius)) this.hurt(u, t, o.damage, 'magic', r, e);
        break;
      case 'burn_wound': {
        const t = e.target === 'nearby_enemy' ? this.nearby(u, false, o.radius ?? 14)[0] : target;
        if (!t || !isAlive(t)) break;
        const old = t.statuses.find((s) => s.group === 'item-burn');
        if (!old) {
          this.marker(t, r, e, 'item-burn', o.burnPerSecondMilli, e.durationTicks);
          t.statuses.find((s) => s.group === 'item-burn')!.nextTick =
            this.state.tick + o.tickIntervalTicks;
        } else {
          old.amount = Math.max(old.amount, o.burnPerSecondMilli);
          old.expiresTick = Math.max(
            old.expiresTick ?? 0,
            this.state.tick + (e.durationTicks ?? 0),
          );
          this.host.emit('status_apply', { unitId: t.id, status: old });
        }
        this.marker(t, r, e, 'item-wound', o.woundMilli, e.durationTicks);
        break;
      }
      case 'round_random_bonus': {
        const roll = randomUint32(
          hash(
            `${u.profile.itemLoadout!.seed}/${r.instanceId}/${u.profile.itemLoadout!.round}/power`,
          ),
        );
        const power = roll.value % policy.randomWeightTotal < policy.randomPowerWeight;
        r.chosen.push(power ? 'power' : 'omnivamp');
        if (power) {
          this.modifier(u, r, e, 'attack', o.adMilli, 'percent_milli');
          this.modifier(u, r, e, 'abilityPower', o.ap);
        }
        break;
      }
      case 'untargetable_cleanse': {
        for (const s of [...u.statuses])
          if (
            s.kind === 'stun' ||
            (s.kind === 'modifier' && s.amount < 0) ||
            ['armor-reduction', 'magic-reduction', 'item-wound', 'item-burn'].includes(
              s.group ?? '',
            )
          ) {
            u.statuses = u.statuses.filter((x) => x !== s);
            this.host.emit('status_expire', { unitId: u.id, statusId: s.id, reason: 'consumed' });
          }
        this.marker(u, r, e, 'item-untargetable', 1, o.untargetableTicks);
        this.host.cancel(u);
        break;
      }
      case 'attack_speed':
        this.modifier(u, r, e, 'attackSpeedMilli', o.ratioMilli, 'percent_milli', e.durationTicks);
        break;
      case 'dual_power_stacks': {
        const n = Math.min(o.stackCap, r.counts[e.id]!);
        r.counts[e.id] = n;
        this.modifier(u, r, e, 'attack', n * o.adPerStackMilli, 'percent_milli');
        this.modifier(u, r, e, 'abilityPower', n * o.apPerStack);
        if (n === o.stackCap) {
          this.modifier(u, r, e, 'armor', o.armorAtCap);
          this.modifier(u, r, e, 'magicResist', o.magicResistAtCap);
        }
        break;
      }
      case 'secondary_bolt': {
        for (const t of this.nearby(u, false)
          .filter((t) => t.id !== target.id)
          .slice(0, o.additionalTargets)) {
          const projectile = {
            id: `projectile-${this.state.effectCounter++}`,
            sourceId: u.id,
            targetId: t.id,
            launchTick: this.state.tick,
            impactTick:
              this.state.tick +
              Math.max(2, Math.ceil((hexDistance(u.position, t.position) * 2) / 3)),
            from: { ...u.position },
            to: { ...t.position },
            rawDamage: Math.floor((effectiveStat(u, 'attack') * o.adRatioMilli) / 1000),
            damageType: o.damageType,
            cause: 'ability' as const,
            itemSource: { ...source, damageClass: 'secondary' as const },
          };
          this.state.projectiles.push(projectile);
          this.host.emit('projectile_launch', projectile);
        }
        break;
      }
      case 'ability_power':
        this.modifier(
          u,
          r,
          e,
          'abilityPower',
          o.amount * (e.stacking === 'add' ? r.counts[e.id]! : 1),
        );
        break;
      case 'attack_mana':
        this.host.mana(u, o.amount);
        break;
      case 'positional_bonuses':
        if (r.front) {
          this.modifier(u, r, e, 'armor', o.frontArmor);
          this.modifier(u, r, e, 'magicResist', o.frontMagicResist);
        } else this.modifier(u, r, e, 'abilityPower', o.backAp);
        break;
      case 'max_mana_reduction': {
        if (!activeAbility(u.profile)) break;
        const max = Math.max(policy.minimumActiveMana, u.profile.stats.maxMana - o.amount);
        u.profile.stats.maxMana = max;
        u.mana = Math.min(u.mana, max);
        u.profile.stats.startingMana = Math.min(u.profile.stats.startingMana, max);
        if (u.profile.championAbility?.active) {
          u.profile.championAbility.active.manaCost = max;
          u.profile.championAbility.active.initialMana = u.profile.stats.startingMana;
        }
        if (u.profile.ability) u.profile.ability.manaCost = max;
        break;
      }
      case 'crowd_control_immunity':
        this.marker(u, r, e, 'item-cc', 1, e.durationTicks);
        break;
      case 'chain_magic':
        if (r.counts[e.id]! % o.everyAttacks === 0)
          for (const t of this.nearby(u, false).slice(0, o.targets)) {
            this.hurt(u, t, o.damage, 'magic', r, e);
            this.marker(t, r, e, 'magic-reduction', o.shredMilli, e.durationTicks);
          }
        break;
      case 'omnivamp':
      case 'random_items':
        break;
      default: {
        const unsupported: never = o;
        throw Error(`Unsupported item operation ${String(unsupported)}`);
      }
    }
  }
  private refreshTargeting(r: Entry, e: PlannedItemEffect) {
    const o = e.operation;
    if (o.kind !== 'targeting_resists') return;
    const u = this.unit(r);
    const n = this.nearby(u, false).filter((t) => t.targetId === u.id).length;
    if (r.last['target-count'] === n) return;
    r.last['target-count'] = n;
    this.modifier(u, r, e, 'armor', n * o.armorPerEnemy);
    this.modifier(u, r, e, 'magicResist', n * o.magicResistPerEnemy);
  }
  private refreshAurasInternal() {
    for (const r of this.entries) {
      const u = this.unit(r);
      for (const e of this.effects(r)) {
        const o = e.operation;
        if (o.kind === 'targeting_resists' && isAlive(u)) this.refreshTargeting(r, e);
        if (e.trigger !== 'aura' || o.kind !== 'resistance_reduction') continue;
        const recipients = new Set(
          isAlive(u) ? this.nearby(u, false, o.radius ?? 0).map((t) => t.id) : [],
        );
        for (const t of this.state.units) {
          const key = `i:${this.entries.indexOf(r)}:${e.id}:${o.stat === 'armor' ? 'armor-reduction' : 'magic-reduction'}`;
          if (recipients.has(t.id))
            this.marker(
              t,
              r,
              e,
              o.stat === 'armor' ? 'armor-reduction' : 'magic-reduction',
              o.ratioMilli,
              null,
            );
          else
            for (const s of t.statuses.filter((s) => s.key === key)) {
              t.statuses = t.statuses.filter((x) => x !== s);
              this.host.emit('status_expire', { unitId: t.id, statusId: s.id, reason: 'consumed' });
            }
        }
      }
    }
  }
  private tickInternal() {
    this.refreshAuras();
    for (const u of this.state.units.filter(isAlive))
      for (const s of [...u.statuses])
        if (s.group === 'item-burn' && s.nextTick !== undefined && s.nextTick <= this.state.tick) {
          s.nextTick += 10;
          const r = this.entries.find(
            (r) => r.instanceId === s.itemSource?.instanceId && r.unitId === s.sourceId,
          );
          const e = r && this.effects(r).find((e) => e.id === s.itemSource!.effectId);
          if (r && e)
            this.hurt(
              this.unit(r),
              u,
              (effectiveStat(u, 'maxHp') * s.amount) / 1000,
              'true',
              r,
              e,
              'periodic',
            );
        }
    for (const r of this.entries) {
      const u = this.unit(r);
      if (!isAlive(u)) continue;
      for (const e of this.effects(r)) {
        if (e.trigger === 'periodic' && e.intervalTicks && this.state.tick % e.intervalTicks === 0)
          this.execute(r, e, u);
        const o = e.operation;
        if (
          o.kind === 'positional_bonuses' &&
          !r.front &&
          this.state.tick % o.backIntervalTicks === 0
        )
          this.host.mana(u, o.backMana);
      }
    }
  }
  private attackInternal(u: CombatUnit, target: CombatUnit) {
    this.host.emit('item_signal', { unitId: u.id, targetId: target.id, signal: 'attack_release' });
    for (const r of this.entries.filter((r) => r.unitId === u.id))
      for (const e of this.effects(r))
        if (e.trigger === 'attack_release' || e.trigger === 'attack_or_damage_taken')
          this.execute(r, e, target);
  }
  private castInternal(u: CombatUnit, target: CombatUnit) {
    for (const r of this.entries) {
      const holder = this.unit(r);
      for (const e of this.effects(r)) {
        if (holder.id === u.id && e.trigger === 'ability_cast') this.execute(r, e, target);
        else if (holder.owner !== u.owner && e.trigger === 'enemy_cast') this.execute(r, e, u);
      }
    }
  }
  private afterDamageInternal(
    source: CombatUnit,
    target: CombatUnit,
    damage: number,
    absorbed: number,
    type: DamageType,
    cause: 'attack' | 'ability',
    derived = false,
  ) {
    if (damage > 0) {
      const ids = (this.state.items!.contributors[target.id] ??= []);
      if (!ids.includes(source.id)) ids.push(source.id);
    }
    const takedown = target.hp === 0 && !this.state.items!.settled.includes(target.id);
    if (takedown) this.state.items!.settled.push(target.id);
    // Defensive reactions resolve before any source healing, independently of unit ordering.
    for (const r of this.entries.filter((r) => r.unitId === target.id)) {
      const u = this.unit(r);
      for (const e of this.effects(r)) {
        const o = e.operation;
        if (u.id === target.id && damage + absorbed > 0 && isAlive(u)) {
          if (
            e.trigger === 'damage_taken' ||
            e.trigger === 'attack_or_damage_taken' ||
            (e.trigger === 'received_attack' && cause === 'attack' && !derived)
          )
            this.execute(r, e, source);
          if (o.kind === 'positional_bonuses' && r.front && cause === 'attack' && !derived)
            this.host.mana(u, o.frontManaPerAttackReceived);
          if (e.trigger === 'health_threshold') {
            const threshold =
              'healthThresholdMilli' in o
                ? o.healthThresholdMilli
                : e.condition?.healthAtOrBelowMilli;
            if (threshold !== undefined && u.hp * 1000 <= effectiveStat(u, 'maxHp') * threshold)
              this.execute(r, e, u);
          }
        }
      }
    }
    for (const r of this.entries) {
      const u = this.unit(r);
      for (const e of this.effects(r)) {
        const o = e.operation;
        if (u.id === source.id && damage > 0 && isAlive(u)) {
          if (o.kind === 'omnivamp') {
            let ratio = o.ratioMilli;
            for (const f of this.effects(r))
              if (f.operation.kind === 'round_random_bonus' && r.chosen.includes('omnivamp'))
                ratio += f.operation.omnivampMilli;
            this.heal(u, u, (damage * ratio) / 1000, r, e);
            if (o.alsoHealLowestHpAlly) {
              const ally = this.nearby(u, true)
                .filter((t) => t.id !== u.id)
                .sort(
                  (a, b) =>
                    a.hp * effectiveStat(b, 'maxHp') - b.hp * effectiveStat(a, 'maxHp') ||
                    compareIds(a.id, b.id),
                )[0];
              if (ally) this.heal(u, ally, (damage * ratio) / 1000, r, e);
            }
          }
          if (isAlive(target) && e.trigger === 'physical_damage' && type === 'physical')
            this.execute(r, e, target);
          if (!derived && e.trigger === 'attack_or_ability_damage') this.execute(r, e, target);
        }
        if (u.id === source.id && absorbed > 0 && e.trigger === 'shield_damage')
          this.execute(r, e, target);
        if (
          takedown &&
          this.state.items!.contributors[target.id]?.includes(u.id) &&
          e.trigger === 'takedown'
        )
          this.execute(r, e, u);
      }
    }
  }
  private expiredInternal(
    u: CombatUnit,
    s: CombatStatus,
    reason: 'duration' | 'consumed' | 'death',
  ) {
    if (s.kind !== 'shield' || !s.itemSource || reason === 'death' || !isAlive(u)) return;
    if (reason === 'consumed' && !policy.shieldBreakGrantsAp) return;
    for (const r of this.entries.filter(
      (r) => r.unitId === u.id && r.instanceId === s.itemSource!.instanceId,
    ))
      for (const e of this.effects(r)) if (e.trigger === 'shield_expire') this.execute(r, e, u);
  }
  canCrit(u: CombatUnit) {
    return this.entries.some(
      (r) =>
        r.unitId === u.id && this.effects(r).some((e) => e.operation.kind === 'ability_critical'),
    );
  }
  untargetable(u: CombatUnit) {
    return u.statuses.some((s) => s.group === 'item-untargetable');
  }
  immune(u: CombatUnit) {
    return u.statuses.some((s) => s.group === 'item-cc');
  }
  healAmount(u: CombatUnit, n: number) {
    return Math.floor(
      (n *
        (1000 -
          u.statuses.reduce(
            (max, s) => (s.group === 'item-wound' ? Math.max(max, s.amount) : max),
            0,
          ))) /
        1000,
    );
  }
  damageAmount(
    source: CombatUnit,
    target: CombatUnit,
    n: number,
    type: DamageType,
    cause: 'attack' | 'ability',
  ) {
    if (type === 'true') return n;
    let amp = source.statuses.reduce((sum, s) => sum + (s.group === 'item-amp' ? s.amount : 0), 0);
    for (const r of this.entries.filter((r) => r.unitId === source.id))
      for (const e of this.effects(r)) {
        const o = e.operation;
        if (
          o.kind === 'damage_amp' &&
          e.trigger === 'damage_dealt' &&
          effectiveStat(target, 'maxHp') > (o.targetMaxHpAbove ?? 0)
        )
          amp += o.ratioMilli;
      }
    let result = (n * (1000 + amp)) / 1000;
    for (const r of this.entries.filter((r) => r.unitId === target.id))
      for (const e of this.effects(r)) {
        const o = e.operation;
        if (
          o.kind === 'damage_reduction' &&
          e.trigger === 'combat_start' &&
          (o.damageClass === 'all' || cause === 'attack')
        ) {
          const amount =
            o.healthAboveMilli !== undefined &&
            target.hp * 1000 > effectiveStat(target, 'maxHp') * o.healthAboveMilli
              ? o.aboveThresholdRatioMilli!
              : o.ratioMilli;
          result = (result * (1000 - amount)) / 1000;
        }
      }
    const strongest = target.statuses.reduce(
      (max, s) => (s.group === 'item-reduction' ? Math.max(max, s.amount) : max),
      0,
    );
    return Math.min(1000000, Math.max(0, Math.floor((result * (1000 - strongest)) / 1000)));
  }
}
