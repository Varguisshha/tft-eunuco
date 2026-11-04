import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { pathToFileURL } from 'node:url';
import console from 'node:console';
import process from 'node:process';

const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sequence = (prefix, names) => names.map((name) => `${prefix}/${name}.png`);
/** Explicit identity, order and release poses, inspected against the supplied images. */
export const P13T_CLIPS = [
  {
    id: 'vargas',
    stars: 1,
    files: sequence(
      'Vargas/Nivel1/Vargas_Atk',
      [1, 2, 3, 4].map((n) => `Vargas_Atk_${n}`),
    ),
    release: 2,
  },
  {
    id: 'dolea',
    stars: 1,
    files: sequence('Dolea/Nivel1/Dolea_Atk', [
      'Dolea1_Atk_1y4',
      'Dolea1_Atk_2',
      'Dolea1_Atk_3',
      'Dolea1_Atk_5',
      'Dolea1_Atk_6',
    ]),
    release: 2,
    idle: 'Dolea/Nivel1/Dolea_Idle/Dolea_idle_1.png',
  },
  {
    id: 'jaramillo',
    folder: 'Erik',
    stars: 1,
    files: sequence(
      'Erik/Nivel1',
      [1, 2, 3, 4].map((n) => `Erik1_Atk_${n}`),
    ),
    bodyHeights: [492, 492, 492, 483],
    release: 2,
    projectile: 'Erik/Nivel1/piedra.png',
    impact: null,
    object: 'piedra',
    origin: { x: 32, y: -38 },
  },
  {
    id: 'jaramillo',
    folder: 'Erik',
    stars: 2,
    files: sequence(
      'Erik/Nivel2',
      [1, 2, 3, 4].map((n) => `Erik2_Atk_${n}`),
    ),
    bodyHeights: [591, 591, 588, 1054],
    release: 2,
    projectile: 'Erik/Nivel2/Piti.png',
    impact: 'Erik/Nivel2/Piti_impc.png',
    object: 'cigarro',
    origin: { x: 29, y: -37 },
  },
  {
    id: 'jaramillo',
    folder: 'Erik',
    stars: 3,
    files: sequence(
      'Erik/Nivel3',
      [1, 2, 3, 4].map((n) => `Erik3_Atk_${n}`),
    ),
    release: 2,
    projectile: 'Erik/Nivel3/Mochila.png',
    impact: 'Erik/Nivel3/Mochila_impc.png',
    object: 'mochila',
    origin: { x: 37, y: -37 },
  },
  {
    id: 'peibol',
    stars: 1,
    files: sequence(
      'Peibol/Nivel1',
      [1, 2, 3, 4, 5, 6].map((n) => `Peibol1_atk_${n}`),
    ),
    release: 3,
    projectile: 'Peibol/Nivel1/Telefono.png',
    impact: 'Peibol/Nivel1/Telefono_impc.png',
    object: 'teléfono',
    origin: { x: 29, y: -46 },
  },
  {
    id: 'peibol',
    stars: 2,
    files: sequence(
      'Peibol/Nivel2',
      [1, 2, 3, 4, 5].map((n) => `Peibol2_Atk_${n}`),
    ),
    release: 3,
    projectile: 'Peibol/Nivel2/Dinero.png',
    impact: 'Peibol/Nivel2/Dinero_impc.png',
    object: 'dinero',
    origin: { x: 25, y: -44 },
  },
  {
    id: 'peibol',
    stars: 3,
    files: sequence(
      'Peibol/Nivel3',
      [1, 2, 3, 4, 5].map((n) => `Peibol3_atak_${n}`),
    ),
    release: 4,
    projectile: 'Peibol/Nivel3/Moneda.png',
    impact: 'Peibol/Nivel3/Moneda_impc.png',
    object: 'moneda',
    origin: { x: 22, y: -38 },
  },
];

