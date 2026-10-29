import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { ArenaIdSchema } from '@tft/shared';
import { BOARD_HEXES } from '@tft/game-core';
import { ArenaRegistry, resolveArena } from './registry';
import { arenaProjection, calibrationErrors } from './arena';
import { hexToWorld, worldToHex, hexCorners } from '../game/projection';
import { insideConvex } from './geometry';

it('registers two distinct calibrated visual projections over the same 56 logical hexes at all zooms', () => {
  expect(resolveArena(undefined).id).toBe('mar-de-cristal');
  expect(ArenaIdSchema.safeParse('foreign').success).toBe(false);
  const before = JSON.stringify(BOARD_HEXES);
  for (const [id, arena] of Object.entries(ArenaRegistry)) {
    expect(id).toBe(arena.id);
    expect(calibrationErrors(arena)).toEqual([]);
    const p = arenaProjection(arena);
    for (const zoom of [0.8, 1, 1.2, 1.8])
      for (const h of BOARD_HEXES) {
        const w = hexToWorld(h, p);
        const screen = { x: w.x * zoom + 123, y: w.y * zoom - 45 };
        expect(worldToHex({ x: (screen.x - 123) / zoom, y: (screen.y + 45) / zoom }, p)).toEqual(h);
        expect(hexCorners(h, p).every((c) => insideConvex(c, arena.playableArea))).toBe(true);
      }
  }
  expect(BOARD_HEXES).toHaveLength(56);
  expect(JSON.stringify(BOARD_HEXES)).toBe(before);
  expect(ArenaRegistry['cafeteria-upm-etsisi'].projection).not.toEqual(
    ArenaRegistry['mar-de-cristal'].projection,
  );
});
it('preserves the supplied PNG and its decoded pixels exactly in the lossless browser image', async () => {
  const master = readFileSync('art/arenas/cafeteria-upm-etsisi.png');
  expect(createHash('sha256').update(master).digest('hex')).toBe(
    '5b484c800b04fc69c33d6d1e7fcb8b3858c1c682a0da0b14a650b922927598ba',
  );
  const arena = ArenaRegistry['cafeteria-upm-etsisi'];
  const image = readFileSync('apps/web/public' + arena.image.url);
  expect(createHash('sha256').update(image).digest('hex')).toBe(arena.image.sha256);
  expect(await sharp(master).raw().toBuffer()).toEqual(await sharp(image).raw().toBuffer());
});
