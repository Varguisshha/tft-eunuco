import { effectiveStat } from './math';
import { it, expect } from 'vitest';
import { analyzeTraits, prepareTraitProfiles } from './traits';
import { runCombat } from './engine';
import { ROSTER_TRAITS, ROSTER_COMBAT_PROFILES } from '@tft/game-data';
import { CombatInputSchema, type CombatInput } from '@tft/shared';
const contributors = (count: number, id: string) =>
  Array.from({ length: count }, (_, i) => ({
    definitionId: `diagnostic-${i}`,
    deployed: true,
    traits: [id],
  }));
it('counts distinct deployed identities once across arbitrary memberships and ignores bench copies', () => {
  const data = [
    ...contributors(2, 'upm'),
    ...contributors(2, 'upm'),
    { definitionId: 'bench', deployed: false, traits: ['upm'] },
  ];
  expect(analyzeTraits(data, ROSTER_TRAITS).find((t) => t.trait.id === 'upm')!.count).toBe(2);
});
it('MUS progresses only at 2/4; three diagnostic members keep two with no fictional effect', () => {
  const mus = ROSTER_TRAITS.find((t) => t.id === 'mus')!;
  for (const [count, tier] of [
    [1, undefined],
    [2, 2],
    [3, 2],
    [4, 4],
  ] as const) {
    const row = analyzeTraits(contributors(count, 'mus'), [mus])[0]!;
    expect(row.progressionThresholds.at(-1)?.count).toBe(tier);
    expect(row.active).toBe(false);
    expect(row.thresholds).toEqual([]);
  }
});
it.each(['hortaleza', 'perdidos_por_el_mundo', 'fumon'])(
  '%s uses 2 until 4, then retains the implemented 4 at pending 6 without stacking replacements',
  (id) => {
    for (const [count, tier, progress] of [
      [2, 2, 2],
      [3, 2, 2],
      [4, 4, 4],
      [6, 4, 6],
    ]) {
      const row = analyzeTraits(contributors(count!, id), ROSTER_TRAITS).find(
        (t) => t.trait.id === id,
      )!;
      expect(row.thresholds.map((t) => t.count)).toEqual([tier]);
      expect(row.progressionThresholds.at(-1)!.count).toBe(progress);
    }
  },
);
it('pending tiers grant no stats, procs, effects or activation and do not mutate profiles', () => {
  const input: CombatInput = CombatInputSchema.parse({
    protocolVersion: 3,
    rulesVersion: 'f0p10a-1',
    combatId: 'p10a-pending',
    seed: 42,
    maxTicks: 120,
    obstacles: [],
    traits: ROSTER_TRAITS,
    units: [0, 1].map((i) => ({
      id: `u-${i}`,
      definitionId: `diagnostic-${i}`,
      owner: 'south',
      position: { q: i, r: 4 },
      profile: { ...ROSTER_COMBAT_PROFILES.dolea, traits: ['gym', 'mus'] },
    })),
  });
  const before = structuredClone(input);
  const prepared = prepareTraitProfiles(input);
  expect(prepared.activations).toEqual([]);
  expect(prepared.modifiers).toEqual([]);
  expect(prepared.effects).toEqual([]);
  expect(prepared.units).toEqual(input.units);
  expect(input).toEqual(before);
  const a = runCombat(input),
    b = runCombat(input);
  expect(a).toEqual(b);
  expect(a.events.some((e) => e.type === 'trait_activate')).toBe(false);
  expect(CombatInputSchema.safeParse({ ...input, rulesVersion: 'florin-1' }).success).toBe(false);
});

it.each([2, 3, 4, 6])(
  'P10A Fumón at %i distinct diagnostic members applies one replacement tier in actual combat',
  (count) => {
    const fighter = structuredClone(ROSTER_COMBAT_PROFILES.jaramillo!);
    delete fighter.championAbility;
    fighter.traits = ['fumon'];
    const target = structuredClone(fighter);
    target.traits = [];
    target.stats.maxHp = 100000;
    target.stats.attack = 0;
    target.stats.attackSpeedMilli = 1;
    target.stats.armor = 100;
    const input = CombatInputSchema.parse({
      combatId: `p10a-smoke-${count}`,
      protocolVersion: 3,
      rulesVersion: 'f0p10a-1',
      seed: 42,
      maxTicks: 40,
      traits: ROSTER_TRAITS,
      obstacles: [],
      units: [
        {
          id: 'source',
          definitionId: 'diagnostic-source',
          owner: 'south',
          position: { q: 2, r: 4 },
          profile: fighter,
        },
        {
          id: 'target',
          definitionId: 'diagnostic-target',
          owner: 'north',
          position: { q: 2, r: 2 },
          profile: target,
        },
        ...Array.from({ length: count - 1 }, (_, i) => ({
          id: `member-${i}`,
          definitionId: `diagnostic-member-${i}`,
          owner: 'south',
          position: { q: i - 2, r: 5 },
          profile: structuredClone(fighter),
        })),
      ],
    });
    const trace = runCombat(input);
    const reduced = trace.snapshots
      .flatMap((s) => s.units.filter((u) => u.id === 'target'))
      .find((u) => u.statuses.some((s) => s.group === 'armor-reduction'))!;
    expect(effectiveStat(reduced, 'armor')).toBe(count < 4 ? 92 : 85);
    expect(
      trace.events.filter((e) => e.type === 'damage' && e.payload.cause === 'ability'),
    ).toHaveLength(count < 4 ? 0 : 1);
    expect(JSON.stringify(trace.events)).not.toContain(count < 4 ? 'smoke-three' : 'smoke-two');
  },
);
