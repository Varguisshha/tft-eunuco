import { describe, expect, it } from 'vitest';
import {
  BOARD_HEXES,
  axialToCartesian,
  boardNeighbors,
  createMatch,
  hexDistance,
  LocalMatchCoordinator,
  offsetToAxial,
  sameHex,
} from '@tft/game-core';
import { CURRENT_ECONOMY_CONFIG } from '@tft/game-data';
import {
  arenaProjection,
  calibrationErrors,
  characterDepth,
  characterScale,
  showArenaGrid,
  validateArena,
} from './arena';
import { MAR_DE_CRISTAL as arena } from './marDeCristal';
import { homography, insideConvex, inverse, logicalBounds, transform, type Quad } from './geometry';
import {
  hexCorners,
  hexToWorld,
  projectPoint,
  unprojectPoint,
  worldToHex,
  createProjection,
} from '../game/projection';
import { fitArenaView, fitCalibrationView } from './camera';
import { LocalSession } from '../match/LocalSession';
import { decodeSave, encodeSave } from '../match/automaticSave';
import { BoardSession } from '../game/session';
const projection = arenaProjection(arena);
describe('versioned arena geometry', () => {
  it('accepts the calibrated manifest and rejects unsupported, nonfinite and unsafe data', () => {
    expect(() => validateArena(arena)).not.toThrow();
    for (const mutate of [
      (a: typeof arena) => {
        a.contractVersion = 2 as 1;
      },
      (a: typeof arena) => {
        a.image.width = NaN;
      },
      (a: typeof arena) => {
        a.characters.scale = 0;
      },
      (a: typeof arena) => {
        a.camera.landmarks = [{ x: NaN, y: 10 }];
      },
      (a: typeof arena) => {
        a.projection.controls = [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ];
      },
      (a: typeof arena) => {
        a.projection.controls = a.projection.controls.map((p) => ({
          x: p.x + 600,
          y: p.y,
        })) as unknown as Quad;
      },
    ]) {
      const copy = structuredClone(arena);
      mutate(copy);
      expect(() => validateArena(copy)).toThrow();
    }
  });
  it('maps the four controls exactly and shows why an affine parallelogram is insufficient', () => {
    logicalBounds().forEach((p, i) => {
      const result = projectPoint(p, projection);
      expect(result.x).toBeCloseTo(arena.projection.controls[i]!.x, 9);
      expect(result.y).toBeCloseTo(arena.projection.controls[i]!.y, 9);
    });
    const [a, b, c, d] = arena.projection.controls;
    expect(Math.hypot(a.x + c.x - b.x - d.x, a.y + c.y - b.y - d.y)).toBeGreaterThan(60);
    expect(() => inverse([0, 0, 0, 0, 0, 0, 0, 0, 0])).toThrow();
    expect(() =>
      homography(logicalBounds(), [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ]),
    ).toThrow();
  });
  it('round-trips every center and fractional movement without altering axial coordinates', () => {
    const original = JSON.stringify(BOARD_HEXES);
    for (const h of BOARD_HEXES) {
      expect(worldToHex(hexToWorld(h, projection), projection)).toEqual(h);
      const p = axialToCartesian(h);
      for (const delta of [0, 0.001, 0.13, 0.47]) {
        const q = { x: p.x + delta, y: p.y - delta };
        const actual = unprojectPoint(projectPoint(q, projection), projection);
        expect(actual.x).toBeCloseTo(q.x, 10);
        expect(actual.y).toBeCloseTo(q.y, 10);
      }
    }
    expect(JSON.stringify(BOARD_HEXES)).toBe(original);
  });
  it('keeps all 336 corners inside the safe asphalt and rejects invalid calibration', () => {
    expect(BOARD_HEXES).toHaveLength(56);
    expect(calibrationErrors(arena)).toEqual([]);
    for (const h of BOARD_HEXES)
      for (const p of hexCorners(h, projection))
        expect(insideConvex(p, arena.playableArea)).toBe(true);
    expect(
      calibrationErrors(arena, [...arena.projection.controls].reverse() as unknown as Quad),
    ).not.toHaveLength(0);
    const invalid = arena.projection.controls.map((p) => ({
      x: p.x,
      y: p.y + 200,
    })) as unknown as Quad;
    expect(calibrationErrors(arena, invalid)[0]).toContain('fuera');
  });
  it('resolves each shared edge on both sides by inverse geometry, not nearest projected center', () => {
    let nearestWouldBeWrong = 0;
    for (const a of BOARD_HEXES)
      for (const b of boardNeighbors(a)) {
        expect(hexDistance(a, b)).toBe(1);
        const pa = axialToCartesian(a),
          pb = axialToCartesian(b);
        for (const t of [0.499999, 0.500001]) {
          const p = projectPoint(
            { x: pa.x + (pb.x - pa.x) * t, y: pa.y + (pb.y - pa.y) * t },
            projection,
          );
          const expected = t < 0.5 ? a : b;
          expect(worldToHex(p, projection)).toEqual(expected);
          const wa = hexToWorld(a, projection),
            wb = hexToWorld(b, projection);
          const nearest =
            Math.hypot(p.x - wa.x, p.y - wa.y) < Math.hypot(p.x - wb.x, p.y - wb.y) ? a : b;
          if (!sameHex(nearest, expected)) nearestWouldBeWrong++;
        }
      }
    expect(nearestWouldBeWrong).toBeGreaterThan(0);
  });
  it('contains each inset corner and returns no board cell just beyond the outer perimeter', () => {
    for (const h of BOARD_HEXES)
      for (const p of hexCorners(h, projection, 0.99999))
        expect(worldToHex(p, projection)).toEqual(h);
    for (const p of [
      { x: -10, y: -10 },
      { x: 30, y: 30 },
    ])
      expect(
        BOARD_HEXES.some((h) => sameHex(h, worldToHex(projectPoint(p, projection), projection))),
      ).toBe(false);
  });
});
describe('camera and input across HUD sizes', () => {
  for (const [w, h] of [
    [1248, 430],
    [1334, 478],
    [1408, 610],
    [1872, 762],
    [2512, 1122],
  ])
    for (const density of [1, 2])
      it(`${w}×${h} DPR ${density}: sign, headroom, all cells and zoomed input`, () => {
        for (const requested of [0.85, 1, 1.15]) {
          const width = w! * density,
            height = h! * density;
          const benchHeight = w! >= 1700 ? 76 : h! < 500 ? 56 : 64;
          const overlay = (benchHeight + 12) * density;
          const fit = fitArenaView(width, height, density, arena, projection, requested, overlay);
          const toScreen = (p: { x: number; y: number }) => ({
            x: (p.x - fit.x) * fit.zoom + width / 2,
            y: (p.y - fit.y) * fit.zoom + height / 2,
          });
          const tl = toScreen({ x: 0, y: 0 }),
            br = toScreen({ x: arena.image.width, y: arena.image.height });
          // Default framing shows every edge of the original, without stretching it.
          expect(br.x - tl.x).toBeCloseTo(arena.image.width * fit.zoom, 7);
          if (requested <= 1) {
            expect(tl.x).toBeGreaterThanOrEqual(fit.margins.left - 1e-7);
            expect(tl.y).toBeGreaterThanOrEqual(fit.margins.top - 1e-7);
            expect(br.x).toBeLessThanOrEqual(width - fit.margins.right + 1e-7);
            expect(br.y).toBeLessThanOrEqual(height - arena.camera.bottomMargin * density + 1e-7);
          }
          for (const landmark of arena.camera.landmarks ?? []) {
            const point = toScreen(landmark);
            expect(point.x).toBeGreaterThanOrEqual(fit.margins.left - 1e-7);
            expect(point.x).toBeLessThanOrEqual(width - fit.margins.right + 1e-7);
            expect(point.y).toBeGreaterThanOrEqual(fit.margins.top - 1e-7);
            expect(point.y).toBeLessThanOrEqual(height - fit.margins.bottom + 1e-7);
          }
          for (const hex of BOARD_HEXES) {
            const screen = toScreen(hexToWorld(hex, projection));
            // Client coordinates -> render buffer -> camera inverse -> projective inverse.
            const client = { x: screen.x / density, y: screen.y / density };
            const world = {
              x: (client.x * density - width / 2) / fit.zoom + fit.x,
              y: (client.y * density - height / 2) / fit.zoom + fit.y,
            };
            expect(worldToHex(world, projection)).toEqual(hex);
            expect(screen.x).toBeGreaterThan(fit.margins.left);
            expect(screen.x).toBeLessThan(width - fit.margins.right);
            expect(
              screen.y - 79 * characterScale(arena, hexToWorld(hex, projection).y) * fit.zoom,
            ).toBeGreaterThanOrEqual(0);
            for (const corner of hexCorners(hex, projection)) {
              const c = toScreen(corner);
              expect(c.y).toBeGreaterThanOrEqual(0);
              expect(c.y).toBeLessThanOrEqual(height - overlay);
            }
          }
        }
      });
});
describe('presentation preserves gameplay', () => {
  it('only shows interactive hexes during editable selection/drag; calibration is explicit', () => {
    expect(showArenaGrid(true, null, false, false)).toBe(false);
    expect(showArenaGrid(true, 'dolea', false, false)).toBe(true);
    expect(showArenaGrid(true, null, true, false)).toBe(true);
    expect(showArenaGrid(false, 'dolea', true, false)).toBe(false);
    expect(showArenaGrid(false, null, false, true)).toBe(true);
  });
  it('scales uniformly, continuously and sorts feet rather than sprite-frame extents', () => {
    expect(characterScale(arena, -100)).toBe(characterScale(arena, 335));
    expect(characterScale(arena, 2000)).toBe(characterScale(arena, 780));
    for (let y = 335; y < 780; y++) {
      expect(characterScale(arena, y + 1) - characterScale(arena, y)).toBeLessThan(0.001);
      expect(characterDepth(y + 1)).toBeGreaterThan(characterDepth(y));
    }
  });
  it('projected drops obey the same valid halves, swaps and rejected destinations', () => {
    const s = new LocalSession(createMatch(360, CURRENT_ECONOMY_CONFIG));
    s.dispatch({ type: 'buy_unit', offerId: s.getMatch().shop[1]!.id });
    s.dispatch({ type: 'buy_unit', offerId: s.getMatch().shop[0]!.id });
    const [a, b] = s.getMatch().units;
    const destination = offsetToAxial(4, 6);
    expect(s.move(a!.id, worldToHex(hexToWorld(destination, projection), projection))).toBe(true);
    expect(s.move(b!.id, destination)).toBe(true);
    expect(s.getMatch().units.find((u) => u.id === a!.id)!.location.kind).toBe('bench');
    const before = JSON.stringify(s.getMatch());
    expect(s.move(b!.id, worldToHex(hexToWorld(offsetToAxial(2, 1), projection), projection))).toBe(
      false,
    );
    expect(JSON.stringify(s.getMatch())).toBe(before);
  });
  it('calibration and projection leave automatic combat, DOLEA fusion and recovery identical', () => {
    let now = 0;
    const time = { now: () => now };
    const c = new LocalMatchCoordinator(createMatch(360, CURRENT_ECONOMY_CONFIG), {
      time,
      matchId: 'arena-p52',
    });
    const s = new LocalSession(c.getMatch(), undefined, c);
    c.start();
    for (const slot of [1, 3, 4])
      s.dispatch({ type: 'buy_unit', offerId: s.getMatch().shop[slot]!.id });
    const dolea = s.getMatch().units[0]!;
    expect(dolea.stars).toBe(2);
    s.move(dolea.id, offsetToAxial(3, 4));
    const before = encodeSave(c.exportSave());
    for (const h of BOARD_HEXES) worldToHex(hexToWorld(h, projection), projection);
    expect(encodeSave(c.exportSave())).toBe(before);
    const restored = decodeSave(before, time);
    expect(restored.getMatch()).toEqual(c.getMatch());
    for (let i = 0; i < 1700; i++) {
      now += 50;
      c.pulse();
      restored.pulse();
    }
    expect(restored.getMatch()).toEqual(c.getMatch());
    expect(c.getMatch().round).toBeGreaterThan(1);
    expect(c.getMatch().units[0]!.stars).toBe(2);
  });
  it('technical Arena still uses original projection, scenarios and deterministic repeats', () => {
    const p = createProjection();
    expect(p.matrix).toBeUndefined();
    expect(p.squash).toBe(0.64);
    const s = new BoardSession();
    s.loadCharacterDuel(3);
    s.startCombat();
    s.advanceCombat(50000);
    const before = s.getSnapshot().combat.result;
    s.startCombat(true);
    s.advanceCombat(50000);
    expect(s.getSnapshot().combat.result).toEqual(before);
    expect(s.starsFor('dolea-south')).toBe(3);
  });
  it('inverse and forward matrices compose for arbitrary image-space points', () => {
    const m = projection.matrix!,
      inv = inverse(m);
    for (const x of [0, 100, 836, 1672])
      for (const y of [0, 400, 941]) {
        const p = transform(transform({ x, y }, inv), m);
        expect(p.x).toBeCloseTo(x, 7);
        expect(p.y).toBeCloseTo(y, 7);
      }
  });
});

it('diagnostic framing shows the entire artwork and safe perimeter beside its controls', () => {
  for (const [width, height] of [
    [1248, 390],
    [1408, 570],
    [1872, 696],
    [2512, 1056],
  ]) {
    const fit = fitCalibrationView(width!, height!, 1, arena);
    for (const p of [
      { x: 0, y: 0 },
      { x: arena.image.width, y: arena.image.height },
      ...arena.playableArea,
    ]) {
      const x = (p.x - fit.x) * fit.zoom + width! / 2,
        y = (p.y - fit.y) * fit.zoom + height! / 2;
      expect(x).toBeGreaterThanOrEqual(340 - 1e-7);
      expect(x).toBeLessThanOrEqual(width! - 16 + 1e-7);
      expect(y).toBeGreaterThanOrEqual(8 - 1e-7);
      expect(y).toBeLessThanOrEqual(height! - 32 + 1e-7);
    }
  }
});
