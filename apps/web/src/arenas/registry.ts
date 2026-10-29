import { DEFAULT_ARENA_ID, type ArenaId } from '@tft/shared';
import { MAR_DE_CRISTAL } from './marDeCristal';
import { CAFETERIA_UPM } from './cafeteriaUpm';
export const ArenaRegistry = {
  'mar-de-cristal': {
    ...MAR_DE_CRISTAL,
    description: 'La plaza donde empezó todo.',
    thumbnail: '/assets/arenas/mar-de-cristal-thumb.webp',
    aspectRatio: 1672 / 941,
    configVersion: 1,
  },
  'cafeteria-upm-etsisi': {
    ...CAFETERIA_UPM,
    description: 'Una ronda al sol, frente a la cafetería.',
    thumbnail: '/assets/arenas/cafeteria-upm-etsisi-thumb.webp',
    aspectRatio: 1672 / 941,
    configVersion: 1,
  },
} satisfies Record<
  ArenaId,
  typeof MAR_DE_CRISTAL & {
    description: string;
    thumbnail: string;
    aspectRatio: number;
    configVersion: number;
  }
>;
export function resolveArena(id: ArenaId | undefined) {
  return ArenaRegistry[id ?? DEFAULT_ARENA_ID];
}
/** Decode/preload only the chosen full background; thumbnails stay independent. */
export function preloadArena(id: ArenaId) {
  const image = new Image();
  image.src = resolveArena(id).image.url;
  return image.decode().catch(() => undefined);
}
