import {
  EXECUTABLE_ITEM_CATALOG,
  EFFECT_ITEMS_ECONOMY_CONFIG as config,
  traitsFor,
} from '@tft/game-data';
import { DEFAULT_OVERTIME, type CombatInput } from '@tft/shared';
import { createMatch } from '../match/engine';
import { unit, act } from './fixture.test-support';
import { grantItemInstances } from './inventory';
import { scaledOwnedProfile } from '../match/selectors';
export function battle(items: string[], champion = 'vargas'): CombatInput {
  let s = createMatch(42, config);
  unit(s, 'a', 1, 0, champion);
  if (items.length) grantItemInstances(s, 'g', items);
  for (const i of [...s.items!.completed])
    s = act(s, { type: 'equip_item', unitId: 'a', itemId: i.id });
  const profile = scaledOwnedProfile(s.units[0]!, s.config, s.items, s.round, s.seed);
  const enemy = structuredClone(profile);
  delete enemy.itemLoadout;
  delete enemy.initialItemModifiers;
  enemy.stats.maxHp = 10000;
  enemy.stats.attack = 35;
  return {
    protocolVersion: 3,
    rulesVersion: 'f0p6c-1',
    combatId: 'item-test',
    seed: 42,
    maxTicks: 200,
    overtime: DEFAULT_OVERTIME,
    obstacles: [],
    traits: [...traitsFor('f0p6c')],
    units: [
      { id: 'a', definitionId: champion, owner: 'south', position: { q: 0, r: 4 }, profile },
      { id: 'b', definitionId: champion, owner: 'north', position: { q: 0, r: 3 }, profile: enemy },
      {
        id: 'c',
        definitionId: champion,
        owner: 'north',
        position: { q: 1, r: 3 },
        profile: structuredClone(enemy),
      },
    ],
  };
}

export function stressBattle() {
  const sets = [
    ['RunaansHurricane', 'StatikkShiv', 'GuinsoosRageblade'],
    ['RedBuff', 'Redemption', 'IonicSpark'],
    ['Crownguard', 'DragonsClaw', 'TitansResolve'],
    ['ThiefsGloves'],
  ];
  const input = battle([]);
  input.units = [];
  input.maxTicks = 450;
  for (let i = 0; i < 14; i++) {
    const specimen = battle(
      sets[i % sets.length]!.map(
        (n) =>
          EXECUTABLE_ITEM_CATALOG.definitions.find(
            (d) => d.content?.sourceRecordId === `TFT_Item_${n}`,
          )!.id,
      ),
      ['dolea', 'vargas', 'jaramillo'][i % 3]!,
    ).units[0]!;
    specimen.id = `stress-${i}`;
    specimen.owner = i < 7 ? 'north' : 'south';
    specimen.position = { q: (i % 7) - Math.floor((i < 7 ? 3 : 4) / 2), r: i < 7 ? 3 : 4 };
    specimen.profile.stats.maxHp = 10000;
    for (const item of specimen.profile.itemLoadout!.instances)
      item.instanceId = `stress-${i}/${item.definitionId}`;
    input.units.push(specimen);
  }
  return input;
}
