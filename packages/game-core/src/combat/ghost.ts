import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { CombatInputSchema, type CombatInput } from '@tft/shared';
/** Freeze only the battle contract. Never copy a participant or economic state. */
export function withGhostArmy(
  input: CombatInput,
  sourcePlayerId: string,
  realPlayerId: string,
): CombatInput {
  if (input.ghost || !input.combatId) throw Error('Ghost requires a fresh identified combat');
  const copy = structuredClone(input);
  const domain = bytesToHex(sha256(utf8ToBytes(JSON.stringify([input.combatId, sourcePlayerId]))));
  const units = copy.units
    .filter((u) => u.owner === 'north')
    .map((u, i) => {
      const sourceUnitId = u.id;
      u.id = `ghost-${domain.slice(0, 48)}-${i}`;
      return { unitId: u.id, sourceUnitId };
    });
  copy.ghost = {
    version: 'f0p12b-1',
    side: 'north',
    sourcePlayerId,
    realPlayerId,
    damageMultiplierMilli: 800,
    units,
  };
  return CombatInputSchema.parse(copy);
}
