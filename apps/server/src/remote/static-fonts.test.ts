import { it, expect } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig } from './config';
import { protectHttp } from './http';
import { Availability } from './availability';
it('serves font bytes with correct MIME and nosniff; rejects unknown files and encoded traversal', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tft-fonts-'));
  const bytes = Buffer.from([0, 1, 0, 0, 255, 128]);
  const types = { ttf: 'font/ttf', woff: 'font/woff', woff2: 'font/woff2' };
  for (const ext of [...Object.keys(types), 'bin'])
    await writeFile(join(dir, 'font.' + ext), bytes);
  const c = readConfig({
    SUPABASE_URL: 'https://example.test',
    SUPABASE_PUBLISHABLE_KEY: 'public',
    SUPABASE_SERVICE_ROLE_KEY: 'private',
    TFT_STATIC_DIR: dir,
  });
  const server = createServer();
  protectHttp(server, c, new Availability(async () => {}));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  c.publicUrl = new URL(`http://127.0.0.1:${(server.address() as { port: number }).port}`);
  try {
    for (const [ext, type] of Object.entries(types)) {
      const r = await fetch(c.publicUrl + 'font.' + ext);
      expect(r.status).toBe(200);
      expect(r.headers.get('content-type')).toBe(type);
      expect(r.headers.get('x-content-type-options')).toBe('nosniff');
      expect(Buffer.from(await r.arrayBuffer())).toEqual(bytes);
      const head = await fetch(c.publicUrl + 'font.' + ext, { method: 'HEAD' });
      expect(head.headers.get('content-length')).toBe(String(bytes.length));
      expect((await head.arrayBuffer()).byteLength).toBe(0);
    }
    for (const path of ['font.bin', 'missing.ttf', '%2eenv', '%2e%2e/secret.ttf'])
      expect((await fetch(c.publicUrl + path)).status).toBe(404);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await rm(dir, { recursive: true });
  }
});
