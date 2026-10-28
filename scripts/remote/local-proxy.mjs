/** Loopback diagnostic TLS terminator. Production uses the reviewed Caddy configuration. */
import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import process from 'node:process';
const traffic = {
  requests: 0,
  websocketUpgrades: 0,
  websocketClientBytes: 0,
  websocketServerBytes: 0,
};
const port = process.env.P9A_TLS_PORT || 9443,
  backend = process.env.P9A_BACKEND_PORT || 2596;
const options = {
  key: fs.readFileSync('artifacts/p9a/tls/server.key'),
  cert: fs.readFileSync('artifacts/p9a/tls/server.pem'),
  minVersion: 'TLSv1.2',
};
const headers = (req) => ({
  ...req.headers,
  host: `localhost:${port}`,
  'x-forwarded-proto': 'https',
  'x-forwarded-host': `localhost:${port}`,
  'x-forwarded-for': '127.0.0.1',
});
const allowed = (req) => req.headers.host === `localhost:${port}`;
const server = https.createServer(options, (req, res) => {
  traffic.requests++;
  if (!allowed(req)) {
    res.writeHead(403).end();
    return;
  }
  const upstream = http.request(
    { host: '127.0.0.1', port: backend, path: req.url, method: req.method, headers: headers(req) },
    (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(upstream);
});
server.on('upgrade', (req, socket, head) => {
  if (!allowed(req)) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }
  const upstream = http.request({
    host: '127.0.0.1',
    port: backend,
    path: req.url,
    method: 'GET',
    headers: headers(req),
  });
  upstream.on('upgrade', (res, peer, upHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n${Object.entries(res.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n')}\r\n\r\n`,
    );
    if (upHead.length) socket.write(upHead);
    if (head.length) peer.write(head);
    traffic.websocketUpgrades++;
    socket.on('data', (b) => (traffic.websocketClientBytes += b.length));
    peer.on('data', (b) => (traffic.websocketServerBytes += b.length));
    socket.pipe(peer).pipe(socket);
    socket.on('error', () => peer.destroy());
    peer.on('error', () => socket.destroy());
  });
  upstream.on('response', (res) => {
    socket.end(`HTTP/1.1 ${res.statusCode} Rejected\r\nConnection: close\r\n\r\n`);
  });
  upstream.on('error', () => socket.destroy());
  upstream.end();
});
server.listen(Number(port), '127.0.0.1');
const redirect = http
  .createServer((req, res) => {
    if (req.headers.host !== 'localhost:9080') {
      res.writeHead(403).end();
      return;
    }
    res.writeHead(308, { location: `https://localhost:${port}${req.url}` }).end();
  })
  .listen(9080, '127.0.0.1');
process.on('SIGTERM', () => {
  fs.writeFileSync('artifacts/p9a/tls-traffic.json', JSON.stringify(traffic, null, 2));
  redirect.close();
  server.close();
  process.exit(0);
});
