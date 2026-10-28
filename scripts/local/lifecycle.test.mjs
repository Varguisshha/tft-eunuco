/* global fetch, setTimeout */
import { it, expect } from 'vitest';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { childEnvironment } from './safety.mjs';
const run = (...args) =>
  spawn(process.execPath, ['scripts/local/run.mjs', ...args], {
    env: childEnvironment(process.env),
    stdio: 'ignore',
  });
it.skipIf(process.env.TFT_LOCAL_INTEGRATION !== '1')(
  'rejects an occupied port, starts only local services and closes owned children on SIGTERM',
  async () => {
    const occupied = createServer();
    await new Promise((resolve, reject) => {
      occupied.once('error', reject);
      occupied.listen(4173, '127.0.0.1', resolve);
    });
    try {
      const duplicate = run('start');
      const [code] = await once(duplicate, 'exit');
      expect(code).not.toBe(0);
      expect(occupied.listening).toBe(true);
    } finally {
      await new Promise((resolve) => occupied.close(resolve));
    }
    const child = run('start');
    const exited = once(child, 'exit');
    try {
      let ready = false;
      for (let i = 0; i < 150; i++) {
        try {
          // The authority becomes ready before the supervisor binds its control socket.
          ready =
            (await fetch('http://127.0.0.1:2567/readyz')).status === 200 &&
            (await fetch('http://127.0.0.1:2559/status')).status === 403;
        } catch {
          /* Server is still starting. */
        }
        if (ready) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(ready).toBe(true);
      expect((await fetch('http://127.0.0.1:2559/stop', { method: 'POST' })).status).toBe(403);
    } finally {
      child.kill('SIGTERM');
      await exited;
    }
    for (const port of [4173, 2567, 2559, 55440]) {
      const probe = createServer();
      await new Promise((resolve, reject) => {
        probe.once('error', reject);
        probe.listen(port, '127.0.0.1', resolve);
      });
      await new Promise((resolve) => probe.close(resolve));
    }
  },
  30000,
);
