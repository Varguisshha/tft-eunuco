import { it, expect, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client, type Room } from '@colyseus/sdk';
import {
  LOBBY_VERSION,
  RECOVERY_VERSION,
  NETWORK_VERSION,
  type LobbyEvent,
  type CompetitiveSnapshot,
} from '@tft/shared';
import { PostgresTestRepository } from './PostgresTestRepository';
const url = process.env.PERSISTENCE_TEST_URL;
let child: ChildProcess | undefined;
const sockets: Room[] = [];
async function boot() {
  child = spawn(process.execPath, ['--import', 'tsx', 'src/persistence/crash-fixture.ts'], {
    cwd: process.cwd() + '/apps/server',
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise<void>((resolve, reject) => {
    let log = '';
    const timer = setTimeout(() => reject(Error('Fixture boot timeout ' + log)), 12000);
    child!.stdout!.on('data', (b) => {
      if (String(b).includes('PERSISTENCE_READY')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child!.stderr!.on('data', (b) => {
      log += String(b);
    });
    child!.on('exit', () => {
      clearTimeout(timer);
      reject(Error('Fixture failed ' + log));
    });
  });
}
async function kill() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const c = child;
  child = undefined;
  await new Promise<void>((r) => {
    c.once('exit', () => r());
    c.kill('SIGKILL');
  });
}
async function until(fn: () => boolean) {
  const end = Date.now() + 8000;
  while (!fn()) {
    if (Date.now() > end) throw Error('Timeout');
    await new Promise((r) => setTimeout(r, 20));
  }
}
function client(i: number) {
  const c = new Client('http://127.0.0.1:2582');
  c.auth.token = `fixture-${i}`;
  return c;
}
async function gate(i: number) {
  const r = await client(i).create('lobby_gateway');
  r.reconnection.enabled = false;
  r.onMessage('lobby_event', () => {});
  sockets.push(r);
  return r;
}
function action(r: Room, type: string, extra = {}) {
  return new Promise<LobbyEvent>((resolve) => {
    const requestId = randomUUID();
    const off = r.onMessage('lobby_event', (e: LobbyEvent) => {
      if (e.requestId === requestId) {
        off();
        resolve(e);
      }
    });
    r.send('lobby_action', { version: LOBBY_VERSION, requestId, type, ...extra });
  });
}
async function join(i: number, id: string) {
  const r = await client(i).joinById(id, { recoveryVersion: RECOVERY_VERSION });
  r.reconnection.enabled = false;
  sockets.push(r);
  const d = {
    r,
    view: null as CompetitiveSnapshot | null,
    traces: [] as unknown[],
    receipts: [] as { accepted: boolean }[],
  };
  r.onMessage('state_snapshot', (s: CompetitiveSnapshot) => {
    d.view = s;
  });
  r.onMessage('combat_trace', (t) => d.traces.push(t));
  r.onMessage('action_receipt', (v) => d.receipts.push(v));
  for (const event of [
    'resume_accepted',
    'spectate_snapshot',
    'final_results',
    'service_status',
    'protocol_error',
  ])
    r.onMessage(event, () => {});
  r.send('sync', null);
  await until(() => !!d.view);
  return d;
}
afterAll(async () => {
  await kill();
});
it.skipIf(!url).each([2, 3, 4] as const)(
  'PostgreSQL + SIGKILL: %i players restore acknowledged purchases, phase and receipts',
  async (count) => {
    const repo = new PostgresTestRepository(url!);
    // Explicit isolated database only; never points at Supabase or user data.
    if (!url!.includes('127.0.0.1:55439/tft_persistence_test')) throw Error('Unsafe test database');
    await repo.pool.query('truncate private.authority_members,private.authority_matches');
    try {
      await boot();
      const gates = await Promise.all(Array.from({ length: count }, (_, i) => gate(i)));
      const created = await action(gates[0]!, 'create_lobby', { capacity: count });
      for (let i = 1; i < count; i++)
        await action(gates[i]!, 'join_lobby', { roomCode: created.lobby!.roomCode });
      for (const g of gates) await action(g, 'set_ready', { readyState: true });
      const start = await action(gates[0]!, 'start_match');
      expect(start.error).toBeNull();
      const id = start.lobby!.matchId!;
      const peers: Awaited<ReturnType<typeof join>>[] = [];
      for (let i = 0; i < count; i++) peers.push(await join(i, id));
      await until(() => peers[0]!.view!.clock.currentPhase === 'preparation');
      if (count === 4) {
        const prepared = await fetch('http://127.0.0.1:2583/fusion-shop', { method: 'POST' });
        expect(await prepared.text()).toBe('ok');
        await until(() => peers[0]!.view!.own.shop[0]?.id === 'fusion-offer-0');
      }
      const p = peers[0]!,
        s = p.view!;
      const cmd = {
        version: NETWORK_VERSION,
        sessionId: p.r.sessionId,
        requestId: randomUUID(),
        sequence: 0,
        matchId: id,
        phaseId: s.clock.phaseId,
        action: {
          type: 'buy_unit',
          seq: s.own.nextActionSeq,
          expectedRevision: s.own.revision,
          offerId: s.own.shop.find(Boolean)!.id,
        },
      };
      p.r.send('command', cmd);
      await until(() => p.receipts.length === 1);
      expect(p.receipts[0]!.accepted).toBe(true);
      if (count === 4) {
        for (let i = 1; i < 3; i++) {
          const saved = (await repo.load())[0]!,
            player = saved.authority.players[0]!;
          p.r.send('command', {
            ...cmd,
            requestId: randomUUID(),
            sequence: player.sequence,
            action: {
              ...cmd.action,
              seq: player.state.nextActionSeq,
              expectedRevision: player.state.revision,
              offerId: player.state.shop.find(Boolean)!.id,
            },
          });
          await until(() => p.receipts.length === i + 1);
          expect(p.receipts[i]!.accepted).toBe(true);
        }
        expect((await repo.load())[0]!.authority.players[0]!.state.units[0]!.stars).toBe(2);
      }
      const before = (await repo.load())[0]!;
      expect(before.authority.players[0]!.state.units).toHaveLength(1);
      await kill();
      await new Promise((r) => setTimeout(r, 1200));
      await boot();
      const g = await gate(0);
      expect((await action(g, 'sync')).lobby!.matchId).toBe(id);
      const restored = await join(0, id);
      expect(restored.view!.own.gold).toBe(before.authority.players[0]!.state.gold);
      expect(restored.view!.own.units).toEqual(before.authority.players[0]!.state.units);
      expect(restored.view!.clock.remainingMs).toBeGreaterThan(
        before.authority.clock.remainingMs - 1000,
      );
      restored.r.send('command', { ...cmd, sessionId: restored.r.sessionId });
      await until(() => restored.receipts.length === 1);
      expect(restored.receipts[0]!.accepted).toBe(true);
      expect((await repo.load())[0]!.authority.players[0]!.state.units).toHaveLength(1);
      await fetch('http://127.0.0.1:2583/advance', { method: 'POST' });
      await until(() => restored.view!.clock.currentPhase === 'combat');
      const combat = (await repo.load())[0]!;
      await kill();
      await boot();
      const resumed = await join(0, id);
      expect(resumed.view!.clock.currentPhase).toBe('combat');
      const after = (await repo.load())[0]!;
      expect(after.authority.duels).toEqual(combat.authority.duels);
      expect(after.authority.simulations).toBe(combat.authority.simulations);
      await fetch('http://127.0.0.1:2583/advance', { method: 'POST' });
      await until(() => resumed.view!.clock.currentPhase === 'resolution');
      const paid = (await repo.load())[0]!;
      await kill();
      await boot();
      await join(0, id);
      const recovered = (await repo.load())[0]!;
      expect(recovered.authority.settlements).toEqual(paid.authority.settlements);
      expect(recovered.authority.players.map((p) => p.state.gold)).toEqual(
        paid.authority.players.map((p) => p.state.gold),
      );
      await kill();
    } finally {
      await kill();
      await repo.pool.end();
    }
  },
  60000,
);

it.skipIf(!url)('PostgreSQL CAS, atomic rollback, duplicate commit and actual grants', async () => {
  const repo = new PostgresTestRepository(url!);
  try {
    const current = (await repo.load())[0]!;
    expect(current).toBeTruthy();
    const a = { ...current, revision: current.revision + 1, commitId: randomUUID() };
    const b = { ...a, commitId: randomUUID() };
    const outcomes = await Promise.allSettled([
      repo.commit(current.revision, a),
      repo.commit(current.revision, b),
    ]);
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
    const committed = (await repo.load())[0]!;
    await repo.commit(current.revision, committed);
    const bad = {
      ...committed,
      revision: committed.revision + 1,
      commitId: randomUUID(),
      lobby: {
        ...committed.lobby,
        participants: [...committed.lobby.participants, committed.lobby.participants[0]!],
      },
    };
    await expect(repo.commit(committed.revision, bad)).rejects.toThrow();
    expect((await repo.load())[0]!.revision).toBe(committed.revision);
    const permissions = await repo.pool.query(
      "select has_function_privilege('authenticated','public.authority_commit(bigint,jsonb)','execute') as execute, has_table_privilege('authenticated','private.authority_matches','select') as read",
    );
    expect(permissions.rows[0]).toEqual({ execute: false, read: false });
    const c = await repo.pool.connect();
    try {
      await c.query('set role authenticated');
      await expect(c.query('select public.authority_load()')).rejects.toThrow();
    } finally {
      await c.query('reset role');
      c.release();
    }
  } finally {
    await repo.pool.end();
  }
});
