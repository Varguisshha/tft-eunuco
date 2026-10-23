import Phaser from 'phaser';
import {
  BOARD_HEXES,
  isInBounds,
  unitAt,
  validateDestination,
  sameHex,
  type Point,
} from '@tft/game-core';
import { getUnitDefinition } from '@tft/game-data';
import type { HexCoord } from '@tft/shared';
import type { BoardPort } from './boardPort';
import { createProjection, hexCorners, hexToWorld, WORLD, worldToHex } from './projection';
import { PhaserUnitVisual } from './visualAdapter';
import { CombatRenderer } from './CombatRenderer';
import { CHARACTER_ASSETS } from './characterAssets';
import { fitLocalBoardView } from './viewport';

export class BoardScene extends Phaser.Scene {
  private projection = createProjection();
  private overlay!: Phaser.GameObjects.Graphics;
  private visuals = new Map<string, PhaserUnitVisual>();
  private unsubscribe: (() => void) | undefined;
  private press: { unitId: string | null; x: number; y: number; dragging: boolean } | null = null;
  private zoomLevel = 1;
  private combatRenderer: CombatRenderer | null = null;
  constructor(
    private session: BoardPort,
    private onReady: () => void,
    private fitted = false,
  ) {
    super('board');
    if (fitted) this.projection = createProjection(0.32);
  }
  preload(): void {
    for (const manifest of CHARACTER_ASSETS)
      for (const slots of Object.values(manifest.evolutions))
        for (const asset of Object.values(slots)) {
          if (asset && !this.textures.exists(asset.textureKey))
            this.load.spritesheet(asset.textureKey, asset.url, {
              frameWidth: asset.frameWidth,
              frameHeight: asset.frameHeight,
            });
        }
  }
  create(): void {
    const ground = this.add.graphics();
    // Tile extrusions use the same projected footprint as the selectable surface.
    const ordered = [...BOARD_HEXES].sort(
      (a, b) => hexToWorld(a, this.projection).y - hexToWorld(b, this.projection).y,
    );
    for (const hex of ordered) {
      const points = hexCorners(hex, this.projection, 0.96).map(
        (p) => new Phaser.Math.Vector2(p.x, p.y),
      );
      const south = hex.r >= 4;
      ground.fillStyle(south ? 0x172c24 : 0x302a20).fillPoints(
        points.map((p) => new Phaser.Math.Vector2(p.x, p.y + 11)),
        true,
      );
      ground.lineStyle(1, south ? 0x345443 : 0x514332, 0.7).strokePoints(
        points.map((p) => new Phaser.Math.Vector2(p.x, p.y + 11)),
        true,
      );
      ground.fillStyle(south ? 0x294237 : 0x3d372a).fillPoints(points, true);
      ground.lineStyle(1, south ? 0x42664f : 0x645239, 0.8).strokePoints(points, true);
      const center = hexToWorld(hex, this.projection);
      ground
        .fillStyle(south ? 0x6b9277 : 0x967e56, 0.24)
        .fillRect(center.x - 1, center.y - 1, 2, 2);
    }
    this.overlay = this.add.graphics().setDepth(2);
    this.combatRenderer = new CombatRenderer(this, this.projection, !this.fitted);
    this.cameras.main.setBackgroundColor('#111e18').centerOn(WORLD.width / 2, WORLD.height / 2);
    this.input.on('pointermove', this.pointerMove, this);
    this.input.on('pointerdown', this.pointerDown, this);
    this.input.on('pointerup', this.pointerUp, this);
    this.input.on('pointerupoutside', this.pointerUpOutside, this);
    this.input.on('gameout', this.pointerOut, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.cancelDrag, this);
    this.unsubscribe = this.session.subscribe(() => this.sync());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.dispose, this);
    this.sync();
    this.onReady();
  }
  update(time: number, delta: number): void {
    this.session.advanceCombat(delta);
    const frame = this.session.combatFrame();
    if (frame)
      this.combatRenderer?.render(frame, this.visuals, this.session.getSnapshot().selectedId);
    else for (const visual of this.visuals.values()) visual.play('idle', time);
  }
  dispose(): void {
    if (!this.unsubscribe) return;
    this.unsubscribe();
    this.unsubscribe = undefined;
    this.game.events.off(Phaser.Core.Events.BLUR, this.cancelDrag, this);
    this.input.off('pointermove', this.pointerMove, this);
    this.input.off('pointerdown', this.pointerDown, this);
    this.input.off('pointerup', this.pointerUp, this);
    this.input.off('pointerupoutside', this.pointerUpOutside, this);
    this.input.off('gameout', this.pointerOut, this);
    this.press = null;
    this.combatRenderer?.destroy();
    this.combatRenderer = null;
    this.visuals.forEach((visual) => visual.destroy());
    this.visuals.clear();
  }
  setViewZoom(zoom: number): void {
    this.zoomLevel = zoom;
    this.fitView();
  }
  fitView(): void {
    const camera = this.cameras?.main;
    if (!camera) return;
    if (this.fitted) {
      const { width, height } = this.scale;
      const density = width / this.game.canvas.getBoundingClientRect().width;
      const fit = fitLocalBoardView(width, height, this.projection, density);
      camera
        .setSize(width, height)
        .setZoom(fit.zoom * this.zoomLevel)
        .centerOn(fit.x, fit.y);
    } else camera.setZoom(this.zoomLevel).centerOn(WORLD.width / 2, WORLD.height / 2);
  }
  private pointerWorld(pointer: Phaser.Input.Pointer): Point {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }
  private pointerMove(pointer: Phaser.Input.Pointer): void {
    const point = this.pointerWorld(pointer);
    const hex = worldToHex(point, this.projection);
    this.session.hover(isInBounds(hex) ? hex : null);
    if (this.session.editable && this.press?.unitId && pointer.isDown) {
      if (Math.hypot(pointer.x - this.press.x, pointer.y - this.press.y) > 5)
        this.press.dragging = true;
      if (this.press.dragging)
        this.visuals.get(this.press.unitId)?.setFootPosition(point.x, point.y);
    }
  }
  private pointerDown(pointer: Phaser.Input.Pointer): void {
    if (!pointer.leftButtonDown()) return;
    const hex = worldToHex(this.pointerWorld(pointer), this.projection);
    const state = this.session.getSnapshot();
    const point = this.pointerWorld(pointer);
    const hitId = [...this.visuals]
      .filter(([, visual]) => visual.sprite.getBounds().contains(point.x, point.y))
      .sort((a, b) => b[1].sprite.depth - a[1].sprite.depth)[0]?.[0];
    const currentUnits = this.session.combatFrame()?.state.units ?? state.board.units;
    const unit = currentUnits.find((u) => u.id === hitId) ?? unitAt({ units: currentUnits }, hex);
    if (!this.session.editable) {
      if (unit) this.session.select(unit.id);
      else this.session.pointerActivate?.(hex);
      return;
    }
    this.press = {
      unitId: state.paletteId ? null : (unit?.id ?? null),
      x: pointer.x,
      y: pointer.y,
      dragging: false,
    };
    if (unit && !state.paletteId && !this.session.pointerActivate) this.session.select(unit.id);
  }
  private pointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.press) return;
    const press = this.press;
    this.press = null;
    const hex = worldToHex(this.pointerWorld(pointer), this.projection);
    if (press.dragging && press.unitId) this.session.move(press.unitId, hex);
    else if (press.unitId) this.session.select(press.unitId);
    else if (this.session.pointerActivate) this.session.pointerActivate(hex);
    else this.session.activate(hex);
    this.sync();
  }
  private pointerUpOutside(pointer: Phaser.Input.Pointer): void {
    const id = this.press?.unitId;
    if (id && this.press?.dragging) {
      const event = pointer.event as MouseEvent;
      this.session.dropOutside?.(id, event.clientX, event.clientY);
    }
    this.cancelDrag();
  }
  dropFromBench(unitId: string, clientX: number, clientY: number): void {
    const rect = this.game.canvas.getBoundingClientRect();
    const point = this.cameras.main.getWorldPoint(
      ((clientX - rect.left) * this.scale.width) / rect.width,
      ((clientY - rect.top) * this.scale.height) / rect.height,
    );
    this.session.move(unitId, worldToHex(point, this.projection));
    this.sync();
  }
  private pointerOut(): void {
    this.session.hover(null);
    if (!this.session.dropOutside) this.cancelDrag();
  }
  private cancelDrag(): void {
    this.press = null;
    this.sync();
  }
  private sync(): void {
    const state = this.session.getSnapshot();
    const frame = this.session.combatFrame();
    const units = frame?.state.units ?? state.board.units;
    const ids = new Set(units.map((u) => u.id));
    if (!frame) this.combatRenderer?.clear();
    for (const [id, visual] of this.visuals)
      if (!ids.has(id)) {
        visual.destroy();
        this.visuals.delete(id);
      }
    for (const unit of units) {
      let visual = this.visuals.get(unit.id);
      if (!visual) {
        const def = getUnitDefinition(unit.definitionId);
        if (!def) continue;
        visual = new PhaserUnitVisual(this, def, unit.owner);
        this.visuals.set(unit.id, visual);
      }
      if (!frame && !(this.press?.dragging && this.press.unitId === unit.id)) {
        visual.setOpacity(1);
        visual.sprite.setAngle(0).clearTint();
        const position = hexToWorld(unit.position, this.projection);
        visual.setFootPosition(position.x, position.y);
      }
      visual.setSelected(state.selectedId === unit.id);
      visual.setStars(this.session.starsFor?.(unit.id) ?? 1);
    }
    this.overlay.clear();
    const selected = state.board.units.find((u) => u.id === state.selectedId);
    const hasAction = !frame && Boolean(state.paletteId || selected);
    if (hasAction)
      for (const hex of BOARD_HEXES) {
        const valid =
          (!selected || selected.owner === state.side) &&
          !validateDestination(state.board, hex, state.side, state.selectedId ?? undefined);
        if (valid) {
          const point = hexToWorld(hex, this.projection);
          this.overlay.fillStyle(0xa6c8a2, 0.5).fillCircle(point.x, point.y, 2);
        }
      }
    if (!frame) this.outline(state.cursor, 0xd7dcc1, 0.7, 2);
    if (!frame && selected && !sameHex(state.cursor, selected.position))
      this.outline(selected.position, 0xd7dcc1, 0.9, 2);
    if (state.hover && !frame) {
      const invalid =
        hasAction &&
        ((selected && selected.owner !== state.side) ||
          validateDestination(state.board, state.hover, state.side, state.selectedId ?? undefined));
      const points = hexCorners(state.hover, this.projection, 0.91).map(
        (p) => new Phaser.Math.Vector2(p.x, p.y),
      );
      this.overlay.fillStyle(invalid ? 0xc98168 : 0xafcdb0, 0.18).fillPoints(points, true);
      this.outline(state.hover, invalid ? 0xe09a7c : 0xc4dfb6, 1, 2);
      if (invalid) {
        const p = hexToWorld(state.hover, this.projection);
        this.overlay
          .lineStyle(2, 0xe09a7c, 0.9)
          .lineBetween(p.x - 4, p.y - 4, p.x + 4, p.y + 4)
          .lineBetween(p.x - 4, p.y + 4, p.x + 4, p.y - 4);
      }
    }
  }
  private outline(hex: HexCoord, color: number, alpha: number, width: number): void {
    this.overlay.lineStyle(width, color, alpha).strokePoints(
      hexCorners(hex, this.projection, 0.92).map((p) => new Phaser.Math.Vector2(p.x, p.y)),
      true,
    );
  }
}
