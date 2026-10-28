import { INTEGRATED_ECONOMY_CONFIG } from '@tft/game-data';
import { AuthoritativeMatch } from '../../../server/src/AuthoritativeMatch';
import { act } from '../../../server/src/multi-fixture';
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Room } from '@colyseus/sdk';
import { RECOVERY_VERSION, PAIRING_VERSION, reversePerspective } from '@tft/shared';
import { multiFixture, equip } from '../../../server/src/multi-fixture';
import { RemoteCoordinator } from './RemoteCoordinator';
import { authorizedReplay, currentPairing, opponent, projectRemote } from './remoteView';
function fixture(count: 2 | 3 | 4 = 4) {
  const f = multiFixture(count);
  equip(f.match);
  f.advance(30000);
  const snapshot = (i: number) => f.match.roundSnapshot(`socket-${i}`);
  const trace = (i: number) => {
    const d = f.match.duelFor(`socket-${i}`)!;
    return {
      version: PAIRING_VERSION,
      matchId: f.match.id,
      combatId: d.pairing.combatId,
      pairing: d.pairing,
      side:
        d.pairing.southPlayerId === snapshot(i).playerId ? ('south' as const) : ('north' as const),
      startedAt: f.match.clock.snapshot().phaseStart,
      replay: d.replay,
    };
  };
  return { ...f, snapshot, trace };
}
function socket() {
  const handlers = new Map<string, (raw: unknown) => void>();
  const room = {
    roomId: 'diagnostic',
    sessionId: 'socket-0',
    reconnection: { enabled: true },
    onMessage: (key: string, cb: (raw: unknown) => void) => handlers.set(key, cb),
    onLeave: vi.fn(),
    send: vi.fn(),
    leave: vi.fn(),
  };
  return {
    room: room as unknown as Room,
    send: (key: string, data: unknown) => handlers.get(key)!(data),
    sent: room.send,
  };
}
afterEach(() => vi.useRealTimers());
describe('private duel presentation', () => {
  it.each([2, 3, 4] as const)('projects %i identities and only the assigned enemy', (count) => {
    const f = fixture(count);
    for (let i = 0; i < count; i++) {
      const s = f.snapshot(i),
        t = f.trace(i),
        r = authorizedReplay(s, t)!;
      expect(currentPairing(s)?.combatId).toBe(s.combatId);
      expect(opponent(s)?.id).toBe(s.players[i]!.opponentId);
      expect(r).toEqual(t.side === 'north' ? reversePerspective(t.replay) : t.replay);
      expect(projectRemote(s, r).health.south).toBe(s.own.hp);
      expect(projectRemote(s, r).pool).toEqual({});
    }
  });
  it('rejects wrong identity, side, round, pairing, match and unauthorized trace', () => {
    const f = fixture(),
      s = f.snapshot(0),
      t = f.trace(0);
    const other = [1, 2, 3].find((i) => f.trace(i).combatId !== t.combatId)!;
    expect(authorizedReplay(s, f.trace(other))).toBeNull();
    expect(authorizedReplay(s, { ...t, side: t.side === 'south' ? 'north' : 'south' })).toBeNull();
    expect(authorizedReplay(s, { ...t, matchId: 'other' })).toBeNull();
    expect(authorizedReplay({ ...s, own: { ...s.own, round: 2 } }, t)).toBeNull();
    expect(authorizedReplay({ ...s, pairings: [] }, t)).toBeNull();
  });
  it('ghost owner sees own human duel, ghost facing player sees isolated copy', () => {
    const f = fixture(3),
      ghost = f.match.duels.find((d) => d.pairing.kind === 'ghost')!;
    const owner = f.match.players.findIndex((p) => p.id === ghost.pairing.northPlayerId);
    expect(currentPairing(f.snapshot(owner))?.kind).toBe('human');
    const facing = f.match.players.findIndex((p) => p.id === ghost.pairing.southPlayerId);
    expect(currentPairing(f.snapshot(facing))?.kind).toBe('ghost');
    expect(authorizedReplay(f.snapshot(owner), f.trace(facing))).toBeNull();
  });
  it('buffers trace before snapshot, retains replay identity across revisions and clears next round', () => {
    vi.useFakeTimers();
    const f = fixture(),
      ws = socket(),
      remote = new RemoteCoordinator(ws.room);
    ws.send('combat_trace', f.trace(0));
    expect(remote.getReplay()).toBeNull();
    ws.send('state_snapshot', f.snapshot(0));
    const replay = remote.getReplay();
    expect(replay).not.toBeNull();
    ws.send('state_snapshot', { ...f.snapshot(0), revision: f.snapshot(0).revision + 1 });
    expect(remote.getReplay()).toBe(replay);
    ws.send('combat_trace', f.trace(1));
    expect(remote.getReplay()).toBe(replay);
    const s = f.snapshot(0);
    ws.send('state_snapshot', {
      ...s,
      revision: s.revision + 2,
      combatId: null,
      pairings: [],
      own: { ...s.own, phase: 'preparation', round: 2 },
    });
    expect(remote.getReplay()).toBeNull();
    remote.dispose();
  });
  it('accepts snapshot before trace and ignores stale, malformed and changed-player snapshots', () => {
    vi.useFakeTimers();
    const f = fixture(),
      ws = socket(),
      remote = new RemoteCoordinator(ws.room),
      s = f.snapshot(0);
    ws.send('state_snapshot', s);
    expect(remote.getReplay()).toBeNull();
    ws.send('combat_trace', f.trace(0));
    expect(remote.getReplay()).not.toBeNull();
    const state = remote.getMatch();
    ws.send('state_snapshot', { ...s, revision: s.revision - 1 });
    ws.send('state_snapshot', f.snapshot(1));
    ws.send('state_snapshot', {});
    expect(remote.getMatch()).toBe(state);
    remote.dispose();
  });
  it('uses server standings including ties, and awaiting_round cannot submit or settle', () => {
    vi.useFakeTimers();
    const f = fixture(),
      ws = socket(),
      remote = new RemoteCoordinator(ws.room),
      s = f.snapshot(0);
    s.players.forEach((p, i) => {
      p.provisionalPosition = i < 2 ? 2 : 1;
      if (p.id === s.playerId) p.status = 'awaiting_round';
    });
    ws.send('combat_trace', f.trace(0));
    ws.send('state_snapshot', s);
    expect(remote.standings.map((p) => p.position)).toEqual([1, 1, 2, 2]);
    expect(remote.duel.awaiting).toBe(true);
    const before = JSON.stringify(remote.getMatch());
    expect(
      remote.submit({
        matchId: s.matchId,
        phaseId: s.clock.phaseId,
        expectedRevision: s.own.revision,
        command: { type: 'reroll_shop' },
      }),
    ).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(JSON.stringify(remote.getMatch())).toBe(before);
    expect(remote.rivals().every((u) => u.id.startsWith(opponent(s)!.id))).toBe(true);
    remote.dispose();
  });
});

