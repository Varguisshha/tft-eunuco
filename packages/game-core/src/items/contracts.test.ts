import { describe, it, expect } from 'vitest';
import {
  ITEM_CATALOG,
  DIAGNOSTIC_ITEM_CATALOG,
  ITEM_DROP_DESIGN,
  validateItemCatalog,
  recipeKey,
  itemBonusDescription,
  JARAMILLO_ECONOMY_CONFIG,
} from '@tft/game-data';
import {
  ComponentDefinitionSchema,
  CompleteItemDefinitionSchema,
  ItemDropDesignSchema,
  NetworkCommandSchema,
  PlayerItemStateSchema,
} from '@tft/shared';
import { createMatch } from '../match/engine';
import { validateMatchState } from '../match/invariants';
import { createItemInventory } from './inventory';
describe('P8A item contracts and reserved recipes', () => {
  it('registers exactly eight technical categories with no final stat values or complete competitive items', () => {
    expect(ITEM_CATALOG.definitions).toHaveLength(8);
    for (const d of ITEM_CATALOG.definitions) {
      expect(ComponentDefinitionSchema.safeParse(d).success).toBe(true);
      expect(d.bonuses).toEqual([]);
      expect(itemBonusDescription(d.bonuses)).toContain('pendientes');
    }
    expect(ITEM_CATALOG.recipes.every((r) => r.resultId === null)).toBe(true);
    for (const d of DIAGNOSTIC_ITEM_CATALOG.definitions.filter((d) => d.kind === 'completed'))
      expect(CompleteItemDefinitionSchema.safeParse(d).success).toBe(true);
  });
  it('covers all 36 symmetric unordered pairs, including eight repeated pairs', () => {
    const pairs = new Set<string>();
    for (const a of ITEM_CATALOG.definitions)
      for (const b of ITEM_CATALOG.definitions) {
        expect(recipeKey(a.id, b.id)).toBe(recipeKey(b.id, a.id));
        pairs.add(recipeKey(a.id, b.id));
      }
    expect(pairs.size).toBe(36);
    expect(new Set(ITEM_CATALOG.recipes.map((r) => r.id))).toEqual(pairs);
    expect(ITEM_CATALOG.recipes.filter((r) => r.components[0] === r.components[1])).toHaveLength(8);
  });
  it('rejects duplicate definitions, symmetric duplicate recipes, missing pairs and bad results', () => {
    const c = structuredClone(ITEM_CATALOG);
    c.definitions.push(c.definitions[0]!);
    expect(() => validateItemCatalog(c)).toThrow();
    const r = structuredClone(ITEM_CATALOG);
    r.recipes[1] = r.recipes[0]!;
    expect(() => validateItemCatalog(r)).toThrow();
    const missing = structuredClone(ITEM_CATALOG);
    missing.recipes.pop();
    expect(() => validateItemCatalog(missing)).toThrow();
    const bad = structuredClone(ITEM_CATALOG);
    bad.recipes[0]!.resultId = 'unregistered';
    expect(() => validateItemCatalog(bad)).toThrow();
  });
  it('rejects unsupported versions and active special effects', () => {
    expect(() => validateItemCatalog({ ...ITEM_CATALOG, version: 'next' })).toThrow();
    const d = DIAGNOSTIC_ITEM_CATALOG.definitions.find((d) => d.kind === 'completed')!;
    expect(
      CompleteItemDefinitionSchema.safeParse({
        ...d,
        effects: [
          {
            id: 'reserved-shield',
            implementation: 'reserved',
            trigger: 'combat_start',
            effects: [{ kind: 'shield', amount: 30, target: 'self', radius: 0, duration: 5 }],
          },
        ],
      }).success,
    ).toBe(false);
  });
  it('keeps historical saves byte-equivalent without phantom inventory and rejects imported invented inventories', () => {
    const old = createMatch(42, JARAMILLO_ECONOMY_CONFIG);
    expect(validateMatchState(JSON.parse(JSON.stringify(old)))).toEqual(old);
    expect(old).not.toHaveProperty('items');
    expect(() =>
      validateMatchState({
        ...old,
        items: createItemInventory('00000000-0000-4000-8000-000000000001'),
      }),
    ).toThrow();
    expect(
      PlayerItemStateSchema.safeParse({
        ...createItemInventory('00000000-0000-4000-8000-000000000001'),
        version: 2,
      }).success,
    ).toBe(false);
  });
  it('reserves the agreed deterministic drop design without enabling a scheduler', () => {
    expect(ITEM_DROP_DESIGN).toMatchObject({
      enabled: false,
      everyRounds: 3,
      quantity: [
        { count: 2, weight: 50 },
        { count: 3, weight: 50 },
      ],
      quantityScope: 'round-alive-players',
      typesScope: 'independent-per-player',
    });
    expect(ItemDropDesignSchema.safeParse({ ...ITEM_DROP_DESIGN, enabled: true }).success).toBe(
      false,
    );
  });
  it('rejects inventory replacement and DEV generation in normal network commands', () => {
    const envelope = {
      version: 'f0p7b1-1',
      sessionId: 's',
      requestId: 'r',
      sequence: 0,
      matchId: 'm',
      phaseId: 'p',
    };
    expect(
      NetworkCommandSchema.safeParse({
        ...envelope,
        action: {
          type: 'grant_items',
          definitionIds: ['component-ad'],
          seq: 0,
          expectedRevision: 0,
        },
      }).success,
    ).toBe(false);
    expect(
      NetworkCommandSchema.safeParse({
        ...envelope,
        action: {
          type: 'equip_item',
          itemId: 'x',
          unitId: 'u',
          ownerId: 'other',
          seq: 0,
          expectedRevision: 0,
        },
      }).success,
    ).toBe(false);
  });
});
