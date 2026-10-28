import { afterEach, expect, it, vi } from 'vitest';
import type { Room } from '@colyseus/sdk';
import { P11C_ECONOMY_CONFIG, P11H_ECONOMY_CONFIG } from '@tft/game-data';
import { RECOVERY_VERSION } from '@tft/shared';
import { AuthoritativeMatch } from '../../../server/src/AuthoritativeMatch';
import { equip, fixtureUsers } from '../../../server/src/multi-fixture';
import { RemoteCoordinator } from './RemoteCoordinator';
import { LocalSession } from '../match/LocalSession';
afterEach(() => vi.useRealTimers());
function fixture(config = P11C_ECONOMY_CONFIG) {
  vi.useFakeTimers();
  let now = 0;
  const m = new AuthoritativeMatch('p11-recovery', { now: () => now }, () => 42, 2, config);
  for (let i = 0; i < 2; i++)
    m.join(`socket-${i}`, { userId: fixtureUsers[i]!, name: `Player ${i}` });
  m.start('socket-0');
  equip(m, [0], ['dolea']);
  equip(m, [1], ['vargas']);
  const unit = m.players[0]!.state.units[0]!;
  unit.location = { kind: 'bench', slot: 0 };
  m.assertConservation();
  const handlers = new Map<string, (v: unknown) => void>(),
    send = vi.fn();
  const room = {
    roomId: m.id,
    sessionId: 'socket-0',
    reconnection: { enabled: true },
    onMessage: (key: string, cb: (v: unknown) => void) => handlers.set(key, cb),
    onLeave: vi.fn(),
    send,
    leave: vi.fn(),
  } as unknown as Room;
  const remote = new RemoteCoordinator(room),
    deliver = (key: string, v: unknown) => handlers.get(key)!(v);
  const snapshot = () => deliver('state_snapshot', m.roundSnapshot('socket-0'));
  snapshot();
  const session = new LocalSession(remote.getMatch(), undefined, undefined, remote);
  const last = () => send.mock.calls.filter((c) => c[0] === 'command').at(-1)![1];
  const synchronize = () => {
    deliver('resume_accepted', {
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
    snapshot();
  };
  return {
    m,
    remote,
    session,
    unit,
    last,
    deliver,
    snapshot,
    synchronize,
    advance: (ms: number) => {
      now += ms;
      m.pulse();
    },
  };
}
it('LocalSession keeps selection and accepts placement after semantic rejection, without reloading or recreating the session', () => {
  const f = fixture();
  f.session.select(f.unit.id);
  expect(f.session.move(f.unit.id, { q: -30, r: 4 })).toBe(true);
  const rejected = f.m.submit('socket-0', f.last());
  expect(rejected.accepted).toBe(false);
  f.deliver('action_receipt', rejected);
  f.snapshot();
  expect(f.remote.requestPending).toBe(false);
  expect(f.session.move(f.unit.id, { q: 0, r: 4 })).toBe(true);
  const receipt = f.m.submit('socket-0', f.last());
  expect(receipt.accepted).toBe(true);
  f.deliver('action_receipt', receipt);
  f.snapshot();
  expect(f.session.getMatch().units[0]!.location).toEqual({ kind: 'board', hex: { q: 0, r: 4 } });
  expect(f.session.getSnapshot().selectedId).toBe(f.unit.id);
  f.m.assertConservation();
  f.remote.dispose();
});
it('accepted acknowledgment without its snapshot cannot strand the selected unit: timeout resync then move once', () => {
  const f = fixture();
  f.session.select(f.unit.id);
  expect(f.session.move(f.unit.id, { q: 0, r: 4 })).toBe(true);
  const receipt = f.m.submit('socket-0', f.last());
  expect(receipt.accepted).toBe(true);
  f.deliver('action_receipt', receipt);
  expect(f.remote.requestPending).toBe(true);
  expect(f.session.move(f.unit.id, { q: 1, r: 4 })).toBe(false);
  vi.advanceTimersByTime(8001);
  f.synchronize();
  expect(f.remote.requestPending).toBe(false);
  expect(f.session.move(f.unit.id, { q: 1, r: 4 })).toBe(true);
  f.deliver('action_receipt', f.m.submit('socket-0', f.last()));
  f.snapshot();
  expect(f.session.getMatch().units[0]!.location).toEqual({ kind: 'board', hex: { q: 1, r: 4 } });
  expect(f.m.players[0]!.sequence).toBe(2);
  f.m.assertConservation();
  f.remote.dispose();
});
it('a gesture arriving across the phase deadline rejects safely and control returns in the next preparation', () => {
  const f = fixture();
  f.session.select(f.unit.id);
  expect(f.session.move(f.unit.id, { q: 0, r: 4 })).toBe(true);
  f.advance(30000);
  const rejected = f.m.submit('socket-0', f.last());
  expect(rejected.accepted).toBe(false);
  f.deliver('action_receipt', rejected);
  f.snapshot();
  expect(f.session.editable).toBe(false);
  f.advance(60000);
  f.advance(60000);
  f.snapshot();
  expect(f.session.getMatch().phase).toBe('preparation');
  expect(f.remote.requestPending).toBe(false);
  expect(f.session.editable).toBe(true);
  expect(f.session.move(f.unit.id, { q: 0, r: 4 })).toBe(true);
  const receipt = f.m.submit('socket-0', f.last());
  expect(receipt.accepted).toBe(true);
  f.deliver('action_receipt', receipt);
  f.snapshot();
  expect(f.session.getMatch().units[0]!.location.kind).toBe('board');
  f.m.assertConservation();
  f.remote.dispose();
});
it('a lost synchronization response is retried without replaying the uncertain command', () => {
  const f = fixture();
  expect(f.session.move(f.unit.id, { q: 0, r: 4 })).toBe(true);
  const receipt = f.m.submit('socket-0', f.last());
  expect(receipt.accepted).toBe(true);
  vi.advanceTimersByTime(8001);
  vi.advanceTimersByTime(8001);
  expect(f.remote.requestPending).toBe(true);
  f.synchronize();
  expect(f.remote.requestPending).toBe(false);
  expect(f.session.move(f.unit.id, { q: 1, r: 4 })).toBe(true);
  expect(f.m.submit('socket-0', f.last()).accepted).toBe(true);
  expect(f.m.players[0]!.sequence).toBe(2);
  f.remote.dispose();
});

it('P11H combat purchase waits for authoritative snapshot, recovers a lost ACK/snapshot and never deploys', () => {
  const f = fixture(P11H_ECONOMY_CONFIG);
  f.advance(30000);
  f.snapshot();
  const frozen = structuredClone(f.m.players[0]!.state.combat);
  const before = structuredClone(f.session.getMatch()),
    offer = before.shop.find(Boolean)!;
  expect(f.session.canEconomicAction({ type: 'buy_unit', offerId: offer.id })).toBe(true);
  expect(f.session.dispatch({ type: 'buy_unit', offerId: offer.id })).toBe(true);
  expect(f.remote.requestPending).toBe(true);
  expect(f.session.getMatch()).toEqual(before);
  expect(f.session.dispatch({ type: 'buy_unit', offerId: offer.id })).toBe(false);
  const command = f.last(),
    receipt = f.m.submit('socket-0', command);
  expect(receipt.accepted).toBe(true);
  f.deliver('action_receipt', receipt);
  expect(f.remote.requestPending).toBe(true);
  expect(f.session.getMatch()).toEqual(before);
  vi.advanceTimersByTime(8001);
  f.synchronize();
  expect(f.remote.requestPending).toBe(false);
  const after = f.session.getMatch();
  expect(after.units).toHaveLength(before.units.length + 1);
  const bought = after.units.find((u) => !before.units.some((b) => b.id === u.id))!;
  expect(bought.location.kind).toBe('bench');
  expect(after.combat).toEqual(before.combat);
  expect(f.m.players[0]!.state.combat).toEqual(frozen);
  expect(f.session.move(bought.id, { q: 1, r: 4 })).toBe(false);
  expect(f.m.submit('socket-0', command).accepted).toBe(true);
  f.snapshot();
  expect(f.session.getMatch().units).toEqual(after.units);
  f.m.assertConservation();
  f.remote.dispose();
});
