import { it, expect } from 'vitest';
import { analyzeTraits } from '@tft/game-core';
import { TraitDefinitionSchema } from '@tft/shared';
import { sortTraitRows, traitState, traitStatus } from './traitOrder';
function row(
  id: string,
  count: number,
  thresholds = [2, 4],
  pending: readonly number[] = [],
  unique = false,
) {
  const trait = TraitDefinitionSchema.parse({
    id,
    name: id,
    version: 1,
    icon: id,
    description: 'Fixture de orden',
    visual: { tone: 'jade', provisional: false },
    stacking: 'highest',
    recipients: 'members',
    ...(unique
      ? {
          planning: {
            kind: 'unique',
            members: ['member-0'],
            effectState: pending.length ? 'pending_effects' : 'implemented',
            sourceVersion: 'test',
          },
        }
      : {}),
    thresholds: thresholds.map((n) => ({
      count: n,
      effectState: pending.includes(n) ? 'pending_effects' : 'implemented',
      description: pending.includes(n) ? 'Pendiente' : 'Implementado',
      bonuses: pending.includes(n) ? [] : [{ stat: 'attack', mode: 'flat', amount: 1 }],
      effects: [],
    })),
  });
  return analyzeTraits(
    Array.from({ length: count }, (_, i) => ({
      definitionId: `member-${i}`,
      traits: [id],
      deployed: true,
    })),
    [trait],
  )[0]!;
}
it('orders real activation before pending progress, then level and exact relative progress, with stable ID ties', () => {
  const rows = [
    row('pending', 4, [2, 4], [2, 4]),
    row('zero', 0),
    row('b', 3),
    row('a', 3),
    row('high', 4),
    row('partial', 1),
  ];
  const before = structuredClone(rows);
  expect(sortTraitRows(rows).map((r) => r.trait.id)).toEqual([
    'high',
    'a',
    'b',
    'pending',
    'partial',
    'zero',
  ]);
  expect(rows).toEqual(before);
  expect(sortTraitRows([...rows].reverse()).map((r) => r.trait.id)).toEqual([
    'high',
    'a',
    'b',
    'pending',
    'partial',
    'zero',
  ]);
});
it('compares progress by cross products, not absolute counts or rounded percentages', () => {
  expect(
    sortTraitRows([row('less', 4, [3, 6]), row('more', 3, [2, 4])]).map((r) => r.trait.id),
  ).toEqual(['more', 'less']);
});
it('retains the lower implemented effect when a reached higher threshold is pending, without calling it an active reward', () => {
  const mixed = row('mixed', 6, [2, 4, 6], [4, 6]);
  expect(traitState(mixed)).toMatchObject({ active: true, implementedLevel: 1, pending: true });
  expect(traitStatus(mixed)).toContain('Nivel 3');
  expect(traitStatus(mixed)).toContain('efecto activo 1');
  expect(mixed.thresholds.map((t) => t.count)).toEqual([2]);
  const waiting = row('waiting', 2, [2], [2]);
  expect(traitState(waiting).active).toBe(false);
  expect(traitStatus(waiting)).toContain('Efectos pendientes');
});
it('recognizes unique1/1 as membership, keeps pending uniques inactive, and includes all rows beyond eight', () => {
  const unique = row('unique', 1, [1], [], true),
    pending = row('pending-unique', 1, [1], [1], true);
  expect(traitStatus(unique)).toBe('Atributo único · Activo');
  expect(traitStatus(pending)).toBe('Atributo único · Efecto pendiente');
  const many = [
    pending,
    ...Array.from({ length: 14 }, (_, i) => row(`trait-${i.toString().padStart(2, '0')}`, 2)),
    unique,
  ];
  expect(sortTraitRows(many)).toHaveLength(16);
  expect(sortTraitRows(many).at(-1)).toBe(pending);
});
