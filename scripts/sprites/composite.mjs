import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
/** Authored anchors; the importer never infers board coordinates from source padding. */
export async function importComposite(root, definition) {
  const output = path.join(root, 'apps/web/public/sprites', definition.id, 'shared');
  await fs.mkdir(output, { recursive: true });
  const assets = {};
  for (const [name, clip] of Object.entries(definition.clips)) {
    const composites = [],
      sources = [];
    for (const [i, frame] of clip.frames.entries()) {
      const bytes = await fs.readFile(path.join(root, frame.file));
      const meta = await sharp(bytes).metadata();
      if (!meta.hasAlpha) throw Error(`Missing alpha: ${frame.file}`);
      const { data, info } = await sharp(bytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (!data.some((v, j) => j % 4 === 3 && v === 0)) throw Error(`Opaque: ${frame.file}`);
      const w = Math.round(info.width * frame.scale),
        h = Math.round(info.height * frame.scale);
      const input = await sharp(bytes).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
      const left = Math.round(clip.anchor.x - frame.anchor.x * frame.scale),
        top = Math.round(clip.anchor.y - frame.anchor.y * frame.scale);
      if (left < 0 || top < 0 || left + w > clip.width || top + h > clip.height)
        throw Error(`Clipped ${frame.file}`);
      composites.push({ input, left: i * clip.width + left, top });
      sources.push({
        file: frame.file,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      });
    }
    const sheet = await sharp({
      create: {
        width: clip.width * clip.frames.length,
        height: clip.height,
        channels: 4,
        background: '#00000000',
      },
    })
      .composite(composites)
      .png()
      .toBuffer();
    await fs.writeFile(path.join(output, `${name}.png`), sheet);
    await sharp(sheet)
      .extract({ left: 0, top: 0, width: clip.width, height: clip.height })
      .png()
      .toFile(path.join(output, `${name}-portrait.png`));
    assets[name] = {
      textureKey: `${definition.id}:shared:${name}`,
      url: `/sprites/${definition.id}/shared/${name}.png`,
      frameWidth: clip.width,
      frameHeight: clip.height,
      frames: clip.frames.map((_, i) => i),
      frameCount: clip.frames.length,
      fps: clip.fps ?? 8,
      loop: name === 'idle' || name === 'walk' || name === 'projectile',
      scale: clip.displayScale ?? 2 / 3,
      foot: clip.anchor,
      facing: 'right',
      mirrorAllowed: true,
      impactFrame: name === 'attack' ? 1 : null,
      status: 'provisional',
      sources,
    };
  }
  const slots = {
    idle: assets.idle,
    walk: assets.walk,
    attack: assets.attack,
    ability: null,
    death: assets.death,
  };
  return {
    version: 2,
    id: definition.id,
    provenance: {
      characterId: definition.id,
      sourceStarLevel: null,
      nativeAppearance: 'pending',
      pending: ['ability'],
    },
    fallbacks: { star1: [], star2: [1], star3: [1] },
    evolutions: {
      star1: slots,
      star2: { idle: null, walk: null, attack: null, ability: null, death: null },
      star3: { idle: null, walk: null, attack: null, ability: null, death: null },
    },
    composite: {
      version: 1,
      bodyAnimation: 'attack',
      recoveryAnimation: assets.recovery,
      projectileAnimation: assets.projectile,
      impactAnimation: assets.impact,
      releaseMarker: 1,
      projectileOrigin: { x: 20, y: -43 },
      targetAnchor: { x: 0, y: -30 },
      visualTiming: { recoveryMs: 160, releaseMs: 80, impactMs: 300 },
      fallbackPolicy: 'body-only',
    },
  };
}
