import {
  CombatStatisticsSchema,
  type CombatStatistics,
  type CombatEventV3,
  type CombatInput,
} from '@tft/shared';
import { compareIds } from './math';
/** Logical HP loss only; shields, mitigation, item/periodic subsets and overheal remain explicit. */
export function combatStatistics(input: {
  combatId: string;
  round: number;
  units: readonly CombatInput['units'][number][];
  events: readonly CombatEventV3[];
  observedTick: number;
  complete: boolean;
}): CombatStatistics {
  const rows = new Map(
    input.units.map((u) => [
      u.id,
      {
        unitId: u.id,
        definitionId: u.definitionId,
        owner: u.owner,
        stars: u.profile.starLevel ?? 1,
        dealt: 0,
        received: 0,
        healing: 0,
        shieldAbsorbed: 0,
        shieldDamage: 0,
        mitigated: 0,
        overheal: 0,
        healingPrevented: 0,
        defenseAmplification: 0,
        itemDamage: 0,
        periodicDamage: 0,
      },
    ]),
  );
  const coverage = { mitigation: true, overheal: true },
    seen = new Set<string>();
  let unattributedDamage = 0;
  for (const e of input.events) {
    if (e.tick > input.observedTick) continue;
    const key = `${e.tick}/${e.order}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (e.type === 'damage') {
      const p = e.payload,
        target = rows.get(p.targetId),
        source = rows.get(
          p.responsibleId === null ? '' : (p.responsibleId ?? p.itemSource?.unitId ?? p.sourceId),
        );
      if (target) {
        target.received += p.amount;
        target.shieldAbsorbed += p.absorbed;
        if (p.accounting) {
          target.mitigated += p.accounting.mitigated;
          target.defenseAmplification += p.accounting.defenseAmplification;
        }
      }
      if (source) {
        source.dealt += p.amount;
        source.shieldDamage += p.absorbed;
        if (p.itemSource) source.itemDamage += p.amount;
        if (p.origin === 'periodic' || p.itemSource?.damageClass === 'periodic')
          source.periodicDamage += p.amount;
      } else unattributedDamage += p.amount;
      if (!p.accounting) coverage.mitigation = false;
    } else if (e.type === 'heal') {
      const p = e.payload,
        source = rows.get(p.itemSource?.unitId ?? p.sourceId);
      if (source) {
        source.healing += p.amount;
        if (p.accounting) {
          source.overheal += p.accounting.overheal;
          source.healingPrevented += p.accounting.prevented;
        }
      }
      if (!p.accounting) coverage.overheal = false;
    }
  }
  return CombatStatisticsSchema.parse({
    version: 'f0p11c-1',
    combatId: input.combatId,
    round: input.round,
    observedTick: input.observedTick,
    complete: input.complete,
    coverage,
    unattributedDamage,
    units: [...rows.values()].sort((a, b) => compareIds(a.unitId, b.unitId)),
  });
}
