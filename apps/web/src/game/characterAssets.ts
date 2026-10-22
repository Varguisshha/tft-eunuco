import { CharacterManifestSchema } from '@tft/sprite-contract';
import imported from '../assets/characters.json';
export const CHARACTER_ASSETS = imported.map((m) => CharacterManifestSchema.parse(m));
export function characterManifest(spriteId: string) {
  return CHARACTER_ASSETS.find((m) => m.id === spriteId);
}
