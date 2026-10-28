import type { IncomingMessage, ServerResponse, Server } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import type { RuntimeConfig } from './config';
import type { Availability } from './availability';
import { log } from './telemetry';
export function requestAllowed(
  req: IncomingMessage,
  config: RuntimeConfig,
  websocket = false,
): boolean {
  // Railway edge is the sole ingress in this mode (no TCP proxy/private peers).
  // Never derive identity, rate buckets or the canonical host from XFF/Forwarded.
  const railway = config.proxyMode === 'railway';
  for (const name of ['host', 'origin', 'x-forwarded-proto', 'x-forwarded-host']) {
    if ((req.rawHeaders ?? []).filter((v, i) => i % 2 === 0 && v.toLowerCase() === name).length > 1)
      return false;
  }
  if (railway && req.headers.host === 'healthcheck.railway.app')
    return (
      !websocket &&
      req.method === 'GET' &&
      !req.headers.origin &&
      (req.url === '/readyz' || req.url === '/healthz')
    );
  if (req.headers.host !== config.publicUrl.host) return false;
  if (railway && req.headers['x-forwarded-host'] !== config.publicUrl.host) return false;
  const forwarded = req.headers['x-forwarded-proto'];
  if (
    config.publicUrl.protocol === 'https:' &&
    ((!railway && req.socket.remoteAddress !== config.proxyAddress) || forwarded !== 'https')
  )
    return false;
  if (config.publicUrl.protocol !== 'https:' && forwarded) return false;
  const origin = req.headers.origin;
  if (origin && !config.origins.includes(origin)) return false;
  if ((websocket || req.url?.startsWith('/matchmake/')) && !origin) return false;
  return true;
}
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};
/** Installed around Colyseus's final handler BEFORE listen, so OPTIONS and upgrade cannot bypass it. */
export function protectHttp(server: Server, config: RuntimeConfig, availability: Availability) {
  const handlers = server.listeners('request') as ((
    req: IncomingMessage,
    res: ServerResponse,
  ) => void)[];
  server.removeAllListeners('request');
  const buckets = new Map<string, { count: number; until: number }>();
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.on('request', (req, res) => {
    const end = (code: number, body: string | Buffer = '') => {
      res.writeHead(code);
      res.end(body);
    };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    if (!requestAllowed(req, config)) {
      log('request_rejected');
      end(403);
      return;
    }
    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
      res.setHeader('Vary', 'Origin');
    }
    // Prevent the framework's default reflected/wildcard CORS and cookie headers.
    const set = res.setHeader.bind(res);
    res.setHeader = (name, value) => {
      if (/^access-control-allow-origin$/i.test(name))
        return req.headers.origin ? set(name, req.headers.origin) : res;
      if (/^access-control-allow-credentials$/i.test(name) || /^set-cookie$/i.test(name))
        return res;
      return set(name, value);
    };
    const path = (req.url ?? '/').split('?')[0]!;
    if (path === '/healthz') {
      end(availability.draining ? 503 : 200, availability.draining ? 'stopping' : 'ok');
      return;
    }
    if (path === '/readyz') {
      void availability.check().then((ok) => end(ok ? 200 : 503, ok ? 'ready' : 'unavailable'));
      return;
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      end(204);
      return;
    }
    if (path.startsWith('/matchmake/')) {
      if (!availability.ready || availability.draining) {
        end(503);
        return;
      }
      if (
        req.method !== 'POST' ||
        !/^\/matchmake\/(create|joinById|joinOrCreate)\/[A-Za-z0-9_-]+$/.test(path) ||
        path.endsWith('/test_match')
      ) {
        end(404);
        return;
      }
      const key = req.socket.remoteAddress ?? 'unknown'; // single-host proxy: deliberately aggregate, never trust client XFF
      const time = Date.now();
      const old = buckets.get(key);
      const bucket = old && old.until > time ? old : { count: 0, until: time + 60000 };
      buckets.set(key, bucket);
      if (++bucket.count > 240) {
        end(429);
        return;
      }
      if (Number(req.headers['content-length'] ?? 0) > 4096 || req.headers['transfer-encoding']) {
        end(413);
        return;
      }
      for (const handler of handlers) handler.call(server, req, res);
      return;
    }
    if (
      !['GET', 'HEAD'].includes(req.method ?? '') ||
      path.includes('..') ||
      path.split('/').some((s) => s.startsWith('.')) ||
      path.startsWith('/__') ||
      path.startsWith('/artifacts') ||
      path.startsWith('/dev')
    ) {
      end(404);
      return;
    }
    void (async () => {
      let decoded: string;
      try {
        decoded = decodeURIComponent(path);
      } catch {
        end(400);
        return;
      }
      let file = resolve(config.staticDir, '.' + decoded);
      if (
        !file.startsWith(config.staticDir + sep) ||
        decoded.split('/').some((s) => s.startsWith('.'))
      ) {
        if (decoded !== '/') {
          end(404);
          return;
        }
      }
      if (decoded === '/') file = resolve(config.staticDir, 'index.html');
      try {
        if (!(await stat(file)).isFile() || !mime[extname(file)]) {
          end(404);
          return;
        }
        const body = await readFile(file);
        res.setHeader('Content-Type', mime[extname(file)]!);
        res.setHeader('Content-Length', body.length);
        res.setHeader(
          'Content-Security-Policy',
          `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ${config.supabaseUrl} ${config.origins.map((o) => o.replace(/^http/, 'ws')).join(' ')}; frame-ancestors 'none'; base-uri 'self'; object-src 'none'`,
        );
        end(200, req.method === 'HEAD' ? '' : body);
      } catch {
        end(404);
      }
    })().catch(() => end(500));
  });
}
