import { describe, it, expect } from 'vitest';
import {
  ChampionAbilitySchema,
  CombatInputSchema,
  CombatProfileSchema,
  CURRENT_COMBAT_RULES,
  type ChampionAbility,
  type CombatInput,
} from '@tft/shared';
import {
  CURRENT_COMBAT_PROFILES,
  DOLEA_ABILITY,
  TRAIT_DEFINITIONS,
  CURRENT_ECONOMY_CONFIG,
  ECONOMY_CONFIG,
} from '@tft/game-data';
import { runCombat } from './engine';
import { effectiveStat } from './math';
import { spec, input } from './fixtures.test-support';
import { scaledProfile } from '../match/selectors';
import { analyzeTraits, prepareTraitProfiles } from './traits';
const hero = (stars: 1 | 2 | 3 = 1) => ({
  ...spec('dolea', 'south', { q: 0, r: 4 }),
  definitionId: 'dolea',
  profile: scaledProfile('dolea', stars, CURRENT_ECONOMY_CONFIG),
});
const modern = (units: CombatInput['units'], maxTicks = 100) =>
  input(units, { rulesVersion: CURRENT_COMBAT_RULES, traits: [...TRAIT_DEFINITIONS], maxTicks });
const foe = (id = 'foe', attack = 180) =>
  spec(id, 'north', { q: 0, r: 3 }, { maxHp: 10000, attack, armor: 0, attackSpeedMilli: 1000 });
