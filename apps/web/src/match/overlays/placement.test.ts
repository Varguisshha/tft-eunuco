import { it, expect } from 'vitest';
import { placeSurface } from './placement';
it.each([
  [1280, 720],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [3840, 2160],
])('keeps Ruman Trinity readable beside the112px inventory in %ix%i', (width, height) => {
  const bar = { left: 175, top: 132, right: 287, bottom: height - 280 };
  const r = placeSurface(
    { left: 16, right: 162, top: 300, bottom: 350 },
    336,
    440,
    { width, height },
    [bar],
  );
  expect(r.left).toBeGreaterThanOrEqual(bar.right);
  expect(r.left + r.width).toBeLessThanOrEqual(width - 8);
  expect(r.top).toBeGreaterThanOrEqual(8);
  expect(r.top + Math.min(440, r.maxHeight)).toBeLessThanOrEqual(height - 8);
});
it('flips an inspector tooltip to the left at the viewport edge', () => {
  const r = placeSurface(
    { left: 1200, right: 1240, top: 650, bottom: 690 },
    336,
    500,
    { width: 1280, height: 720 },
    [{ left: 960, right: 1270, top: 100, bottom: 700 }],
  );
  expect(r.left + r.width).toBeLessThanOrEqual(960);
  expect(r.top + 500).toBeLessThanOrEqual(712);
});
it('constrains oversized surfaces to the viewport', () => {
  const r = placeSurface({ left: 5, right: 40, top: 2, bottom: 20 }, 900, 2000, {
    width: 320,
    height: 480,
  });
  expect(r.width).toBe(304);
  expect(r.maxHeight).toBe(464);
  expect(r.left).toBe(8);
});
it.each([
  [1280, 720],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [3840, 2160],
])(
  'anchors inventory to its rail despite an inspector appearing first in DOM at %ix%i',
  (width, height) => {
    const rail = { left: 175, right: 287, top: 132, bottom: height - 220 };
    const inspector = { left: width - 340, right: width - 20, top: 94, bottom: height - 220 };
    const anchor = { left: 184, right: 228, top: 205, bottom: 249 };
    for (const obstacles of [
      [inspector, rail],
      [rail, inspector],
    ]) {
      const r = placeSurface(anchor, 336, 340, { width, height }, obstacles, {
        origin: 'inventory',
        bounds: rail,
      });
      expect(r.left).toBe(rail.right + 10);
      expect(r.left + r.width).toBeLessThanOrEqual(inspector.left);
      expect(r.top).toBe(205);
    }
    const slot = { left: inspector.left + 24, right: inspector.left + 68, top: 300, bottom: 344 };
    const r = placeSurface(slot, 336, 440, { width, height }, [rail, inspector], {
      origin: 'inspector',
      bounds: inspector,
    });
    expect(r.left + r.width).toBe(inspector.left - 10);
    expect(r.top + 440).toBeLessThanOrEqual(height - 8);
  },
);
it('clamps a long tooltip vertically while retaining its nearby inventory side', () => {
  const bar = { left: 175, right: 287, top: 132, bottom: 500 };
  const r = placeSurface(
    { left: 184, right: 228, top: 470, bottom: 514 },
    336,
    2000,
    { width: 1280, height: 720 },
    [bar],
    { origin: 'inventory', bounds: bar },
  );
  expect(r.left).toBe(297);
  expect(r.top).toBe(8);
  expect(r.maxHeight).toBe(704);
});

it('keeps the rail gap for right-column items after scrolling instead of squeezing toward their one-pixel inset', () => {
  const rail = { left: 212, right: 324, top: 195, bottom: 737 };
  const r = placeSurface(
    { left: 271, right: 315, top: 590, bottom: 634 },
    336,
    189,
    { width: 1920, height: 1080 },
    [rail],
    { origin: 'inventory', bounds: rail },
  );
  expect(r.left).toBe(334);
  expect(r.top).toBe(590);
});
