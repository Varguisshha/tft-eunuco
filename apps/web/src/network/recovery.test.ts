import { it, expect, vi, afterEach } from 'vitest';
import type { Room } from '@colyseus/sdk';
import { RECOVERY_VERSION } from '@tft/shared';
import { multiFixture } from '../../../server/src/multi-fixture';
import { RemoteCoordinator } from './RemoteCoordinator';
import { MAX_RECOVERY_ATTEMPTS, retryDelay, recoveryError } from './retry';
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function harness(sessionId = 'socket-0') {
  const handlers = new Map<string, (raw: unknown) => void>();
  let leave: (code: number) => void = () => {};
  const room = {
    roomId: 'diagnostic',
    sessionId,
    reconnection: { enabled: true },
    onMessage: (key: string, cb: (raw: unknown) => void) => handlers.set(key, cb),
    onLeave: (cb: typeof leave) => {
      leave = cb;
    },
    send: vi.fn(),
    leave: vi.fn(),
  };
  const remote = new RemoteCoordinator(room as unknown as Room);
  const f = multiFixture(2);
  handlers.get('state_snapshot')!(f.match.competitiveSnapshot('socket-0'));
  remote.enableRecovery(() => 'fresh-token');
  return { remote, room, handlers, disconnect: (code = 1006) => leave(code) };
}
it('bounded exponential backoff has controlled variation and classifies terminal errors', () => {
  expect([0, 1, 2, 3, 4].map((n) => retryDelay(n, 0.5))).toEqual([750, 1500, 3000, 6000, 12000]);
  expect(retryDelay(100, 0)).toBe(10200);
  for (const code of [401, 403, 4001, 4002, 410, 4212])
    expect(recoveryError({ code })).toBeTruthy();
  expect(recoveryError(Error('network'))).toBeNull();
  expect(recoveryError({ code: 522 })).toBeNull();
});
it('stops after the bounded restart window, allows manual retry and cancels on voluntary leave', async () => {
  vi.useFakeTimers();
  const connect = vi.spyOn(RemoteCoordinator, 'connect').mockRejectedValue(Error('offline'));
  const h = harness();
  h.disconnect();
  await vi.advanceTimersByTimeAsync(180000);
  expect(connect).toHaveBeenCalledTimes(MAX_RECOVERY_ATTEMPTS);
  expect(h.remote.canRetry).toBe(true);
  h.remote.retry();
  h.remote.dispose();
  await vi.advanceTimersByTimeAsync(180000);
  expect(connect).toHaveBeenCalledTimes(MAX_RECOVERY_ATTEMPTS);
});
it.each([4001, 4002])(
  'never automatically fights an invalid or superseded session %i',
  async (code) => {
    vi.useFakeTimers();
    const connect = vi.spyOn(RemoteCoordinator, 'connect');
    const h = harness();
    h.disconnect(code);
    await vi.advanceTimersByTimeAsync(180000);
    expect(connect).not.toHaveBeenCalled();
    expect(h.remote.canRetry).toBe(false);
    h.remote.dispose();
  },
);
it('revalidates credentials, stops on revoked session and never retries a command', async () => {
  vi.useFakeTimers();
  const connect = vi.spyOn(RemoteCoordinator, 'connect').mockRejectedValue({ code: 401 });
  const h = harness();
  h.disconnect();
  await vi.advanceTimersByTimeAsync(180000);
  expect(connect).toHaveBeenCalledExactlyOnceWith('join', 'diagnostic', 'fresh-token');
  expect(h.remote.recoveryStatus).toMatch(/Sesión/);
  expect(h.room.send.mock.calls.some((c) => c[0] === 'command')).toBe(false);
  h.remote.dispose();
});
it('adopts synchronized socket and sequence, ignores delayed old socket messages', async () => {
  vi.useFakeTimers();
  const old = harness(),
    next = harness('new-socket');
  next.handlers.get('resume_accepted')!({
    version: RECOVERY_VERSION,
    matchId: 'diagnostic',
    participantId: 'user',
    connectionId: 'new-socket',
    generation: 2,
    nextSequence: 9,
    spectateSequence: 3,
    roundId: 'round',
    phaseId: 'phase',
    duelId: null,
    revision: 1,
  });
  vi.spyOn(RemoteCoordinator, 'connect').mockResolvedValue(next.remote);
  old.disconnect();
  await vi.advanceTimersByTimeAsync(1500);
  expect(old.remote.connected).toBe(true);
  expect(old.remote.room.sessionId).toBe('new-socket');
  expect(old.remote.recoveryStatus).toBe('Partida recuperada');
  old.handlers.get('protocol_error')!('stale message');
  old.disconnect(4002);
  expect(old.remote.connected).toBe(true);
  expect(old.remote.notice).not.toBe('stale message');
  old.remote.dispose();
});
it('cancels an in-flight connection after leaving and closes its eventual socket', async () => {
  vi.useFakeTimers();
  const old = harness(),
    next = harness('next');
  let finish!: (r: RemoteCoordinator) => void;
  vi.spyOn(RemoteCoordinator, 'connect').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  old.disconnect();
  await vi.advanceTimersByTimeAsync(1500);
  old.remote.dispose();
  finish(next.remote);
  await vi.advanceTimersByTimeAsync(1);
  expect(next.room.leave).toHaveBeenCalledOnce();
  expect(old.remote.connected).toBe(false);
});
it('survives a missing room while the server restores it after a minute, then adopts the final snapshot', async () => {
  vi.useFakeTimers();
  const old = harness(),
    next = harness('restored-final');
  const connect = vi.spyOn(RemoteCoordinator, 'connect').mockRejectedValue({ code: 522 });
  old.disconnect();
  await vi.advanceTimersByTimeAsync(65000);
  expect(old.remote.canRetry).toBe(false);
  expect(old.remote.connected).toBe(false);
  connect.mockResolvedValue(next.remote);
  await vi.advanceTimersByTimeAsync(15000);
  expect(old.remote.connected).toBe(true);
  expect(old.remote.room.sessionId).toBe('restored-final');
  expect(old.room.send.mock.calls.some((c) => c[0] === 'command')).toBe(false);
  old.remote.dispose();
});