describe('eliminated spectator client', () => {
  it('switches sampled duels without carrying old frames; rejects stale selections and cannot buy', () => {
    vi.useFakeTimers();
    const f = multiFixture(4);
    equip(f.match, [1, 2, 3]);
    const p = f.match.players[0]!;
    p.state.config = structuredClone(p.state.config);
    p.state.config.roundDamage.initialHp = 1;
    p.state.health = { north: 1, south: 1 };
    f.advance(30000);
    f.advance(f.match.clock.snapshot().remainingMs);
    f.advance(5000);
    f.advance(30000);
    const ws = socket(),
      remote = new RemoteCoordinator(ws.room);
    ws.send('state_snapshot', f.match.competitiveSnapshot('socket-0'));
    expect(remote.eliminated).toBe(true);
    expect(
      remote.submit({
        matchId: f.match.id,
        phaseId: f.match.clock.snapshot().phaseId,
        expectedRevision: 0,
        command: { type: 'reroll_shop' },
      }),
    ).toBe(false);
    const choose = (index: number) => {
      remote.spectate(f.match.duels[index]!.pairing.combatId);
      const args = ws.sent.mock.calls.at(-1)!;
      expect(f.match.spectate('socket-0', args[1])).toBe(true);
      ws.send('state_snapshot', f.match.competitiveSnapshot('socket-0'));
      const frame = f.match.spectatorFrame('socket-0')!;
      ws.send('spectate_snapshot', frame);
      return frame;
    };
    const old = choose(0);
    expect(remote.getSpectatorFrame()?.combatId).toBe(old.combatId);
    const next = choose(1);
    ws.send('spectate_snapshot', old);
    expect(remote.getSpectatorFrame()?.combatId).toBe(next.combatId);
    ws.send('spectate_snapshot', { ...next, playerId: 'foreign' });
    expect(remote.getSpectatorFrame()).toEqual(next);
    f.advance(f.match.clock.snapshot().remainingMs);
    ws.send('state_snapshot', f.match.competitiveSnapshot('socket-0'));
    expect(remote.getSpectatorFrame()).toBeNull();
    remote.dispose();
  });
  it('uses final server ties and remains read-only after completion', () => {
    vi.useFakeTimers();
    const f = multiFixture(2);
    for (const p of f.match.players) {
      p.state.config = structuredClone(p.state.config);
      p.state.config.roundDamage.initialHp = 1;
      p.state.health = { north: 1, south: 1 };
    }
    f.advance(30000);
    f.advance(f.match.clock.snapshot().remainingMs);
    const ws = socket(),
      remote = new RemoteCoordinator(ws.room);
    ws.send('state_snapshot', f.match.competitiveSnapshot('socket-0'));
    expect(remote.finalResults?.sharedFirst).toBe(true);
    expect(remote.standings.map((p) => p.position)).toEqual([1, 1]);
    expect(remote.spectate(null)).toBe(false);
    expect(remote.getClock().clockState).toBe('stopped');
    remote.dispose();
  });
});

