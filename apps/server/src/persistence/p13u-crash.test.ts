import { expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { P13U_ECONOMY_CONFIG } from '@tft/game-data';
import { LOBBY_VERSION } from '@tft/shared';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import { fixtureUsers, equip } from '../multi-fixture';
import { PostgresTestRepository } from './PostgresTestRepository';
import { type StoredMatch } from './snapshot';
const url = process.env.PERSISTENCE_TEST_URL;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(f: () => boolean) {
  const end = Date.now() + 10000;
  while (!f()) {
    if (Date.now() > end) throw Error('P13U process timeout');
    await pause(10);
  }
}
const cases = ([2, 3, 4] as const).flatMap((n) =>
  (['before', 'after'] as const).flatMap((boundary) =>
    (['combat', 'resolution'] as const).map((phase) => ({ n, boundary, phase })),
  ),
);
it.skipIf(!url).each(cases)(
  'P13U $n players SIGKILL $boundary $phase commit: versioned characters/replay/pool/items atomically persist exactly once',
  async ({ n, boundary, phase }) => {
    if (
      !url ||
      !/^postgres(?:ql)?:\/\/(?:[^/@]+@)?127\.0\.0\.1:55439\/tft_persistence_test$/.test(url)
    )
      throw Error('Unsafe database');
    const repo = new PostgresTestRepository(url);
    let child: ChildProcess | undefined;
    const kill = async () => {
      if (!child || child.exitCode !== null || child.signalCode !== null) return;
      const c = child;
      await new Promise<void>((r) => {
        c.once('exit', () => r());
        c.kill('SIGKILL');
      });
      child = undefined;
    };
    try {
      await repo.pool.query('truncate private.authority_members,private.authority_matches');
      const m = new AuthoritativeMatch(
        randomUUID(),
        { now: () => 0 },
        () => 360,
        n,
        P13U_ECONOMY_CONFIG,
      );
      for (let i = 0; i < n; i++)
        m.join(`socket-${i}`, { userId: fixtureUsers[i]!, name: `P13U ${i}` });
      for (const p of m.players) {
        p.state.level = 7;
        p.state.xp = 0;
      }
      m.start('socket-0');
      equip(m, undefined, ['dolea', 'vargas', 'peibol', 'jaramillo']);
      for (const p of m.players) m.grantItems(p.id, 'p13t-crash', ['component-ad']);
      const advance = () => {
        m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
        m.pulse();
      };
      advance();
      if (phase === 'resolution') advance();
      const lobby = {
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
        status: 'in_match' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 900000,
        matchId: m.id,
        revision: 1,
      };
      const initial: StoredMatch = {
        id: m.id,
        revision: 1,
        commitId: randomUUID(),
        status: 'active',
        expiresAt: Date.now() + 900000,
        lobby,
        authority: m.exportState(),
      };
      await repo.commit(0, initial);
      let submitted = false,
        committed = false,
        ready = false;
      const boot = async () => {
        submitted = false;
        committed = false;
        ready = false;
        child = spawn(
          process.execPath,
          ['--import', 'tsx', 'src/persistence/p13-online-crash-worker.ts', m.id, '1', phase],
          {
            cwd: process.cwd() + '/apps/server',
            env: { PATH: process.env.PATH, USER: process.env.USER, PERSISTENCE_TEST_URL: url },
            stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
          },
        );
        let failure = '';
        child.stderr!.on('data', (b) => {
          failure += String(b).slice(0, 2000);
        });
        child.on('exit', (code) => {
          if (code && !ready) failure = 'Worker exit ' + code + ': ' + failure;
        });
        child.on('message', (msg) => {
          if (msg && typeof msg === 'object' && 'type' in msg) {
            if (msg.type === 'ready') ready = true;
            if (msg.type === 'sql-submit') submitted = true;
            if (msg.type === 'committed') committed = true;
          }
        });
        await until(() => ready || !!failure);
        if (failure) throw Error(failure);
      };
      await boot();
      if (boundary === 'before') {
        const lock = await repo.pool.connect();
        await lock.query('BEGIN');
        await lock.query('LOCK TABLE private.authority_matches IN ACCESS EXCLUSIVE MODE');
        try {
          child!.send('advance');
          await until(() => submitted);
          let blocked: number[] = [];
          for (let i = 0; i < 150 && !blocked.length; i++) {
            await lock.query('select pg_stat_clear_snapshot()');
            const q = await lock.query(
              "select pid from pg_stat_activity where datname=current_database() and query like 'select public.authority_commit%' and pg_backend_pid()=any(pg_blocking_pids(pid))",
            );
            blocked = q.rows.map((r) => Number(r.pid));
            if (!blocked.length) await pause(10);
          }
          expect(blocked.length).toBeGreaterThan(0);
          expect(committed).toBe(false);
          await kill();
          await lock.query(
            'select pg_terminate_backend(pid,2000) from pg_stat_activity where datname=current_database() and pid=any($1::int[])',
            [blocked],
          );
        } finally {
          await lock.query('ROLLBACK');
          lock.release();
        }
        const stored = (await repo.load()).find((d) => d.id === m.id)!;
        expect(stored).toEqual(initial);
      } else {
        child!.send('advance');
        await until(() => committed);
        await kill();
      }
      const afterCrash = (await repo.load()).find((d) => d.id === m.id)!;
      await boot();
      child!.send('retry');
      await until(() => committed);
      await kill();
      const recovered = (await repo.load()).find((d) => d.id === m.id)!;
      const restored = AuthoritativeMatch.restore(recovered.authority, { now: () => 0 }, false);
      restored.assertConservation();
      if (boundary === 'after') expect(recovered.authority).toEqual(afterCrash.authority);
      expect(recovered.authority.rules).toBe('f0p13u-1');
      for (const p of recovered.authority.players) {
        expect(p.state.config.jewPolicy).toBeUndefined();
        expect(p.state.config.synergyPolicy).toBe('f0p13u-1');
        if (p.state.lastReward) {
          expect(p.state.lastReward.jew).toBeUndefined();
          expect(
            p.state.synergies!.receipts.filter(
              (r) => r.kind === 'interest' && r.round === p.state.lastReward!.round,
            ),
          ).toHaveLength(1);
          expect(
            p.state.ledger.filter(
              (e) => e.reason === 'jew_interest' && e.round === p.state.lastReward!.round,
            ),
          ).toHaveLength(0);
        }
      }
      for (const p of recovered.authority.players) {
        expect(p.state.config.characterPolicy).toBe('f0p13t-1');
        expect(p.state.units.every((u) => !u.progress)).toBe(true);
      }
      for (const d of recovered.authority.duels)
        expect(d.replay.input.rulesVersion).toBe('f0p13u-1');
    } finally {
      await kill();
      await repo.pool.end();
    }
  },
  30000,
);
