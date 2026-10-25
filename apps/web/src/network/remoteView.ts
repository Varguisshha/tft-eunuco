import {
  DuelMessageSchema,
  NetworkCombatSchema,
  NetworkSnapshotSchema,
  RoundSnapshotSchema,
  reversePerspective,
  type MatchState,
  type CombatReplay,
} from '@tft/shared';
export type RemoteSnapshot =
  | ReturnType<typeof RoundSnapshotSchema.parse>
  | ReturnType<typeof NetworkSnapshotSchema.parse>;
export type RemoteTrace =
  | ReturnType<typeof DuelMessageSchema.parse>
  | ReturnType<typeof NetworkCombatSchema.parse>;
export const RemoteSnapshotSchema = {
  safeParse(raw: unknown) {
    const modern = RoundSnapshotSchema.safeParse(raw);
    return modern.success ? modern : NetworkSnapshotSchema.safeParse(raw);
  },
};
export const RemoteTraceSchema = {
  safeParse(raw: unknown) {
    const modern = DuelMessageSchema.safeParse(raw);
    return modern.success ? modern : NetworkCombatSchema.safeParse(raw);
  },
};
export function ownPlayer(s: RemoteSnapshot) {
  return s.players.find((p) => p.id === s.playerId)!;
}
export function currentPairing(s: RemoteSnapshot) {
  return 'pairings' in s
    ? (s.pairings.find(
        (p) =>
          p.southPlayerId === s.playerId || (p.kind === 'human' && p.northPlayerId === s.playerId),
      ) ?? null)
    : null;
}
export function opponent(s: RemoteSnapshot) {
  const p = ownPlayer(s);
  return s.players.find((r) => ('opponentId' in p ? r.id === p.opponentId : r.id !== p.id));
}
/** Validate the assignment before a canonical trace is ever exposed to the renderer. */
export function authorizedReplay(s: RemoteSnapshot, t: RemoteTrace): CombatReplay | null {
  if (s.matchId !== t.matchId || !s.combatId || s.combatId !== t.combatId) return null;
  if ('pairings' in s) {
    if (!('pairing' in t)) return null;
    const p = currentPairing(s);
    if (!p || p.round !== s.own.round || JSON.stringify(p) !== JSON.stringify(t.pairing))
      return null;
    const side = p.southPlayerId === s.playerId ? 'south' : 'north';
    if (t.side !== side) return null;
    return side === 'north' ? reversePerspective(t.replay) : t.replay;
  }
  if ('pairing' in t) return null;
  const p = ownPlayer(s);
  return 'side' in p && p.side === 'north' ? reversePerspective(t.replay) : t.replay;
}
export function projectRemote(s: RemoteSnapshot, replay: CombatReplay | null): MatchState {
  const health =
    'hp' in s.own
      ? {
          south: s.own.hp,
          north: opponent(s)?.hp ?? s.own.config.roundDamage.initialHp,
        }
      : s.own.health;
  return {
    ...s.own,
    health,
    seed: 0,
    shopRng: 0,
    combatRng: 0,
    nextEntity: 0,
    pool: {},
    history: [],
    combat: replay
      ? {
          round: s.own.round,
          bank: s.own.gold,
          input: replay.input,
          result: s.own.phase === 'resolution' || s.own.phase === 'finished' ? replay.result : null,
        }
      : null,
  };
}
