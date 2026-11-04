import { CharacterManifestSchema } from '@tft/sprite-contract';
import imported from '../assets/characters.json';
import current from '../assets/characters-p13t.json';
export const LEGACY_CHARACTER_ASSETS = imported.map((m) => CharacterManifestSchema.parse(m));
export const CHARACTER_ASSETS = current.map((m) => CharacterManifestSchema.parse(m));
export function legacyCharacterManifest(spriteId: string) {
  return LEGACY_CHARACTER_ASSETS.find((m) => m.id === spriteId);
}
export function characterManifest(spriteId: string) {
  return CHARACTER_ASSETS.find(
    (m) => m.id === (spriteId === 'provisional-peibol' ? 'peibol' : spriteId),
  );
}
