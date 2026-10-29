import type { ItemDefinition } from '@tft/shared';
export type ItemIconTheme = 'eunuco' | 'tft-reference' | 'authorized';
export interface IconArtwork {
  iconKey: string;
  internalId: string;
  tftId: string;
  visibleName: string;
  kind: 'component' | 'completed';
  recipe: readonly string[];
  src: string;
  sha256: string;
}
export interface IconResourcePolicy {
  version: 1;
  defaultTheme: ItemIconTheme;
  allowSimulation: boolean;
  allowLocalOverrides: boolean;
  packages: Partial<
    Record<
      Exclude<ItemIconTheme, 'eunuco'>,
      {
        id: string;
        assets: Record<string, IconArtwork>;
      }
    >
  >;
}
const safePolicy: IconResourcePolicy = {
  version: 1,
  defaultTheme: 'eunuco',
  allowSimulation: false,
  allowLocalOverrides: false,
  packages: {},
};
/** Vite injects a verified resource plan. An unconfigured consumer fails closed to original art. */
export function getIconResourcePolicy(): IconResourcePolicy {
  return typeof __ITEM_ICON_RESOURCES__ === 'undefined' ? safePolicy : __ITEM_ICON_RESOURCES__;
}
export const themeAllowed = (policy: IconResourcePolicy, theme: ItemIconTheme) =>
  theme === 'eunuco' || !!policy.packages[theme];
/** Preserve the historical tuple guard: an iconKey or translated name alone is insufficient. */
export function matchesIconIdentity(d: ItemDefinition, a: IconArtwork): boolean {
  return (
    a.iconKey === d.icon &&
    a.internalId === d.id &&
    a.tftId === d.content?.sourceRecordId &&
    a.visibleName === d.content?.visibleName &&
    a.kind === d.kind &&
    JSON.stringify([...a.recipe].sort()) ===
      JSON.stringify(d.kind === 'completed' ? [...d.recipe].sort() : [])
  );
}
