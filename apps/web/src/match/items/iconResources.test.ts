import type { ItemDefinition } from '@tft/shared';
import { afterEach, expect, it, vi } from 'vitest';
import { P11H_ITEM_CATALOG } from '@tft/game-data';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import reference from './tftOfficialItemIcons.json';
import originals from './itemIconAssets.json';
import { ItemIcon, resolveItemIconCandidates, ITEM_ICON_OVERRIDES } from './ItemIcon';
import { getIconResourcePolicy, themeAllowed, type IconResourcePolicy } from './iconResourcePolicy';
import { setItemIconTheme } from './itemIconTheme';
const authorized: IconResourcePolicy = {
  version: 1,
  defaultTheme: 'authorized',
  allowSimulation: false,
  allowLocalOverrides: false,
  packages: {
    authorized: {
      id: 'controlled-own-art-test',
      assets: Object.fromEntries(
        Object.entries(reference).map(([key, a]) => [
          key,
          {
            ...a,
            kind: a.kind === 'component' ? ('component' as const) : ('completed' as const),
            src: originals[a.tftId as keyof typeof originals].src,
          },
        ]),
      ),
    },
  },
};
afterEach(() => {
  setItemIconTheme('eunuco');
  vi.unstubAllGlobals();
  for (const key of Object.keys(ITEM_ICON_OVERRIDES)) delete ITEM_ICON_OVERRIDES[key];
});
it('resolves all 44 approved associations in a public environment without DEV tooling or game mutations', () => {
  vi.stubGlobal('__DEVTOOLS__', false);
  vi.stubGlobal('__ITEM_ICON_RESOURCES__', authorized);
  setItemIconTheme('authorized');
  const before = structuredClone(P11H_ITEM_CATALOG);
  for (const d of P11H_ITEM_CATALOG.definitions) {
    const chain = resolveItemIconCandidates(d, 'authorized', authorized);
    expect(chain.map((c) => c.kind)).toEqual(['authorized', 'original', 'legacy-original']);
    expect(renderToStaticMarkup(createElement(ItemIcon, { definition: d }))).toContain(
      'data-icon-art="authorized"',
    );
  }
  expect(P11H_ITEM_CATALOG).toEqual(before);
});
it('fails closed to original art without a resource configuration, even with DEV tools enabled', () => {
  vi.stubGlobal('__DEVTOOLS__', true);
  const policy = getIconResourcePolicy();
  expect(themeAllowed(policy, 'authorized')).toBe(false);
  expect(() => setItemIconTheme('tft-reference')).toThrow('not permitted');
  expect(
    resolveItemIconCandidates(P11H_ITEM_CATALOG.definitions[0], 'tft-reference', policy).map(
      (c) => c.kind,
    ),
  ).toEqual(['original', 'legacy-original']);
});
it('guards historical IDs, iconKey, recipe, name and kind; unknown definitions keep the SVG fallback', () => {
  const d = P11H_ITEM_CATALOG.definitions.find((d) => d.kind === 'completed')!;
  for (const patch of [
    { id: 'different' },
    { icon: 'different' },
    { recipe: [] },
    { content: { ...d.content!, visibleName: 'different' } },
    { kind: 'component' as const },
  ]) {
    expect(
      resolveItemIconCandidates(
        { ...d, ...patch } as unknown as ItemDefinition,
        'authorized',
        authorized,
      ).some((c) => c.kind === 'authorized'),
    ).toBe(false);
  }
  expect(resolveItemIconCandidates(undefined, 'authorized', authorized)).toEqual([]);
  expect(renderToStaticMarkup(createElement(ItemIcon, { definition: undefined }))).toContain(
    'data-icon-art="fallback"',
  );
});
it('ignores unlisted public overrides and disallows production failure simulation', () => {
  const d = P11H_ITEM_CATALOG.definitions[0]!;
  vi.stubGlobal('__ITEM_ICON_RESOURCES__', authorized);
  ITEM_ICON_OVERRIDES[d.icon] = '/unapproved.webp';
  expect(resolveItemIconCandidates(d, 'authorized', authorized, true).map((c) => c.kind)).toEqual([
    'authorized',
    'original',
    'legacy-original',
  ]);
  expect(resolveItemIconCandidates(d, 'authorized', authorized, true)[0]!.src).not.toContain(
    '__missing__',
  );
  expect(() => setItemIconTheme('authorized', true)).toThrow('not permitted');
  ITEM_ICON_OVERRIDES[d.icon] = authorized.packages.authorized!.assets[d.icon]!.src;
  expect(resolveItemIconCandidates(d, 'authorized', authorized)[0]!.kind).toBe('override');
});