async function sourceFrame(root, file, bodyHeight, kind) {
  const bytes = await fs.readFile(path.join(root, 'TFPeru 2', file));
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width,
    top = info.height,
    right = -1,
    bottom = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 0) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  if (right < left) throw Error(`Empty artwork: ${file}`);
  const width = right - left + 1,
    height = bottom - top + 1;
  // Same silhouette height in all poses, preserving aspect ratio with nearest-neighbour only.
  const scale =
    kind === 'body'
      ? 384 / (bodyHeight ?? height)
      : kind === 'projectile'
        ? 112 / Math.max(width, height)
        : 192 / Math.max(width, height);
  const w = Math.max(1, Math.round(width * scale)),
    h = Math.max(1, Math.round(height * scale));
  let footLeft = right,
    footRight = left;
  for (let y = Math.max(top, bottom - Math.round((bodyHeight ?? height) * 0.04)); y <= bottom; y++)
    for (let x = left; x <= right; x++)
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        footLeft = Math.min(footLeft, x);
        footRight = Math.max(footRight, x);
      }
  const footX =
    kind === 'body' ? Math.round(((footLeft + footRight) / 2 - left) * scale) : Math.round(w / 2);
  return {
    input: await sharp(bytes)
      .extract({ left, top, width, height })
      .resize(w, h, { kernel: 'nearest' })
      .png()
      .toBuffer(),
    w,
    h,
    footX,
    footY: kind === 'body' ? h : Math.round(h / 2),
    source: { file: `TFPeru 2/${file}`, sha256: sha(bytes) },
    bounds: { left, top, width, height },
    scale,
  };
}
async function clip(root, id, stars, name, files, bodyHeights, impactFrame, kind = 'body') {
  const frames = await Promise.all(
    files.map((f, i) => sourceFrame(root, f, bodyHeights?.[i], kind)),
  );
  const foot = {
    x: Math.max(...frames.map((f) => f.footX)) + 8,
    y: Math.max(...frames.map((f) => f.footY)) + 8,
  };
  const frameWidth = foot.x + Math.max(...frames.map((f) => f.w - f.footX)) + 8;
  const frameHeight = foot.y + Math.max(...frames.map((f) => f.h - f.footY)) + 8;
  const prefix = `sprites/${id}/p13t/star${stars}/${name}`;
  const output = path.join(root, 'apps/web/public', `${prefix}.png`);
  await fs.mkdir(path.dirname(output), { recursive: true });
  const bytes = await sharp({
    create: {
      width: frameWidth * frames.length,
      height: frameHeight,
      channels: 4,
      background: '#00000000',
    },
  })
    .composite(
      frames.map((f, i) => ({
        input: f.input,
        left: i * frameWidth + foot.x - f.footX,
        top: foot.y - f.footY,
      })),
    )
    .png()
    .toBuffer();
  await fs.writeFile(output, bytes);
  await sharp(bytes)
    .extract({ left: 0, top: 0, width: frameWidth, height: frameHeight })
    .png()
    .toFile(output.replace('.png', '-portrait.png'));
  return {
    asset: {
      textureKey: `${id}:p13t:star${stars}:${name}`,
      url: `/${prefix}.png`,
      frameWidth,
      frameHeight,
      frames: frames.map((_, i) => i),
      frameCount: frames.length,
      fps: 8,
      loop: false,
      scale: kind === 'body' ? 1 / 6 : kind === 'projectile' ? 0.16 : 0.2,
      foot,
      facing: 'right',
      mirrorAllowed: true,
      impactFrame,
      status: 'provisional',
      sources: frames.map((f) => f.source),
    },
    derivation: {
      output: `${prefix}.png`,
      sha256: sha(bytes),
      frames: frames.map(({ source, bounds, scale }) => ({ ...source, bounds, scale })),
    },
  };
}
export async function importTftPeru2(root) {
  const manifests = JSON.parse(
    await fs.readFile(path.join(root, 'apps/web/src/assets/characters.json'), 'utf8'),
  );
  const reports = [];
  for (const d of P13T_CLIPS) {
    let m = manifests.find((m) => m.id === d.id);
    if (!m) {
      const empty = () => ({ idle: null, walk: null, attack: null, ability: null, death: null });
      m = {
        version: 2,
        id: d.id,
        evolutions: { star1: empty(), star2: empty(), star3: empty() },
        fallbacks: { star1: [], star2: [], star3: [] },
      };
      manifests.push(m);
    }
    const body = await clip(root, d.id, d.stars, 'attack', d.files, d.bodyHeights, d.release);
    // Jaramillo's broad, crouched poses need a smaller on-board silhouette than
    // the upright 64 px reference. Keep source pixels and the foot anchor intact.
    const bodyMultiplier = d.id === 'jaramillo' ? 0.8 : 1;
    body.asset.scale *= bodyMultiplier;
    reports.push(body.derivation);
    const slots = m.evolutions[`star${d.stars}`];
    slots.attack = body.asset;
    if (d.id === 'vargas' || d.id === 'jaramillo' || d.id === 'peibol') {
      // No new walk/death supplied: hold this evolution's body instead of replaying another costume.
      slots.idle = null;
      slots.walk = null;
      slots.death = null;
      slots.ability = null;
      m.fallbackPresentation = {
        idle: 'first_frame',
        walk: 'first_frame',
        death: 'first_frame',
        ability: 'attack',
      };
    }
    if (d.id === 'vargas') m.fallbacks.star1 = [];
    if (d.id === 'jaramillo') m.fallbacks = { star1: [], star2: [], star3: [] };
    m.provenance = {
      characterId: d.id,
      sourceStarLevel: null,
      nativeAppearance: 'pending',
      pending: ['walk', 'death', ...(d.id === 'dolea' ? [] : ['idle']), 'ability'],
    };
    if (d.idle) {
      const idle = await clip(root, d.id, d.stars, 'idle', [d.idle], undefined, null);
      slots.idle = idle.asset;
      reports.push(idle.derivation);
    }
    if (d.projectile) {
      const projectile = await clip(
        root,
        d.id,
        d.stars,
        'projectile',
        [d.projectile],
        undefined,
        null,
        'projectile',
      );
      reports.push(projectile.derivation);
      const impact = d.impact
        ? await clip(root, d.id, d.stars, 'impact', [d.impact], undefined, null, 'impact')
        : null;
      if (impact) reports.push(impact.derivation);
      m.composites ??= { star1: null, star2: null, star3: null };
      m.composites[`star${d.stars}`] = {
        version: 1,
        bodyAnimation: 'attack',
        recoveryAnimation: { ...body.asset, frames: [body.asset.frames.at(-1)], impactFrame: null },
        projectileAnimation: projectile.asset,
        impactAnimation: impact?.asset ?? null,
        releaseMarker: d.release,
        projectileOrigin: {
          x: Number((d.origin.x * bodyMultiplier).toFixed(2)),
          y: Number((d.origin.y * bodyMultiplier).toFixed(2)),
        },
        targetAnchor: { x: 0, y: -30 },
        visualTiming: { releaseMs: 80, recoveryMs: 220, impactMs: 250 },
        fallbackPolicy: 'body-only',
      };
    }
  }
  await fs.writeFile(
    path.join(root, 'apps/web/src/assets/characters-p13t.json'),
    JSON.stringify(manifests, null, 2) + '\n',
  );
  const splash = [];
  const previousSplashes = JSON.parse(
    await fs.readFile(path.join(root, 'docs/SPLASH_ART_ASSETS.json'), 'utf8'),
  );
  for (const [id, folder] of Object.entries({
    dolea: 'Dolea',
    vargas: 'Vargas',
    jaramillo: 'Erik',
    florin: 'Florin',
    peibol: 'Peibol',
  })) {
    const source = `TFPeru 2/${folder}/Splash_art_${folder}.png`;
    const bytes = await fs.readFile(path.join(root, source));
    const unchanged = previousSplashes.some((p) => p.id === id && p.sha256 === sha(bytes));
    const output = unchanged ? `assets/splash/${id}.webp` : `assets/splash/p13t/${id}.webp`;
    let derived;
    if (unchanged) derived = await fs.readFile(path.join(root, 'apps/web/public', output));
    else {
      await fs.mkdir(path.dirname(path.join(root, 'apps/web/public', output)), { recursive: true });
      derived = await sharp(bytes)
        .resize({ width: 1280, withoutEnlargement: true })
        .webp({ quality: 90, effort: 5 })
        .toBuffer();
      await fs.writeFile(path.join(root, 'apps/web/public', output), derived);
    }
    splash.push({
      id,
      source,
      sha256: sha(bytes),
      output,
      derivedSha256: sha(derived),
      reusedHistoricalDerivative: unchanged,
    });
  }
  const report = {
    version: 'f0p13t-assets-1',
    source: 'TFPeru 2',
    mapping: { Erik: 'jaramillo' },
    derivatives: reports,
    splash,
  };
  await fs.writeFile(
    path.join(root, 'docs/TFTPERU2_IMPORT_REPORT.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const r = await importTftPeru2(process.cwd());
  console.log({ sheets: r.derivatives.length, splash: r.splash.length });
}
