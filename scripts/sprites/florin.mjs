import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
/** Explicit source order: combined filenames intentionally supply repeated recovery poses. */
export const FLORIN_FRAMES = [
  ['1y4', '2', '3', '1y4'],
  ['1y4y8', '2', '3', '1y4y8', '5', '6', '7', '1y4y8'],
  ['1y8', '2', '3', '4', '5', '6', '7', '1y8'],
];
export async function importFlorin(root) {
  const manifest = {
    version: 2,
    id: 'florin',
    provenance: {
      characterId: 'florin',
      sourceStarLevel: null,
      nativeAppearance: 'pending',
      pending: ['idle', 'walk', 'ability', 'death'],
    },
    fallbackPresentation: {
      idle: 'first_frame',
      walk: 'first_frame',
      death: 'first_frame',
      ability: 'attack',
    },
    fallbacks: { star1: [], star2: [], star3: [] },
    evolutions: {},
  };
  const report = [];
  for (const star of [1, 2, 3]) {
    const frames = [];
    for (const suffix of FLORIN_FRAMES[star - 1]) {
      const file = `TFPeru/Florin/Nivel${star}/Florin_Atk/Florin_Atk_${suffix}.png`;
      const bytes = await fs.readFile(path.join(root, file));
      const meta = await sharp(bytes).metadata();
      if (!meta.hasAlpha || (await sharp(bytes).stats()).isOpaque)
        throw Error(`Missing transparency: ${file}`);
      const trimmed = await sharp(bytes).trim({ threshold: 8 }).png().toBuffer();
      const m = await sharp(trimmed).metadata();
      const raw = await sharp(trimmed).ensureAlpha().raw().toBuffer();
      const soles = [];
      for (let y = Math.floor(m.height * 0.7); y < m.height; y++)
        for (let x = 0; x < m.width; x++) {
          const i = (y * m.width + x) * 4;
          if (
            raw[i + 3] > 128 &&
            raw[i] > 90 &&
            raw[i] > raw[i + 1] * 1.3 &&
            raw[i] > raw[i + 2] * 1.15
          )
            soles.push({ x, y });
        }
      if (!soles.length) throw Error(`Red shoe ground anchor missing: ${file}`);
      const ground = Math.max(...soles.map((p) => p.y));
      const contacts = soles.filter((p) => p.y >= ground - m.height * 0.035);
      const sourceFoot = {
        x: (Math.min(...contacts.map((p) => p.x)) + Math.max(...contacts.map((p) => p.x))) / 2,
        y: ground,
      };
      frames.push({
        file,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        trimmed,
        sourceFoot,
        width: m.width,
        height: m.height,
      });
    }
    // The source art has a shared ground plane; star 3 includes its hammer in the body.
    const standard = frames[0];
    const scale = 96 / standard.height;
    const fw = 192,
      fh = 176,
      foot = { x: 96, y: 160 };
    const layers = [];
    for (const [i, f] of frames.entries()) {
      const w = Math.round(f.width * scale),
        h = Math.round(f.height * scale);
      if (w > fw - 8 || h > fh - 8) throw Error(`Clipping source ${f.file}`);
      const left = Math.round(foot.x - f.sourceFoot.x * scale),
        top = Math.round(foot.y - f.sourceFoot.y * scale);
      if (left < 0 || top < 0 || left + w > fw || top + h > fh)
        throw Error(`Anchor clipping ${f.file}`);
      layers.push({
        input: await sharp(f.trimmed).resize(w, h, { kernel: 'nearest' }).png().toBuffer(),
        left: i * fw + left,
        top,
      });
    }
    const folder = path.join(root, `apps/web/public/sprites/florin/star${star}`);
    await fs.mkdir(folder, { recursive: true });
    const sheet = await sharp({
      create: { width: fw * frames.length, height: fh, channels: 4, background: '#00000000' },
    })
      .composite(layers)
      .png()
      .toBuffer();
    await fs.writeFile(path.join(folder, 'attack.png'), sheet);
    await sharp(sheet)
      .extract({ left: 0, top: 0, width: fw, height: fh })
      .png()
      .toFile(path.join(folder, 'attack-portrait.png'));
    const asset = {
      textureKey: `florin:star${star}:attack`,
      url: `/sprites/florin/star${star}/attack.png`,
      frameWidth: fw,
      frameHeight: fh,
      frameCount: frames.length,
      frames: frames.map((_, i) => i),
      fps: 10,
      loop: false,
      scale: 2 / 3,
      foot,
      facing: 'right',
      mirrorAllowed: true,
      impactFrame: [2, 5, 5][star - 1],
      status: 'provisional',
      sources: frames.map(({ file, sha256 }) => ({ file, sha256 })),
    };
    manifest.evolutions[`star${star}`] = {
      idle: null,
      walk: null,
      attack: asset,
      ability: null,
      death: null,
    };
    report.push({
      character: 'florin',
      star,
      state: 'attack',
      output: asset.url.slice(1),
      frameWidth: fw,
      frameHeight: fh,
      scale,
      frames: asset.sources,
      anomalies: [
        'Idle, Walk, Ability and Death absent; same-evolution attack fallback only. No separate projectile or impact exists.',
      ],
    });
  }
  return { manifest, report };
}
