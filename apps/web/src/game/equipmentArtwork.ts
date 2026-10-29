import type { ItemDefinition } from '@tft/shared';
import { itemIconCandidates } from '../match/items/ItemIcon';
import { getItemIconSettings } from '../match/items/itemIconTheme';

/** The arena uses the same permitted theme and fallback order as the React HUD. */
export function equipmentArtwork(definitions: readonly ItemDefinition[]) {
  const settings = getItemIconSettings();
  return definitions.slice(0, 3).map((definition) => ({
    id: definition.id,
    label: definition.content?.visibleName ?? definition.id,
    sources: itemIconCandidates(definition, settings.theme, settings.simulateMissingOfficial).map(
      (candidate) => candidate.src,
    ),
  }));
}

const images = new Map<string, Promise<HTMLImageElement | null>>();
/** Shared requests, including failed URLs: no per-unit or per-frame retry storm. */
export function loadEquipmentImage(src: string): Promise<HTMLImageElement | null> {
  let pending = images.get(src);
  if (!pending) {
    pending = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
    images.set(src, pending);
  }
  return pending;
}
