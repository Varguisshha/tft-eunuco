import { describe, it, expect } from 'vitest';
import {
  CombatInputSchema,
  CombatStateSchema,
  CombatEventV3Schema,
  FLORIN_RULES,
  type CombatInput,
} from '@tft/shared';
import {
  FLORIN_ECONOMY_CONFIG as config,
  FLORIN_TUNING,
  EXECUTABLE_ITEM_CATALOG,
  matchCatalog,
  traitsFor,
  FLORIN_COMBAT_PROFILES,
  JARAMILLO_COMBAT_PROFILES,
  RUMAN_TRINITY,
  PERDIDOS_POR_EL_MUNDO,
} from '@tft/game-data';
import { scaledProfile } from '../match/selectors';
import { runCombat } from './engine';
import { effectiveStat, isPresent } from './math';
import { analyzeTraits, prepareTraitProfiles } from './traits';
import { blockedCells } from './pathfinding';
import { hexKey } from '../hex';
function setup(stars: 1 | 2 | 3 = 1, ally = false): CombatInput {
  const florin = scaledProfile('florin', stars, config);
  const foe = scaledProfile('test-k01', 1, config);
  foe.stats = {
    ...foe.stats,
    maxHp: 100000,
    attack: 0,
    armor: 0,
    magicResist: 0,
    range: 14,
    critChanceMilli: 0,
    maxMana: 0,
    startingMana: 0,
  };
  delete foe.championAbility;
  foe.ability = null;
  foe.passive = null;
  foe.traits = [];
  return CombatInputSchema.parse({
    protocolVersion: 3,
    rulesVersion: FLORIN_RULES,
    combatId: 'florin-fixture',
    seed: 42,
    maxTicks: 200,
    obstacles: [],
    traits: traitsFor(config.catalog),
    units: [
      {
        id: 'florin',
        definitionId: 'florin',
        owner: 'south',
        position: { q: 1, r: 4 },
        profile: florin,
      },
      {
        id: 'foe',
        definitionId: 'test-k01',
        owner: 'north',
        position: { q: 1, r: 3 },
        profile: foe,
      },
      ...(ally
        ? [
            {
              id: 'ally',
              definitionId: 'dolea',
              owner: 'south',
              position: { q: -2, r: 6 },
              profile: structuredClone(foe),
            },
          ]
        : []),
    ],
  });
}
function passiveOnly(input: CombatInput) {
  const u = input.units[0]!;
  const a = u.profile.championAbility!;
  u.profile.championAbility = {
    id: a.id,
    name: a.name,
    description: a.description,
    icon: a.icon,
    version: 1,
    type: 'passive',
    passive: a.passive!,
  };
  u.profile.stats.maxMana = 0;
  u.profile.stats.startingMana = 0;
  u.profile.stats.critChanceMilli = 0;
  u.profile.traits = [];
  return input;
}
describe('FLORIN versioned combat', () => {
  it.each(
    EXECUTABLE_ITEM_CATALOG.definitions.filter((d) => d.kind === 'completed').map((d) => [d.id]),
  )('executes item %s on Florin without bypassing its ability contract', (id) => {
    const input = setup();
    input.maxTicks = 100;
    input.units[0]!.profile.itemLoadout = {
      version: 'f0p8c-1',
      round: 1,
      seed: 42,
      instances: [{ instanceId: 'florin-item', definitionId: id! }],
    };
    const replay = runCombat(input);
    expect(replay.snapshots[0]!.items!.entries.length).toBeGreaterThan(0);
    expect(replay.result.tick).toBeGreaterThan(0);
    expect(runCombat(input).events).toEqual(replay.events);
  });
  it('reduces off-board recovery healing through item wounds and never catches up missed burns as damage', () => {
    const input = setup(1, true);
    input.maxTicks = 200;
    input.units[1]!.profile.stats.attack = 160;
    const item = EXECUTABLE_ITEM_CATALOG.definitions.find(
      (d) => d.content?.sourceRecordId === 'TFT_Item_Morellonomicon',
    )!;
    input.units[1]!.profile.itemLoadout = {
      version: 'f0p8c-1',
      round: 1,
      seed: 42,
      instances: [{ instanceId: 'wounding-item', definitionId: item.id }],
    };
    const replay = runCombat(input);
    let checked = 0;
    for (const e of replay.events)
      if (e.type === 'heal' && e.payload.targetId === 'florin') {
        const before = replay.snapshots[e.tick - 1]?.units.find((u) => u.id === 'florin');
        const wound = before?.statuses.find(
          (s) => s.group === 'item-wound' && s.expiresTick! > e.tick,
        );
        if (wound && before?.mechanics?.recovery?.away) {
          expect(e.payload.amount).toBe(
            Math.floor((Math.floor((620 * 80) / 1000) * (1000 - wound.amount)) / 1000),
          );
          checked++;
        }
      }
    expect(checked).toBeGreaterThan(0);
    for (const state of replay.snapshots)
      if (state.units.find((u) => u.id === 'florin')?.mechanics?.recovery?.away)
        expect(
          replay.events.some(
            (e) =>
              e.type === 'damage' &&
              e.tick === state.tick &&
              e.payload.targetId === 'florin' &&
              e.payload.origin === 'periodic',
          ),
        ).toBe(false);
  });
  it('keeps Ruman shields separate from item shields', () => {
    const input = setup();
    input.maxTicks = 1;
    input.units[0]!.profile.traits = ['ruman_trinity'];
    for (let n = 1; n < 3; n++)
      input.units.push({
        ...structuredClone(input.units[0]!),
        id: `shield-member-${n}`,
        definitionId: n === 1 ? 'dolea' : 'vargas',
        position: { q: n - 2, r: 5 },
      });
    const item = EXECUTABLE_ITEM_CATALOG.definitions.find(
      (d) => d.content?.sourceRecordId === 'TFT_Item_Crownguard',
    )!;
    input.units[0]!.profile.itemLoadout = {
      version: 'f0p8c-1',
      round: 1,
      seed: 42,
      instances: [{ instanceId: 'crownguard', definitionId: item.id }],
    };
    const replay = runCombat(input);
    const shields = replay.snapshots[0]!.units.find((u) => u.id === 'florin')!.statuses.filter(
      (s) => s.kind === 'shield',
    );
    expect(shields).toHaveLength(2);
    expect(new Set(shields.map((s) => s.id)).size).toBe(2);
    expect(shields.some((s) => s.itemSource)).toBe(true);
    expect(shields.some((s) => !s.itemSource && s.amount === 74)).toBe(true);
  });

  it('adds exactly one real character without changing existing profiles or 36 items', () => {
    expect(matchCatalog(config).at(-1)).toMatchObject({
      id: 'florin',
      cost: 3,
      synergies: ['ruman_trinity', 'perdidos_por_el_mundo', 'mano_de_obra'],
    });
    for (const [id, p] of Object.entries(JARAMILLO_COMBAT_PROFILES))
      expect(FLORIN_COMBAT_PROFILES[id]).toEqual(p);
    expect(FLORIN_TUNING.stats.range).toBe(1);
    expect(
      [1, 2, 3].map((s) => scaledProfile('florin', s as 1 | 2 | 3, config).stats.maxHp),
    ).toEqual([620, 1116, 2008]);
  });
  it.each([1, 2, 3] as const)(
    'uses the documented next basic attack at %i stars without double on-hit',
    (stars) => {
      const input = passiveOnly(setup(stars));
      const replay = runCombat(input);
      const damages = replay.events.filter(
        (e) =>
          e.type === 'damage' && e.payload.sourceId === 'florin' && e.payload.cause === 'attack',
      );
      const triggers = replay.events.filter(
        (e) => e.type === 'passive_trigger' && e.payload.ruleId === 'suela-reforzada',
      );
      const n = FLORIN_TUNING.passive.afterAttacks[stars - 1]! + 1;
      expect(damages.length).toBeGreaterThan(n);
      expect(triggers[0]!.tick).toBe(damages[n - 1]!.tick);
      const powered = damages[n - 1]!;
      expect(powered.type === 'damage' && powered.payload.amount).toBeGreaterThan(
        (damages[0]!.type === 'damage' ? damages[0]!.payload.amount : 0) * 1.3,
      );
      expect(
        replay.events.filter(
          (e) => e.type === 'status_apply' && e.payload.status.key === 'suela-slow',
        ).length > 0,
      ).toBe(stars === 3);
      expect(replay).toEqual(runCombat(input));
      expect(replay.events).toEqual(
        runCombat({ ...input, units: [...input.units].reverse() }).events,
      );
    },
  );
  it.each([1, 2, 3] as const)(
    'resolves documented AD, secondary damage and primary stun for %i stars',
    (stars) => {
      const input = setup(stars);
      input.maxTicks = 20;
      const f = input.units[0]!;
      f.profile.stats.startingMana = 80;
      f.profile.stats.critChanceMilli = 0;
      f.profile.championAbility!.active!.initialMana = 80;
      input.units.push({
        ...structuredClone(input.units[1]!),
        id: 'secondary',
        definitionId: 'test-v02',
        position: { q: 2, r: 3 },
      });
      const replay = runCombat(input),
        damage = replay.events.filter(
          (e) =>
            e.type === 'damage' && e.payload.sourceId === 'florin' && e.payload.cause === 'ability',
        );
      const primary = damage.find((e) => e.type === 'damage' && e.payload.targetId === 'foe')!;
      const secondary = damage.find(
        (e) => e.type === 'damage' && e.payload.targetId === 'secondary',
      )!;
      expect(primary.type === 'damage' && primary.payload.amount).toBe(
        Math.floor((f.profile.stats.attack * FLORIN_TUNING.active.adRatioMilli[stars - 1]!) / 1000),
      );
      expect(secondary.type === 'damage' && secondary.payload.amount).toBe(
        Math.floor(
          (f.profile.stats.attack * FLORIN_TUNING.active.secondaryRatioMilli[stars - 1]!) / 1000,
        ),
      );
      const stun = replay.events.find(
        (e) => e.type === 'status_apply' && e.payload.status.kind === 'stun',
      )!;
      expect(stun.type === 'status_apply' && stun.payload.status.expiresTick! - stun.tick).toBe(
        FLORIN_TUNING.active.stunTicks[stars - 1],
      );
      expect(
        damage.filter(
          (e) => e.tick === primary.tick && e.type === 'damage' && e.payload.targetId === 'foe',
        ),
      ).toHaveLength(1);
    },
  );
  it('performs two off-board recoveries, respects immunity, gives buffs then true basic damage', () => {
    const input = setup(1, true);
    input.maxTicks = 450;
    input.units[1]!.profile.stats.attack = 160;
    const replay = runCombat(input);
    const presence = replay.events.filter((e) => e.type === 'unit_presence');
    expect(presence.filter((e) => e.type === 'unit_presence' && e.payload.away)).toHaveLength(2);
    expect(presence.filter((e) => e.type === 'unit_presence' && !e.payload.away)).toHaveLength(2);
    for (let i = 0; i < presence.length; i += 2) {
      const start = presence[i]!,
        end = presence[i + 1]!;
      expect(
        replay.events.some(
          (e) =>
            e.tick > start.tick &&
            e.tick < end.tick &&
            e.type === 'damage' &&
            (e.payload.sourceId === 'florin' || e.payload.targetId === 'florin'),
        ),
      ).toBe(false);
      const unit = replay.snapshots[start.tick + 1]!.units.find((u) => u.id === 'florin')!;
      expect(isPresent(unit)).toBe(false);
      expect(
        blockedCells(replay.snapshots[start.tick + 1]!.units, [], 'foe').has(hexKey(unit.position)),
      ).toBe(false);
      expect(
        replay.events.some(
          (e) =>
            e.type === 'heal' &&
            e.payload.targetId === 'florin' &&
            e.tick > start.tick &&
            e.tick <= end.tick,
        ),
      ).toBe(true);
    }
    expect(
      replay.events.some(
        (e) =>
          e.type === 'status_apply' &&
          e.payload.status.key === 'mano-ritmo' &&
          e.payload.status.amount === 250,
      ),
    ).toBe(true);
    const second = presence.find(
      (e) => e.type === 'unit_presence' && !e.payload.away && e.payload.stage === 2,
    )!;
    expect(
      replay.events.some(
        (e) =>
          e.tick > second.tick &&
          e.type === 'damage' &&
          e.payload.sourceId === 'florin' &&
          e.payload.cause === 'attack' &&
          e.payload.damageType === 'true',
      ),
    ).toBe(true);
    expect(
      replay.snapshots.map((s) => CombatStateSchema.parse(JSON.parse(JSON.stringify(s)))),
    ).toEqual(replay.snapshots);
    expect(
      replay.events.map((e) => CombatEventV3Schema.parse(JSON.parse(JSON.stringify(e)))),
    ).toEqual(replay.events);
  });
  it('lets living off-board companions finish recovery instead of treating them as dead', () => {
    const input = setup(1, true);
    input.maxTicks = 220;
    input.units[1]!.profile.stats.attack = 130;
    const ally = input.units[2]!;
    ally.definitionId = 'florin';
    ally.profile = scaledProfile('florin', 1, config);
    ally.position = { q: 0, r: 4 };
    const replay = runCombat(input);
    expect(
      replay.snapshots.some((s) =>
        s.units.filter((u) => u.owner === 'south').every((u) => u.mechanics?.recovery?.away),
      ),
    ).toBe(true);
    expect(
      replay.events.some((e) => e.type === 'unit_presence' && e.payload.reason === 'last_ally'),
    ).toBe(false);
  });
  it('immediately returns when alone, without losing the combat while off board', () => {
    const input = setup();
    input.units[1]!.profile.stats.attack = 140;
    const replay = runCombat(input),
      p = replay.events.filter((e) => e.type === 'unit_presence');
    expect(p.length).toBeGreaterThan(0);
    expect(p.some((e) => e.type === 'unit_presence' && e.payload.reason === 'last_ally')).toBe(
      true,
    );
    expect(replay.result.tick).toBeGreaterThan(p[0]!.tick);
  });
  it('keeps collective thresholds inactive for Florin alone or duplicate copies; excludes bench', () => {
    for (const trait of [RUMAN_TRINITY, PERDIDOS_POR_EL_MUNDO]) {
      const result = analyzeTraits(
        [
          { definitionId: 'florin', traits: [trait.id], deployed: true },
          { definitionId: 'florin', traits: [trait.id], deployed: true },
          { definitionId: 'dolea', traits: [trait.id], deployed: false },
        ],
        [trait],
      )[0]!;
      expect(result.count).toBe(1);
      expect(result.active).toBe(false);
    }
    const input = setup();
    const replay = runCombat(input);
    expect(
      replay.events
        .filter((e) => e.type === 'trait_activate')
        .map((e) => e.type === 'trait_activate' && e.payload.traitId),
    ).toEqual(['mano_de_obra']);
  });
  it.each([2, 3])(
    'applies highest Ruman threshold to members only with %i distinct diagnostic contributors',
    (count) => {
      const input = setup();
      input.maxTicks = 1;
      const member = input.units[0]!;
      member.profile.traits = ['ruman_trinity'];
      for (let n = 1; n < count; n++)
        input.units.push({
          ...structuredClone(member),
          id: `member-${n}`,
          definitionId: n === 1 ? 'dolea' : 'vargas',
          position: { q: n - 2, r: 5 },
        });
      const outsider = {
        ...structuredClone(member),
        id: 'outsider',
        definitionId: 'jaramillo',
        position: { q: 2, r: 5 },
      };
      outsider.profile.traits = [];
      input.units.push(outsider);
      const replay = runCombat(input),
        s = replay.snapshots[0]!;
      expect(effectiveStat(s.units.find((u) => u.id === 'florin')!, 'attackSpeedMilli')).toBe(
        count === 2 ? 770 : 840,
      );
      expect(effectiveStat(s.units.find((u) => u.id === 'florin')!, 'abilityPower')).toBe(
        count === 2 ? 10 : 20,
      );
      expect(effectiveStat(s.units.find((u) => u.id === 'outsider')!, 'attackSpeedMilli')).toBe(
        700,
      );
      expect(replay.events.filter((e) => e.type === 'shield_apply')).toHaveLength(
        count === 3 ? 3 : 0,
      );
      if (count === 3)
        expect(
          s.units.find((u) => u.id === 'florin')!.statuses.find((x) => x.kind === 'shield'),
        ).toMatchObject({ amount: 74, expiresTick: 50 });
      expect(prepareTraitProfiles(input).units[0]!.profile.stats.maxHp).toBe(620);
    },
  );
  it.each([2, 3])(
    'uses effective HP and a single nonrecursive Perdidos heal at %i members',
    (count) => {
      const input = setup();
      input.maxTicks = 180;
      input.units[0]!.profile.traits = ['perdidos_por_el_mundo'];
      input.units[1]!.profile.stats.attack = 150;
      for (let n = 1; n < count; n++)
        input.units.push({
          ...structuredClone(input.units[0]!),
          id: `member-${n}`,
          definitionId: n === 1 ? 'dolea' : 'vargas',
          position: { q: n - 2, r: 6 },
        });
      const replay = runCombat(input),
        unit = replay.snapshots[0]!.units.find((u) => u.id === 'florin')!;
      expect(unit.hp).toBe(Math.floor(620 * (count === 2 ? 1.1 : 1.18)));
      const heals = replay.events.filter(
        (e) => e.type === 'heal' && e.payload.targetId === 'florin',
      );
      expect(heals).toHaveLength(count === 3 ? 1 : 0);
      if (count === 3)
        expect(heals[0]!.type === 'heal' && heals[0]!.payload.amount).toBe(
          Math.floor(unit.hp * 0.08),
        );
    },
  );
  it('rejects new mechanics under historical rules', () => {
    const input = setup();
    expect(CombatInputSchema.safeParse({ ...input, rulesVersion: 'f0p6c-1' }).success).toBe(false);
  });
});
