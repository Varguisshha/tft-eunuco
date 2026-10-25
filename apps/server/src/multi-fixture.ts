/** Controlled local diagnostics only. This module is never imported by main/server production. */
import { commandFor } from '@tft/game-core';
import { NETWORK_VERSION, type MatchCommand } from '@tft/shared';
import { AuthoritativeMatch } from './AuthoritativeMatch';
export const fixtureUsers = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
];
export function multiFixture(capacity: 2 | 3 | 4, seed = 360) {
  let now = 0;
  const match = new AuthoritativeMatch('diagnostic', { now: () => now }, () => seed, capacity);
  for (let i = 0; i < capacity; i++)
    match.join(`socket-${i}`, {
      userId: fixtureUsers[i]!,
      name: `Fixture ${i + 1}`,
      avatarId: 'jade',
    });
  match.start('socket-0');
  return {
    match,
    advance(ms: number) {
      now += ms;
      match.pulse();
    },
  };
}
export function intent(match: AuthoritativeMatch, index: number, command: MatchCommand) {
  const p = match.players[index]!;
  return {
    version: NETWORK_VERSION,
    sessionId: p.sessionId,
    requestId: `intent-${index}-${p.sequence}`,
    sequence: p.sequence,
    matchId: match.id,
    phaseId: match.clock.snapshot().phaseId,
    action: commandFor(p.state, command),
  };
}
export function act(match: AuthoritativeMatch, index: number, command: MatchCommand) {
  const message = intent(match, index, command);
  return match.submit(message.sessionId, message);
}
/** Add explicit test formations and debit real copies; no network mutation exists. */
export function equip(
  match: AuthoritativeMatch,
  indices = match.players.map((_, i) => i),
  definitions = ['dolea', 'vargas'],
  stars: 1 | 2 | 3 = 1,
) {
  for (const i of indices) {
    const p = match.players[i]!;
    if (p.state.units.length) throw new Error('Fixture expects empty inventory');
    p.state.units = definitions.map((definitionId, j) => ({
      id: `${p.id}-fixture-${j}`,
      definitionId,
      stars,
      location: { kind: 'board', hex: { q: j, r: 4 } },
    }));
    for (const u of p.state.units) match.pool[u.definitionId]! -= 3 ** (stars - 1);
  }
  for (const p of match.players) p.state.pool = { ...match.pool };
  match.assertConservation();
}
