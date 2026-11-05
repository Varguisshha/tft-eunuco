import { expect, it } from 'vitest';
import { EDU_ECONOMY_CONFIG } from '@tft/game-data';
import { scaledProfile } from '../match/selectors';
import { runCombat } from './engine';
import { ADVANCED_STATS_DEFAULTS } from '@tft/shared';
import { spec, input as baseInput } from './fixtures.test-support';
const hero = (stars: 1 | 2 | 3) => {
  const profile = structuredClone(scaledProfile('edu', stars, EDU_ECONOMY_CONFIG));
  profile.traits = [];
  profile.stats.startingMana = 80;
  profile.championAbility!.active!.initialMana = 80;
  return { ...spec('edu', 'south', { q: 0, r: 6 }), definitionId: 'edu', profile };
};
it.each([1, 2, 3] as const)(
  'Edu %i★ shields lowest-health distant ally with exact star values and timed attack speed',
  (stars) => {
    const units = [
      hero(stars),
      spec('ally-z', 'south', { q: 3, r: 7 }, { maxHp: 500 }),
      spec('ally-a', 'south', { q: 2, r: 7 }, { maxHp: 500 }),
      spec('foe', 'north', { q: 0, r: 0 }, { maxHp: 10000, attack: 0, moveTicks: 20 }),
    ];
    const setup = input(units, { rulesVersion: 'f0p13u-1', maxTicks: 55 });
    const replay = runCombat(setup);
    const cast = replay.events.find(
      (e) => e.type === 'ability_cast' && e.payload.stage === 'start',
    );
    expect(cast?.type === 'ability_cast' && cast.payload.targetId).toBe('ally-a');
    expect(cast?.type === 'ability_cast' && cast.payload.manaAfter).toBe(0);
    const heal = replay.events.find((e) => e.type === 'heal' && e.payload.sourceId === 'edu');
    expect(heal?.type === 'heal' && heal.payload.accounting?.requested).toBe(
      [100, 150, 250][stars - 1],
    );
    const shield = replay.events.find(
      (e) =>
        e.type === 'shield_apply' &&
        e.payload.unitId === 'ally-a' &&
        e.payload.status.key === 'edu-cosmere-shield',
    );
    expect(shield?.type === 'shield_apply' && shield.payload.status.amount).toBe(
      [300, 450, 700][stars - 1],
    );
    const modifier = replay.events.find(
      (e) =>
        e.type === 'status_apply' &&
        e.payload.unitId === 'ally-a' &&
        e.payload.status.key === 'edu-cosmere-speed',
    );
    expect(modifier?.type === 'status_apply' && modifier.payload.status.amount).toBe(
      [250, 350, 500][stars - 1],
    );
    if (modifier?.type !== 'status_apply' || shield?.type !== 'shield_apply')
      throw Error('Missing support effects');
    expect(modifier.payload.status.expiresTick).toBe(modifier.tick + 40);
    expect(shield.payload.status.expiresTick).toBe(shield.tick + 40);
    const expired = replay.snapshots.find((s) => s.tick === modifier.tick + 40)!;
    expect(
      expired.units
        .find((u) => u.id === 'ally-a')!
        .statuses.some((s) => s.key?.startsWith('edu-cosmere')),
    ).toBe(false);
    expect(
      replay.events.some(
        (e) =>
          e.type === 'projectile_launch' &&
          e.payload.sourceId === 'edu' &&
          e.payload.cause === 'ability',
      ),
    ).toBe(false);
    expect(runCombat(setup)).toEqual(replay);
  },
);
it('Edu protects himself when alone', () => {
  const r = runCombat(
    input(
      [hero(1), spec('foe', 'north', { q: 0, r: 0 }, { maxHp: 10000, attack: 0, moveTicks: 20 })],
      { rulesVersion: 'f0p13u-1', maxTicks: 12 },
    ),
  );
  expect(r.events.some((e) => e.type === 'shield_apply' && e.payload.unitId === 'edu')).toBe(true);
});

const input: typeof baseInput = (units, options) =>
  baseInput(
    units.map((u) => ({
      ...u,
      profile: {
        ...u.profile,
        starLevel: u.profile.starLevel ?? 1,
        stats: { ...ADVANCED_STATS_DEFAULTS, ...u.profile.stats },
      },
    })),
    { combatId: 'edu-test', ...options },
  );

it.each([1, 2, 3] as const)(
  'Edu %i★ shares confidence with all allies at combat start',
  (stars) => {
    const edu = hero(stars);
    const replay = runCombat(
      input(
        [
          edu,
          spec('near', 'south', { q: 1, r: 6 }),
          spec('far', 'south', { q: 3, r: 7 }),
          spec('foe', 'north', { q: 0, r: 4 }, { maxHp: 10000, attack: 0 }),
        ],
        { rulesVersion: 'f0p13u-1', maxTicks: 45 },
      ),
    );
    const shields = replay.events.filter(
      (e) => e.type === 'status_apply' && e.payload.status.key === 'edu-confidence-speed',
    );
    expect(shields.map((e) => e.type === 'status_apply' && e.payload.unitId).sort()).toEqual([
      'edu',
      'far',
      'near',
    ]);
    for (const event of shields) {
      if (event.type !== 'status_apply') throw Error('Missing speed');
      expect(event.payload.status.amount).toBe([100, 150, 200][stars - 1]);
      expect(event.payload.status.expiresTick).toBe(event.tick + 60);
    }
  },
);
