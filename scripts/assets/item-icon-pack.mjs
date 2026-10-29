/** Build-time asset approval and integrity boundary. Never imported by browser/game code. */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import sharp from 'sharp';
const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
function assert(test, message) {
  if (!test) throw Error(message);
}
function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
async function inside(root, relative) {
  assert(
    typeof relative === 'string' &&
      relative.length > 0 &&
      !path.isAbsolute(relative) &&
      !relative.includes('\\') &&
      !relative.split('/').includes('..'),
    'Unsafe icon pack path',
  );
  const base = await fs.realpath(root),
    file = await fs.realpath(path.resolve(base, relative));
  const scope = path.relative(base, file);
  assert(
    scope && !scope.startsWith('..') && !path.isAbsolute(scope),
    'Icon pack path escapes its root',
  );
  return file;
}
async function catalogs(root) {
  const base = path.join(root, 'apps/web/src/match/items');
  return {
    reference: await readJson(path.join(base, 'tftOfficialItemIcons.json')),
    originals: await readJson(path.join(base, 'itemIconAssets.json')),
    legacy: await readJson(path.join(base, 'legacyItemIconAssets.json')),
  };
}
function identity(a) {
  return {
    iconKey: a.iconKey,
    internalId: a.internalId,
    tftId: a.tftId,
    visibleName: a.visibleName,
    kind: a.kind,
    recipe: [...a.recipe].sort(),
  };
}
function artwork(a, src, digest) {
  return { ...identity(a), src, sha256: digest };
}
async function image(file, expected) {
  const bytes = await fs.readFile(file);
  assert(sha256(bytes) === expected.sha256, 'Icon pack image integrity mismatch');
  const metadata = await sharp(bytes).metadata();
  assert(
    metadata.width === expected.width &&
      metadata.height === expected.height &&
      metadata.format === expected.format,
    'Icon pack image metadata mismatch',
  );
  return bytes;
}
/** No environment variable can approve a pack: approval is pinned in the reviewed repository. */
export async function approvedPack(id, { root = projectRoot, sourceRoot } = {}) {
  assert(
    typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(id),
    'Invalid icon pack identifier',
  );
  const registry = await readJson(path.join(root, 'config/approved-item-icon-packs.json'));
  assert(Array.isArray(registry), 'Invalid icon approval registry');
  const matches = registry.filter((r) => r.id === id);
  assert(matches.length === 1, 'No unique production redistribution approval for icon pack');
  const approval = matches[0];
  assert(
    approval.scope === 'public-production',
    'Icon pack approval scope does not permit production',
  );
  const manifestFile = await inside(root, approval.manifestPath),
    evidenceFile = await inside(root, approval.evidencePath);
  const manifestBytes = await fs.readFile(manifestFile),
    evidence = await fs.readFile(evidenceFile);
  assert(
    evidence.length > 0 && sha256(evidence) === approval.evidenceSha256,
    'Icon redistribution evidence integrity mismatch',
  );
  assert(
    sha256(manifestBytes) === approval.manifestSha256,
    'Approved icon manifest integrity mismatch',
  );
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert(
    manifest.version === 1 && manifest.id === id && manifest.assets?.length === 44,
    'Icon pack must declare exactly 44 assets',
  );
  const { reference } = await catalogs(root),
    seen = new Set(),
    seenImages = new Set(),
    seenFiles = new Set(),
    files = [];
  const assets = {};
  for (const a of manifest.assets) {
    const canonical = reference[a.iconKey];
    assert(
      canonical && !seen.has(a.iconKey) && same(identity(a), identity(canonical)),
      'Icon pack association mismatch',
    );
    seen.add(a.iconKey);
    assert(
      /^[a-f0-9]{64}$/.test(a.sha256) &&
        ['png', 'webp'].includes(a.format) &&
        Number.isInteger(a.width) &&
        a.width > 0 &&
        a.width <= 512 &&
        a.width === a.height,
      'Invalid icon pack image descriptor',
    );
    assert(!seenImages.has(a.sha256) && !seenFiles.has(a.file), 'Duplicate icon pack image');
    seenImages.add(a.sha256);
    seenFiles.add(a.file);
    const src = `/assets/items/authorized/${id}/${a.sha256}.${a.format}`;
    assets[a.iconKey] = artwork(a, src, a.sha256);
    if (sourceRoot) files.push({ src, bytes: await image(await inside(sourceRoot, a.file), a) });
  }
  assert(seen.size === Object.keys(reference).length, 'Incomplete icon pack');
  return {
    id,
    assets,
    files,
    approval: { manifestSha256: approval.manifestSha256, evidenceSha256: approval.evidenceSha256 },
  };
}
export async function createIconResourcePlan({
  root = projectRoot,
  local = false,
  theme,
  packId,
  packRoot,
  referenceRoot,
} = {}) {
  const { reference, originals, legacy } = await catalogs(root),
    files = [],
    missing = [];
  const policy = {
    version: 1,
    defaultTheme: theme ?? (packId ? 'authorized' : 'eunuco'),
    allowSimulation: local,
    allowLocalOverrides: local,
    packages: {},
  };
  assert(!packRoot || packId, 'A pack source requires a production-approved identifier');
  if (local) {
    const entries = {};
    for (const [key, a] of Object.entries(reference)) {
      entries[key] = artwork(a, a.src, a.sha256);
      const file = path.join(
        path.resolve(root, referenceRoot ?? 'apps/web/public'),
        a.src.slice(1),
      );
      try {
        files.push({ src: a.src, bytes: await image(file, { ...a, format: 'webp' }) });
      } catch (error) {
        if (error.code === 'ENOENT') missing.push(key);
        else throw error;
      }
    }
    policy.packages['tft-reference'] = { id: 'tft-reference-local', assets: entries };
  }
  let approval;
  if (packId) {
    assert(packRoot, 'Approved production icon pack source required');
    const pack = await approvedPack(packId, { root, sourceRoot: path.resolve(root, packRoot) });
    policy.packages.authorized = { id: pack.id, assets: pack.assets };
    files.push(...pack.files);
    approval = pack.approval;
  }
  assert(
    policy.defaultTheme === 'eunuco' || !!policy.packages[policy.defaultTheme],
    'Icon theme is not permitted in this asset environment',
  );
  const originalAssets = Object.fromEntries(
    Object.entries(reference).map(([key, a]) => [
      key,
      artwork(a, originals[a.tftId].src, originals[a.tftId].sha256),
    ]),
  );
  const legacyAssets = Object.fromEntries(
    Object.entries(reference).map(([key, a]) => [
      key,
      artwork(a, legacy[a.tftId].src, legacy[a.tftId].sha256),
    ]),
  );
  return {
    verificationRoot: root,
    policy,
    files,
    missing,
    manifest: {
      version: 1,
      policy,
      originals: originalAssets,
      legacyOriginals: legacyAssets,
      ...(approval ? { approval } : {}),
    },
  };
}
/** Independent public-output audit; a renamed official binary is still rejected. */
export async function verifyIconBuildOutput(output, { root = projectRoot } = {}) {
  const manifest = await readJson(path.join(output, 'item-icon-resources.json'));
  const expected = await createIconResourcePlan({ root });
  assert(
    manifest.version === 1 &&
      same(manifest.originals, expected.manifest.originals) &&
      same(manifest.legacyOriginals, expected.manifest.legacyOriginals),
    'Public original icon mappings changed',
  );
  assert(
    manifest.policy?.version === 1 &&
      !manifest.policy.allowSimulation &&
      !manifest.policy.allowLocalOverrides &&
      !manifest.policy.packages?.['tft-reference'],
    'LOCAL icon permissions in public build',
  );
  const keys = Object.keys(manifest.policy.packages);
  assert(
    keys.every((k) => k === 'authorized'),
    'Unknown public icon package',
  );
  const allowed = new Map();
  if (manifest.policy.packages.authorized) {
    const pack = await approvedPack(manifest.policy.packages.authorized.id, { root });
    assert(
      same(manifest.policy.packages.authorized, { id: pack.id, assets: pack.assets }) &&
        same(manifest.approval, pack.approval),
      'Public icon pack does not match reviewed approval',
    );
    for (const a of Object.values(pack.assets)) allowed.set(a.src.slice(1), a.sha256);
  }
  assert(
    manifest.policy.defaultTheme === 'eunuco' ||
      (manifest.policy.defaultTheme === 'authorized' && keys.includes('authorized')),
    'Unpermitted public default theme',
  );
  for (const a of [
    ...Object.values(manifest.originals),
    ...Object.values(manifest.legacyOriginals),
  ]) {
    const file = await inside(output, a.src.slice(1));
    assert(sha256(await fs.readFile(file)) === a.sha256, 'Public original icon file mismatch');
  }
  for (const [name, digest] of allowed)
    assert(
      sha256(await fs.readFile(await inside(output, name))) === digest,
      'Public approved icon file mismatch',
    );
  const { reference } = await catalogs(root);
  const forbidden = new Set(Object.values(reference).flatMap((a) => [a.sha256, a.sourceSha256]));
  async function scan(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name),
        relative = path.relative(output, file).split(path.sep).join('/');
      assert(!entry.isSymbolicLink(), 'Symlink in public artifact');
      if (entry.isDirectory()) {
        assert(!relative.includes('tft-reference'), 'LOCAL reference folder in public artifact');
        await scan(file);
      } else {
        const digest = sha256(await fs.readFile(file));
        assert(
          !forbidden.has(digest) || allowed.get(relative) === digest,
          'Unapproved official icon binary in public artifact',
        );
        if (relative.startsWith('assets/items/authorized/'))
          assert(allowed.get(relative) === digest, 'Unlisted production icon asset');
      }
    }
  }
  await scan(output);
  return { originals: 44, authorized: allowed.size, officialLocal: 0 };
}
export async function stageApprovedIconPack(
  id,
  sourceRoot,
  destination,
  { root = projectRoot } = {},
) {
  const pack = await approvedPack(id, { root, sourceRoot });
  // A fresh destination avoids mixing reviewed resources with a previous package.
  await fs.mkdir(destination, { recursive: false });
  const registry = await readJson(path.join(root, 'config/approved-item-icon-packs.json'));
  const row = registry.find((r) => r.id === id),
    manifest = await readJson(await inside(root, row.manifestPath));
  for (const a of manifest.assets) {
    const resource = pack.files.find((f) => f.src === pack.assets[a.iconKey].src);
    const output = path.resolve(destination, a.file);
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, resource.bytes, { flag: 'wx' });
  }
  return { id, assets: 44, manifestSha256: pack.approval.manifestSha256 };
}

/** Same verified byte map for ordinary Vite and the isolated LOCAL runner. */
export function iconResourceMiddleware(plan) {
  const resources = new Map(plan.files.map((f) => [f.src, f.bytes]));
  return (req, res, next) => {
    const route = req.url?.split('?')[0];
    if (route === '/item-icon-resources.json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(plan.manifest));
      return;
    }
    if (
      route?.startsWith('/assets/items/tft-reference/') ||
      route?.startsWith('/assets/items/authorized/')
    ) {
      const bytes = resources.get(route);
      if (!bytes) {
        res.statusCode = 404;
        res.end();
        return;
      }
      res.setHeader('Content-Type', route.endsWith('.png') ? 'image/png' : 'image/webp');
      res.setHeader('Cache-Control', 'no-store');
      res.end(bytes);
      return;
    }
    next();
  };
}
