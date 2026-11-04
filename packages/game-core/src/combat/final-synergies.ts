import { CARRASCO_PROVISIONAL } from '@tft/game-data';
import type {
  CombatInput,
  CombatState,
  CombatUnit,
  CombatStatus,
  CombatEffect,
  Side,
} from '@tft/shared';
import { effectiveStat, isAlive, isPresent, randomUint32, compareIds } from './math';
import { BOARD_HEXES, hexDistance, hexKey } from '../hex';
import type { Emit } from './mechanics';
type Host = {
  input: CombatInput;
  state: CombatState;
  emit: Emit;
  effect: (u: CombatUnit, e: CombatEffect) => void;
};
/** One seeded runtime for the definitive guide and explicitly authorized provisional designs.
 * Never runs for historical rules. Redirected damage cannot recursively redirect or re-proc. */
export class FinalSynergies {
  private tiers = new Map<string, number>();
  private measures = new Map<Side, number[]>();
  private first = new Set<string>();
  private hits = new Map<string, number>();
  private confirmed = new Set<string>();
  private lucky = new Set<string>();
  private summoned = new Set<Side>();
  private teamBonuses = new Map<Side, CombatStatus[]>();
  constructor(private h: Host) {
    for (const side of ['south', 'north'] as const) {
      const team = h.state.units.filter((u) => u.owner === side);
      for (const trait of h.input.traits ?? []) {
        const count = new Set(
          team.filter((u) => u.profile.traits?.includes(trait.id)).map((u) => u.definitionId),
        ).size;
        this.tiers.set(
          `${side}:${trait.id}`,
          trait.thresholds.filter((t) => t.count <= count).length,
        );
      }
      const count = this.tier(side, 'psoe'),
        choices = [0, 1, 2, 3, 4, 5],
        measures: number[] = [];
      for (let i = 0; i < count; i++)
        measures.push(choices.splice(this.draw(choices.length), 1)[0]!);
      this.measures.set(side, measures);
      const lostTier = this.tier(side, 'perdidos_por_el_mundo');
      const lostSelection =
        lostTier === 0 ? [] : lostTier === 1 ? [this.draw(2)] : lostTier === 2 ? [0, 1] : [0, 1, 2];
      for (const u of team) {
        const fumon = this.memberTier(u, 'fumon');
        if (fumon) this.mod(u, 'fumon', 'maxHp', -[100, 180, 250][fumon - 1]!, 'percent_milli');
        let t: number;
        t = this.memberTier(u, 'perdidos_por_el_mundo');
        if (t) {
          for (const n of lostSelection) {
            if (n === 2) this.mod(u, 'perdidos', 'maxHp', 150, 'percent_milli');
            else this.marker(u, `lost-${n}`, 150);
          }
          if (t === 3) this.mod(u, 'perdidos', 'attackSpeedMilli', 100, 'percent_milli');
        }
        t = this.memberTier(u, 'blackhaus');
        if (t) this.marker(u, 'ambush', 1, [20, 30, 40][t - 1]!, 'item-untargetable');
        for (const m of measures) {
          this.marker(u, `measure-${m}`, 1);
          if (m === 1) this.mod(u, 'psoe', 'attackSpeedMilli', 150, 'percent_milli', 50);
          if (m === 3) this.mod(u, 'psoe', 'abilityPower', 150, 'percent_milli');
          if (m === 4) this.mod(u, 'psoe', 'attack', 150, 'percent_milli');
          if (m === 5) {
            this.mod(u, 'psoe', 'armor', 10);
            this.mod(u, 'psoe', 'magicResist', 10);
          }
        }
        // Initial HP follows all simultaneous modifiers; Fumón cannot kill its member.
        u.hp = Math.max(1, effectiveStat(u, 'maxHp'));
      }
      this.teamBonuses.set(
        side,
        structuredClone(
          team[0]?.statuses.filter((s) => s.sourceId === 'hortaleza' || s.sourceId === 'psoe') ??
            [],
        ),
      );
    }
  }
  start() {
    for (const u of this.h.state.units) {
      if (this.tier(u.owner, 'lenceria')) this.shield(u, 'lenceria', 80);
      if (this.measures.get(u.owner)?.includes(2)) this.heal(u, 100);
    }
  }
  private draw(max: number) {
    const r = randomUint32(this.h.state.rngState);
    this.h.state.rngState = r.state;
    return Math.floor((r.value * max) / 4294967296);
  }
  private tier(side: Side, id: string) {
    return this.tiers.get(`${side}:${id}`) ?? 0;
  }
  private memberTier(u: CombatUnit, id: string) {
    return u.profile.traits?.includes(id) ? this.tier(u.owner, id) : 0;
  }
  private status(u: CombatUnit, s: CombatStatus) {
    u.statuses.push(s);
    if (this.h.state.tick) this.h.emit('status_apply', { unitId: u.id, status: s });
  }
  private mod(
    u: CombatUnit,
    key: string,
    stat: NonNullable<CombatStatus['stat']>,
    amount: number,
    mode: 'flat' | 'percent_milli' = 'flat',
    duration: number | null = null,
  ) {
    this.status(u, {
      id: `final-${this.h.state.effectCounter++}`,
      sourceId: key,
      key,
      kind: 'modifier',
      stat,
      amount,
      mode,
      origin: 'trait',
      expiresTick: duration === null ? null : this.h.state.tick + duration,
    });
  }
  private marker(
    u: CombatUnit,
    key: string,
    amount: number,
    duration: number | null = null,
    group?: CombatStatus['group'],
  ) {
    this.status(u, {
      id: `final-${this.h.state.effectCounter++}`,
      sourceId: key,
      key,
      kind: 'modifier',
      stat: null,
      amount,
      mode: 'flat',
      origin: 'trait',
      expiresTick: duration === null ? null : this.h.state.tick + duration,
      ...(group ? { group } : {}),
    });
  }
  private heal(u: CombatUnit, milli: number) {
    this.h.effect(u, {
      kind: 'heal',
      target: 'self',
      radius: 0,
      amount: Math.floor((effectiveStat(u, 'maxHp') * milli) / 1000),
    });
  }
  private shield(u: CombatUnit, key: string, milli: number) {
    this.h.effect(u, {
      kind: 'shield',
      target: 'self',
      radius: 0,
      amount: Math.floor((effectiveStat(u, 'maxHp') * milli) / 1000),
      duration: 40,
      key,
      stacking: 'refresh',
    });
  }
  outgoing(u: CombatUnit, amount: number, attack: boolean, critical: boolean) {
    const ruman = this.memberTier(u, 'ruman_trinity');
    if (ruman) amount = Math.floor((amount * (ruman === 1 ? 1150 : 1300)) / 1000);
    if (u.statuses.some((s) => s.key === 'lost-0')) amount = Math.floor((amount * 1150) / 1000);
    if (attack && critical) {
      const t = this.memberTier(u, 'valo');
      if (t && this.draw(1000) < t * 100) amount = Math.floor((amount * 1500) / 1000);
    }
    if (attack && !this.first.has(u.id)) {
      this.first.add(u.id);
      const t = this.memberTier(u, 'blackhaus');
      if (t > 1) amount = Math.floor((amount * (t === 2 ? 1500 : 2000)) / 1000);
    }
    return amount;
  }
  incoming(u: CombatUnit, amount: number, attack: boolean) {
    this.lucky.delete(u.id);
    if (u.statuses.some((s) => s.key === 'lost-1')) amount = Math.floor((amount * 850) / 1000);
    const t = this.memberTier(u, 'pardillo');
    if (attack && t && this.draw(1000) < t * 100) {
      amount = Math.floor(amount / 2);
      if (t >= 3) this.lucky.add(u.id);
    }
    return amount;
  }
  redirects(target: CombatUnit, amount: number) {
    const recipients: { unit: CombatUnit; amount: number }[] = [];
    let remaining = amount;
    const team = this.h.state.units.filter(
      (u) => u.owner === target.owner && u.id !== target.id && isPresent(u),
    );
    if (this.memberTier(target, 'ruman_trinity') >= 2) {
      const others = team
        .filter((u) => this.memberTier(u, 'ruman_trinity'))
        .sort((a, b) => compareIds(a.id, b.id));
      const share = Math.floor((amount * 100) / 1000);
      for (let i = 0; i < others.length; i++) {
        const n = Math.floor(share / others.length) + (i < share % others.length ? 1 : 0);
        if (n) {
          recipients.push({ unit: others[i]!, amount: n });
          remaining -= n;
        }
      }
    }
    for (const protector of team
      .filter((u) => this.memberTier(u, 'pancho'))
      .sort((a, b) => compareIds(a.id, b.id))) {
      const nearest = this.h.state.units
        .filter((u) => u.id !== protector.id && u.owner === protector.owner && isPresent(u))
        .sort(
          (a, b) =>
            hexDistance(protector.position, a.position) -
              hexDistance(protector.position, b.position) || compareIds(a.id, b.id),
        )[0];
      if (nearest?.id !== target.id) continue;
      const reserved = recipients
        .filter((r) => r.unit.id === protector.id)
        .reduce((n, r) => n + r.amount, 0);
      const n = Math.min(
        Math.max(0, protector.hp - reserved),
        Math.floor((remaining * (50 + this.memberTier(protector, 'pancho') * 50)) / 1000),
      );
      if (n) {
        recipients.push({ unit: protector, amount: n });
        remaining -= n;
      }
    }
    return { remaining, recipients };
  }
  after(
    source: CombatUnit,
    target: CombatUnit,
    attack: boolean,
    killed: boolean,
    attackId?: string,
  ) {
    if (this.lucky.delete(target.id) && isAlive(target)) this.heal(target, 50);
    const key = `${source.id}:${attackId ?? this.h.state.tick}`;
    if (attack && !this.confirmed.has(key)) {
      this.confirmed.add(key);
      const n = (this.hits.get(source.id) ?? 0) + 1;
      this.hits.set(source.id, n);
      const t = this.memberTier(source, 'mus');
      if (t && n % 4 === 0 && isAlive(source)) this.shield(source, 'mus', t === 1 ? 80 : 120);
    }
    if (!killed || source.owner === target.owner) return;
    let gold = 0;
    const t = this.memberTier(source, 'rata');
    if (t && this.draw(1000) < [200, 400, 500][t - 1]!) gold += t === 3 ? 2 : 1;
    if (this.measures.get(source.owner)?.includes(0)) gold++;
    if (gold)
      this.h.emit('synergy_gold', {
        side: source.owner,
        amount: gold,
        sourceId: source.id,
        targetId: target.id,
      });
  }
  tick() {
    for (const team of this.h.state.synergies?.teams ?? []) {
      if (!team.triggered || this.summoned.has(team.side)) continue;
      const members = this.h.state.units.filter((u) => team.memberIds.includes(u.id));
      const anchor = members.find(isAlive) ?? members[0]!;
      const occupied = new Set(
        [
          ...this.h.input.obstacles,
          ...this.h.state.units.filter(isPresent).map((u) => u.position),
        ].map(hexKey),
      );
      const position = BOARD_HEXES.filter((h) => !occupied.has(hexKey(h))).sort(
        (a, b) =>
          hexDistance(anchor.position, a) - hexDistance(anchor.position, b) ||
          a.r - b.r ||
          a.q - b.q,
      )[0];
      if (!position) continue;
      this.summoned.add(team.side);
      const i = team.level - 1,
        p = CARRASCO_PROVISIONAL,
        sc = team.scaling;
      const stats = {
        moveTicks: p.moveTicks,
        attackWindupTicks: p.attackWindupTicks,
        moveSpeedMilli: 1000,
        manaRegenMilli: 0,
        maxHp: Math.floor((p.hp[i]! * sc.maxHp) / 1000),
        attack: Math.floor((p.attack[i]! * sc.attack) / 1000),
        abilityPower: 0,
        armor: Math.floor((p.defense[i]! * sc.armor) / 1000),
        magicResist: Math.floor((p.defense[i]! * sc.magicResist) / 1000),
        attackSpeedMilli: p.attackSpeedMilli,
        critChanceMilli: 0,
        critMultiplierMilli: 1500,
        maxMana: p.mana,
        startingMana: 0,
        range: p.range,
      };
      let id = `carrasco-${team.side}`,
        suffix = 1;
      while (this.h.state.units.some((u) => u.id === id)) id = `carrasco-${team.side}-${suffix++}`;
      const unit: CombatUnit = {
        id,
        definitionId: 'carrasco',
        owner: team.side,
        position: { ...position },
        profile: {
          stats,
          passive: null,
          starLevel: 1,
          traits: [],
          ability: {
            id: 'carrasco-impact',
            name: 'Proyecto final',
            manaCost: p.mana,
            castTicks: 4,
            effects: [
              {
                kind: 'damage',
                target: 'enemies',
                radius: 1,
                center: 'target',
                amount: Math.floor((p.spell[i]! * sc.attack) / 1000),
                damageType: 'magic',
              },
            ],
          },
        },
        hp: stats.maxHp,
        mana: 0,
        attackCharge: 10000,
        statuses: (this.teamBonuses.get(team.side) ?? [])
          .filter((s) => s.expiresTick === null || s.expiresTick > this.h.state.tick)
          .map((s) => ({ ...structuredClone(s), id: `final-${this.h.state.effectCounter++}` })),
        action: null,
        targetId: null,
        deathTick: null,
        passiveState: {},
        mechanics: { version: 1, casts: 0, kills: 0, stacks: [], periodics: [] },
      };
      unit.hp = effectiveStat(unit, 'maxHp');
      this.h.state.units.push(unit);
      this.h.state.units.sort((a, b) => compareIds(a.id, b.id));
      this.h.emit('unit_spawn', { unit });
    }
  }
}
