import { expect, it } from 'vitest';
import { RANGED_AP_ECONOMY_CONFIG, SANCHEZ_ECONOMY_CONFIG } from '@tft/game-data';
import { ADVANCED_STATS_DEFAULTS } from '@tft/shared';
import { scaledProfile } from '../match/selectors';
import { spec, input } from './fixtures.test-support';
import { runCombat } from './engine';
function replay(id: 'edu' | 'sanchez', stars: 1 | 2 | 3, ap: number, ad = 20) {
  const profile = structuredClone(scaledProfile(id, stars, RANGED_AP_ECONOMY_CONFIG));
  profile.traits = [];
  profile.stats.abilityPower = ap;
  profile.stats.attack = ad;
  profile.stats.startingMana = profile.stats.maxMana;
  profile.championAbility!.active!.initialMana = profile.stats.maxMana;
  const units = [
    { ...spec(id, 'south', { q: 0, r: 4 }), definitionId: id, profile },
    spec('ally', 'south', { q: 3, r: 7 }, { maxHp: 500, attack: 0 }),
    spec(
      'foe',
      'north',
      { q: 0, r: 0 },
      { maxHp: 100000, attack: 0, armor: 0, magicResist: 0, range: 4 },
    ),
  ];
  return runCombat(
    input(
      units.map((u) => ({
        ...u,
        profile: {
          ...u.profile,
          starLevel: u.profile.starLevel ?? 1,
          stats: { ...ADVANCED_STATS_DEFAULTS, ...u.profile.stats },
        },
      })),
      { combatId: 'ranged-ap-test', rulesVersion: 'f0p13u-1', maxTicks: 120 },
    ),
  );
}
it.each([1, 2, 3] as const)('Edu %i★ support scales with AP, not AD', (stars) => {
  const values = (ap: number, ad: number) =>
    replay('edu', stars, ap, ad)
      .events.filter(
        (e) => e.type === 'heal' || (e.type === 'shield_apply' && e.payload.unitId === 'ally'),
      )
      .map((e) =>
        e.type === 'heal'
          ? e.payload.accounting?.requested
          : e.type === 'shield_apply'
            ? e.payload.status.amount
            : 0,
      );
  expect(values(60, 15)).toEqual(values(60, 999));
  const r = replay('edu', stars, 100);
  expect(r.events.find((e) => e.type === 'heal')?.payload).toMatchObject({
    accounting: { requested: [80, 120, 200][stars - 1]! + 100 },
  });
  expect(
    r.events.find(
      (e) =>
        e.type === 'shield_apply' &&
        e.payload.unitId === 'ally' &&
        e.payload.status.key === 'edu-cosmere-shield',
    )?.payload,
  ).toMatchObject({ status: { amount: [180, 270, 420][stars - 1]! + 200 } });
  expect(
    r.events.find(
      (e) =>
        e.type === 'shield_apply' &&
        e.payload.unitId === 'ally' &&
        e.payload.status.key === 'edu-ap-confidence',
    )?.payload,
  ).toMatchObject({ status: { amount: [40, 60, 90][stars - 1]! + 50 } });
});
it.each([1, 2, 3] as const)('Sanchez %i★ uses AP for redoble and basic magic notes', (stars) => {
  const r = replay('sanchez', stars, 60);
  expect(
    r.events.find(
      (e) =>
        e.type === 'damage' && e.payload.sourceId === 'sanchez' && e.payload.cause === 'ability',
    )?.payload,
  ).toMatchObject({ damageType: 'magic', amount: [130, 195, 290][stars - 1]! + 120 });
  expect(
    r.events.find(
      (e) =>
        e.type === 'damage' &&
        e.payload.sourceId === 'sanchez' &&
        e.payload.cause === 'ability' &&
        !e.payload.projectileId,
    )?.payload,
  ).toMatchObject({ damageType: 'magic', amount: 18 });
  expect(
    r.events.find(
      (e) => e.type === 'status_apply' && e.payload.status.key === 'ausencia-de-sangre-ap',
    )?.payload,
  ).toMatchObject({ status: { amount: [8, 12, 18][stars - 1] } });
  expect(scaledProfile('sanchez', stars, RANGED_AP_ECONOMY_CONFIG).stats.attack).toBeLessThan(
    scaledProfile('sanchez', stars, SANCHEZ_ECONOMY_CONFIG).stats.attack,
  );
  expect(replay('sanchez', stars, 60)).toEqual(r);
});

it('keeps AD low even at three stars and preserves published profiles', () => {
  expect(scaledProfile('edu', 1, RANGED_AP_ECONOMY_CONFIG).stats).toMatchObject({
    attack: 10,
    abilityPower: 60,
    range: 4,
  });
  expect(scaledProfile('sanchez', 1, RANGED_AP_ECONOMY_CONFIG).stats).toMatchObject({
    attack: 15,
    abilityPower: 60,
    range: 4,
  });
  expect(scaledProfile('edu', 3, RANGED_AP_ECONOMY_CONFIG).stats.attack).toBe(32);
  expect(scaledProfile('sanchez', 3, RANGED_AP_ECONOMY_CONFIG).stats.attack).toBe(48);
  expect(scaledProfile('sanchez', 3, SANCHEZ_ECONOMY_CONFIG).stats.attack).toBe(129);
});
