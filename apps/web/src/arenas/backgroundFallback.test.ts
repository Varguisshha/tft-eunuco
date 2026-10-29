import { expect, it, vi } from 'vitest';
import { BOARD_HEXES } from '@tft/game-core';
import { BoardScene } from '../game/BoardScene';
import type { BoardPort } from '../game/boardPort';
import { ArenaRegistry } from './registry';
import { arenaProjection } from './arena';
import { hexCorners, hexToWorld } from '../game/projection';
vi.mock('phaser', () => ({
  default: {
    Scene: class {},
    Math: {
      Vector2: class {
        constructor(
          public x: number,
          public y: number,
        ) {}
      },
    },
    Core: { Events: { BLUR: 'blur' } },
    Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } },
  },
}));
vi.mock('../game/CombatRenderer', () => ({ CombatRenderer: class {} }));

it.each(Object.values(ArenaRegistry))(
  '$id: missing decoded texture warns and preserves all calibrated floor cells',
  (arena) => {
    // No loader error is emitted: reproduce a successful HTTP response with undecodable bytes.
    const polygons: Array<Array<{ x: number; y: number }>> = [];
    const graphic = () => ({
      setDepth() {
        return this;
      },
      fillStyle() {
        return this;
      },
      fillPoints(points: Array<{ x: number; y: number }>) {
        polygons.push(points);
        return this;
      },
      lineStyle() {
        return this;
      },
      strokePoints() {
        return this;
      },
      fillRect() {
        return this;
      },
    });
    const ready = vi.fn(),
      warning = vi.fn(),
      sync = vi.fn();
    const scene = new BoardScene(
      { subscribe: () => () => {} } as unknown as BoardPort,
      ready,
      true,
      arena,
    );
    const camera = {
      setBackgroundColor() {
        return this;
      },
      centerOn() {
        return this;
      },
    };
    Object.assign(scene, {
      textures: { exists: () => false },
      add: { graphics: graphic },
      cameras: { main: camera },
      input: { on() {} },
      game: { events: { on() {} } },
      events: { once() {} },
      sync,
    });
    scene.onAssetError = warning;
    scene.create();
    expect(warning).toHaveBeenCalledOnce();
    expect(ready).toHaveBeenCalledOnce();
    expect(sync).toHaveBeenCalledOnce();
    const projection = arenaProjection(arena);
    const cells = [...BOARD_HEXES].sort(
      (a, b) => hexToWorld(a, projection).y - hexToWorld(b, projection).y,
    );
    expect(polygons).toHaveLength(112);
    cells.forEach((hex, i) =>
      expect(polygons[i * 2 + 1]).toEqual(hexCorners(hex, projection, 0.96)),
    );
  },
);