it('projects equipped Florin rivals without using or exposing the own private inventory', () => {
  vi.useFakeTimers();
  const m = new AuthoritativeMatch(
    'diagnostic',
    { now: () => 0 },
    () => 360,
    2,
    INTEGRATED_ECONOMY_CONFIG,
  );
  for (let i = 0; i < 2; i++)
    m.join(`socket-${i}`, {
      userId: `00000000-0000-4000-8000-00000000000${i + 1}`,
      name: `Fixture ${i}`,
    });
  m.start('socket-0');
  equip(m, undefined, ['florin', 'jaramillo']);
  for (let i = 0; i < 2; i++) {
    const p = m.players[i]!;
    m.grantItems(p.id, 'visual-equipment', ['item-forge-ad--ad']);
    expect(
      act(m, i, {
        type: 'equip_item',
        unitId: p.state.units[0]!.id,
        itemId: p.state.items!.completed[0]!.id,
      }).accepted,
    ).toBe(true);
  }
  m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
  m.pulse();
  const ws = socket(),
    remote = new RemoteCoordinator(ws.room);
  const s = m.roundSnapshot('socket-0');
  ws.send('state_snapshot', s);
  const before = JSON.stringify(remote.getMatch().items);
  const florin = remote.rivals().find((u) => u.definitionId === 'florin')!;
  expect(florin.profile.initialItemModifiers?.length).toBeGreaterThan(0);
  expect(florin.profile.itemLoadout?.instances).toHaveLength(1);
  expect(JSON.stringify(remote.getMatch().items)).toBe(before);
  remote.dispose();
});

