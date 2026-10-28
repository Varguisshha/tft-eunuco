import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { P11H_ITEM_CATALOG } from '@tft/game-data';
import assets from './itemIconAssets.json';
it('44 original independent 64px assets map to exactly 8 components and36 recipes, with content checksums', async () => {
  expect(Object.keys(assets)).toHaveLength(44);
  const hashes = new Set<string>();
  for (const d of P11H_ITEM_CATALOG.definitions) {
    const a = assets[d.content!.sourceRecordId as keyof typeof assets];
    expect(a).toBeTruthy();
    const bytes = readFileSync(`apps/web/public${a.src}`);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(a.sha256);
    hashes.add(a.sha256);
    const meta = await sharp(bytes).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([64, 64, 'webp']);
  }
  expect(hashes.size).toBe(44);
});
