import { matchMaker } from '@colyseus/core';
import { createServer } from '../server';
import { MatchRoom } from '../MatchRoom';
import type { MatchRepository } from '../persistence/repository';
import type { VerifyIdentity } from '../auth';
import type { RuntimeConfig } from './config';
import { protectHttp } from './http';
import { Availability } from './availability';
import { log } from './telemetry';
import { monitorEventLoopDelay } from 'node:perf_hooks';
export async function startRuntime(
  config: RuntimeConfig,
  repository: MatchRepository,
  verify: VerifyIdentity,
  probe: () => Promise<void>,
  RoomType = MatchRoom,
) {
  const availability = new Availability(probe);
  if (!(await availability.check(true))) throw Error('Dependencies unavailable');
  const observed: MatchRepository = {
    load: async () => {
      const rows = await repository.load();
      log('restore', { matches: rows.length });
      return rows;
    },
    commit: async (revision, snapshot) => {
      const start = performance.now();
      try {
        await repository.commit(revision, snapshot);
        log('checkpoint', { ms: performance.now() - start });
      } catch {
        availability.ready = false;
        log('storage_failed');
        throw Error('Persistence unavailable');
      }
    },
  };
  const authenticated: VerifyIdentity = async (token) => {
    try {
      const identity = await verify(token);
      log('auth_ok');
      return identity;
    } catch {
      log('auth_rejected');
      throw Error('Sesión no válida.');
    }
  };
  class AuthenticatedRoom extends RoomType {
    static onAuth = authenticated;
    protected verify = authenticated;
    onJoin(...args: Parameters<MatchRoom['onJoin']>) {
      super.onJoin(...args);
      if (this.match.players.some((p) => p.id === args[2]?.userId && p.generation > 1))
        log('reconnect');
    }
  }
  const server = createServer(AuthenticatedRoom, authenticated, observed, config);
  const http = await server.serverless();
  protectHttp(http, config, availability);
  let rooms = (await matchMaker.query({})).length;
  let connections = 0;
  for (const name of ['lobby_gateway', 'private_match']) {
    const handler = matchMaker.getHandler(name);
    handler.on('create', () => {
      rooms++;
      log('room_create', { rooms });
    });
    handler.on('dispose', () => {
      rooms--;
      log('room_dispose', { rooms });
    });
    handler.on('join', () => {
      connections++;
      log('connection', { connections });
    });
    handler.on('leave', () => {
      connections--;
      log('disconnection', { connections });
    });
  }
  await new Promise<void>((resolve, reject) => {
    http.once('error', reject);
    http.listen(config.port, config.host, () => {
      http.off('error', reject);
      resolve();
    });
  });
  const delay = monitorEventLoopDelay({ resolution: 20 });
  delay.enable();
  const sampling = setInterval(() => {
    void availability.check(true);
    const cpu = process.cpuUsage();
    log('sample', {
      rss: process.memoryUsage().rss,
      heap: process.memoryUsage().heapUsed,
      cpuUserMicros: cpu.user,
      cpuSystemMicros: cpu.system,
      rooms,
      connections,
      eventLoopP99ms: delay.percentile(99) / 1e6,
      eventLoopMaxMs: delay.max / 1e6,
      eventLoopP95ms: delay.percentile(95) / 1e6,
    });
    delay.reset();
  }, 30000);
  sampling.unref();
  log('started');
  let stopping: Promise<void> | undefined;
  const stop = () =>
    (stopping ??= (async () => {
      availability.stop();
      clearInterval(sampling);
      delay.disable();
      log('stopping');
      await server.gracefullyShutdown(false);
      log('stopped');
    })());
  return { server, http, availability, stop };
}
