/* global process */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { format } from 'prettier';
export const states = ['idle', 'walk', 'attack', 'ability', 'death'];
export function frameNumber(name) {
  const n = path.basename(name).match(/(?:ATAQUE|frame)[ _-]*(\d*)\s*\.png$/i);
  return n ? Number(n[1] || 1) : Number(path.basename(name, '.png'));
}
export function orderedFrames(names) {
  const sorted = names
    .filter((n) => !/copia/i.test(n))
    .sort((a, b) => frameNumber(a) - frameNumber(b));
  const numbers = sorted.map(frameNumber);
  if (
    numbers.some((n) => !Number.isInteger(n) || n < 1) ||
    new Set(numbers).size !== numbers.length
  )
    throw new Error('Ambiguous frame numbering');
  return sorted;
}
export function visibleBounds(data, width, height, threshold = 0, fromY = 0) {
  let left = width,
    top = height,
    right = -1,
    bottom = -1;
  for (let y = fromY; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > threshold) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  if (right < 0) throw new Error('Empty transparent frame');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}
async function list(dir) {
  try {
    return (await fs.readdir(dir)).filter((n) => n.toLowerCase().endsWith('.png'));
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}
export async function build(root = process.cwd()) {
  const config = JSON.parse(
    await fs.readFile(path.join(root, 'scripts/sprites/config.json'), 'utf8'),
  );
  const manifests = [],
    report = [];
  for (const c of config.characters) {
    const manifest = {
      version: 2,
      id: c.id,
      ...(c.provenance ? { provenance: c.provenance } : {}),
      ...(c.fallbacks ? { fallbacks: c.fallbacks } : {}),
      evolutions: {},
    };
    const legacy = await list(path.join(root, c.sourceRoot));
    for (const star of [1, 2, 3]) {
      const slots = Object.fromEntries(states.map((s) => [s, null]));
      manifest.evolutions[`star${star}`] = slots;
      let evolutionScale;
      for (const state of ['attack', ...states.filter((s) => s !== 'attack')]) {
        const dir = path.join(c.sourceRoot, c.id, `star${star}`, state);
        const canonical = await list(path.join(root, dir));
        const found = canonical.length
          ? canonical.map((n) => path.join(dir, n))
          : state === 'attack'
            ? legacy
                .filter((n) => n.startsWith(`${c.legacyPrefix} NIVEL ${star} ATAQUE`))
                .map((n) => path.join(c.sourceRoot, n))
            : [];
        const files = orderedFrames(found);
        if (!files.length) continue;
        const anomalies = [];
        if (files.some((f, i) => frameNumber(f) !== i + 1))
          anomalies.push('Missing frame numbers; imported existing frames only');
        for (const copy of found.filter((n) => /copia/i.test(n))) {
          const original = files.find(
            (f) => frameNumber(f) === frameNumber(copy.replace(/\s*copia/i, '')),
          );
          if (!original) throw new Error(`Copy without original: ${copy}`);
          const hash = async (f) =>
            crypto
              .createHash('sha256')
              .update(await fs.readFile(path.join(root, f)))
              .digest('hex');
          try {
            if ((await hash(copy)) !== (await hash(original)))
              throw new Error(`Conflicting copy: ${copy}`);
          } catch (e) {
            if (e.code === 'ENOENT')
              throw new Error(`Copy without original: ${copy}`, { cause: e });
            throw e;
          }
          anomalies.push(`Exact duplicate ignored: ${copy}`);
        }
        const frames = [];
        for (const file of files) {
          const bytes = await fs.readFile(path.join(root, file)),
            meta = await sharp(bytes).metadata();
          if (meta.format !== 'png' || !meta.hasAlpha)
            throw new Error(`PNG with alpha required: ${file}`);
          const { data, info } = await sharp(bytes)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
          if (!data.some((v, i) => i % 4 === 3 && v === 0))
            throw new Error(`Opaque background: ${file}`);
          let cleaned = 0;
          for (let i = 3; i < data.length; i += 4)
            if (data[i] > 0 && data[i] <= (c.alphaCutoff ?? 0)) {
              data[i] = 0;
              cleaned++;
            }
          if (cleaned)
            anomalies.push(
              `${file}: ${cleaned} near-transparent pixels removed in derived assets (alpha <= ${c.alphaCutoff})`,
            );
          const bounds = visibleBounds(data, info.width, info.height);
          const solid = visibleBounds(data, info.width, info.height, 127);
          const feet = visibleBounds(
            data,
            info.width,
            info.height,
            127,
            solid.top + Math.floor(solid.height * 0.88),
          );
          const foot = { x: feet.left + (feet.width - 1) / 2, y: solid.top + solid.height };
          const partial = data.filter((v, i) => i % 4 === 3 && v > 0 && v < 255).length;
          if (partial)
            anomalies.push(
              `${file}: ${partial} partial-alpha pixels preserved; nearest-neighbor only`,
            );
          if (
            bounds.left === 0 ||
            bounds.top === 0 ||
            bounds.left + bounds.width === info.width ||
            bounds.top + bounds.height === info.height
          )
            anomalies.push(
              `${file}: nonzero alpha touches source edge; inspect original for clipping`,
            );
          frames.push({
            file,
            sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
            width: info.width,
            height: info.height,
            bounds,
            solid,
            foot,
          });
        }
        const heights = frames.map((f) => f.solid.height).sort((a, b) => a - b);
        const scale = evolutionScale ?? c.bodyHeight / heights[Math.floor(heights.length / 2)];
        evolutionScale = scale;
        const extent =
          Math.max(
            ...frames.flatMap((f) => [
              Math.abs(f.bounds.left - f.foot.x),
              Math.abs(f.bounds.left + f.bounds.width - f.foot.x),
            ]),
          ) * scale;
        const up = Math.max(...frames.map((f) => f.foot.y - f.bounds.top)) * scale;
        const down =
          Math.max(0, ...frames.map((f) => f.bounds.top + f.bounds.height - f.foot.y)) * scale;
        const width = Math.ceil((extent * 2 + 16) / 16) * 16,
          height = Math.ceil((up + down + 16) / 16) * 16;
        const foot = { x: width / 2, y: Math.ceil(up) + 8 };
        const composites = [];
        for (let i = 0; i < frames.length; i++) {
          const f = frames[i],
            b = f.bounds;
          const w = Math.max(1, Math.round(b.width * scale)),
            h = Math.max(1, Math.round(b.height * scale));
          const left = Math.round(foot.x + (b.left - f.foot.x) * scale),
            top = Math.round(foot.y + (b.top - f.foot.y) * scale);
          if (left < 0 || top < 0 || left + w > width || top + h > height)
            throw new Error('Derived frame clipping');
          const raw = await sharp(path.join(root, f.file)).ensureAlpha().raw().toBuffer();
          for (let j = 3; j < raw.length; j += 4) if (raw[j] <= (c.alphaCutoff ?? 0)) raw[j] = 0;
          const input = await sharp(raw, { raw: { width: f.width, height: f.height, channels: 4 } })
            .extract(b)
            .resize(w, h, { fit: 'fill', kernel: 'nearest' })
            .png()
            .toBuffer();
          composites.push({ input, left: i * width + left, top });
        }
        const relative = `sprites/${c.id}/star${star}/${state}.png`,
          output = path.join(root, 'apps/web/public', relative);
        await fs.mkdir(path.dirname(output), { recursive: true });
        await sharp({
          create: {
            width: width * frames.length,
            height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        })
          .composite(composites)
          .png({ compressionLevel: 9 })
          .toFile(output);
        // Same support geometry as sheet. First pose is a static UI portrait.
        const first = frames[0],
          b = first.solid;
        const portrait = await sharp(path.join(root, first.file)).ensureAlpha().raw().toBuffer();
        for (let j = 3; j < portrait.length; j += 4)
          if (portrait[j] <= (c.alphaCutoff ?? 0)) portrait[j] = 0;
        await sharp(portrait, { raw: { width: first.width, height: first.height, channels: 4 } })
          .extract(b)
          .resize({ height: c.bodyHeight, kernel: 'nearest' })
          .png()
          .toFile(output.replace('.png', '-portrait.png'));
        slots[state] = {
          textureKey: `${c.id}:star${star}:${state}`,
          url: `/${relative}`,
          frameWidth: width,
          frameHeight: height,
          frameCount: frames.length,
          frames: frames.map((_, i) => i),
          fps: c.fps,
          loop: state === 'idle' || state === 'walk',
          scale: c.displayHeight / c.bodyHeight,
          foot,
          facing: c.facing,
          mirrorAllowed: c.mirrorAllowed,
          impactFrame: state === 'attack' ? (c.impactFrames[`star${star}`] ?? null) : null,
          status: 'provisional',
          sources: frames.map(({ file, sha256 }) => ({ file, sha256 })),
        };
        if (state === 'attack' && slots[state].impactFrame !== null) {
          const sourceNumber = slots[state].impactFrame + 1;
          const index = files.findIndex((f) => frameNumber(f) === sourceNumber);
          if (index < 0)
            anomalies.push(
              `Impact source frame ${sourceNumber} missing; marker cleared pending review`,
            );
          slots[state].impactFrame = index < 0 ? null : index;
        }
        report.push({
          character: c.id,
          star,
          state,
          output: relative,
          frameWidth: width,
          frameHeight: height,
          scale,
          frames,
          anomalies,
        });
      }
    }
    manifests.push(manifest);
  }
  await fs.writeFile(
    path.join(root, 'apps/web/src/assets/characters.json'),
    await format(JSON.stringify(manifests), { parser: 'json' }),
  );
  await fs.writeFile(
    path.join(root, 'docs/SPRITE_IMPORT_REPORT.json'),
    await format(JSON.stringify(report), { parser: 'json' }),
  );
  const coverage = [
    '# Cobertura de animaciones (generado)',
    '',
    '| Personaje | Estrellas | Estado solicitado | Cobertura | Recurso seleccionado |',
    '|---|---|---|---|---|',
  ];
  for (const id of [...(config.genericCharacters ?? []), ...manifests.map((m) => m.id)])
    for (const star of [1, 2, 3])
      for (const state of states) {
        const m = manifests.find((m) => m.id === id);
        let selected = null;
        for (const n of m?.fallbacks
          ? [star, ...m.fallbacks[`star${star}`]]
          : Array.from({ length: star }, (_, i) => star - i))
          for (const name of selected ? [] : state === 'attack' ? ['attack'] : [state, 'attack'])
            if (m?.evolutions[`star${n}`][name]) {
              selected = { star: n, state: name };
              break;
            }
        coverage.push(
          `| ${id} | ${star} | ${state} | ${!selected ? 'Ausente' : selected.star === star && selected.state === state ? 'Disponible' : 'Fallback'} | ${selected ? `star${selected.star}/${selected.state}` : 'Sprite genérico'} |`,
        );
      }
  await fs.writeFile(
    path.join(root, 'docs/ANIMATION_COVERAGE.md'),
    await format(coverage.join('\n'), { parser: 'markdown' }),
  );
  return { manifests, report };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await build();
  process.stdout.write(
    `Imported ${r.report.reduce((n, r) => n + r.frames.length, 0)} frames, ${r.report.length} clips.\n`,
  );
}
