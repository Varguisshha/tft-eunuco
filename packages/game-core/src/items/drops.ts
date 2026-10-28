import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import type { DropJournal } from '@tft/shared';
import { ITEM_DROP_POLICY } from '@tft/game-data';
import { randomUint32 } from '../combat/math';
export function deriveDropSeed(seed: number, label: string): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 16777619) >>> 0;
  return h;
}
/** Domain-separated streams do not advance shop, combat or pairing RNG. */
export function planItemDrop(
  matchId: string,
  round: number,
  seed: number,
  players: string[],
  periodicRemovers = false,
): DropJournal['rounds'][number] {
  if (
    !Number.isSafeInteger(round) ||
    round <= 0 ||
    round % ITEM_DROP_POLICY.everyRounds ||
    players.length < (periodicRemovers ? 1 : 2) ||
    players.length > 4 ||
    new Set(players).size !== players.length
  )
    throw Error('Invalid distribution participants/round');
  const id = bytesToHex(sha256(utf8ToBytes(JSON.stringify(['f0p8d-1', matchId, round]))));
  const roundSeed = deriveDropSeed(seed, id);
  const quantity = randomUint32(deriveDropSeed(roundSeed, 'quantity')).value < 0x80000000 ? 2 : 3;
  return {
    id,
    matchId,
    round,
    version: periodicRemovers ? ('f0p12b-1' as const) : ('f0p8d-1' as const),
    quantity,
    status: 'confirmed' as const,
    players: [...players]
      .sort()
      .map((playerId): DropJournal['rounds'][number]['players'][number] => {
        const playerSeed = deriveDropSeed(roundSeed, `types/${playerId}`);
        let state = playerSeed;
        const definitionIds = Array.from({ length: quantity }, () => {
          const draw = randomUint32(state);
          state = draw.state;
          // Eight divides 2^32 exactly, so no modulo bias.
          return `component-${ITEM_DROP_POLICY.components[draw.value % 8]}`;
        });
        return {
          playerId,
          grantId: id,
          seed: playerSeed,
          definitionIds,
          instanceIds: [] as string[],
        };
      }),
  };
}
