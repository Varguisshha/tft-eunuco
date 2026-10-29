import { afterEach, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import {
  createIconResourcePlan,
  approvedPack,
  stageApprovedIconPack,
  verifyIconBuildOutput,
  sha256,
} from './item-icon-pack.mjs';
const repo = process.cwd(),
  roots = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tft-icon-pack-'));
  roots.push(root);
  const source = path.join(root, 'source'),
    base = 'apps/web/src/match/items';
  await fs.mkdir(path.join(root, base), { recursive: true });
  await fs.mkdir(path.join(root, 'config'), { recursive: true });
  await fs.mkdir(source);
  for (const file of [
    'tftOfficialItemIcons.json',
    'itemIconAssets.json',
    'legacyItemIconAssets.json',
  ])
    await fs.copyFile(path.join(repo, base, file), path.join(root, base, file));
  const reference = JSON.parse(
    await fs.readFile(path.join(root, base, 'tftOfficialItemIcons.json'), 'utf8'),
  );
  const originals = JSON.parse(
    await fs.readFile(path.join(root, base, 'itemIconAssets.json'), 'utf8'),
  );
  const assets = [];
  const legacy = JSON.parse(
    await fs.readFile(path.join(repo, base, 'legacyItemIconAssets.json'), 'utf8'),
  );
  for (const a of Object.values(legacy)) {
    const dest = path.join(root, 'apps/web/public', a.src);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(path.join(repo, 'apps/web/public', a.src), dest);
  }
  for (const a of Object.values(reference)) {
    const own = originals[a.tftId],
      file = a.tftId + '.webp';
    await fs.copyFile(path.join(repo, 'apps/web/public', own.src), path.join(source, file));
    const dest = path.join(root, 'apps/web/public', own.src);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(path.join(source, file), dest);
    assets.push({
      iconKey: a.iconKey,
      internalId: a.internalId,
      tftId: a.tftId,
      visibleName: a.visibleName,
      kind: a.kind,
      recipe: a.recipe,
      file,
      sha256: own.sha256,
      width: own.width,
      height: own.height,
      format: 'webp',
    });
  }
  const pack = { version: 1, id: 'own-art-test', assets };
  await fs.writeFile(
    path.join(root, 'config/evidence.md'),
    'Controlled EUNUCO-only test fixture. No third-party redistribution grant.',
  );
  async function approve(scope = 'public-production') {
    const manifest = JSON.stringify(pack),
      evidence = await fs.readFile(path.join(root, 'config/evidence.md'));
    await fs.writeFile(path.join(root, 'config/pack.json'), manifest);
    await fs.writeFile(
      path.join(root, 'config/approved-item-icon-packs.json'),
      JSON.stringify([
        {
          id: pack.id,
          scope,
          manifestPath: 'config/pack.json',
          manifestSha256: sha256(manifest),
          evidencePath: 'config/evidence.md',
          evidenceSha256: sha256(evidence),
        },
      ]),
    );
  }
  await fs.writeFile(path.join(root, 'config/approved-item-icon-packs.json'), '[]');
  async function output(plan) {
    const dir = path.join(root, 'output');
    await fs.mkdir(dir);
    await fs.cp(path.join(root, 'apps/web/public'), dir, { recursive: true });
    for (const f of plan.files) {
      const dest = path.join(dir, f.src);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, f.bytes);
    }
    await fs.writeFile(path.join(dir, 'item-icon-resources.json'), JSON.stringify(plan.manifest));
    return dir;
  }
  return { root, source, pack, approve, output, reference };
}
it('public defaults preserve all 44 original mappings, with zero reference or approved resources', async () => {
  const f = await fixture(),
    plan = await createIconResourcePlan({ root: f.root });
  expect(plan.policy).toEqual({
    version: 1,
    defaultTheme: 'eunuco',
    allowSimulation: false,
    allowLocalOverrides: false,
    packages: {},
  });
  expect(Object.keys(plan.manifest.originals)).toHaveLength(44);
  expect(await verifyIconBuildOutput(await f.output(plan), { root: f.root })).toEqual({
    originals: 44,
    authorized: 0,
    officialLocal: 0,
  });
});
it('rejects production reference themes and packages without reviewed approval before staging anything', async () => {
  const f = await fixture();
  await expect(createIconResourcePlan({ root: f.root, theme: 'tft-reference' })).rejects.toThrow(
    'not permitted',
  );
  await expect(
    createIconResourcePlan({ root: f.root, packId: f.pack.id, packRoot: f.source }),
  ).rejects.toThrow('redistribution approval');
  const dest = path.join(f.root, 'staged');
  await expect(stageApprovedIconPack(f.pack.id, f.source, dest, { root: f.root })).rejects.toThrow(
    'redistribution approval',
  );
  await expect(fs.stat(dest)).rejects.toMatchObject({ code: 'ENOENT' });
});
it('builds, stages and audits exactly 44 approved own-art resources through the production path', async () => {
  const f = await fixture();
  await f.approve();
  const plan = await createIconResourcePlan({
    root: f.root,
    packId: f.pack.id,
    packRoot: f.source,
  });
  expect(plan.files).toHaveLength(44);
  expect(plan.policy.defaultTheme).toBe('authorized');
  expect(JSON.stringify(plan.manifest)).not.toContain(f.source);
  expect(await verifyIconBuildOutput(await f.output(plan), { root: f.root })).toEqual({
    originals: 44,
    authorized: 44,
    officialLocal: 0,
  });
  const dest = path.join(f.root, 'staged');
  expect((await stageApprovedIconPack(f.pack.id, f.source, dest, { root: f.root })).assets).toBe(
    44,
  );
  const staged = await createIconResourcePlan({ root: f.root, packId: f.pack.id, packRoot: dest });
  expect(staged.manifest).toEqual(plan.manifest);
});
it.each([
  'identity',
  'recipe',
  'duplicate',
  'traversal',
  'symlink',
  'hash',
  'dimensions',
  'evidence',
  'scope',
  'manifest',
])('fails closed for %s instead of substituting an image', async (kind) => {
  const f = await fixture(),
    a = f.pack.assets[0];
  if (kind === 'identity') a.tftId = 'wrong';
  if (kind === 'recipe') a.recipe = ['component-ap'];
  if (kind === 'duplicate') f.pack.assets[1].sha256 = a.sha256;
  if (kind === 'traversal') a.file = '../outside.webp';
  if (kind === 'symlink') {
    await fs.copyFile(path.join(f.source, a.file), path.join(f.root, 'outside.webp'));
    await fs.unlink(path.join(f.source, a.file));
    await fs.symlink(path.join(f.root, 'outside.webp'), path.join(f.source, a.file));
  }
  if (kind === 'hash') await fs.writeFile(path.join(f.source, a.file), 'altered');
  if (kind === 'dimensions') a.width += 1;
  await f.approve(kind === 'scope' ? 'local-only' : 'public-production');
  if (kind === 'evidence') await fs.appendFile(path.join(f.root, 'config/evidence.md'), 'altered');
  if (kind === 'manifest') await fs.appendFile(path.join(f.root, 'config/pack.json'), ' ');
  await expect(approvedPack(f.pack.id, { root: f.root, sourceRoot: f.source })).rejects.toThrow();
});
it('LOCAL missing files retain all associations and fallback, while mismatched local bytes fail identity verification', async () => {
  const f = await fixture(),
    referenceRoot = path.join(f.root, 'local-reference');
  await fs.mkdir(referenceRoot);
  let plan = await createIconResourcePlan({ root: f.root, local: true, referenceRoot });
  expect(plan.missing).toHaveLength(44);
  expect(Object.keys(plan.policy.packages['tft-reference'].assets)).toHaveLength(44);
  const a = Object.values(f.reference)[0],
    file = path.join(referenceRoot, a.src);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, 'not the pinned image');
  await expect(
    createIconResourcePlan({ root: f.root, local: true, referenceRoot }),
  ).rejects.toThrow('integrity');
});
it('public artifact verification rejects renamed official bytes and undeclared resource packages', async () => {
  const f = await fixture(),
    output = await f.output(await createIconResourcePlan({ root: f.root }));
  const manifestFile = path.join(output, 'item-icon-resources.json'),
    manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  manifest.policy.packages.unknown = {};
  await fs.writeFile(manifestFile, JSON.stringify(manifest));
  await expect(verifyIconBuildOutput(output, { root: f.root })).rejects.toThrow('Unknown public');
  manifest.policy.packages = {};
  await fs.writeFile(manifestFile, JSON.stringify(manifest));
  const a = Object.values(f.reference)[0],
    referenceRoot = process.env.TFT_REFERENCE_ART_ROOT ?? path.join(repo, 'apps/web/public');
  await fs.writeFile(
    path.join(output, 'renamed-image.bin'),
    await fs.readFile(path.join(referenceRoot, a.src)),
  );
  await expect(verifyIconBuildOutput(output, { root: f.root })).rejects.toThrow(
    'Unapproved official',
  );
});
it('uses the real Vite production plugin with an approved EUNUCO-only pack, no DEV tools and a verifiable public manifest', async () => {
  const f = await fixture();
  await f.approve();
  const plan = await createIconResourcePlan({
    root: f.root,
    packId: f.pack.id,
    packRoot: f.source,
  });
  const { createRequire } = await import('node:module');
  const require = createRequire(path.join(repo, 'apps/web/package.json'));
  const { build } = await import(require.resolve('vite'));
  const { itemIconResourcePlugin } = await import('../../apps/web/build/localItemArt');
  await fs.writeFile(
    path.join(f.root, 'index.html'),
    '<html><body><main id="root"></main><script type="module" src="/entry.ts"></script></body></html>',
  );
  await fs.writeFile(
    path.join(f.root, 'entry.ts'),
    `
    import React from ${JSON.stringify(require.resolve('react'))};
    import {createRoot} from ${JSON.stringify(require.resolve('react-dom/client'))};
    import {ItemIcon} from ${JSON.stringify(path.join(repo, 'apps/web/src/match/items/ItemIcon.tsx'))};
    import {P11H_ITEM_CATALOG} from ${JSON.stringify(path.join(repo, 'packages/game-data/src/index.ts'))};
    createRoot(document.getElementById('root')!).render(React.createElement('section', {'aria-label':'44 recursos aprobados · prueba EUNUCO'},
      React.createElement('h1',null,'Paquete de prueba propio · producción sin DEV'),
      ...P11H_ITEM_CATALOG.definitions.map(d=>React.createElement('button',{key:d.id,'aria-label':d.content?.visibleName,style:{display:'inline-flex',flexDirection:'column',alignItems:'center',width:150,height:110,verticalAlign:'top',fontSize:12}},
        React.createElement(ItemIcon,{definition:d}),React.createElement('span',null,d.content?.visibleName)))));
  `,
  );
  const output = path.join(f.root, 'dist');
  await build({
    configFile: false,
    root: f.root,
    publicDir: path.join(f.root, 'apps/web/public'),
    logLevel: 'error',
    define: { __DEVTOOLS__: 'false', __ITEM_ICON_RESOURCES__: JSON.stringify(plan.policy) },
    plugins: [itemIconResourcePlugin(plan, false)],
    build: { outDir: output },
  });
  expect(await verifyIconBuildOutput(output, { root: f.root })).toEqual({
    originals: 44,
    authorized: 44,
    officialLocal: 0,
  });
  if (process.env.TFT_ICON_VISUAL_OUTPUT) {
    const destination = path.resolve(process.env.TFT_ICON_VISUAL_OUTPUT),
      relative = path.relative(path.join(repo, 'artifacts'), destination);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative))
      throw Error('Visual output must be a new ignored artifact directory');
    await fs.cp(output, destination, { recursive: true, errorOnExist: true, force: false });
  }
}, 20000);
