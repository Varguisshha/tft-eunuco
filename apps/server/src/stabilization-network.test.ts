/** P8F: real sockets, normal economy, only the laboratory clock is accelerated. */
import { afterAll, beforeAll, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Client, type Room } from '@colyseus/sdk';
import { ServerError } from '@colyseus/core';
import { INTEGRATED_ECONOMY_CONFIG } from '@tft/game-data';
import {
  LOBBY_VERSION,
  RECOVERY_VERSION,
  CompetitiveSnapshotSchema,
  type CompetitiveSnapshot,
  type MatchCommand,
  type ActionReceipt,
  type LobbyEvent,
} from '@tft/shared';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { MatchRoom } from './MatchRoom';
import { createServer } from './server';
import { fixtureUsers, intent } from './multi-fixture';
let now = 0;
const authorities = new Map<string, AuthoritativeMatch>();
async function verify(token: unknown) {
  const index = ['fixture-0', 'fixture-1', 'fixture-2', 'fixture-3'].indexOf(String(token));
  if (index < 0) throw new ServerError(401, 'Invalid fixture');
  return {
    token: String(token),
    userId: fixtureUsers[index]!,
    name: ['Vargas', 'Florin', 'Nora', 'Alex'][index]!,
    avatarId: 'jade' as const,
    expiresAt: Date.now() + 3600000,
  };
}
class Laboratory extends MatchRoom {
  static onAuth = verify;
  protected verify = verify;
  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    const state = new AuthoritativeMatch(
      this.roomId,
      { now: () => now },
      undefined,
      capacity,
      INTEGRATED_ECONOMY_CONFIG,
    ).exportState();
    state.rng = 80126;
    state.itemDrops!.seed = 80626;
    const match = AuthoritativeMatch.restore(state, { now: () => now }, false);
    authorities.set(this.roomId, match);
    return match;
  }
}
const server = createServer(Laboratory, verify);
const sockets: Room[] = [];
beforeAll(() => server.listen(2591, '127.0.0.1'));
afterAll(async () => {
  await Promise.all(
    sockets.filter((s) => s.connection.isOpen).map((s) => s.leave().catch(() => {})),
  );
  await server.gracefullyShutdown(false);
});
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(check: () => boolean) {
  const limit = Date.now() + 6000;
  while (!check()) {
    if (Date.now() > limit) throw Error('P8F timeout');
    await delay(10);
  }
}
function client(i: number) {
  const c = new Client('http://127.0.0.1:2591');
  c.auth.token = `fixture-${i}`;
  return c;
}
async function lobby(room: Room, type: string, extra = {}) {
  const requestId = randomUUID();
  let result: LobbyEvent | undefined;
  const off = room.onMessage('lobby_event', (e: LobbyEvent) => {
    if (e.requestId === requestId) result = e;
  });
  room.send('lobby_action', { version: LOBBY_VERSION, requestId, type, ...extra });
  await until(() => !!result);
  off();
  expect(result!.error).toBeNull();
  return result!;
}
it.each([2, 3, 4] as const)(
  '%i authenticated clients complete an unmodified integrated economy campaign',
  async (count) => {
    now = 0;
    const gateways: Room[] = [];
    const peers: Room[] = [];
    const views: (CompetitiveSnapshot | undefined)[] = [];
    const receipts: ActionReceipt[][] = Array.from({ length: count }, () => []);
    for (let i = 0; i < count; i++) {
      const gateway = await client(i).create('lobby_gateway');
      gateway.onMessage('lobby_event', () => {});
      gateways.push(gateway);
      sockets.push(gateway);
    }
    const created = await lobby(gateways[0]!, 'create_lobby', { capacity: count });
    for (let i = 1; i < count; i++)
      await lobby(gateways[i]!, 'join_lobby', { roomCode: created.lobby!.roomCode });
    for (const gateway of gateways) await lobby(gateway, 'set_ready', { readyState: true });
    const started = await lobby(gateways[0]!, 'start_match');
    async function joinPeer(i: number) {
      const peer = await client(i).joinById(started.lobby!.matchId!, {
        recoveryVersion: RECOVERY_VERSION,
      });
      peer.onMessage('state_snapshot', (raw: unknown) => {
        views[i] = CompetitiveSnapshotSchema.parse(raw);
      });
      peer.onMessage('action_receipt', (receipt: ActionReceipt) => receipts[i]!.push(receipt));
      for (const name of [
        'combat_trace',
        'final_results',
        'spectate_snapshot',
        'service_status',
        'resume_accepted',
      ])
        peer.onMessage(name, () => {});
      peers[i] = peer;
      sockets.push(peer);
      peer.send('sync', null);
    }
    for (let i = 0; i < count; i++) await joinPeer(i);
    const match = authorities.get(started.lobby!.matchId!)!;
    await until(
      () => views.every((v) => v?.clock.currentPhase === 'preparation') && views.length === count,
    );
    const initial = match.exportState();
    const observedCharacters = new Set<string>();
    const phases: unknown[] = [];
    const actions: Record<string, number> = {};
    const faults: string[] = [];
    let fusion = false;
    let ghost = false;
    let spectator = false;
    async function command(i: number, action: MatchCommand) {
      const message = intent(match, i, action);
      const interrupt =
        count === 4 &&
        ['buy_unit', 'equip_item'].includes(action.type) &&
        !faults.includes(action.type);
      const control = interrupt
        ? AuthoritativeMatch.restore(match.exportState(), { now: () => now }, false)
        : null;
      const expected = control?.submit(message.sessionId, message);
      const before = receipts[i]!.length;
      if (count === 4) await delay(75); // Reproducible delayed intent, not altered server rules.
      peers[i]!.send('command', message);
      if (expected?.accepted) {
        // Disconnect immediately after send, before waiting for an acknowledgement.
        await peers[i]!.leave();
        await joinPeer(i);
        await until(() => views[i]?.revision === match.revision);
        const receiptCount = receipts[i]!.length;
        peers[i]!.send('command', { ...message, sessionId: peers[i]!.sessionId });
        await until(() => receipts[i]!.length > receiptCount);
        expect(receipts[i]!.at(-1)!.accepted).toBe(true);
        expect(match.players[i]!.state).toEqual(control!.players[i]!.state);
        faults.push(action.type);
      } else await until(() => receipts[i]!.length > before);
      const receipt = receipts[i]!.at(-1)!;
      if (receipt.accepted) actions[action.type] = (actions[action.type] ?? 0) + 1;
      await delay(36); // Stay within the actual 30 messages/s admission limit.
      return receipt.accepted;
    }
    for (let step = 0; step < 240 && !match.finalResults; step++) {
      const clock = match.clock.snapshot();
      if (clock.currentPhase === 'preparation') {
        for (let i = 0; i < count; i++) {
          const p = match.players[i]!;
          if (p.eliminated) continue;
          if (count > 2 && i === 0 && p.state.round >= 7) {
            for (const unit of [...p.state.units])
              await command(i, { type: 'sell_unit', unitId: unit.id });
            continue;
          }
          // Different ordinary purchasing policies produce eliminations without editing HP.
          const target = i === count - 1 ? 7 : i === 0 ? 2 : 4;
          if (p.state.level < target && p.state.gold >= 8) await command(i, { type: 'buy_xp' });
          for (const offer of [...p.state.shop]) {
            if (!offer) continue;
            observedCharacters.add(offer.definitionId);
            if (p.state.units.length >= target + 3) continue;
            await command(i, { type: 'buy_unit', offerId: offer.id });
          }
          let deployed = p.state.units.filter((u) => u.location.kind === 'board').length;
          for (const unit of [...p.state.units]) {
            fusion ||= unit.stars > 1;
            if (unit.location.kind !== 'bench' || deployed >= Math.min(target, p.state.level))
              continue;
            for (let q = -2; q < 5; q++) {
              if (
                p.state.units.some(
                  (u) =>
                    u.location.kind === 'board' && u.location.hex.q === q && u.location.hex.r === 4,
                )
              )
                continue;
              if (
                await command(i, {
                  type: 'move_unit',
                  unitId: unit.id,
                  to: { kind: 'board', hex: { q, r: 4 } },
                })
              )
                deployed++;
              break;
            }
          }
          const items = p.state.items!;
          if (items.components.length >= 2 && i !== 0) {
            await command(i, {
              type: 'combine_components',
              firstId: items.components[0]!.id,
              secondId: items.components[1]!.id,
            });
          }
          for (const item of [...p.state.items!.completed]) {
            for (const unit of p.state.units.filter((u) => u.location.kind === 'board')) {
              if (await command(i, { type: 'equip_item', itemId: item.id, unitId: unit.id })) break;
            }
          }
        }
      }
      match.assertConservation();
      if (
        count === 4 &&
        ((clock.currentPhase === 'combat' && match.players[0]!.state.round === 2) ||
          (clock.currentPhase === 'resolution' && match.players[0]!.state.round === 3))
      ) {
        const saved = match.players.map((p) => structuredClone(p.state));
        await Promise.all(peers.map((p) => p.leave()));
        for (let i = 0; i < count; i++) await joinPeer(i);
        await until(() => views.every((v) => v?.revision === match.revision));
        expect(match.players.map((p) => p.state)).toEqual(saved);
        faults.push(`all-offline-${clock.currentPhase}`);
      }
      for (const view of views) {
        expect(view).not.toHaveProperty('rng');
        expect(view).not.toHaveProperty('itemDrops');
        expect(view!.players.every((p) => !('items' in p))).toBe(true);
      }
      ghost ||= match.duels.some((d) => d.pairing.kind === 'ghost');
      spectator ||= match.players.some((p) => p.eliminated) && !match.finalResults;
      phases.push({
        round: clock.roundId,
        phase: clock.currentPhase,
        alive: match.players.filter((p) => !p.eliminated).length,
        gold: match.players.map((p) => p.state.gold),
        drops: match.exportState().itemDrops!.rounds,
      });
      now += match.clock.snapshot().remainingMs;
      match.pulse();
      await until(() => views.every((v) => v?.revision === match.revision));
    }
    mkdirSync('artifacts/p8f', { recursive: true });
    writeFileSync(
      `artifacts/p8f/campaign-${count}.json`,
      JSON.stringify(
        {
          faults,
          initial,
          phases,
          actions,
          observedCharacters: [...observedCharacters],
          fusion,
          ghost,
          spectator,
          final: match.exportState(),
        },
        null,
        2,
      ),
    );
    for (const peer of peers) await peer.leave();
    for (const gateway of gateways) {
      await lobby(gateway, 'leave_lobby');
      await gateway.leave();
    }
    expect(match.finalResults).not.toBeNull();
    expect(match.finalResults!.standings).toHaveLength(count);
    expect(match.exportState().itemDrops!.rounds.map((d) => d.round)).toEqual(
      expect.arrayContaining([3, 6]),
    );
    for (const id of ['dolea', 'vargas', 'jaramillo', 'florin'])
      expect(observedCharacters.has(id)).toBe(true);
    expect(fusion).toBe(true);
    expect(actions.combine_components).toBeGreaterThan(0);
    expect(actions.equip_item).toBeGreaterThan(0);
    if (count === 4)
      expect(faults).toEqual(
        expect.arrayContaining([
          'buy_unit',
          'equip_item',
          'all-offline-combat',
          'all-offline-resolution',
        ]),
      );
    if (count === 3) expect(ghost).toBe(true);
    if (count > 2) expect(spectator).toBe(true);
    for (const view of views) expect(view!.finalResults).toEqual(match.finalResults);
  },
  120000,
);
