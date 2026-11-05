import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

/** Full-body clips from the latest sheet; attacks and casts have no detached projectile. */
export async function importEdu(root) {
  const manifest = {
    version: 2,
    id: 'edu',
    provenance: {
      characterId: 'edu',
      sourceStarLevel: null,
      nativeAppearance: 'pending',
      pending: ['walk'],
    },
    fallbacks: { star1: [], star2: [], star3: [] },
    evolutions: {},
  };
  const report = [];
  for (const stars of [1, 2, 3]) {
    const assets = {};
    for (const [name, folder, numbers, scale, foot] of [
      ['idle', 'idle', [1, 2, 3, 4], 0.36, { x: 112, y: 216 }],
      ['attack', 'ataque', [1, 2, 3, 4, 5, 6, 7, 8], 0.36, { x: 112, y: 216 }],
      ['death', 'muerte', [1, 2, 3, 4, 5, 6], 0.36, { x: 112, y: 216 }],
    ]) {
      const sources = [],
        inputs = [];
      for (const [i, n] of numbers.entries()) {
        const file = `Sprites/edu/frames/nivel_${stars}/${folder}/${folder}_${String(n).padStart(2, '0')}.png`;
        const input = await fs.readFile(path.join(root, file));
        const meta = await sharp(input).metadata(),
          stats = await sharp(input).stats();
        if (
          !meta.hasAlpha ||
          meta.width !== 224 ||
          meta.height !== 224 ||
          stats.channels[3].min !== 0 ||
          stats.channels[3].max === 0
        )
          throw Error(`Invalid Edu frame: ${file}`);
        sources.push({ file, sha256: crypto.createHash('sha256').update(input).digest('hex') });
        inputs.push({ input, left: i * 224, top: 0 });
      }
      const url = `/sprites/edu/star${stars}/${name}.png`;
      const output = path.join(root, 'apps/web/public', url);
      await fs.mkdir(path.dirname(output), { recursive: true });
      const sheet = await sharp({
        create: { width: 224 * numbers.length, height: 224, channels: 4, background: '#00000000' },
      })
        .composite(inputs)
        .png()
        .toBuffer();
      await fs.writeFile(output, sheet);
      await fs.writeFile(output.replace('.png', '-portrait.png'), inputs[0].input);
      assets[name] = {
        textureKey: `edu:star${stars}:${name}`,
        url,
        frameWidth: 224,
        frameHeight: 224,
        frames: numbers.map((_, i) => i),
        frameCount: numbers.length,
        fps: 8,
        loop: name === 'idle',
        scale,
        foot,
        facing: 'right',
        mirrorAllowed: true,
        impactFrame: name === 'attack' ? 4 : null,
        status: 'provisional',
        sources,
      };
      report.push({
        output: url,
        sha256: crypto.createHash('sha256').update(sheet).digest('hex'),
        sources,
      });
    }
    manifest.evolutions[`star${stars}`] = {
      idle: assets.idle,
      walk: null,
      attack: assets.attack,
      ability: assets.attack,
      death: assets.death,
    };
  }
  await fs.writeFile(
    path.join(root, 'apps/web/src/assets/edu.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  await fs.writeFile(
    path.join(root, 'docs/EDU_IMPORT_REPORT.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  await importEdu(process.cwd());
