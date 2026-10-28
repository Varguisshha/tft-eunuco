import console from 'node:console';
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const source = 'Plaza urbana isométrica junto al metro.png';
const output = 'apps/web/public/assets/arenas/mar-de-cristal.webp';
const bytes = await readFile(source);
const metadata = await sharp(bytes).metadata();
await mkdir('apps/web/public/assets/arenas', { recursive: true });
await sharp(bytes).webp({ lossless: true, effort: 6 }).toFile(output);
const result = {
  source,
  width: metadata.width,
  height: metadata.height,
  sourceBytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  output,
  outputBytes: (await readFile(output)).length,
  processing: 'Lossless WebP; same dimensions, pixels, composition and colors. Original untouched.',
};
await writeFile('docs/ARENA_IMPORT_REPORT.json', JSON.stringify(result, null, 2) + '\n');
console.log(result);