const main = () => structuredClone(DOLEA_ABILITY);
const events = (units: CombatInput['units'], maxTicks = 100) => runCombat(modern(units, maxTicks));
describe('versioned ability contracts', () => {
  it('accepts active, passive and mixed with one identity, rejects incomplete/mismatched components', () => {
    const a = main();
    expect(ChampionAbilitySchema.parse(a).type).toBe('mixed');
    expect(ChampionAbilitySchema.parse({ ...a, type: 'active', passive: undefined }).type).toBe(
      'active',
    );
    expect(ChampionAbilitySchema.parse({ ...a, type: 'passive', active: null }).type).toBe(
      'passive',
    );
    expect(ChampionAbilitySchema.safeParse({ ...a, active: undefined }).success).toBe(false);
    expect(ChampionAbilitySchema.safeParse({ ...a, type: 'active', active: null }).success).toBe(
      false,
    );
    expect(ChampionAbilitySchema.safeParse({ ...a, version: 2 }).success).toBe(false);
    expect(ChampionAbilitySchema.parse(JSON.parse(JSON.stringify(a)))).toEqual(a);
  });
  it('validates mana, no fictitious mana, exclusive legacy slots and rule IDs', () => {
    const a = main();
    if (!a.active || !a.passive) throw Error();
    expect(
      ChampionAbilitySchema.safeParse({ ...a, active: { ...a.active, manaCost: 0 } }).success,
    ).toBe(false);
    expect(
      ChampionAbilitySchema.safeParse({ ...a, active: { ...a.active, initialMana: 71 } }).success,
    ).toBe(false);
    expect(
      ChampionAbilitySchema.safeParse({
        ...a,
        passive: { ...a.passive, rules: [...a.passive.rules, ...a.passive.rules] },
      }).success,
    ).toBe(false);
    const p = hero().profile;
    expect(
      CombatProfileSchema.safeParse({ ...p, stats: { ...p.stats, maxMana: 50 } }).success,
    ).toBe(false);
    expect(
      CombatProfileSchema.safeParse({
        ...p,
        championAbility: { ...a, type: 'passive', active: null },
        stats: { ...p.stats, maxMana: 0 },
      }).success,
    ).toBe(true);
    expect(() => input([hero(), foe()])).toThrow();
  });
});
describe('composition and trait preparation', () => {
  const member = (
    definitionId: string,
    deployed = true,
    traits = ['hortaleza', 'llama-de-padel'],
  ) => ({ definitionId, deployed, traits });
  it('counts distinct deployed definitions once, contributes to one or two traits, bench excluded', () => {
    const result = analyzeTraits(
      [member('a'), member('a'), member('b', false), member('c', true, ['hortaleza'])],
      TRAIT_DEFINITIONS,
    );
    expect(result.map((r) => r.count)).toEqual([2, 1]);
    expect(result[0]!.thresholds.map((t) => t.count)).toEqual([2]);
    expect(result[1]!.nextThreshold).toBe(2);
    expect(analyzeTraits([member('a')], TRAIT_DEFINITIONS)[0]!.active).toBe(false);
    expect(
      analyzeTraits([member('a'), member('b'), member('c')], TRAIT_DEFINITIONS)[0]!.thresholds.map(
        (t) => t.count,
      ),
    ).toEqual([3]);
    expect(analyzeTraits([], TRAIT_DEFINITIONS).every((t) => !t.active)).toBe(true);
  });
  it.each([1, 2, 3] as const)(
    'applies highest tier once after %s-star scaling; repeated rounds clone the same input',
    (stars) => {
      const a = hero(stars),
        b = {
          ...hero(),
          id: 'diagnostic-b',
          definitionId: 'diagnostic-b',
          position: { q: 1, r: 4 },
        },
        c = {
          ...hero(),
          id: 'diagnostic-c',
          definitionId: 'diagnostic-c',
          position: { q: 2, r: 4 },
        };
      const i = modern([a, b, c, foe()]);
      const frozen = JSON.stringify(i);
      const p = prepareTraitProfiles(i);
      const d = p.units.find((u) => u.id === 'dolea')!;
      expect(d.profile.stats.maxHp).toBe(a.profile.stats.maxHp + 220);
      expect(d.profile.stats.armor).toBe(60);
      expect(d.profile.stats.attackSpeedMilli).toBe(1000);
      expect(prepareTraitProfiles(i)).toEqual(p);
      expect(JSON.stringify(i)).toBe(frozen);
      const two = prepareTraitProfiles(modern([a, b, foe()])).units[0]!;
      expect(two.profile.stats.maxHp).toBe(a.profile.stats.maxHp + 100);
      expect(two.profile.stats.attackSpeedMilli).toBe(896);
    },
  );
  it('only buffs the correct side/members and supports explicit cumulative tiers', () => {
    const a = hero(),
      b = { ...hero(), id: 'b', definitionId: 'diagnostic-b', position: { q: 1, r: 4 } };
    const other = spec('other', 'south', { q: 2, r: 4 });
    const i = modern([a, b, other, foe()]);
    expect(prepareTraitProfiles(i).units.find((u) => u.id === 'other')!.profile).toEqual(
      other.profile,
    );
    const t = structuredClone(TRAIT_DEFINITIONS[0]!);
    t.stacking = 'cumulative';
    t.thresholds[1]!.count = 2;
    t.thresholds[0]!.count = 1;
    i.traits = [t];
    a.profile.traits = ['hortaleza'];
    b.profile.traits = ['hortaleza'];
    i.units = [a, b, foe()];
    expect(prepareTraitProfiles(i).units[0]!.profile.stats.maxHp).toBe(920);
  });
});
describe('Volumen Sucio deterministic semantics', () => {
  it('triggers only after crossing below 50%, grants 12% effective HP once and resets next combat', () => {
    const trace = events([hero(), foe()]);
    const trigger = trace.events.filter((e) => e.type === 'passive_trigger');
    expect(trigger).toHaveLength(1);
    const shield = trace.events.find(
      (e) => e.type === 'shield_apply' && e.payload.unitId === 'dolea',
    );
    expect(shield?.type === 'shield_apply' && shield.payload.status.amount).toBe(72);
    const crossing = trace.events.filter(
      (e) => e.type === 'damage' && e.payload.targetId === 'dolea' && e.payload.hpAfter < 300,
    )[0]!;
    expect(trigger[0]!.tick).toBe(crossing.tick);
    expect(runCombat(trace.input)).toEqual(trace);
    expect(CURRENT_COMBAT_PROFILES.dolea!.stats.maxHp).toBe(600);
  });
  it('lethal and simultaneous damage cannot activate or resurrect a dead unit', () => {
    const a = hero();
    a.profile.stats.armor = 0;
    const b = foe('b', 10000);
    const c = { ...foe('c', 10000), position: { q: 1, r: 3 } };
    const t = events([a, b, c]);
    expect(t.events.filter((e) => e.type === 'passive_trigger')).toHaveLength(0);
    expect(t.snapshots.at(-1)!.units.find((u) => u.id === 'dolea')!.hp).toBe(0);
  });
  it('simultaneous nonlethal crossing followed by lethal hit does not gain an intermediate shield', () => {
    const a = hero();
    a.profile.stats.armor = 0;
    const b = foe('b', 350),
      c = { ...foe('c', 350), position: { q: 1, r: 3 } };
    expect(events([a, b, c]).events.some((e) => e.type === 'passive_trigger')).toBe(false);
  });
  it.each([1, 2, 3] as const)(
    '%s-star shields scale from HP once and active damage uses explicit stars',
    (stars) => {
      const a = hero(stars);
      a.profile.stats.armor = 0;
      const t = events([a, foe('foe', Math.floor(a.profile.stats.maxHp * 0.3))]);
      const shield = t.events.find(
        (e) => e.type === 'shield_apply' && e.payload.unitId === 'dolea',
      );
      expect(shield?.type === 'shield_apply' && shield.payload.status.amount).toBe(
        Math.floor(a.profile.stats.maxHp * 0.12),
      );
      expect(a.profile.championAbility!.active!.effects[0]).toMatchObject({
        amount: [100, 180, 324][stars - 1],
      });
    },
  );
  it('gains mana, casts at70, damages adjacent enemies and refreshes armor for exactly40ticks', () => {
    const a = hero();
    const b = foe('b', 0),
      c = { ...foe('c', 0), position: { q: 1, r: 4 } },
      far = { ...foe('far', 0), position: { q: 4, r: 0 } };
    far.profile.stats.range = 14;
    const t = events([a, b, c, far], 180);
    const casts = t.events.filter((e) => e.type === 'ability_cast' && e.payload.unitId === 'dolea');
    expect(casts.length).toBeGreaterThanOrEqual(2);
    const start = casts.find((e) => e.type === 'ability_cast' && e.payload.stage === 'start')!;
    const gains = t.events.filter(
      (e) => e.type === 'mana_gain' && e.payload.unitId === 'dolea' && e.tick <= start.tick,
    );
    const lastGain = gains.at(-1);
    expect(lastGain?.type === 'mana_gain' && lastGain.payload.manaAfter).toBe(70);
    const resolve = casts.find((e) => e.type === 'ability_cast' && e.payload.stage === 'resolve')!;
    const hits = t.events.filter(
      (e) =>
        e.type === 'damage' &&
        e.payload.sourceId === 'dolea' &&
        e.payload.cause === 'ability' &&
        e.tick === resolve.tick,
    );
    expect(hits.map((e) => e.type === 'damage' && e.payload.targetId).sort()).toEqual(['b', 'c']);
    expect(hits.every((e) => e.type === 'damage' && e.payload.amount === 100)).toBe(true);
    const status = t.events.find((e) => e.type === 'status_apply' && e.payload.unitId === 'dolea')!;
    expect(status.type === 'status_apply' && status.payload.status.expiresTick).toBe(
      resolve.tick + 40,
    );
    const live = t.snapshots[resolve.tick]!.units.find((u) => u.id === 'dolea')!;
    expect(effectiveStat(live, 'armor')).toBe(65);
    expect(
      effectiveStat(t.snapshots[resolve.tick + 40]!.units.find((u) => u.id === 'dolea')!, 'armor'),
    ).toBe(45);
  });
  it('overtime reduces newly granted shields, not the base ability', () => {
    const a = hero();
    a.profile.stats.armor = 0;
    a.profile.stats.attack = 0;
    const b = foe('foe', 0);
    // Deterministic delayed attack: 0.032 attacks/s, first hit harmlessly below the threshold.
    b.profile.ability = null;
    b.profile.passive = null;
    b.profile.stats.attack = 220;
    b.profile.stats.attackSpeedMilli = 32;
    const t = events([a, b], 400);
    const shield = t.events.find((e) => e.type === 'shield_apply' && e.payload.unitId === 'dolea');
    expect(shield?.tick).toBeGreaterThanOrEqual(300);
    expect(shield?.type === 'shield_apply' && shield.payload.status.amount).toBeLessThan(72);
    expect(t.events.some((e) => e.type === 'overtime_start')).toBe(true);
  });
  it('pure passive gains no mana and self active can cast without adjacent enemies', () => {
    const a = hero();
    const ability = main();
    a.profile.championAbility = {
      ...ability,
      type: 'passive',
      passive: ability.passive!,
      active: null,
    };
    a.profile.stats.maxMana = 0;
    expect(
      events([a, foe()]).events.some((e) => e.type === 'mana_gain' && e.payload.unitId === 'dolea'),
    ).toBe(false);
    const c = hero();
    const active = main().active!;
    c.profile.championAbility = {
      ...main(),
      type: 'active',
      passive: null,
      active: { ...active, targeting: 'self', initialMana: 70 },
    } as ChampionAbility;
    c.profile.stats.startingMana = 70;
    const t = events([c, { ...foe(), position: { q: 4, r: 0 } }], 5);
    expect(t.events.find((e) => e.type === 'ability_cast')?.tick).toBe(1);
  });
  it('legacy profile/catalog stays frozen and roundtrips new serialized inputs', () => {
    expect(scaledProfile('dolea', 1, { ...ECONOMY_CONFIG, catalog: 'f0p4.1' }).ability?.id).toBe(
      'test-bastion',
    );
    const i = modern([hero(), foe()]);
    expect(CombatInputSchema.parse(JSON.parse(JSON.stringify(i)))).toEqual(i);
  });
});
