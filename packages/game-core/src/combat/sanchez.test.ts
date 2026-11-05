import { expect, it } from 'vitest';
import { ADVANCED_STATS_DEFAULTS, type CombatInput } from '@tft/shared';
import { SANCHEZ_ECONOMY_CONFIG, EDU_ECONOMY_CONFIG } from '@tft/game-data';
import { scaledOwnedProfile, scaledProfile } from '../match/selectors';
import { runCombat } from './engine';
import { spec, input as baseInput } from './fixtures.test-support';
const setup = (units: CombatInput['units'], maxTicks = 80) =>
  baseInput(
    units.map((u) => ({
      ...u,
      profile: {
        ...u.profile,
        starLevel: u.profile.starLevel ?? 1,
        stats: { ...ADVANCED_STATS_DEFAULTS, ...u.profile.stats },
      },
    })),
    { rulesVersion: 'f0p13u-1', combatId: 'sanchez-test', maxTicks },
  );
const hero = (stars: 1 | 2 | 3, ready = false) => {
  const profile = structuredClone(scaledProfile('sanchez', stars, SANCHEZ_ECONOMY_CONFIG));
  profile.traits = [];
  if (ready) {
    profile.stats.startingMana = 70;
    profile.championAbility!.active!.initialMana = 70;
  }
  return { ...spec('sanchez', 'south', { q: 0, r: 4 }), definitionId: 'sanchez', profile };
};
it.each([1, 2, 3] as const)(
  'Sanchez %i★ fires a magic AP projectile with its stun only on impact',
  (stars) => {
    const u = hero(stars, true),
      foe = spec(
        'foe',
        'north',
        { q: 0, r: 2 },
        { maxHp: 10000, attack: 0, armor: 0, magicResist: 0, moveTicks: 20 },
      );
    const i = setup([u, foe], 30),
      r = runCombat(i);
    const launch = r.events.find(
      (e) => e.type === 'projectile_launch' && e.payload.cause === 'ability',
    );
    expect(launch).toBeDefined();
    const hit = r.events.find(
      (e) =>
        e.type === 'damage' && e.payload.sourceId === 'sanchez' && e.payload.cause === 'ability',
    );
    expect(hit?.type === 'damage' && hit.payload.amount).toBe([140, 210, 315][stars - 1]! + 45);
    expect(hit?.type === 'damage' && hit.payload.damageType).toBe('magic');
    expect(hit?.tick).toBeGreaterThan(launch!.tick);
    const stun = r.events.find(
      (e) =>
        e.type === 'status_apply' && e.payload.unitId === 'foe' && e.payload.status.kind === 'stun',
    );
    expect(stun?.tick).toBe(hit?.tick);
    expect(stun?.type === 'status_apply' && stun.payload.status.expiresTick).toBe(hit!.tick + 8);
    expect(runCombat(i)).toEqual(r);
    expect(scaledProfile('sanchez', stars, EDU_ECONOMY_CONFIG).stats.range).toBe(1);
    expect(u.profile.stats.range).toBe(4);
  },
);
it.each([1, 2, 3] as const)(
  'Ausencia de Sangre %i★ builds AP every four basic hits, capped at five stacks',
  (stars) => {
    const u = hero(stars);
    u.profile.stats.attackSpeedMilli = 2000;
    u.profile.stats.maxMana = 0;
    u.profile.stats.startingMana = 0;
    u.profile.championAbility = {
      ...u.profile.championAbility!,
      type: 'passive',
      passive: u.profile.championAbility!.passive!,
      active: null,
    };
    const r = runCombat(
      setup([u, spec('foe', 'north', { q: 0, r: 0 }, { maxHp: 100000, attack: 0, range: 4 })], 200),
    );
    const bonuses = r.events.filter(
      (e) => e.type === 'status_apply' && e.payload.status.key === 'ausencia-de-sangre-ap',
    );
    expect(bonuses).toHaveLength(5);
    for (const [index, bonus] of bonuses.entries()) {
      if (bonus.type !== 'status_apply') throw Error('bonus');
      expect(bonus.payload.status.amount).toBe([6, 9, 12][stars - 1]);
      expect(bonus.payload.status.expiresTick).toBeNull();
      const hits = r.events.filter(
        (e) =>
          e.type === 'damage' &&
          e.payload.sourceId === 'sanchez' &&
          e.payload.cause === 'attack' &&
          e.tick <= bonus.tick,
      );
      expect(hits).toHaveLength((index + 1) * 4);
    }
    expect(r.events.some((e) => e.type === 'shield_apply' && e.payload.unitId === 'sanchez')).toBe(
      false,
    );
    expect(r.events.some((e) => e.type === 'move_start' && e.payload.unitId === 'sanchez')).toBe(
      false,
    );
  },
);

it('Sanchez receives the caster item role rather than marksman', () => {
  expect(
    scaledOwnedProfile(
      { id: 's', definitionId: 'sanchez', stars: 1, location: { kind: 'bench', slot: 0 } },
      SANCHEZ_ECONOMY_CONFIG,
    ).itemRole,
  ).toBe('caster');
});
