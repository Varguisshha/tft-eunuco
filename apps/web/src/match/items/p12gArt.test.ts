import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import assets from './itemIconAssets.json';
import official from './tftOfficialItemIcons.json';
import pack from '../../../../../art/p12g/pack.json';
import catalog from '../../../../../art/p12g/specs/catalog.json';

it('ships 44 unique original pixel images and matching lossless masters without changing associations', async () => {
  expect(pack.assets).toHaveLength(44);
  expect(pack.assets.filter((a) => a.kind === 'component')).toHaveLength(8);
  const hashes = new Set<string>();
  for (const a of pack.assets) {
    const mapped = assets[a.tftId as keyof typeof assets];
    const reference = official[a.iconKey as keyof typeof official];
    expect([a.internalId, a.tftId, a.visibleName]).toEqual([
      reference.internalId,
      reference.tftId,
      reference.visibleName,
    ]);
    const bytes = readFileSync('apps/web/public' + mapped.src);
    const hash = createHash('sha256').update(bytes).digest('hex');
    expect(hash).toBe(a.sha256);
    expect(hash).toBe(mapped.sha256);
    expect(hash).not.toBe(reference.sha256);
    hashes.add(hash);
    const meta = await sharp(bytes).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([128, 128, 'webp']);
    const master = readFileSync('art/p12g/masters/' + a.file);
    expect(createHash('sha256').update(master).digest('hex')).toBe(
      catalog.assets.find((s) => s.tftId === a.tftId)!.masterSha256,
    );
    const masterMeta = await sharp(master).metadata();
    expect([masterMeta.width, masterMeta.height]).toEqual([512, 512]);
  }
  expect(hashes.size).toBe(44);
});
