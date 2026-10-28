import { PAIRING_VERSION, PairingPlanSchema, type Pairing, type PairingPlan } from '@tft/shared';
export interface PairingHistory {
  round: number;
  pairings: Pairing[];
}
export interface PairingConfig {
  recentWindow: number;
  version?: 'f0p12b-1';
}
export const DEFAULT_PAIRING_CONFIG: PairingConfig = { recentWindow: 6 };
/** Stable unsigned hash; no wall time, connection order or mutable RNG. */
export function deriveSeed(seed: number, label: string): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 16777619) >>> 0;
  return h;
}
const key = (a: string, b: string) => JSON.stringify([a, b].sort());
export function pairRound(
  ids: readonly string[],
  round: number,
  history: readonly PairingHistory[],
  seed: number,
  matchId: string,
  config = DEFAULT_PAIRING_CONFIG,
): PairingPlan {
  if (
    ids.length < 2 ||
    ids.length > (config.version ? 8 : 4) ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !id || id.length > 80) ||
    !Number.isSafeInteger(round) ||
    round < 1 ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !Number.isSafeInteger(config.recentWindow) ||
    config.recentWindow < 1
  )
    throw new Error('Invalid pairing input');
  if (
    history.some((h) => h.round >= round || h.round < 1) ||
    new Set(history.map((h) => h.round)).size !== history.length
  )
    throw new Error('Invalid pairing history');
  const players = [...ids].sort();
  type Candidate = { human: [string, string][]; ghost: [string, string] | null };
  const candidates: Candidate[] = [];
  if (config.version) {
    const matchings = (rest: string[]): [string, string][][] => {
      if (!rest.length) return [[]];
      return rest
        .slice(1)
        .flatMap((b, i) =>
          matchings(rest.filter((_, j) => j !== 0 && j !== i + 1)).map((pairs) => [
            [rest[0]!, b] as [string, string],
            ...pairs,
          ]),
        );
    };
    if (players.length % 2) {
      for (const facing of players) {
        const rest = players.filter((p) => p !== facing);
        for (const human of matchings(rest))
          for (const owner of rest) candidates.push({ human, ghost: [facing, owner] });
      }
    } else for (const human of matchings(players)) candidates.push({ human, ghost: null });
  } else if (players.length === 2)
    candidates.push({ human: [[players[0]!, players[1]!]], ghost: null });
  else if (players.length === 4) {
    for (const index of [1, 2, 3]) {
      const rest = players.filter((_, i) => i !== 0 && i !== index);
      candidates.push({
        human: [
          [players[0]!, players[index]!],
          [rest[0]!, rest[1]!],
        ],
        ghost: null,
      });
    }
  } else {
    for (const facing of players) {
      const rest = players.filter((p) => p !== facing);
      for (const owner of rest)
        candidates.push({ human: [[rest[0]!, rest[1]!]], ghost: [facing, owner] });
    }
  }
  const encounters = history.flatMap((h) => h.pairings.map((p) => ({ ...p, round: h.round })));
  const ranked = candidates
    .map((c) => {
      const pairs = [...c.human, ...(c.ghost ? [c.ghost] : [])];
      const counts = pairs.map(
        ([a, b]) =>
          encounters.filter((p) => key(p.southPlayerId, p.northPlayerId) === key(a, b)).length,
      );
      const recent = pairs.reduce(
        (n, [a, b]) =>
          n +
          encounters.reduce(
            (s, p) =>
              s +
              (key(a, b) === key(p.southPlayerId, p.northPlayerId)
                ? Math.max(0, config.recentWindow + 1 - (round - p.round))
                : 0),
            0,
          ),
        0,
      );
      const ghosts = encounters.filter((p) => p.kind === 'ghost');
      const score = [
        ...(c.ghost
          ? [
              ghosts.filter((p) => p.ghostFacingId === c.ghost![0]).length,
              ghosts.filter((p) => p.ghostOwnerId === c.ghost![1]).length,
            ]
          : []),
        Math.max(...counts),
        counts.reduce((a, b) => a + b, 0),
        recent,
      ];
      const signature = JSON.stringify(c);
      return { c, score, signature, tieBreak: deriveSeed(seed, `${round}:${signature}`) };
    })
    .sort((a, b) => {
      for (let i = 0; i < a.score.length; i++)
        if (a.score[i] !== b.score[i]) return a.score[i]! - b.score[i]!;
      return a.tieBreak - b.tieBreak || (a.signature < b.signature ? -1 : 1);
    });
  const choice = ranked[0]!;
  const pairings: Pairing[] = choice.c.human.map(([southPlayerId, northPlayerId], i) => ({
    id: `${matchId}/round/${round}/pair/${i}`,
    combatId: `${matchId}/round/${round}/combat/${i}`,
    round,
    kind: 'human',
    southPlayerId,
    northPlayerId,
    ghostOwnerId: null,
    ghostFacingId: null,
  }));
  if (choice.c.ghost)
    pairings.push({
      id: `${matchId}/round/${round}/pair/${pairings.length}`,
      combatId: `${matchId}/round/${round}/combat/${pairings.length}`,
      round,
      kind: 'ghost',
      southPlayerId: choice.c.ghost[0],
      northPlayerId: choice.c.ghost[1],
      ghostFacingId: choice.c.ghost[0],
      ghostOwnerId: choice.c.ghost[1],
    });
  return PairingPlanSchema.parse({
    version: PAIRING_VERSION,
    round,
    pairings,
    decision: {
      policy: config.version ? 'balanced-history-v2' : 'balanced-history-v1',
      score: choice.score,
      tieBreak: choice.tieBreak,
    },
  });
}
