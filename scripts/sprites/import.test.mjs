import { Buffer } from 'node:buffer';
import { expect, it } from 'vitest';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { build, orderedFrames, visibleBounds } from './import.mjs';
it('sorts numeric frames, ignores copies and rejects ambiguous numbering', () => {
  expect(
    orderedFrames(['frame-10.png', 'frame-2.png', 'frame-1.png', 'frame-2 copia.png']),
  ).toEqual(['frame-1.png', 'frame-2.png', 'frame-10.png']);
  expect(() => orderedFrames(['frame-1.png', '01.png'])).toThrow();
});
it('finds visible bounds including faint alpha; excludes transparent RGB', () => {
  const raw = Buffer.alloc(4 * 4 * 4);
  raw[(1 * 4 + 2) * 4 + 3] = 1;
  expect(visibleBounds(raw, 4, 4)).toEqual({ left: 2, top: 1, width: 1, height: 1 });
  expect(() => visibleBounds(raw, 4, 4, 127)).toThrow();
});
it('derived sheets and source hashes agree with physical assets, without opaque background', async () => {
  const report = JSON.parse(await fs.readFile('docs/SPRITE_IMPORT_REPORT.json', 'utf8'));
  for (const r of report) {
    const asset = await sharp('apps/web/public/' + r.output).metadata();
    expect(asset.width).toBe(r.frameWidth * 8);
    expect(asset.height).toBe(r.frameHeight);
    expect(asset.hasAlpha).toBe(true);
    const stats = await sharp('apps/web/public/' + r.output).stats();
    expect(stats.channels[3].min).toBe(0);
    for (const f of r.frames)
      expect(
        crypto
          .createHash('sha256')
          .update(await fs.readFile(f.file))
          .digest('hex'),
      ).toBe(f.sha256);
  }
});
it('reimports deterministically and discovers an added walk without touching attack', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tft-sprite-'));
  try {
    await fs.mkdir(path.join(root, 'scripts/sprites'), { recursive: true });
    await fs.mkdir(path.join(root, 'apps/web/src/assets'), { recursive: true });
    await fs.mkdir(path.join(root, 'docs'));
    await fs.copyFile(
      'scripts/sprites/config.json',
      path.join(root, 'scripts/sprites/config.json'),
    );
    await fs.cp('Sprites', path.join(root, 'Sprites'), { recursive: true });
    const first = await build(root);
    const sheet = await fs.readFile(
      path.join(root, 'apps/web/public/sprites/dolea/star1/attack.png'),
    );
    const second = await build(root);
    expect(second).toEqual(first);
    const walk = path.join(root, 'Sprites/dolea/star1/walk');
    await fs.mkdir(walk, { recursive: true });
    await fs.copyFile('Sprites/DOLEA NIVEL 1 ATAQUE.png', path.join(walk, 'frame-1.png'));
    const next = await build(root);
    expect(next.manifests[0].evolutions.star1.walk.frameCount).toBe(1);
    expect(next.manifests[0].evolutions.star1.attack).toEqual(
      first.manifests[0].evolutions.star1.attack,
    );
    expect(
      await fs.readFile(path.join(root, 'apps/web/public/sprites/dolea/star1/attack.png')),
    ).toEqual(sheet);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
