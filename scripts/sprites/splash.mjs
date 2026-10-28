import console from 'node:console';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
const sources = {
  dolea: 'TFPeru/Dolea/Splash_art_Dolea.png',
  vargas: 'TFPeru/Vargas/Splash_art_Vargas.png',
  jaramillo: 'TFPeru/Erik/Splash_art_Erik.png',
  florin: 'TFPeru/Florin/Splash_art_Florin.png',
};
await fs.mkdir('apps/web/public/assets/splash', { recursive: true });
const manifest = [];
for (const [id, file] of Object.entries(sources)) {
  const bytes = await fs.readFile(file),
    m = await sharp(bytes).metadata();
  const output = `apps/web/public/assets/splash/${id}.webp`;
  await sharp(bytes)
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 88, effort: 6 })
    .toFile(output);
  const derived = await fs.readFile(output),
    d = await sharp(derived).metadata();
  manifest.push({
    id,
    source: file,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    sourceWidth: m.width,
    sourceHeight: m.height,
    sourceBytes: bytes.length,
    output,
    width: d.width,
    height: d.height,
    bytes: derived.length,
    mapping:
      id === 'jaramillo'
        ? 'Erik → JARAMILLO: explicitly confirmed by the owner in this chat on 2026-10-26.'
        : 'Original named character folder',
  });
}
await fs.writeFile('docs/SPLASH_ART_ASSETS.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(manifest.map((x) => `${x.id}: ${x.bytes} bytes`).join('\n'));
