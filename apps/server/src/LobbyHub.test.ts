import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  LOBBY_VERSION,
  LobbySnapshotSchema,
  LobbyActionSchema,
  type LobbyEvent,
} from '@tft/shared';
import { LobbyHub, type MatchFactory } from './LobbyHub';
const ids = Array.from({ length: 6 }, () => randomUUID());
function fixture(
  factory: MatchFactory = async () => ({ id: 'private-destination', cancel: async () => {} }),
) {
  let now = 1000;
  const hub = new LobbyHub(factory, () => now);
  const events: LobbyEvent[][] = ids.map(() => []);
  const connect = (i: number) =>
    hub.connect(
      {
        userId: ids[i]!,
        name: 'Player ' + i,
        avatarId: 'jade',
        token: 'secret',
        expiresAt: Infinity,
      },
      (e) => events[i]!.push(e),
    );
  ids.forEach((_, i) => connect(i));
  const act = (i: number, type: string, extra = {}, requestId = randomUUID()) =>
    hub.action(ids[i]!, { version: LOBBY_VERSION, requestId, type, ...extra });
  const event = (i = 0) => events[i]!.at(-1)!;
  const lobby = (i = 0) => event(i).lobby!;
  const pair = async (capacity = 2) => {
    await act(0, 'create_lobby', { capacity });
    await act(1, 'join_lobby', { roomCode: lobby().roomCode });
  };
  const ready = async () => {
    await act(0, 'set_ready', { readyState: true });
    await act(1, 'set_ready', { readyState: true });
  };
  return {
    hub,
    act,
    event,
    lobby,
    pair,
    ready,
    connect,
    advance: (ms: number) => {
      now += ms;
      hub.sweep();
    },
  };
}
describe('private lobby authority', () => {
  it('creates unique crypto codes and only public identities', async () => {
    const f = fixture();
    await f.act(0, 'create_lobby', { capacity: 4 });
    await f.act(1, 'create_lobby', { capacity: 3 });
    expect(f.lobby().roomCode).not.toBe(f.lobby(1).roomCode);
    expect(LobbySnapshotSchema.safeParse(f.lobby()).success).toBe(true);
    expect(JSON.stringify(f.lobby())).not.toMatch(/token|secret|email|password/);
  });
  it('normalizes code case, whitespace and separators', async () => {
    const f = fixture();
    await f.act(0, 'create_lobby', { capacity: 2 });
    const c = f.lobby().roomCode;
    await f.act(1, 'join_lobby', {
      roomCode: ' ' + c.slice(0, 4).toLowerCase() + '-' + c.slice(4) + ' ',
    });
    expect(f.lobby(1).participants).toHaveLength(2);
  });
  it('does not allow a second room or duplicate active connection', async () => {
    const f = fixture();
    await f.pair();
    await f.act(0, 'create_lobby', { capacity: 4 });
    expect(f.event().error).toMatch(/Ya estás/);
    expect(() => f.connect(0)).toThrow();
  });
  it('reserves last capacity synchronously under concurrent joins', async () => {
    const f = fixture();
    await f.act(0, 'create_lobby', { capacity: 2 });
    const roomCode = f.lobby().roomCode;
    await Promise.all([1, 2, 3, 4].map((i) => f.act(i, 'join_lobby', { roomCode })));
    expect(f.lobby().participants).toHaveLength(2);
    expect([1, 2, 3, 4].filter((i) => f.event(i).error?.includes('llena'))).toHaveLength(3);
  });
  it('limits brute force across new requests and connections', async () => {
    const f = fixture();
    for (let i = 0; i < 9; i++) await f.act(0, 'join_lobby', { roomCode: 'AAAAAAAA' });
    expect(f.event().error).toMatch(/Demasiados/);
    f.hub.disconnect(ids[0]!);
    f.connect(0);
    await f.act(0, 'create_lobby', { capacity: 2 });
    expect(f.event().error).toMatch(/Demasiados/);
    f.advance(60_000);
    await f.act(0, 'create_lobby', { capacity: 2 });
    expect(f.event().error).toBeNull();
  });
  it.each([3, 4])('supports %s seats but blocks its match', async (capacity) => {
    const f = fixture();
    await f.pair(capacity);
    for (let i = 2; i < capacity; i++)
      await f.act(i, 'join_lobby', { roomCode: f.lobby().roomCode });
    for (let i = 0; i < capacity; i++) await f.act(i, 'set_ready', { readyState: true });
    await f.act(0, 'start_match');
    expect(f.event().error).toMatch(/F0-P7C/);
    expect(f.lobby().status).toBe('waiting');
  });
  it('rejects missing, malformed, spoofed and DEV payloads', async () => {
    const f = fixture();
    await f.pair();
    for (const payload of [
      null,
      {},
      { type: 'dev' },
      {
        version: LOBBY_VERSION,
        requestId: randomUUID(),
        type: 'set_ready',
        readyState: true,
        userId: ids[1],
      },
    ]) {
      await f.hub.action(ids[0]!, payload);
      expect(f.event().error).toBeTruthy();
    }
    expect(f.lobby().participants.every((p) => !p.readyState)).toBe(true);
  });
  it('applies readiness once and rejects reused request with different body', async () => {
    const f = fixture();
    await f.pair();
    const request = randomUUID();
    await f.act(0, 'set_ready', { readyState: true }, request);
    const revision = f.lobby().revision;
    await f.act(0, 'set_ready', { readyState: true }, request);
    expect(f.lobby().revision).toBe(revision);
    await f.act(0, 'set_ready', { readyState: false }, request);
    expect(f.event().error).toMatch(/reutilizado/);
  });
  it('requires host and readiness, invalidates ready on configuration changes', async () => {
    const f = fixture();
    await f.pair();
    await f.act(1, 'close_lobby');
    expect(f.event(1).error).toMatch(/anfitrión/);
    await f.act(1, 'set_capacity', { capacity: 4 });
    expect(f.event(1).error).toMatch(/anfitrión/);
    await f.act(0, 'start_match');
    expect(f.event().error).toMatch(/listos/);
    await f.ready();
    await f.act(1, 'start_match');
    expect(f.event(1).error).toMatch(/anfitrión/);
    await f.act(0, 'set_capacity', { capacity: 3 });
    expect(f.lobby().participants.every((p) => !p.readyState)).toBe(true);
  });
  it('transfers host deterministically and closes empty room', async () => {
    const f = fixture();
    await f.pair();
    const code = f.lobby().roomCode;
    await f.act(0, 'leave_lobby');
    expect(f.lobby(1).hostUserId).toBe(ids[1]);
    await f.act(1, 'leave_lobby');
    await f.act(2, 'join_lobby', { roomCode: code });
    expect(f.event(2).error).toBeTruthy();
  });
  it('revokes closed and expired codes', async () => {
    const f = fixture();
    await f.pair();
    const code = f.lobby().roomCode;
    await f.act(0, 'close_lobby');
    expect(f.event(1).lobby).toBeNull();
    await f.act(2, 'join_lobby', { roomCode: code });
    expect(f.event(2).error).toBeTruthy();
    await f.act(0, 'create_lobby', { capacity: 2 });
    const next = f.lobby().roomCode;
    f.advance(900_001);
    await f.act(1, 'join_lobby', { roomCode: next });
    expect(f.event(1).error).toBeTruthy();
  });
  it('distinguishes transient absence, return and grace expiry', async () => {
    const f = fixture();
    await f.pair();
    await f.ready();
    f.hub.disconnect(ids[0]!);
    expect(f.lobby(1).participants[0]!.connected).toBe(false);
    f.connect(0);
    expect(f.lobby().participants[0]!.readyState).toBe(false);
    f.hub.disconnect(ids[0]!);
    f.advance(30001);
    expect(f.lobby(1).hostUserId).toBe(ids[1]);
    expect(f.lobby(1).participants).toHaveLength(1);
  });
  it('starts once and freezes membership while creation is pending', async () => {
    let resolve!: (v: { id: string; cancel: () => Promise<void> }) => void;
    const factory = vi.fn(
      () =>
        new Promise<{ id: string; cancel: () => Promise<void> }>((r) => {
          resolve = r;
        }),
    );
    const f = fixture(factory);
    await f.pair();
    await f.ready();
    const start = f.act(0, 'start_match');
    await f.act(0, 'start_match');
    await f.act(1, 'set_ready', { readyState: false });
    expect(f.event(1).error).toBeTruthy();
    await f.act(2, 'join_lobby', { roomCode: f.lobby().roomCode });
    expect(f.event(2).error).toBeTruthy();
    resolve({ id: 'match', cancel: async () => {} });
    await start;
    expect(factory).toHaveBeenCalledTimes(1);
    expect(f.lobby().matchId).toBe('match');
  });
  it('recovers from factory failure without keeping ready states', async () => {
    const f = fixture(async () => {
      throw Error('failure');
    });
    await f.pair();
    await f.ready();
    await f.act(0, 'start_match');
    expect(f.lobby().status).toBe('waiting');
    expect(f.lobby().matchId).toBeNull();
    expect(f.lobby().participants.every((p) => !p.readyState)).toBe(true);
  });
  it('cancels timed out destination and recovers safely', async () => {
    const cancel = vi.fn(async () => {});
    const f = fixture(async () => ({ id: 'match', cancel }));
    await f.pair();
    await f.ready();
    await f.act(0, 'start_match');
    f.advance(25001);
    expect(cancel).toHaveBeenCalledOnce();
    expect(f.lobby().status).toBe('waiting');
  });
  it('cleans late-created matches after host abandons during transition', async () => {
    let resolve!: (v: { id: string; cancel: () => Promise<void> }) => void;
    const cancel = vi.fn(async () => {});
    const f = fixture(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    await f.pair();
    await f.ready();
    const pending = f.act(0, 'start_match');
    await f.act(0, 'leave_lobby');
    resolve({ id: 'late', cancel });
    await pending;
    expect(cancel).toHaveBeenCalledOnce();
    expect(f.lobby(1).status).toBe('waiting');
    expect(f.lobby(1).hostUserId).toBe(ids[1]);
  });
  it('validates version and refuses arbitrary room IDs', () => {
    expect(
      LobbyActionSchema.safeParse({
        version: 'old',
        type: 'join_lobby',
        requestId: randomUUID(),
        roomCode: 'ABCDEFGH',
      }).success,
    ).toBe(false);
    expect(
      LobbyActionSchema.safeParse({
        version: LOBBY_VERSION,
        type: 'join_lobby',
        requestId: randomUUID(),
        roomId: 'arbitrary',
      }).success,
    ).toBe(false);
  });
});
it('ignores a late failure from an abandoned transition after a new start', async () => {
  let rejectFirst!: (reason: Error) => void;
  let oldEnded!: () => void;
  let calls = 0;
  const f = fixture(async (_users, _started, ended) => {
    if (++calls === 1) {
      oldEnded = ended;
      return await new Promise((_resolve, reject) => {
        rejectFirst = reject;
      });
    }
    return { id: 'second-match', cancel: async () => {} };
  });
  await f.pair();
  await f.ready();
  const old = f.act(0, 'start_match');
  f.advance(25001);
  await f.ready();
  await f.act(0, 'start_match');
  oldEnded();
  rejectFirst(new Error('old transport failed'));
  await old;
  expect(f.lobby().status).toBe('starting');
  expect(f.lobby().matchId).toBe('second-match');
});
