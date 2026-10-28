import { TFT185_REVISED_ITEM_VERSION, type PlannedItemEffect } from '@tft/shared';
import { TFT185_ITEM_CATALOG, TFT185_PENDING } from './items-tft185';
import { validateItemCatalog } from './items';
import resolution from './reference/p11h-item-resolution.json';
export const P11H_ITEM_RESOLUTION = resolution;
export const P11H_PENDING: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    Object.entries(TFT185_PENDING).filter(([id]) => !(id in resolution.resolved)),
  ),
  TFT_Item_PowerGauntlet:
    'Base oficial 10 %, 5 % por crítico durante 5 s, máximo 4. Pendiente: renovación y expiración de cada acumulación en 18.5; no se ejecuta.',
};
/** Derivation only. B/C/G definitions and fingerprint inputs remain byte-equivalent. */
export const P11H_ITEM_CATALOG = validateItemCatalog({
  ...TFT185_ITEM_CATALOG,
  version: TFT185_REVISED_ITEM_VERSION,
  definitions: structuredClone(TFT185_ITEM_CATALOG.definitions).map((d) => {
    const id = d.content!.sourceRecordId,
      resolved = id in resolution.resolved;
    if (d.kind !== 'completed') return d;
    if (resolved) {
      d.availability = 'available';
      d.content!.competitive = true;
      d.content!.combat = 'compatible';
      for (const e of d.effects) if (e.implementation !== 'reserved') e.note = '';
      d.effects.unshift({
        id: 'verified-base-amp',
        implementation: 'executable-v1',
        trigger: 'combat_start',
        target: 'self',
        operation: {
          kind: 'damage_amp',
          ratioMilli:
            id === 'TFT_Item_MadredsBloodrazor'
              ? resolution.resolved.TFT_Item_MadredsBloodrazor.baseAmpMilli
              : resolution.resolved.TFT_Item_RapidFireCannon.baseAmpMilli,
        },
        durationTicks: null,
        stacking: 'independent',
        capability: 'direct',
        note: '',
      } as PlannedItemEffect);
      if (id === 'TFT_Item_RapidFireCannon')
        d.effects = d.effects.filter(
          (e) =>
            e.id === 'verified-base-amp' ||
            e.implementation === 'reserved' ||
            e.operation.kind !== 'damage_amp',
        );
    }
    for (const e of d.effects) {
      if (e.implementation === 'reserved') continue;
      if (P11H_PENDING[id]) e.note = P11H_PENDING[id]!;
      if (e.operation.kind === 'untargetable_cleanse')
        e.note += ' No elimina quemaduras ni otro daño periódico.';
      if (e.operation.kind === 'precision')
        e.note = 'No anula una prohibición personal explícita de crítico.';
      if (e.operation.kind === 'damage_amp' || e.operation.kind === 'damage_reduction')
        e.note += ' En EUNUCO no modifica daño verdadero.';
    }
    return d;
  }),
});
export const P11H_ITEM_POLICY = {
  version: TFT185_REVISED_ITEM_VERSION,
  reference: resolution,
  personalNoCrit: 'explicit-false-precedes-precision',
  trueDamage: 'unchanged-excludes-amp-and-reduction-no-new-global-rule',
  blocked: Object.keys(P11H_PENDING).sort(),
  combatPurchase:
    'bench-only-combine-bench-excluding-frozen-input-defer-board-merges-to-preparation',
} as const;
