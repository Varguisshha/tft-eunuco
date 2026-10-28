import { BOARD_HEXES } from '@tft/game-core';
import { hexCorners, type Projection } from '../game/projection';
import type { ArenaDefinition } from './arena';
/** One uniform camera transforms both artwork and calibrated world coordinates. */
export function fitArenaView(
  width: number,
  height: number,
  density: number,
  arena: ArenaDefinition,
  projection: Projection,
  requested = 1,
  bottomOverlay = 0,
) {
  const p = BOARD_HEXES.flatMap((h) => hexCorners(h, projection));
  const c = arena.camera;
  const bounds = {
    left: Math.min(...p.map((v) => v.x)) - 40,
    right: Math.max(...p.map((v) => v.x)) + 40,
    top: Math.min(...p.map((v) => v.y)) - c.headroom,
    bottom: Math.max(...p.map((v) => v.y)) + 24,
  };
  for (const point of c.landmarks ?? []) {
    bounds.left = Math.min(bounds.left, point.x);
    bounds.right = Math.max(bounds.right, point.x);
    bounds.top = Math.min(bounds.top, point.y);
    bounds.bottom = Math.max(bounds.bottom, point.y);
  }
  const margins = {
    left: (width / density >= 650 ? c.leftHud : 8) * density,
    right: c.rightMargin * density,
    top: c.topMargin * density,
    bottom: Math.max(c.bottomMargin * density, bottomOverlay),
  };
  const cover = Math.max(width / arena.image.width, height / arena.image.height);
  const fit = Math.min(
    (width - margins.left - margins.right) / (bounds.right - bounds.left),
    (height - margins.top - margins.bottom) / (bounds.bottom - bounds.top),
  );
  const contain = Math.min(
    (width - margins.left - margins.right) / arena.image.width,
    (height - margins.top - c.bottomMargin * density) / arena.image.height,
  );
  const wholeImage = c.framing === 'contain';
  const desired =
    (wholeImage ? contain : cover) * Math.max(c.zoomMin, Math.min(c.zoomMax, requested));
  // Explicit landmarks take precedence over cover: never crop the sign to fill a wide canvas.
  const zoom =
    wholeImage || c.landmarks?.length
      ? Math.min(
          fit,
          desired,
          // Leave room for floating reserves while retaining the image's top edge at default zoom.
          wholeImage && requested <= 1
            ? (height - margins.top - margins.bottom) / bounds.bottom
            : Infinity,
        )
      : Math.max(cover, Math.min(fit, desired));
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const coversX = arena.image.width * zoom >= width;
  const coversY = !wholeImage && !c.landmarks?.length && arena.image.height * zoom >= height;
  // When full-width cover is impossible, center the unmodified artwork beside the player rail.
  const x = clamp(
    coversX ? c.focus.x : arena.image.width / 2 - (margins.left - margins.right) / (2 * zoom),
    Math.max(
      coversX ? width / (2 * zoom) : -Infinity,
      bounds.right - (width / 2 - margins.right) / zoom,
    ),
    Math.min(
      coversX ? arena.image.width - width / (2 * zoom) : Infinity,
      bounds.left + (width / 2 - margins.left) / zoom,
    ),
  );
  const y = clamp(
    wholeImage
      ? arena.image.height / 2 - (margins.top - c.bottomMargin * density) / (2 * zoom)
      : arena.camera.focus.y,
    Math.max(
      coversY ? height / (2 * zoom) : -Infinity,
      bounds.bottom - (height / 2 - margins.bottom) / zoom,
    ),
    Math.min(
      coversY ? arena.image.height - height / (2 * zoom) : Infinity,
      bounds.top + (height / 2 - margins.top) / zoom,
    ),
  );
  return { x, y, zoom, cover, fit, bounds, margins };
}

/** Diagnostic view only: show the whole source/perimeter beside the calibration controls. */
export function fitCalibrationView(
  width: number,
  height: number,
  density: number,
  arena: ArenaDefinition,
) {
  const left = (width / density >= 1100 ? 340 : 8) * density,
    right = 16 * density,
    top = 8 * density,
    bottom = 32 * density;
  const zoom = Math.max(
    0.01,
    Math.min(
      (width - left - right) / arena.image.width,
      (height - top - bottom) / arena.image.height,
    ),
  );
  return {
    zoom,
    x: arena.image.width / 2 - (left - right) / (2 * zoom),
    y: arena.image.height / 2 - (top - bottom) / (2 * zoom),
  };
}
