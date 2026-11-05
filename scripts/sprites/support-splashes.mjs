import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
const report = [];
for (const id of ['edu', 'sanchez']) {
  const source = `Sprites/${id}/splash-original.png`;
  const bytes = await fs.readFile(source);
  const output = `apps/web/public/assets/splash/${id}.webp`;
  await sharp(bytes)
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 85, effort: 6 })
    .toFile(output);
  const derived = await fs.readFile(output);
  const { width, height } = await sharp(derived).metadata();
  report.push({
    id,
    source,
    output,
    width,
    height,
    bytes: derived.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  });
}
await fs.writeFile('docs/EDU_SANCHEZ_SPLASH_ARTS.json', JSON.stringify(report, null, 2) + '\n');
