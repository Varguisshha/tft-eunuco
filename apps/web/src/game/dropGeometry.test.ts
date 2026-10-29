import { expect, it } from 'vitest';
import { resolveDropArea } from './dropGeometry';
import { clampCameraZoom } from './cameraZoom';
it('expands hits without DOM order dependence and rejects a shared border', () => {
  const areas = [
    { id: 'a', left: 0, top: 0, width: 40, height: 60 },
    { id: 'b', left: 46, top: 0, width: 40, height: 60 },
  ];
  for (const list of [areas, [...areas].reverse()]) {
    expect(resolveDropArea({ x: -6, y: 30 }, list)).toEqual({ id: 'a', ambiguous: false });
    expect(resolveDropArea({ x: 20, y: 30 }, list).id).toBe('a');
    expect(resolveDropArea({ x: 43, y: 30 }, list)).toEqual({ id: null, ambiguous: true });
    expect(resolveDropArea({ x: 200, y: 30 }, list)).toEqual({ id: null, ambiguous: false });
  }
});
it.each([0.8, 1, 1.4, 1.8])('keeps target identity under zoom %s and device density', (zoom) => {
  const areas = [
    { id: 'unit', left: 200 * zoom, top: 80 * zoom, width: 60 * zoom, height: 90 * zoom },
  ];
  for (const density of [1, 2])
    expect(
      resolveDropArea(
        { x: 230 * zoom * density, y: 120 * zoom * density },
        areas.map((a) => ({
          ...a,
          left: a.left * density,
          top: a.top * density,
          width: a.width * density,
          height: a.height * density,
        })),
        8 * zoom * density,
      ).id,
    ).toBe('unit');
});
it('clamps zoom and resets bad values', () => {
  expect(clampCameraZoom(9)).toBe(1.8);
  expect(clampCameraZoom(-2)).toBe(0.8);
  expect(clampCameraZoom(NaN)).toBe(1);
});
