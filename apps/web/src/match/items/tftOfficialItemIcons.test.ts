import { it, expect, vi, afterEach, afterAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { P11H_ITEM_CATALOG, resolveItemCatalog } from '@tft/game-data';
import { createP11HReference } from '../../development/p11hReference';
import { LocalSession } from '../LocalSession';
import manifest from './tftOfficialItemIcons.json';
import originals from './itemIconAssets.json';
import frozen from '../../../../../packages/game-data/src/reference/tft-18.5-items.json';
// This isolated test explicitly grants LOCAL resources independently of DEV tooling.
vi.stubGlobal('__DEVTOOLS__', false);
vi.stubGlobal('__ITEM_ICON_RESOURCES__', {
  version: 1,
  defaultTheme: 'tft-reference',
  allowSimulation: true,
  allowLocalOverrides: true,
  packages: { 'tft-reference': { id: 'tft-reference-local', assets: manifest } },
});
const { ItemIcon, itemIconCandidates, ITEM_ICON_OVERRIDES } = await import('./ItemIcon');
const { setItemIconTheme } = await import('./itemIconTheme');
const { ItemHud, ItemDetails } = await import('./ItemHud');
const { ItemArtGallery } = await import('../../development/ItemArtGallery');
afterEach(() => {
  setItemIconTheme('tft-reference');
  for (const k of Object.keys(ITEM_ICON_OVERRIDES)) delete ITEM_ICON_OVERRIDES[k];
});
afterAll(() => vi.unstubAllGlobals());
it('pins exactly 8 components and 36 standard recipes to their exact ID, recipe and Riot image path, including historical renamed IDs', async () => {
  const rows = Object.values(manifest),
    defs = P11H_ITEM_CATALOG.definitions;
  expect(rows).toHaveLength(44);
  expect(rows.filter((r) => r.kind === 'component')).toHaveLength(8);
  expect(rows.filter((r) => r.kind === 'completed')).toHaveLength(36);
  const hashes = new Set<string>(),
    sourceHashes = new Set<string>();
  for (const d of defs) {
    const m = manifest[d.icon as keyof typeof manifest],
      ref = frozen.records.find((r) => r.recordId === d.content!.sourceRecordId)!;
    expect([m.internalId, m.tftId, m.iconKey, m.visibleName]).toEqual([
      d.id,
      d.content!.sourceRecordId,
      d.icon,
      d.content!.visibleName,
    ]);
    expect([...m.recipeTftIds].sort()).toEqual([...ref.components].sort());
    expect(m.sourceUrl).toBe(
      `https://ddragon.leagueoflegends.com/cdn/16.21.1/img/tft-item/${m.sourceFile}`,
    );
    expect(m.sourceFile).toBe(m.tftId + '.png');
    expect(m.dataDragonVersion).toBe('16.21.1');
    expect(m.set).toBe(18);
    expect(m.competitiveAvailability).toBe(d.availability);
    // Binary provenance is still verified in full using the preserved external LOCAL pack.
    const file = (process.env.TFT_REFERENCE_ART_ROOT ?? 'apps/web/public') + m.src;
    expect(existsSync(file)).toBe(true);
    const bytes = readFileSync(file);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(m.sha256);
    hashes.add(m.sha256);
    sourceHashes.add(m.sourceSha256);
    const meta = await sharp(bytes).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', m.width, m.height]);
    expect([64, 128]).toContain(meta.width);
    expect(meta.height).toBe(meta.width);
    expect(existsSync('apps/web/public' + originals[m.tftId as keyof typeof originals].src)).toBe(
      true,
    );
  }
  expect(hashes.size).toBe(44);
  expect(sourceHashes.size).toBe(44);
});
it('uses the same renderer for all 44 definitions and can globally restore all original images', () => {
  for (const d of P11H_ITEM_CATALOG.definitions) {
    const official = renderToStaticMarkup(createElement(ItemIcon, { definition: d }));
    expect(official).toContain('data-icon-art="tft-official"');
    expect(official).toContain(manifest[d.icon as keyof typeof manifest].src);
    setItemIconTheme('eunuco');
    const own = renderToStaticMarkup(createElement(ItemIcon, { definition: d }));
    expect(own).toContain('data-icon-art="original"');
    expect(own).not.toContain('/tft-reference/');
    setItemIconTheme('tft-reference');
  }
});
it('preserves override priority, then exact official identity, own artwork, and final SVG fallback without substituting another item', () => {
  const d = P11H_ITEM_CATALOG.definitions[0]!;
  ITEM_ICON_OVERRIDES[d.icon] = '/missing-override.webp';
  const candidates = itemIconCandidates(d, 'tft-reference');
  expect(candidates.map((c) => c.kind)).toEqual([
    'override',
    'tft-official',
    'original',
    'legacy-original',
  ]);
  expect(candidates[2]!.src).toBe(
    originals[d.content!.sourceRecordId as keyof typeof originals].src,
  );
  expect(
    itemIconCandidates({ ...d, id: 'different-item' }, 'tft-reference').some(
      (c) => c.kind === 'tft-official',
    ),
  ).toBe(false);
  expect(itemIconCandidates(undefined, 'tft-reference')).toEqual([]);
  expect(renderToStaticMarkup(createElement(ItemIcon, { definition: undefined }))).toContain(
    'data-icon-art="fallback"',
  );
});
it('offers forced official failure only in the LOCAL gallery while preserving blocked definitions and accessible names', () => {
  const blocked = P11H_ITEM_CATALOG.definitions.filter((d) => d.availability !== 'available');
  expect(blocked).toHaveLength(4);
  const before = structuredClone(P11H_ITEM_CATALOG);
  const gallery = renderToStaticMarkup(createElement(ItemArtGallery));
  expect(gallery.match(/aria-label="Consultar /g)).toHaveLength(44);
  expect(gallery).toContain('Simular fallo de iconos TFT');
  expect(gallery).toContain('Bloqueado');
  for (const d of blocked) {
    expect(gallery).toContain(d.content!.visibleName);
    expect(renderToStaticMarkup(createElement(ItemDetails, { definition: d }))).toContain(
      'Bloqueado · el efecto no se ejecuta',
    );
  }
  setItemIconTheme('tft-reference', true);
  const sample = P11H_ITEM_CATALOG.definitions[0]!;
  expect(renderToStaticMarkup(createElement(ItemIcon, { definition: sample }))).toContain(
    '/__missing__/',
  );
  expect(P11H_ITEM_CATALOG).toEqual(before);
});
it('integrates inventory, pending rewards and recipes without changing the owned state, with own-art fallback for historical definitions', () => {
  const c = createP11HReference(),
    s = new LocalSession(c.coordinator.getMatch(), undefined, c.coordinator);
  const before = structuredClone(s.getMatch());
  const html = renderToStaticMarkup(createElement(ItemHud, { session: s }));
  expect(html).toContain('Inventario de objetos');
  expect(html).toContain('data-icon-art="tft-official"');
  expect(html).toContain('aria-label=');
  expect(s.getMatch()).toEqual(before);
  for (const version of ['f0p8b-14.1-1', 'f0p11b-18.5-1', 'f0p11h-18.5-1']) {
    const catalog = resolveItemCatalog(version);
    for (const d of catalog.definitions)
      expect(renderToStaticMarkup(createElement(ItemIcon, { definition: d }))).toMatch(
        /data-icon-art="(original|tft-official|fallback)"/,
      );
  }
  c.dispose();
});