it('waits for receipt AND authoritative inventory; prevents duplicate commands during latency', async () => {
  vi.useFakeTimers();
  const { LocalSession } = await import('../match/LocalSession');
  const { ItemInteraction } = await import('../match/items/itemInteraction');
  const m = new AuthoritativeMatch(
    'diagnostic',
    { now: () => 0 },
    () => 360,
    2,
    INTEGRATED_ECONOMY_CONFIG,
  );
  for (let i = 0; i < 2; i++)
    m.join(`socket-${i}`, {
      userId: `00000000-0000-4000-8000-00000000000${i + 1}`,
      name: `Fixture ${i}`,
    });
  m.start('socket-0');
  equip(m, undefined, ['florin']);
  m.grantItems(m.players[0]!.id, 'ui-grant', ['component-ad', 'component-ap']);
  const ws = socket(),
    remote = new RemoteCoordinator(ws.room);
  ws.send('state_snapshot', m.roundSnapshot('socket-0'));
  const session = new LocalSession(remote.getMatch(), undefined, undefined, remote),
    ui = new ItemInteraction(session),
    off = ui.subscribe(() => {});
  const unit = session.getMatch().units[0]!,
    item = session.getMatch().items!.components[0]!;
  expect(ui.equip(unit.id, item.id)).toBe(true);
  expect(ui.getSnapshot().pending).toBe(true);
  expect(session.getMatch().items!.components).toHaveLength(2);
  expect(ui.equip(unit.id, item.id)).toBe(false);
  const sent = ws.sent.mock.calls.find((c) => c[0] === 'command')![1];
  const receipt = m.submit('socket-0', sent);
  expect(receipt.accepted).toBe(true);
  ws.send('action_receipt', receipt);
  expect(ui.getSnapshot().pending).toBe(true);
  ws.send('state_snapshot', m.roundSnapshot('socket-0'));
  expect(ui.getSnapshot().pending).toBe(false);
  expect(ui.getSnapshot().outcome).toBe('success');
  expect(m.submit('socket-0', sent)).toEqual(receipt);
  expect(m.players[0]!.state.units[0]!.equipment).toHaveLength(1);
  const second = session.getMatch().items!.components[0]!;
  expect(ui.equip(unit.id, second.id)).toBe(true);
  remote.connected = false;
  ws.send('state_snapshot', m.roundSnapshot('socket-0'));
  expect(ui.getSnapshot().status).toContain('Conexión perdida');
  remote.connected = true;
  const next = ws.sent.mock.calls.filter((c) => c[0] === 'command').at(-1)![1];
  ws.send('action_receipt', {
    requestId: next.requestId,
    sequence: next.sequence,
    accepted: false,
    reason: 'wrong-phase',
    revision: session.getMatch().revision,
  });
  expect(ui.getSnapshot().outcome).toBe('error');
  expect(session.getMatch().items!.components).toHaveLength(1);
  expect(ui.equip(unit.id, second.id)).toBe(true);
  off();
  remote.dispose();
});

it('accepts durable service status before the first reconnect snapshot', () => {
  vi.useFakeTimers();
  const ws = socket(),
    remote = new RemoteCoordinator(ws.room),
    f = fixture();
  expect(() =>
    ws.send('service_status', { version: 1, available: true, message: 'Partida recuperada' }),
  ).not.toThrow();
  ws.send('state_snapshot', f.snapshot(0));
  expect(remote.getClock().matchId).toBe(f.match.id);
  remote.dispose();
});

