import { appendFileSync, mkdirSync } from 'node:fs';
import type { PoolClient } from 'pg';
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
let sqlSubmissions = 0;
async function boot(
  effects: boolean | 'florin' | 'integrated' | 'roster' | 'pool' | 'p11' | 'p11h' | 'p11k' = false,
  drops = false,
  manualSteps = false,
) {
  sqlSubmissions = 0;
  child = spawn(process.execPath, ['--import', 'tsx', 'src/persistence/crash-fixture.ts'], {
    cwd: process.cwd() + '/apps/server',
    env: {
      ...process.env,
      P8C_DIAGNOSTIC: effects ? '1' : '0',
      MANUAL_PHASE_STEPS: manualSteps ? '1' : '0',
      P8D_DIAGNOSTIC: drops ? '1' : '0',
      FLORIN_DIAGNOSTIC: effects === 'florin' ? '1' : '0',
      POOL_DIAGNOSTIC: effects === 'pool' ? '1' : '0',
      P11_DIAGNOSTIC: effects === 'p11' ? '1' : '0',
      P11H_DIAGNOSTIC: effects === 'p11h' ? '1' : '0',
      P11K_DIAGNOSTIC: effects === 'p11k' ? '1' : '0',
      ROSTER_DIAGNOSTIC: effects === 'roster' || effects === 'p11' ? '1' : '0',
      INTEGRATED_DIAGNOSTIC: effects === 'integrated' || effects === 'pool' ? '1' : '0',
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  child.on('message', (message) => {
    if (
      message &&
      typeof message === 'object' &&
      'type' in message &&
      message.type === 'fixture-before-commit'
    )
      sqlSubmissions++;
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
/** Observe the actual SQL window, not candidate preparation time. Overall test limits stay unchanged. */
async function waitForBlockedWriter(lock: PoolClient, previousSubmissions: number) {
  await until(() => sqlSubmissions > previousSubmissions);
  let blocked = false;
  for (let n = 0; n < 100 && !blocked; n++) {
    await lock.query('select pg_stat_clear_snapshot()');
    const waiting = await lock.query(
      "select pid from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like 'select public.authority_commit%' and pg_backend_pid()=any(pg_blocking_pids(pid))",
    );
    blocked = waiting.rows.length > 0;
    if (!blocked) await new Promise((r) => setTimeout(r, 20));
  }
  if (process.env.P12R2_DIAGNOSTICS === '1') {
    mkdirSync('artifacts/p12a-r2', { recursive: true });
    appendFileSync(
      'artifacts/p12a-r2/fixture-trace.jsonl',
      JSON.stringify({ at: Date.now(), stage: 'probe-end', blocked }) + '\n',
    );
  }
  expect(blocked).toBe(true);
}
/** Guarantee the explicit before-commit branch: a disconnected PG client can still commit after lock release. */
async function killBlockedFixtureWriter(lock: PoolClient) {
  if (!url?.includes('127.0.0.1:55439/tft_persistence_test'))
    throw Error('Disposable persistence database required');
  await lock.query('select pg_stat_clear_snapshot()');
  const writers = await lock.query(
    "select pid from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like 'select public.authority_commit%' and pg_backend_pid()=any(pg_blocking_pids(pid))",
  );
  const ids = writers.rows.map((r) => Number(r.pid));
  expect(ids.length).toBeGreaterThan(0);
  await kill();
  // Only PIDs observed in this isolated DB executing this fixture's blocked authority commit.
  const stopped = await lock.query(
    "select pg_terminate_backend(pid,2000) as stopped from pg_stat_activity where datname=current_database() and pid=any($1::int[]) and query like 'select public.authority_commit%'",
    [ids],
  );
  expect(stopped.rows.every((r) => r.stopped === true)).toBe(true);
  // Refresh the observation after termination before asserting that no fixture writer remains.
  await lock.query('select pg_stat_clear_snapshot()');
  expect(
    (
      await lock.query(
        'select pid from pg_stat_activity where datname=current_database() and pid=any($1::int[])',
        [ids],
      )
    ).rows,
  ).toHaveLength(0);
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

it.skipIf(!url)(
  'P6C Kilómetros survive PostgreSQL storage, a fresh repository and authenticated resume',
  async () => {
    if (!url!.includes('127.0.0.1:55439/tft_persistence_test')) throw Error('Unsafe test database');
    const { AuthoritativeMatch } = await import('../AuthoritativeMatch');
    const { JARAMILLO_ECONOMY_CONFIG } = await import('@tft/game-data');
    const m = new AuthoritativeMatch(
      randomUUID(),
      { now: () => 1000 },
      () => 42,
      2,
      JARAMILLO_ECONOMY_CONFIG,
    );
    for (let i = 0; i < 2; i++)
      m.join(`progress-${i}`, { userId: randomUUID(), name: `Progress${i}` });
    m.start('progress-0');
    const authority = m.exportState();
    authority.pool.jaramillo!--;
    for (const p of authority.players) p.state.pool = { ...authority.pool };
    authority.players[0]!.state.units.push({
      id: 'persistent-jaramillo',
      definitionId: 'jaramillo',
      stars: 1,
      location: { kind: 'bench', slot: 0 },
      progress: { version: 1, stacks: [{ id: 'kilometros', count: 6, lastRound: 1 }] },
    });
    const document = {
      id: m.id,
      revision: 1,
      commitId: randomUUID(),
      expiresAt: Date.now() + 900000,
      status: 'active' as const,
      authority,
      lobby: {
        version: LOBBY_VERSION,
        roomId: randomUUID(),
        roomCode: 'JKLMNPQR',
        hostUserId: m.players[0]!.id,
        capacity: 2 as const,
        participants: m.players.map((p) => ({
          userId: p.id,
          name: p.name,
          avatarId: p.avatarId,
          readyState: true,
          connected: true,
        })),
        status: 'in_match' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 900000,
        matchId: m.id,
        revision: 1,
      },
    };
    const writer = new PostgresTestRepository(url!);
    try {
      await writer.commit(0, document);
    } finally {
      await writer.pool.end();
    }
    const reader = new PostgresTestRepository(url!);
    try {
      const stored = (await reader.load()).find((s) => s.id === m.id)!;
      const restored = AuthoritativeMatch.restore(stored.authority);
      restored.resume('new-session', m.players[0]!.id);
      expect(restored.players[0]!.state.units).toEqual(authority.players[0]!.state.units);
      expect(restored.config.catalog).toBe('f0p6c');
      expect(restored.players[0]!.state.units[0]!.progress!.stacks[0]!.count).toBe(6);
    } finally {
      await reader.pool.end();
    }
  },
);

it.skipIf(!url)(
  'P8A inventory guarantees on P8B: PostgreSQL + SIGKILL restores equipment and receipts',
  async () => {
    if (!url!.includes('127.0.0.1:55439/tft_persistence_test')) throw Error('Unsafe test database');
    const repo = new PostgresTestRepository(url!);
    try {
      const { fixtureUsers } = await import('../multi-fixture');
      const existing = (await repo.load()).find(
        (s) =>
          s.authority.players.some((p) => p.id === fixtureUsers[0]) &&
          s.authority.players[0]!.state.config.itemCatalog,
      )!;
      expect(existing).toBeTruthy();
      await boot();
      const peer = await join(0, existing.id);
      const grant = await fetch(`http://127.0.0.1:2583/item-foundation?matchId=${existing.id}`, {
        method: 'POST',
      });
      expect(grant.status).toBe(200);
      await until(() => peer.view!.own.items!.components.length === 16);
      const own = peer.view!.own,
        item = own.items!.components[0]!;
      expect(own.items!.ownerId).toBe(fixtureUsers[0]);
      expect(own.items!.catalogVersion).toBe('f0p8b-14.1-1');
      expect(own.items!.pending).toHaveLength(4);
      const cmd = {
        version: NETWORK_VERSION,
        sessionId: peer.r.sessionId,
        requestId: randomUUID(),
        sequence: (await repo.load()).find((s) => s.id === existing.id)!.authority.players[0]!
          .sequence,
        matchId: existing.id,
        phaseId: peer.view!.clock.phaseId,
        action: {
          type: 'equip_item',
          seq: own.nextActionSeq,
          expectedRevision: own.revision,
          itemId: item.id,
          unitId: own.units[0]!.id,
        },
      };
      peer.r.send('command', cmd);
      await until(() => peer.receipts.length === 1);
      expect(peer.receipts[0]!.accepted).toBe(true);
      const committed = (await repo.load()).find((s) => s.id === existing.id)!;
      expect(committed.authority.players[0]!.state.units[0]!.equipment![0]!.id).toBe(item.id);
      await kill();
      await boot();
      const restored = await join(0, existing.id);
      expect(restored.view!.own.items).toEqual(committed.authority.players[0]!.state.items);
      expect(restored.view!.own.units).toEqual(committed.authority.players[0]!.state.units);
      restored.r.send('command', { ...cmd, sessionId: restored.r.sessionId });
      await until(() => restored.receipts.length === 1);
      expect(restored.receipts[0]!.accepted).toBe(true);
      const after = (await repo.load()).find((s) => s.id === existing.id)!;
      expect(after.authority.players[0]!.state.items).toEqual(
        committed.authority.players[0]!.state.items,
      );
      expect(after.authority.players[0]!.state.units[0]!.equipment).toHaveLength(1);
    } finally {
      await kill();
      await repo.pool.end();
    }
  },
  60000,
);

it.skipIf(!url).each([2, 3, 4] as const)(
  'P8C %i players: live item effects survive authenticated reconnect and SIGKILL without replay or settlement duplication',
  async (count) => {
    const repo = new PostgresTestRepository(url!);
    try {
      await repo.pool.query('truncate private.authority_members,private.authority_matches');
      await boot(true);
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
      await until(() => peers.every((p) => p.view!.clock.currentPhase === 'preparation'));
      const prepared = await fetch(`http://127.0.0.1:2583/item-effects?matchId=${id}`, {
        method: 'POST',
      });
      expect(prepared.status, await prepared.text()).toBe(200);
      const before = (await repo.load())[0]!;
      expect(
        before.authority.players.every((p) => p.state.items!.catalogVersion === 'f0p8c-1'),
      ).toBe(true);
      const { AuthoritativeMatch } = await import('../AuthoritativeMatch');
      const baseline = AuthoritativeMatch.restore(before.authority, { now: () => 0 }, false);
      baseline.clock.restore({ ...baseline.clock.snapshot(), remainingMs: 0 });
      baseline.pulse();
      const advanced = await fetch('http://127.0.0.1:2583/advance', { method: 'POST' });
      expect(advanced.status, await advanced.text()).toBe(200);
      await until(() => peers[0]!.view!.clock.currentPhase === 'combat');
      const combat = (await repo.load())[0]!;
      expect(combat.authority.duels).toEqual(baseline.exportState().duels);
      expect(
        combat.authority.duels.every((d) =>
          d.replay.events.some((e) => e.type === 'damage' && e.payload.itemSource),
        ),
      ).toBe(true);
      await kill();
      await boot(true);
      const resumed = await join(0, id);
      const after = (await repo.load())[0]!;
      expect(after.authority.duels).toEqual(combat.authority.duels);
      expect(after.authority.simulations).toBe(combat.authority.simulations);
      expect(after.authority.players.map((p) => p.state.units)).toEqual(
        combat.authority.players.map((p) => p.state.units),
      );
      await fetch('http://127.0.0.1:2583/advance', { method: 'POST' });
      await until(() => resumed.view!.clock.currentPhase === 'resolution');
      const paid = (await repo.load())[0]!;
      await kill();
      await boot(true);
      await join(0, id);
      const restored = (await repo.load())[0]!;
      expect(restored.authority.settlements).toEqual(paid.authority.settlements);
      expect(restored.authority.players.map((p) => p.state.items)).toEqual(
        paid.authority.players.map((p) => p.state.items),
      );
    } finally {
      await kill();
      await repo.pool.end();
    }
  },
  60000,
);

it.skipIf(!url)(
  'P8D four players round 6: SIGKILL before/after commit, exactly once rewards and fixed-seed baseline',
  async () => {
    const repo = new PostgresTestRepository(url!);
    try {
      await repo.pool.query('truncate private.authority_members,private.authority_matches');
      await boot(false, true);
      const gates = await Promise.all([0, 1, 2, 3].map(gate));
      const created = await action(gates[0]!, 'create_lobby', { capacity: 4 });
      for (let i = 1; i < 4; i++)
        await action(gates[i]!, 'join_lobby', { roomCode: created.lobby!.roomCode });
      for (const g of gates) await action(g, 'set_ready', { readyState: true });
      const start = await action(gates[0]!, 'start_match');
      const id = start.lobby!.matchId!;
      const peers: Awaited<ReturnType<typeof join>>[] = [];
      for (let i = 0; i < 4; i++) peers.push(await join(i, id));
      await until(() => peers.every((p) => p.view!.clock.currentPhase === 'preparation'));
      const initial = (await repo.load())[0]!;
      const { AuthoritativeMatch } = await import('../AuthoritativeMatch');
      const baseline = AuthoritativeMatch.restore(initial.authority, { now: () => 0 }, false);
      const step = () => {
        baseline.clock.restore({ ...baseline.clock.snapshot(), remainingMs: 0 });
        baseline.pulse();
      };
      const advance = async () => {
        const result = await fetch('http://127.0.0.1:2583/advance', { method: 'POST' });
        expect(result.status, await result.text()).toBe(200);
      };
      // Reach combat 3: no drop is visible until the settlement commits.
      for (let i = 0; i < 7; i++) {
        step();
        await advance();
      }
      expect((await repo.load())[0]!.authority.itemDrops!.rounds).toHaveLength(0);
      const lock = await repo.pool.connect();
      await lock.query('BEGIN');
      await lock.query('LOCK TABLE private.authority_matches IN ACCESS EXCLUSIVE MODE');
      // Deliberately longer than the old pre-SQL polling window: regression for late writers.
      await fetch('http://127.0.0.1:2583/probe-preparation-delay', { method: 'POST' });
      const previousSubmissions = sqlSubmissions;
      const interrupted = advance().catch(() => {});
      try {
        await waitForBlockedWriter(lock, previousSubmissions);
        // No confirmed inventory is published while the transaction is waiting.
        expect(peers.every((p) => p.view!.own.items!.distributions.length === 0)).toBe(true);
        await killBlockedFixtureWriter(lock);
      } finally {
        await lock.query('ROLLBACK');
        lock.release();
      }
      await interrupted;
      expect((await repo.load())[0]!.authority.itemDrops!.rounds).toHaveLength(0);
      await boot(false, true);
      await join(0, id);
      step();
      await advance(); // confirmed round 3
      const paid = (await repo.load())[0]!;
      expect(paid.authority.itemDrops).toEqual(baseline.exportState().itemDrops);
      expect(paid.authority.itemDrops!.rounds).toHaveLength(1);
      await kill();
      await boot(false, true);
      const resumed = await join(0, id);
      expect(resumed.view!.own.items).toEqual({
        ...paid.authority.players[0]!.state.items,
        distributions: paid.authority.players[0]!.state.items!.distributions.map((d) => ({
          ...d,
          seed: 0,
        })),
      });
      for (let i = 0; i < 9; i++) {
        step();
        await advance();
      }
      const round6 = (await repo.load())[0]!;
      expect(round6.authority.itemDrops!.rounds.map((d) => d.round)).toEqual([3, 6]);
      expect(round6.authority.itemDrops).toEqual(baseline.exportState().itemDrops);
      expect(round6.authority.players.map((p) => p.state.items)).toEqual(
        baseline.players.map((p) => p.state.items),
      );
      for (const d of round6.authority.itemDrops!.rounds) {
        expect(d.players).toHaveLength(4);
        expect(d.players.every((p) => p.instanceIds.length === d.quantity)).toBe(true);
      }
      await kill();
      await boot(false, true);
      await join(0, id);
      const recovered = (await repo.load())[0]!;
      expect(recovered.authority.itemDrops).toEqual(round6.authority.itemDrops);
      expect(recovered.authority.players.map((p) => p.state.items)).toEqual(
        round6.authority.players.map((p) => p.state.items),
      );
      const { writeFileSync } = await import('node:fs');
      writeFileSync(
        '/tmp/p8d-four-player.json',
        JSON.stringify(round6.authority.itemDrops, null, 2),
      );
    } finally {
      await kill();
      await repo.pool.end();
    }
  },
  60000,
);

it.skipIf(!url).each(['integrated', 'roster', 'pool', 'p11'] as const)(
  '%s four players round 6: SIGKILL before/after commit, exactly once rewards and fixed-seed baseline',
  async (mode) => {
    const repo = new PostgresTestRepository(url!);
    try {
      await repo.pool.query('truncate private.authority_members,private.authority_matches');
      await boot(mode, false, true);
      const gates = await Promise.all([0, 1, 2, 3].map(gate));
      const created = await action(gates[0]!, 'create_lobby', { capacity: 4 });
      for (let i = 1; i < 4; i++)
        await action(gates[i]!, 'join_lobby', { roomCode: created.lobby!.roomCode });
      for (const g of gates) await action(g, 'set_ready', { readyState: true });
      const start = await action(gates[0]!, 'start_match');
      const id = start.lobby!.matchId!;
      const peers: Awaited<ReturnType<typeof join>>[] = [];
      for (let i = 0; i < 4; i++) peers.push(await join(i, id));
      await until(() => peers.every((p) => p.view!.clock.currentPhase === 'preparation'));
      if (mode === 'integrated' || mode === 'roster' || mode === 'pool' || mode === 'p11') {
        const result = await fetch(`http://127.0.0.1:2583/item-effects?matchId=${id}`, {
          method: 'POST',
        });
        expect(result.status, await result.text()).toBe(200);
      }
      const initial = (await repo.load())[0]!;
      if (mode === 'roster') {
        expect(initial.authority.rules).toBe('f0p10a-1');
        expect(Object.keys(initial.authority.pool).sort()).toEqual([
          'dolea',
          'florin',
          'jaramillo',
          'vargas',
        ]);
      }
      const { AuthoritativeMatch } = await import('../AuthoritativeMatch');
      const baseline = AuthoritativeMatch.restore(initial.authority, { now: () => 0 }, false);
      const step = () => {
        baseline.clock.restore({ ...baseline.clock.snapshot(), remainingMs: 0 });
        baseline.pulse();
      };
      const advance = async () => {
        const result = await fetch('http://127.0.0.1:2583/advance', { method: 'POST' });
        expect(result.status, await result.text()).toBe(200);
      };
      let presenceSeen = false;
      const compare = async () => {
        const saved = (await repo.load())[0]!.authority;
        expect(saved.duels).toEqual(baseline.exportState().duels);
        expect(saved.players.map((p) => p.state.units)).toEqual(
          baseline.players.map((p) => p.state.units),
        );
        if (saved.duels.some((d) => d.replay.events.some((e) => e.type === 'unit_presence')))
          presenceSeen = true;
      };
      // Reach combat 3: no drop is visible until the settlement commits.
      for (let i = 0; i < 7; i++) {
        step();
        await advance();
        await compare();
      }
      expect((await repo.load())[0]!.authority.itemDrops!.rounds).toHaveLength(0);
      const lock = await repo.pool.connect();
      await lock.query('BEGIN');
      await lock.query('LOCK TABLE private.authority_matches IN ACCESS EXCLUSIVE MODE');
      // Deliberately longer than the old pre-SQL polling window: regression for late writers.
      await fetch('http://127.0.0.1:2583/probe-preparation-delay', { method: 'POST' });
      const previousSubmissions = sqlSubmissions;
      const interrupted = advance().catch(() => {});
      try {
        await waitForBlockedWriter(lock, previousSubmissions);
        // No confirmed inventory is published while the transaction is waiting.
        expect(peers.every((p) => p.view!.own.items!.distributions.length === 0)).toBe(true);
        await killBlockedFixtureWriter(lock);
      } finally {
        await lock.query('ROLLBACK');
        lock.release();
      }
      await interrupted;
      expect((await repo.load())[0]!.authority.itemDrops!.rounds).toHaveLength(0);
      await boot(mode, false, true);
      await join(0, id);
      step();
      await advance(); // confirmed round 3
      const paid = (await repo.load())[0]!;
      expect(paid.authority.itemDrops).toEqual(baseline.exportState().itemDrops);
      expect(paid.authority.itemDrops!.rounds).toHaveLength(1);
      await kill();
      await boot(mode, false, true);
      const resumed = await join(0, id);
      const { writeFileSync: writeView } = await import('node:fs');
      writeView('/tmp/integration-round3-view.json', JSON.stringify(resumed.view, null, 2));
      expect(resumed.view!.own.items).toEqual({
        ...paid.authority.players[0]!.state.items,
        distributions: paid.authority.players[0]!.state.items!.distributions.map((d) => ({
          ...d,
          seed: 0,
        })),
      });
      for (let i = 0; i < 9; i++) {
        step();
        await advance();
        await compare();
      }
      if (mode === 'integrated' || mode === 'roster' || mode === 'pool' || mode === 'p11')
        expect(presenceSeen).toBe(true);
      const round6 = (await repo.load())[0]!;
      expect(round6.authority.itemDrops!.rounds.map((d) => d.round)).toEqual([3, 6]);
      expect(round6.authority.itemDrops).toEqual(baseline.exportState().itemDrops);
      expect(round6.authority.players.map((p) => p.state.items)).toEqual(
        baseline.players.map((p) => p.state.items),
      );
      for (const d of round6.authority.itemDrops!.rounds) {
        expect(d.players).toHaveLength(4);
        expect(d.players.every((p) => p.instanceIds.length === d.quantity)).toBe(true);
      }
      await kill();
      await boot(mode, false, true);
      await join(0, id);
      const recovered = (await repo.load())[0]!;
      expect(recovered.authority.duels).toEqual(round6.authority.duels);
      expect(recovered.authority.players.map((p) => p.state.units)).toEqual(
        round6.authority.players.map((p) => p.state.units),
      );
      expect(recovered.authority.settlements).toEqual(round6.authority.settlements);
      expect(recovered.authority.finalResult).toEqual(round6.authority.finalResult);
      expect(recovered.authority.itemDrops).toEqual(round6.authority.itemDrops);
      expect(recovered.authority.players.map((p) => p.state.items)).toEqual(
        round6.authority.players.map((p) => p.state.items),
      );
      const { writeFileSync } = await import('node:fs');
      writeFileSync(
        mode === 'roster'
          ? '/tmp/p10a-four-player.json'
          : mode === 'integrated'
            ? '/tmp/integration-four-player.json'
            : '/tmp/p8d-four-player.json',
        JSON.stringify(round6.authority.itemDrops, null, 2),
      );
    } finally {
      await kill();
      await repo.pool.end();
    }
  },
  60000,
);

it.skipIf(!url).each([2, 3, 4] as const)(
  'FLORIN %i players: live item effects survive authenticated reconnect and SIGKILL without replay or settlement duplication',
  async (count) => {
    const repo = new PostgresTestRepository(url!);
    try {
      if (!url!.includes('127.0.0.1:55439/tft_persistence_test'))
        throw Error('Isolated PostgreSQL test database required');
      await repo.pool.query('truncate private.authority_members,private.authority_matches');
      await boot('florin');
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
      await until(() => peers.every((p) => p.view!.clock.currentPhase === 'preparation'));
      const prepared = await fetch(`http://127.0.0.1:2583/item-effects?matchId=${id}`, {
        method: 'POST',
      });
      expect(prepared.status, await prepared.text()).toBe(200);
      const before = (await repo.load())[0]!;
      expect(
        before.authority.players.every((p) => p.state.items!.catalogVersion === 'f0p8c-1'),
      ).toBe(true);
      const { AuthoritativeMatch } = await import('../AuthoritativeMatch');
      const baseline = AuthoritativeMatch.restore(before.authority, { now: () => 0 }, false);
      baseline.clock.restore({ ...baseline.clock.snapshot(), remainingMs: 0 });
      baseline.pulse();
      const advanced = await fetch('http://127.0.0.1:2583/advance', { method: 'POST' });
      expect(advanced.status, await advanced.text()).toBe(200);
      await until(() => peers[0]!.view!.clock.currentPhase === 'combat');
      const combat = (await repo.load())[0]!;
      expect(combat.authority.rules).toBe('florin-1');
      expect(
        combat.authority.players.every((p) =>
          p.state.units.some((u) => u.definitionId === 'florin'),
        ),
      ).toBe(true);
      expect(
        combat.authority.duels.some((d) => d.replay.events.some((e) => e.type === 'unit_presence')),
      ).toBe(true);
      expect(combat.authority.duels).toEqual(baseline.exportState().duels);
      expect(
        combat.authority.duels.every((d) =>
          d.replay.events.some((e) => e.type === 'damage' && e.payload.itemSource),
        ),
      ).toBe(true);
      await kill();
      await boot('florin');
      const resumed = await join(0, id);
      const after = (await repo.load())[0]!;
      expect(after.authority.duels).toEqual(combat.authority.duels);
      expect(after.authority.simulations).toBe(combat.authority.simulations);
      expect(after.authority.players.map((p) => p.state.units)).toEqual(
        combat.authority.players.map((p) => p.state.units),
      );
      await fetch('http://127.0.0.1:2583/advance', { method: 'POST' });
      await until(() => resumed.view!.clock.currentPhase === 'resolution');
      const paid = (await repo.load())[0]!;
      await kill();
      await boot('florin');
      await join(0, id);
      const restored = (await repo.load())[0]!;
      expect(restored.authority.settlements).toEqual(paid.authority.settlements);
      expect(restored.authority.players.map((p) => p.state.items)).toEqual(
        paid.authority.players.map((p) => p.state.items),
      );
    } finally {
      await kill();
      await repo.pool.end();
    }
  },
  60000,
);

it.skipIf(!url)(
  'P8F SIGKILL during overtime and retained final preserves integrated state against uninterrupted control',
  async () => {
    if (!url!.includes('127.0.0.1:55439/tft_persistence_test')) throw Error('Unsafe test database');
    const { AuthoritativeMatch } = await import('../AuthoritativeMatch');
    const repo = new PostgresTestRepository(url!);
    await repo.pool.query('truncate private.authority_members,private.authority_matches');
    try {
      await boot('integrated');
      const gates = [];
      for (let i = 0; i < 4; i++) gates.push(await gate(i));
      const created = await action(gates[0]!, 'create_lobby', { capacity: 4 });
      for (let i = 1; i < 4; i++)
        await action(gates[i]!, 'join_lobby', { roomCode: created.lobby!.roomCode });
      for (const g of gates) await action(g, 'set_ready', { readyState: true });
      const started = await action(gates[0]!, 'start_match');
      const id = started.lobby!.matchId!;
      const peers: Awaited<ReturnType<typeof join>>[] = [];
      for (let i = 0; i < 4; i++) peers.push(await join(i, id));
      await until(() => peers.every((p) => p.view!.clock.currentPhase === 'preparation'));
      const result = await fetch('http://127.0.0.1:2583/overtime', { method: 'POST' });
      expect(await result.text()).toBe('ok');
      const overtime = (await repo.load())[0]!;
      expect(overtime.authority.clock.currentPhase).toBe('combat');
      expect(overtime.authority.clock.remainingMs).toBeLessThan(15000);
      expect(overtime.authority.duels.every((d) => d.replay.result.tick === 450)).toBe(true);
      const control = AuthoritativeMatch.restore(overtime.authority, { now: () => 0 }, false);
      await kill();
      await boot('integrated');
      const resumed = await join(0, id);
      for (let i = 1; i < 4; i++) await join(i, id);
      const recovered = (await repo.load())[0]!;
      expect(recovered.authority.duels).toEqual(overtime.authority.duels);
      expect(recovered.authority.itemDrops).toEqual(overtime.authority.itemDrops);
      expect(recovered.authority.simulations).toBe(overtime.authority.simulations);
      expect(resumed.view!.clock.currentPhase).toBe('combat');
      const step = () => {
        control.clock.restore({ ...control.clock.snapshot(), remainingMs: 0 });
        control.pulse();
      };
      for (let n = 0; n < 200 && !control.finalResults; n++) step();
      expect(control.finalResults).not.toBeNull();
      const finish = await fetch('http://127.0.0.1:2583/finish', { method: 'POST' });
      expect(await finish.text()).toBe('ok');
      const finished = (await repo.load())[0]!;
      // Four authenticated resumes add four publication revisions, not economic actions.
      expect(finished.authority.finalResult).toEqual({
        ...control.finalResults,
        sequence: control.finalResults!.sequence + 4,
      });
      expect(finished.authority.itemDrops).toEqual(control.exportState().itemDrops);
      expect(finished.authority.settlements).toEqual(control.exportState().settlements);
      expect(finished.authority.players.map((p) => p.state.items)).toEqual(
        control.players.map((p) => p.state.items),
      );
      expect(finished.authority.players.every((p) => p.eliminated)).toBe(true);
      await kill();
      await boot('integrated');
      const finalPeer = await join(0, id);
      expect(finalPeer.view!.finalResults).toEqual(finished.authority.finalResult);
      const retained = (await repo.load())[0]!;
      expect(retained.authority.completedDuels).toEqual(finished.authority.completedDuels);
      expect(retained.authority.itemDrops).toEqual(finished.authority.itemDrops);
      expect(retained.authority.settlements).toEqual(finished.authority.settlements);
      expect(retained.authority.players.map((p) => p.state)).toEqual(
        finished.authority.players.map((p) => p.state),
      );
    } finally {
      await kill();
      await repo.pool.end();
    }
  },
  60000,
);

it.skipIf(!url)(
  'P8F eliminated spectator survives SIGKILL before the remaining players finish',
  async () => {
    if (!url!.includes('127.0.0.1:55439/tft_persistence_test')) throw Error('Unsafe test database');
    const { AuthoritativeMatch } = await import('../AuthoritativeMatch');
    const { INTEGRATED_ECONOMY_CONFIG } = await import('@tft/game-data');
    const { fixtureUsers, equip } = await import('../multi-fixture');
    const repo = new PostgresTestRepository(url!);
    await repo.pool.query('truncate private.authority_members,private.authority_matches');
    try {
      const m = new AuthoritativeMatch(
        randomUUID(),
        { now: () => 0 },
        undefined,
        4,
        INTEGRATED_ECONOMY_CONFIG,
      );
      fixtureUsers.forEach((userId, i) =>
        m.join(`fixture-${i}`, { userId, name: ['Vargas', 'Florin', 'Nora', 'Alex'][i]! }),
      );
      m.start('fixture-0');
      // Isolated checkpoint fixture. Actual pool copies, damage and economy remain authoritative.
      equip(m, [1, 2], ['dolea']);
      equip(m, [3], ['vargas'], 3);
      for (let n = 0; n < 200 && !m.players[0]!.eliminated && !m.finalResults; n++) {
        m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
        m.pulse();
      }
      expect(m.players[0]!.eliminated).toBe(true);
      expect(m.finalResults).toBeNull();
      const before = m.exportState();
      await repo.commit(0, {
        id: m.id,
        revision: 1,
        commitId: randomUUID(),
        expiresAt: Date.now() + 900000,
        status: 'active',
        authority: before,
        lobby: {
          version: LOBBY_VERSION,
          roomId: randomUUID(),
          roomCode: 'PQRSTVWX',
          hostUserId: fixtureUsers[0]!,
          capacity: 4,
          participants: m.players.map((p) => ({
            userId: p.id,
            name: p.name,
            avatarId: p.avatarId,
            readyState: true,
            connected: true,
          })),
          status: 'in_match',
          createdAt: Date.now(),
          expiresAt: Date.now() + 900000,
          matchId: m.id,
          revision: 1,
        },
      });
      await boot('integrated');
      const observer = await join(0, m.id);
      expect(observer.view!.players.find((p) => p.id === fixtureUsers[0])!.eliminated).toBe(true);
      const checkpoint = (await repo.load())[0]!;
      await kill();
      await boot('integrated');
      const resumed = await join(0, m.id);
      expect(resumed.view!.players.find((p) => p.id === fixtureUsers[0])!.finalPosition).toBe(
        m.players[0]!.finalPosition,
      );
      const after = (await repo.load())[0]!;
      expect(after.authority.players.map((p) => p.state)).toEqual(
        checkpoint.authority.players.map((p) => p.state),
      );
      expect(after.authority.settlements).toEqual(checkpoint.authority.settlements);
      expect(after.authority.itemDrops).toEqual(checkpoint.authority.itemDrops);
      expect(after.authority.duels).toEqual(checkpoint.authority.duels);
    } finally {
      await kill();
      await repo.pool.end();
    }
  },
  30000,
);

it.skipIf(!url).each([2, 3, 4] as const)(
  'P11H %i players: ACK combat purchase survives SIGKILL with immutable duel and idempotent receipt',
  async (count) => {
    const repo = new PostgresTestRepository(url!);
    if (!url!.includes('127.0.0.1:55439/tft_persistence_test')) throw Error('Unsafe test database');
    try {
      await repo.pool.query('truncate private.authority_members,private.authority_matches');
      await boot('p11h');
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
      const p = peers[0]!;
      await until(() => peers.every((x) => x.view!.clock.currentPhase === 'preparation'));
      const prepared = await fetch('http://127.0.0.1:2583/fusion-shop', { method: 'POST' });
      expect(prepared.status, await prepared.text()).toBe(200);
      const advanced = await fetch('http://127.0.0.1:2583/advance', { method: 'POST' });
      expect(advanced.status, await advanced.text()).toBe(200);
      await until(() => p.view!.clock.currentPhase === 'combat');
      const before = (await repo.load())[0]!,
        s = p.view!,
        cmd = {
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
      const ack = (await repo.load())[0]!;
      expect(ack.authority.players[0]!.state.units).toHaveLength(3);
      expect(
        ack.authority.players[0]!.state.units.filter((u) => u.location.kind === 'bench'),
      ).toHaveLength(1);
      expect(ack.authority.duels).toEqual(before.authority.duels);
      expect(ack.authority.players.every((p) => p.state.units[0]!.equipment?.length === 2)).toBe(
        true,
      );
      expect(
        ack.authority.duels.every((d) =>
          d.replay.events.some(
            (e) => e.type === 'damage' && e.payload.damageType === 'true' && e.payload.itemSource,
          ),
        ),
      ).toBe(true);
      await kill();
      await boot('p11h');
      const resumed = await join(0, id),
        restored = (await repo.load())[0]!;
      expect(restored.authority.duels).toEqual(ack.authority.duels);
      expect(restored.authority.players.map((p) => p.state.units)).toEqual(
        ack.authority.players.map((p) => p.state.units),
      );
      expect(restored.authority.simulations).toBe(ack.authority.simulations);
      resumed.r.send('command', { ...cmd, sessionId: resumed.r.sessionId });
      await until(() => resumed.receipts.length === 1);
      expect(resumed.receipts[0]!.accepted).toBe(true);
      expect((await repo.load())[0]!.authority.players[0]!.state.units).toEqual(
        ack.authority.players[0]!.state.units,
      );
    } finally {
      await kill();
      await repo.pool.end();
    }
  },
  60000,
);

it.skipIf(!url).each(['before', 'after'] as const)(
  'P11K remover SIGKILL %s commit: equipment, overflow and consumable are atomic and request retry never duplicates',
  async (boundary) => {
    if (!url!.includes('127.0.0.1:55439/tft_persistence_test')) throw Error('Unsafe test database');
    const repo = new PostgresTestRepository(url!);
    try {
      await repo.pool.query('truncate private.authority_members,private.authority_matches');
      await boot('p11k', false, true);
      const gates = await Promise.all([gate(0), gate(1)]);
      const created = await action(gates[0]!, 'create_lobby', { capacity: 2 });
      await action(gates[1]!, 'join_lobby', { roomCode: created.lobby!.roomCode });
      for (const g of gates) await action(g, 'set_ready', { readyState: true });
      const start = await action(gates[0]!, 'start_match');
      expect(start.error).toBeNull();
      const id = start.lobby!.matchId!;
      const peer = await join(0, id);
      await join(1, id);
      const setup = await fetch('http://127.0.0.1:2583/remover-setup', { method: 'POST' });
      expect(setup.status, await setup.text()).toBe(200);
      const advance = await fetch('http://127.0.0.1:2583/advance', { method: 'POST' });
      expect(advance.status, await advance.text()).toBe(200);
      await until(() => peer.view!.clock.currentPhase === 'combat');
      const before = (await repo.load())[0]!,
        own = before.authority.players[0]!.state;
      const unit = own.units.find((u) => u.location.kind === 'bench')!,
        returned = unit.equipment!.map((i) => i.id),
        removerId = own.items!.removers!.issued[0]!.id;
      expect(returned).toHaveLength(2);
      expect(own.items!.removers!.issued).toHaveLength(1);
      const cmd = {
        version: NETWORK_VERSION,
        sessionId: peer.r.sessionId,
        requestId: randomUUID(),
        sequence: before.authority.players[0]!.sequence,
        matchId: id,
        phaseId: peer.view!.clock.phaseId,
        action: {
          type: 'remove_unit_items',
          seq: own.nextActionSeq,
          expectedRevision: own.revision,
          unitId: unit.id,
          removerId,
        },
      };
      if (boundary === 'before') {
        const lock = await repo.pool.connect();
        await lock.query('BEGIN');
        await lock.query('LOCK TABLE private.authority_matches IN ACCESS EXCLUSIVE MODE');
        try {
          const previousSubmissions = sqlSubmissions;
          peer.r.send('command', cmd);
          await waitForBlockedWriter(lock, previousSubmissions);
          expect(peer.receipts).toHaveLength(0);
          expect(peer.view!.own.items!.removers!.consumed).toHaveLength(0);
          await killBlockedFixtureWriter(lock);
        } finally {
          await lock.query('ROLLBACK');
          lock.release();
        }
        const uncommitted = (await repo.load())[0]!;
        expect(uncommitted.authority.players[0]!.state.items).toEqual(own.items);
        expect(uncommitted.authority.players[0]!.state.units).toEqual(own.units);
      } else {
        peer.r.send('command', cmd);
        await until(() => peer.receipts.length === 1);
        expect(peer.receipts[0]!.accepted).toBe(true);
        await kill();
      }
      await boot('p11k', false, true);
      const resumed = await join(0, id);
      expect(resumed.view!.own.items!.removers!.consumed).toHaveLength(
        boundary === 'before' ? 0 : 1,
      );
      resumed.r.send('command', { ...cmd, sessionId: resumed.r.sessionId });
      await until(() => resumed.receipts.length === 1);
      expect(resumed.receipts[0]!.accepted).toBe(true);
      const committed = (await repo.load())[0]!,
        current = committed.authority.players[0]!.state;
      expect(current.items!.removers!.issued).toHaveLength(1);
      expect(current.items!.removers!.consumed).toEqual([
        { id: removerId, unitId: unit.id, returnedIds: returned },
      ]);
      expect(current.units.find((u) => u.id === unit.id)!.equipment).toBeUndefined();
      for (const id of returned)
        expect(current.items!.pending.filter((i) => i.id === id)).toHaveLength(1);
      expect(committed.authority.duels).toEqual(before.authority.duels);
      expect(committed.authority.simulations).toBe(before.authority.simulations);
      resumed.r.send('command', { ...cmd, sessionId: resumed.r.sessionId });
      await until(() => resumed.receipts.length === 2);
      expect((await repo.load())[0]!.authority.players[0]!.state.items).toEqual(current.items);
    } finally {
      await kill();
      await repo.pool.end();
    }
  },
  60000,
);
