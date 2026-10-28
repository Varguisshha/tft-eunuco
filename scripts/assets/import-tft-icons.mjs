/* global process, fetch, AbortSignal, Buffer, console */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
const root = process.cwd(),
  version = '16.21.1';
const base = `https://ddragon.leagueoflegends.com/cdn/${version}`;
const metaUrl = `${base}/data/es_ES/tft-item.json`;
const hash = (b) => createHash('sha256').update(b).digest('hex');
const reference = JSON.parse(
  await fs.readFile('packages/game-data/src/reference/tft-18.5-items.json', 'utf8'),
);
const expected = reference.sources.find((s) => s.url === metaUrl)?.sha256;
if (!expected) throw Error('Pinned source metadata required');
const result = spawnSync(
  process.execPath,
  [
    '--import',
    'tsx',
    '--input-type=module',
    '-e',
    "import {P11H_ITEM_CATALOG} from '../../packages/game-data/src/index.ts';process.stdout.write(JSON.stringify(P11H_ITEM_CATALOG));",
  ],
  { cwd: path.join(root, 'apps/server'), encoding: 'utf8' },
);
if (result.status !== 0) throw Error('Unable to read authoritative local catalogue');
const catalog = JSON.parse(result.stdout),
  defs = catalog.definitions;
if (
  catalog.version !== 'f0p11h-18.5-1' ||
  defs.length !== 44 ||
  defs.filter((d) => d.kind === 'component').length !== 8
)
  throw Error('Unexpected catalogue');
async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`Asset response ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
const metadata = await download(metaUrl);
if (hash(metadata) !== expected)
  throw Error('Unexpected metadata revision; review before importing');
const records = JSON.parse(metadata).data;
await fs.mkdir('artifacts/p11j/sources', { recursive: true });
const matrix = [];
for (let start = 0; start < defs.length; start += 4) {
  const jobs = await Promise.allSettled(
    defs.slice(start, start + 4).map(async (d) => {
      const id = d.content.sourceRecordId,
        official = records[id],
        frozen = reference.records.find((r) => r.recordId === id);
      if (
        !official ||
        official.id !== id ||
        !frozen ||
        official.name !== frozen.nameEs ||
        d.content.visibleName !== official.name
      )
        throw Error('Unverified identity ' + id);
      const recipe =
        d.kind === 'completed'
          ? d.recipe.map((c) => defs.find((x) => x.id === c).content.sourceRecordId).sort()
          : [];
      if (JSON.stringify(recipe) !== JSON.stringify([...(frozen.components ?? [])].sort()))
        throw Error('Recipe identity differs ' + id);
      if (
        official.image.group !== 'tft-item' ||
        !/^[A-Za-z0-9_.-]+\.png$/.test(official.image.full)
      )
        throw Error('Unsupported image path');
      const sourceUrl = `${base}/img/${official.image.group}/${official.image.full}`;
      const png = await download(sourceUrl),
        meta = await sharp(png).metadata();
      if (meta.format !== 'png' || meta.width !== meta.height || meta.width < 64)
        throw Error('Unexpected image format/dimensions');
      const webp = await sharp(png).webp({ lossless: true, effort: 6 }).toBuffer();
      const [a, b] = await Promise.all([
        sharp(png).ensureAlpha().raw().toBuffer(),
        sharp(webp).ensureAlpha().raw().toBuffer(),
      ]);
      if (!a.equals(b)) throw Error('Image appearance changed during conversion');
      const category = d.kind === 'component' ? 'components' : 'completed';
      const src = `/assets/items/tft-reference/${category}/${id}.webp`;
      await fs.mkdir(path.dirname(path.join('apps/web/public', src)), { recursive: true });
      await fs.writeFile(path.join('apps/web/public', src), webp);
      await fs.writeFile(`artifacts/p11j/sources/${official.image.full}`, png);
      return {
        internalId: d.id,
        visibleName: d.content.visibleName,
        tftId: id,
        iconKey: d.icon,
        kind: d.kind,
        recipe: d.kind === 'completed' ? d.recipe : [],
        recipeTftIds: recipe,
        catalogVersion: catalog.version,
        patch: '18.5 (2026-10-27 update)',
        set: 18,
        dataDragonVersion: version,
        metadataUrl: metaUrl,
        metadataSha256: expected,
        sourceUrl,
        sourceFile: official.image.full,
        sourceSha256: hash(png),
        sourceBytes: png.length,
        src,
        sha256: hash(webp),
        bytes: webp.length,
        width: meta.width,
        height: meta.height,
        status: 'imported-identity-and-pixels-verified',
        competitiveAvailability: d.availability,
      };
    }),
  );
  for (const job of jobs) {
    if (job.status === 'rejected') throw job.reason;
    matrix.push(job.value);
  }
}
if (new Set(matrix.map((m) => m.sha256)).size !== 44)
  throw Error('Duplicate images require review');
matrix.sort((a, b) => a.tftId.localeCompare(b.tftId));
const manifest = Object.fromEntries(matrix.map((m) => [m.iconKey, m]));
await fs.writeFile(
  'apps/web/src/match/items/tftOfficialItemIcons.json',
  JSON.stringify(manifest, null, 2) + '\n',
);
await fs.writeFile('artifacts/p11j/import-matrix.json', JSON.stringify(matrix, null, 2) + '\n');
console.log(
  `Verified ${matrix.length} icons; original pixels preserved; PNG ${matrix.reduce((n, m) => n + m.sourceBytes, 0)} bytes -> lossless WebP ${matrix.reduce((n, m) => n + m.bytes, 0)} bytes.`,
);