function movementRecoveryFixture() {
  const { match: m } = multiFixture(2);
  equip(m, [0], ['dolea']);
  const unit = m.players[0]!.state.units[0]!;
  unit.location = { kind: 'bench', slot: 0 };
  m.assertConservation();
  const ws = socket(),
    remote = new RemoteCoordinator(ws.room);
  ws.send('state_snapshot', m.roundSnapshot('socket-0'));
  const command = (q = 0) => ({
    matchId: m.id,
    phaseId: m.clock.snapshot().phaseId,
    expectedRevision: remote.getMatch().revision,
    command: {
      type: 'move_unit' as const,
      unitId: unit.id,
      to: { kind: 'board' as const, hex: { q, r: 4 } },
    },
  });
  const synchronize = () => {
    ws.send('resume_accepted', {
      version: RECOVERY_VERSION,
      matchId: m.id,
      participantId: m.players[0]!.id,
      connectionId: 'socket-0',
      generation: 1,
      nextSequence: m.players[0]!.sequence,
      spectateSequence: -1,
      roundId: 'round-1',
      phaseId: m.clock.snapshot().phaseId,
      duelId: null,
      revision: m.revision,
    });
    ws.send('state_snapshot', m.roundSnapshot('socket-0'));
  };
  const last = () => ws.sent.mock.calls.filter((c) => c[0] === 'command').at(-1)![1];
  return { m, ws, remote, command, synchronize, last, unit };
}
it.each(['protocol_error', 'invalid-payload', 'sequence'])(
  'P11E regression: %s recovers bench placement using canonical sequence/state without reload',
  (reason) => {
    const f = movementRecoveryFixture();
    expect(f.remote.submit(f.command())).toBe(true);
    if (reason === 'protocol_error') f.ws.send('protocol_error', 'invalid-payload');
    else if (reason === 'invalid-payload')
      f.ws.send('action_receipt', f.m.submit('socket-0', { ...f.last(), action: {} }));
    else {
      f.m.players[0]!.sequence = 1;
      f.ws.send('action_receipt', f.m.submit('socket-0', f.last()));
    }
    expect(f.ws.sent).toHaveBeenCalledWith('sync', null);
    expect(f.remote.submit(f.command())).toBe(false);
    f.synchronize();
    expect(f.remote.requestPending).toBe(false);
    expect(f.remote.submit(f.command())).toBe(true);
    const receipt = f.m.submit('socket-0', f.last());
    expect(receipt.accepted).toBe(true);
    f.ws.send('action_receipt', receipt);
    f.ws.send('state_snapshot', f.m.roundSnapshot('socket-0'));
    expect(f.remote.requestPending).toBe(false);
    expect(f.remote.getMatch().units[0]!.location).toEqual({ kind: 'board', hex: { q: 0, r: 4 } });
    f.m.assertConservation();
    f.remote.dispose();
  },
);
it('P11E regression: lost acknowledgment times out into sync, never replays and ignores delayed old receipts', () => {
  vi.useFakeTimers();
  const f = movementRecoveryFixture();
  expect(f.remote.submit(f.command())).toBe(true);
  const old = f.last(),
    receipt = f.m.submit('socket-0', old);
  expect(receipt.accepted).toBe(true);
  vi.advanceTimersByTime(8001);
  expect(f.ws.sent).toHaveBeenCalledWith('sync', null);
  expect(f.ws.sent.mock.calls.filter((c) => c[0] === 'command')).toHaveLength(1);
  f.synchronize();
  expect(f.remote.requestPending).toBe(false);
  expect(f.remote.submit(f.command(1))).toBe(true);
  f.ws.send('action_receipt', receipt);
  expect(f.remote.requestPending).toBe(true);
  f.ws.send('action_receipt', f.m.submit('socket-0', f.last()));
  f.ws.send('state_snapshot', f.m.roundSnapshot('socket-0'));
  expect(f.remote.requestPending).toBe(false);
  f.m.assertConservation();
  f.remote.dispose();
});
it('P11E regression: a transport send exception cannot pin placement pending forever', () => {
  const f = movementRecoveryFixture();
  f.ws.sent.mockImplementationOnce(() => {
    throw Error('transport');
  });
  expect(f.remote.submit(f.command())).toBe(false);
  expect(f.ws.sent).toHaveBeenCalledWith('sync', null);
  f.synchronize();
  expect(f.remote.requestPending).toBe(false);
  expect(f.remote.submit(f.command())).toBe(true);
  expect(f.m.submit('socket-0', f.last()).accepted).toBe(true);
  f.remote.dispose();
});
