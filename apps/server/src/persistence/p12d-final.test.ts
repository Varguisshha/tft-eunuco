import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { P12D_ECONOMY_CONFIG, P12F_ECONOMY_CONFIG } from '@tft/game-data';
import { LOBBY_VERSION, type LobbySnapshot } from '@tft/shared';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { fixtureUsers } from '../multi-fixture';
import { DurableMatch } from './DurableMatch';
import { encodeStoredMatch, decodeStoredMatch } from './codec';
import {
  P12B_CATALOG_HASH,
  P12D_CATALOG_HASH,
  P12F_CATALOG_HASH,
  type StoredMatch,
} from './snapshot';
it.each(
  ([P12D_ECONOMY_CONFIG, P12F_ECONOMY_CONFIG] as const).flatMap((config) =>
    ([2, 3, 4] as const).map((n) => ({ n, config })),
  ),
)(
  '$n players ($config.combatItemPolicy): durable overtime/double-elimination final, disconnect/resume and codec survive each committed transition',
  async ({ n, config }) => {
    const m = new AuthoritativeMatch(randomUUID(), undefined, () => 360, n, config);
    for (let i = 0; i < n; i++)
      m.join(`socket-${i}`, { userId: fixtureUsers[i]!, name: `Lab ${i}` });
    m.start('socket-0');
    const lobby: LobbySnapshot = {
      version: LOBBY_VERSION,
      roomId: randomUUID(),
      roomCode: 'ABCDEFGH',
      hostUserId: fixtureUsers[0]!,
      capacity: n,
      participants: m.players.map((p) => ({
        userId: p.id,
        name: p.name,
        avatarId: p.avatarId,
        connected: true,
        readyState: true,
      })),
      status: 'in_match',
      createdAt: Date.now(),
      expiresAt: Date.now() + 900000,
      matchId: m.id,
      revision: 1,
    };
    let saved: StoredMatch | undefined;
    const d = new DurableMatch(
      m,
      {
        load: async () => (saved ? [saved] : []),
        commit: async (expected, doc) => {
          expect(expected).toBe(saved?.revision ?? 0);
          saved = decodeStoredMatch(JSON.parse(JSON.stringify(encodeStoredMatch(doc))));
        },
      },
      lobby,
    );
    await d.run(() => {});
    for (let i = 0; i < 100 && !d.match.finalResults; i++) {
      await d.run((x) => {
        const c = x.clock.snapshot();
        x.clock.restore({ ...c, phaseDuration: c.phaseDuration - c.remainingMs, remainingMs: 0 });
        x.pulse();
      });
      expect(() => AuthoritativeMatch.restore(saved!.authority)).not.toThrow();
    }
    expect(d.match.finalResults).not.toBeNull();
    expect(saved!.status).toBe('finished');
    const final = structuredClone(d.match.finalResults),
      deadline = d.retentionDeadline,
      settlements = [...d.match.settlements];
    await d.run((x) => x.disconnect('socket-0'));
    await d.run((x) => x.resume('reconnected', fixtureUsers[0]!));
    expect(d.match.competitiveSnapshot('reconnected').finalResults).toEqual(final);
    expect(d.retentionDeadline).toBe(deadline);
    expect([...d.match.settlements]).toEqual(settlements);
    await d.shutdown();
    expect(P12B_CATALOG_HASH).toBe(
      '0948310d6132a43cf03607ab356c12120357473863ff75c87cdde6fe7b45e72f',
    );
    expect(saved!.authority.catalog).toBe(
      config.combatItemPolicy ? P12F_CATALOG_HASH : P12D_CATALOG_HASH,
    );
  },
  30000,
);
