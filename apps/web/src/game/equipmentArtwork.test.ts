import { afterEach, expect, it, vi } from 'vitest';
import { P11H_ITEM_CATALOG } from '@tft/game-data';
import { equipmentArtwork, loadEquipmentImage } from './equipmentArtwork';

afterEach(() => vi.unstubAllGlobals());

it('preserves all 44 equipped identities and provides original and legacy fallback images', () => {
  for (const definition of P11H_ITEM_CATALOG.definitions) {
    const [art] = equipmentArtwork([definition]);
    expect(art!.id).toBe(definition.id);
    expect(art!.sources[0]).toContain('/items/p12g/');
    expect(art!.sources.length).toBeGreaterThanOrEqual(2);
    expect(new Set(art!.sources).size).toBe(art!.sources.length);
  }
  expect(equipmentArtwork([])).toEqual([]);
});

it('shares successful and failed requests across units without retry storms', async () => {
  const created: { onload?: () => void; onerror?: () => void; src?: string }[] = [];
  vi.stubGlobal(
    'Image',
    class {
      constructor() {
        created.push(this);
      }
      src = '';
    },
  );
  const success = loadEquipmentImage('/test-equipment-success.webp');
  expect(loadEquipmentImage('/test-equipment-success.webp')).toBe(success);
  created[0]!.onload!();
  expect(await success).toBe(created[0]);
  const failure = loadEquipmentImage('/test-equipment-failure.webp');
  created[1]!.onerror!();
  expect(await failure).toBeNull();
  expect(loadEquipmentImage('/test-equipment-failure.webp')).toBe(failure);
  expect(created).toHaveLength(2);
});
