import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

/** Body and musical projectile sampled independently from authoritative attack/cast events. */
export async function importSanchez(root) {
  const manifest = {
    version: 2,
    id: 'sanchez',
    provenance: {
      characterId: 'sanchez',
      sourceStarLevel: null,
      nativeAppearance: 'pending',
      pending: ['walk'],
    },
    fallbacks: { star1: [], star2: [], star3: [] },
    evolutions: {},
    composites: {},
  };
  const report = [];
  for (const stars of [1, 2, 3]) {
    const assets = {};
    for (const [name, folder, numbers, scale, foot] of [
      ['projectile', 'projectile', [1], 0.28, { x: 128, y: 128 }],
      ['idle', 'idle', [1, 2, 3, 4], 0.34, { x: 128, y: 248 }],
      ['attack', 'ataque', [1, 2, 3, 4, 5, 6, 7, 8], 0.34, { x: 128, y: 248 }],
      ['death', 'muerte', [1, 2, 3, 4, 5, 6], 0.34, { x: 128, y: 248 }],
    ]) {
      const sources = [],
        inputs = [];
      for (const [i, n] of numbers.entries()) {
        const file = `Sprites/sanchez/frames/nivel_${stars}/${folder}/${folder}_${String(n).padStart(2, '0')}.png`;
        const input = await fs.readFile(path.join(root, file));
        const meta = await sharp(input).metadata(),
          stats = await sharp(input).stats();
        if (
          !meta.hasAlpha ||
          meta.width !== 256 ||
          meta.height !== 256 ||
          stats.channels[3].min !== 0 ||
          stats.channels[3].max === 0
        )
          throw Error(`Invalid Sanchez frame: ${file}`);
        sources.push({ file, sha256: crypto.createHash('sha256').update(input).digest('hex') });
        inputs.push({ input, left: i * 256, top: 0 });
      }
      const url = `/sprites/sanchez/star${stars}/${name}.png`;
      const output = path.join(root, 'apps/web/public', url);
      await fs.mkdir(path.dirname(output), { recursive: true });
      const sheet = await sharp({
        create: { width: 256 * numbers.length, height: 256, channels: 4, background: '#00000000' },
      })
        .composite(inputs)
        .png()
        .toBuffer();
      await fs.writeFile(output, sheet);
      await fs.writeFile(output.replace('.png', '-portrait.png'), inputs[0].input);
      assets[name] = {
        textureKey: `sanchez:star${stars}:${name}`,
        url,
        frameWidth: 256,
        frameHeight: 256,
        frames: numbers.map((_, i) => i),
        frameCount: numbers.length,
        fps: 8,
        loop: name === 'idle',
        scale,
        foot,
        facing: 'right',
        mirrorAllowed: true,
        impactFrame: name === 'attack' ? 7 : null,
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
    manifest.composites[`star${stars}`] = {
      version: 1,
      bodyAnimation: 'attack',
      recoveryAnimation: { ...assets.attack, frames: [7], impactFrame: null },
      projectileAnimation: assets.projectile,
      impactAnimation: { ...assets.projectile, scale: 0.4, loop: false },
      releaseMarker: 7,
      projectileOrigin: { x: 25, y: -38 },
      targetAnchor: { x: 0, y: -30 },
      visualTiming: { releaseMs: 80, recoveryMs: 220, impactMs: 250 },
      fallbackPolicy: 'body-only',
    };
  }
  await fs.writeFile(
    path.join(root, 'apps/web/src/assets/sanchez.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  await fs.writeFile(
    path.join(root, 'docs/SANCHEZ_IMPORT_REPORT.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  await importSanchez(process.cwd());
