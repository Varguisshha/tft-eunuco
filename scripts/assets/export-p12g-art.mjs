import process from 'node:process';
import { Buffer } from 'node:buffer';
import console from 'node:console';
/** Export generated masters and game icons without changing the authored composition. */
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
const hash = (b) => createHash('sha256').update(b).digest('hex');
const spec = JSON.parse(await fs.readFile('art/p12g/specs/catalog.json', 'utf8'));
const sources = JSON.parse(
  await fs.readFile(process.argv[2] ?? 'artifacts/p12g/pixel-sources.json', 'utf8'),
);
for (const source of sources) {
  const a = spec.assets.find((a) => a.tftId === source.id);
  if (!a) throw Error('Unknown generated artwork');
  const input = await fs.readFile(source.path);
  const metadata = await sharp(input).metadata();
  if (metadata.width !== metadata.height || metadata.width < 512) throw Error('Invalid master');
  const master = await sharp(input)
    .resize(512, 512, { kernel: 'nearest' })
    .webp({ lossless: true })
    .toBuffer();
  const icon = await sharp(input)
    .resize(128, 128, { kernel: 'nearest' })
    .webp({ lossless: true })
    .toBuffer();
  await fs.writeFile(`art/p12g/masters/${a.file}`, master);
  await fs.writeFile(`apps/web/public/items/p12g/${a.file}`, icon);
  Object.assign(a, {
    prompt: source.prompt ?? a.prompt,
    sourceFile: source.path.split('/').at(-1),
    sourceSha256: hash(input),
    sourceDimensions: [metadata.width, metadata.height],
    masterSha256: hash(master),
    sha256: hash(icon),
    status: 'pixel-generated-awaiting-batch-review',
  });
}
await fs.writeFile('art/p12g/specs/catalog.json', JSON.stringify(spec, null, 2) + '\n');
for (const batch of 'ABCD') {
  const rows = spec.assets.filter((a) => a.batch === batch && a.sha256);
  if (!rows.length) continue;
  const cells = [];
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i],
      x = (i % 4) * 240,
      y = Math.floor(i / 4) * 200;
    const input = `apps/web/public/items/p12g/${a.file}`;
    cells.push({ input: await sharp(input).toBuffer(), left: x + 8, top: y + 8 });
    cells.push({ input: await sharp(input).resize(40, 40).toBuffer(), left: x + 156, top: y + 48 });
    const label = a.visibleName.replaceAll('&', '&amp;');
    cells.push({
      input: Buffer.from(
        `<svg width="235" height="48"><text x="8" y="18" fill="white" font-family="sans-serif" font-size="12">${label}</text><text x="8" y="37" fill="#bec4e1" font-family="sans-serif" font-size="10">128 px · 40 px</text></svg>`,
      ),
      left: x,
      top: y + 145,
    });
  }
  await sharp({
    create: {
      width: 960,
      height: Math.ceil(rows.length / 4) * 200,
      channels: 3,
      background: '#141322',
    },
  })
    .composite(cells)
    .png()
    .toFile(`artifacts/p12g/batch-${batch}.png`);
}
console.log(JSON.stringify({ exported: sources.length }));
