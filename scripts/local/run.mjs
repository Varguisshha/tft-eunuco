/* global Buffer, AbortSignal, fetch, setTimeout, clearTimeout */
import console from 'node:console';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { randomBytes, createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createServer as tcpServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import {
  PORTS,
  targetIdentity,
  assertLocalEnvironment,
  childEnvironment,
  issueIdentity,
} from './safety.mjs';
const tools = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(tools, '../..');
const stateFile = path.join(root, 'artifacts/local-session.json');
const command = process.argv[2] ?? 'start';
if (command === 'stop' || command === 'status') {
  if (!fs.existsSync(stateFile)) {
    console.log('No managed LOCAL session recorded.');
    process.exit(0);
  }
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  if (state.root !== root || state.control !== PORTS.control)
    throw Error('Invalid local ownership record');
  try {
    const r = await fetch(`http://127.0.0.1:${PORTS.control}/${command}`, {
      method: command === 'stop' ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + state.secret },
      signal: AbortSignal.timeout(40000),
    });
    if (!r.ok) throw Error('Ownership check rejected');
    console.log(await r.text());
    if (command === 'stop') {
      const deadline = Date.now() + 45000;
      while (fs.existsSync(stateFile) && Date.now() < deadline)
        await new Promise((resolve) => setTimeout(resolve, 100));
      if (fs.existsSync(stateFile)) throw Error('Shutdown not confirmed');
      console.log('LOCAL stopped; owned resources closed.');
    }
  } catch {
    console.error(
      'LOCAL unreachable; no PID or foreign process was killed. Inspect the recorded worktree and ports.',
    );
    process.exitCode = 1;
  }
} else if (command === 'start') {
  assertLocalEnvironment(process.env);
  const arg = process.argv.indexOf('--worktree');
  const target = fs.realpathSync(arg < 0 ? root : process.argv[arg + 1]);
  for (const file of [
    'apps/web/vite.config.ts',
    'apps/server/src/remote/runtime.ts',
    'packages/game-data/src/economy.ts',
  ])
    if (!fs.existsSync(path.join(target, file))) throw Error('Not a compatible TFT worktree');
  execFileSync('git', ['-C', target, 'rev-parse', '--show-toplevel'], { stdio: 'ignore' });
  for (const port of Object.values(PORTS)) {
    const probe = tcpServer();
    await new Promise((resolve, reject) => {
      probe.once('error', () =>
        reject(
          Error(
            `Port ${port} is occupied; nothing will be stopped. Inspect with lsof -nP -iTCP:${port} -sTCP:LISTEN`,
          ),
        ),
      );
      probe.listen(port, '127.0.0.1', resolve);
    });
    await new Promise((resolve) => probe.close(resolve));
  }
  for (const bin of ['initdb', 'postgres']) execFileSync(bin, ['--version'], { stdio: 'ignore' });
  const hash = createHash('sha256');
  function walk(dir) {
    for (const f of fs.readdirSync(dir).sort()) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (!f.endsWith('.test.ts')) {
        hash.update(path.relative(target, p));
        hash.update(fs.readFileSync(p));
      }
    }
  }
  walk(path.join(target, 'packages/game-data/src'));
  const fingerprint = hash.digest('hex');
  const identity = createHash('sha256')
    .update(targetIdentity(target) + fingerprint)
    .digest('hex')
    .slice(0, 16);
  const directory = path.join(root, 'artifacts/local', identity);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const key = randomBytes(32).toString('hex');
  const env = childEnvironment(process.env);
  const requireServer = createRequire(path.join(target, 'apps/server/package.json'));
  const { build } = requireServer('esbuild');
  const modules = path.join(directory, 'node_modules');
  if (!fs.existsSync(modules))
    fs.symlinkSync(path.join(target, 'apps/server/node_modules'), modules, 'dir');
  const source = fs
    .readFileSync(path.join(tools, 'server.mjs.fixture'), 'utf8')
    .replaceAll('__TARGET__', target)
    .replaceAll('__TOOLS__', tools);
  await build({
    stdin: {
      contents: source,
      resolveDir: path.join(target, 'apps/server'),
      sourcefile: 'local-entry.mjs',
    },
    outfile: path.join(directory, 'server.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    alias: Object.fromEntries(
      ['game-data', 'game-core', 'shared'].map((n) => [
        '@tft/' + n,
        path.join(target, 'packages', n, 'src/index.ts'),
      ]),
    ),
  });
  let child, vite, control, stopping;
  const stop = () =>
    (stopping ??= (async () => {
      await vite?.close();
      if (child && child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit');
        child.send({ stop: true });
        await exited;
      }
      if (control) await new Promise((resolve) => control.close(resolve));
      if (fs.existsSync(stateFile) && JSON.parse(fs.readFileSync(stateFile, 'utf8')).secret === key)
        fs.unlinkSync(stateFile);
    })());
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => void stop().then(() => process.exit(0)));
  try {
    child = spawn(process.execPath, [path.join(directory, 'server.mjs')], {
      cwd: target,
      env: {
        ...env,
        TFT_LOCAL_BOOT: JSON.stringify({
          directory,
          database: `postgresql://127.0.0.1:55440/tft_local_${identity}`,
          identity,
          key,
        }),
      },
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    });
    child.on('exit', () => {
      if (!stopping)
        void stop().then(() => {
          process.exitCode = 1;
        });
    });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('LOCAL startup timeout')), 30000);
      child.once('exit', () => {
        clearTimeout(timeout);
        reject(Error('Local server exited'));
      });
      child.once('message', (m) => {
        clearTimeout(timeout);
        if (m.ready) resolve();
        else reject(Error(m.error));
      });
    });
    // Vite config and env files from the selected worktree are deliberately not loaded.
    const requireWeb = createRequire(path.join(target, 'apps/web/package.json'));
    const { createServer: createVite } = await import(requireWeb.resolve('vite'));
    const react = (await import(requireWeb.resolve('@vitejs/plugin-react'))).default;
    const { createIconResourcePlan, iconResourceMiddleware } = await import(
      '../assets/item-icon-pack.mjs'
    );
    // Asset-only configuration: never read online worktree env files or grant production packs here.
    const iconPlan = await createIconResourcePlan({
      root: target,
      local: true,
      ...(process.env.TFT_REFERENCE_ART_ROOT
        ? { referenceRoot: process.env.TFT_REFERENCE_ART_ROOT }
        : {}),
    });
    vite = await createVite({
      configFile: false,
      envDir: false,
      root: path.join(target, 'apps/web'),
      cacheDir: path.join(directory, 'vite-cache'),
      define: {
        __DEVTOOLS__: 'true',
        __ITEM_ICON_RESOURCES__: JSON.stringify(iconPlan.policy),
        'import.meta.env.VITE_APP_ENV': '"local-isolated"',
        'import.meta.env.VITE_ACCOUNT_REGISTRATION_MODE': '"open-local"',
        'import.meta.env.VITE_TURNSTILE_SITE_KEY': '""',
        'import.meta.env.VITE_SUPABASE_URL': '""',
        'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': '""',
        'import.meta.env.VITE_GAME_SERVER_URL': '"http://127.0.0.1:4173/__game"',
      },
      plugins: [
        {
          name: 'tft-local-icon-resources',
          configureServer(server) {
            server.middlewares.use(iconResourceMiddleware(iconPlan));
          },
        },
        {
          name: 'tft-local-isolation',
          enforce: 'pre',
          transform(_code, id) {
            if (id === path.join(target, 'apps/web/src/auth/AccountPortal.tsx'))
              return fs.readFileSync(path.join(tools, 'portal.tsx.fixture'), 'utf8');
          },
          configureServer(server) {
            server.middlewares.use('/__local/auth-preview', async (req, res) => {
              if (req.method !== 'GET' || req.headers.host !== '127.0.0.1:4173') {
                res.writeHead(403).end();
                return;
              }
              const html = await server.transformIndexHtml(
                '/__local/auth-preview',
                `<!doctype html><html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Registro LOCAL · TFT EUNUCO</title></head><body><div id="root"></div><script type="module">import '/src/styles.css';import '/src/match/hud/neonHud.css';import '@fontsource/dm-sans/latin-400.css';import '@fontsource/dm-sans/latin-500.css';import '@fontsource/dm-sans/latin-700.css';import React from 'react';import {createRoot} from 'react-dom/client';import {AccountPortal} from '/src/auth/AccountPortal.tsx?local-auth-preview';createRoot(document.getElementById('root')).render(React.createElement(AccountPortal,{onLocal:()=>location.assign('/')}));</script></body></html>`,
              );
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.setHeader('Cache-Control', 'no-store');
              res.end(html);
            });
            server.middlewares.use('/__local/identity', (req, res) => {
              if (
                req.method !== 'POST' ||
                req.headers.origin !== 'http://127.0.0.1:4173' ||
                req.headers.host !== '127.0.0.1:4173'
              ) {
                res.writeHead(403).end();
                return;
              }
              let body = '';
              req.on('data', (b) => {
                body += b;
                if (body.length > 128) req.destroy();
              });
              req.on('end', () => {
                try {
                  const slot = JSON.parse(body).slot;
                  const token = issueIdentity(slot, key);
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Cache-Control', 'no-store');
                  res.end(
                    JSON.stringify({
                      access_token: token,
                      user: { id: JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).sub },
                    }),
                  );
                } catch {
                  res.writeHead(400).end();
                }
              });
            });
          },
        },
        react(),
      ],
      server: {
        host: '127.0.0.1',
        port: 4173,
        strictPort: true,
        fs: { allow: [target, root] },
        proxy: {
          '/__game': {
            target: 'http://127.0.0.1:2567',
            ws: true,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/__game/, ''),
          },
        },
      },
    });
    await vite.listen();
    vite.watcher.add([path.join(target, 'packages'), path.join(target, 'apps/server/src')]);
    vite.watcher.on('change', (file) => {
      if (
        file.startsWith(path.join(target, 'packages') + path.sep) ||
        file.startsWith(path.join(target, 'apps/server/src') + path.sep)
      ) {
        console.log(
          'Server/catalog changed: LOCAL stopping. Restart explicitly; incompatible catalogs receive isolated storage.',
        );
        void stop();
      }
    });
    control = createServer((req, res) => {
      if (
        req.headers.authorization !== 'Bearer ' + key ||
        req.headers.host !== `127.0.0.1:${PORTS.control}` ||
        req.headers.origin
      ) {
        res.writeHead(403).end();
        return;
      }
      if (req.method === 'POST' && req.url === '/stop') {
        res.end('LOCAL stopping; only owned processes.');
        void stop();
      } else if (req.method === 'GET' && req.url === '/status')
        res.end(
          JSON.stringify({
            target,
            fingerprint,
            web: 'http://127.0.0.1:4173',
            database: `tft_local_${identity}`,
          }),
        );
      else res.writeHead(404).end();
    });
    await new Promise((resolve, reject) => {
      control.once('error', reject);
      control.listen(PORTS.control, '127.0.0.1', resolve);
    });
    fs.writeFileSync(
      stateFile,
      JSON.stringify({ root, target, control: PORTS.control, secret: key, fingerprint }),
      { mode: 0o600 },
    );
    console.log(
      `LOCAL ready: http://127.0.0.1:4173/ | Colyseus 2567 | PostgreSQL 55440\nWorktree: ${target}\nCatalog source fingerprint: ${fingerprint}\nStop with pnpm stop:local from ${root}`,
    );
  } catch (error) {
    console.error(error.message);
    await stop();
    process.exitCode = 1;
  }
} else throw Error('Use start, stop or status');
