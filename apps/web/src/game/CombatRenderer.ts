import Phaser from 'phaser';
import { TICK_MS, type CombatUnit } from '@tft/shared';
import type { Point } from '@tft/game-core';
import { WORLD, hexToWorld, type Projection } from './projection';
import type { PlaybackFrame } from './combatPlayback';
import type { PhaserUnitVisual } from './visualAdapter';
const clamp = (n: number) => Math.max(0, Math.min(1, n));
/** Frame sampling, never timers that resolve combat. Every stat comes from an authority snapshot. */
export class CombatRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private overtimeLabel: Phaser.GameObjects.Text;
  private labels = new Map<string, Phaser.GameObjects.Text>();
  constructor(
    private scene: Phaser.Scene,
    private projection: Projection,
  ) {
    this.graphics = scene.add.graphics().setDepth(2000);
    this.overtimeLabel = scene.add
      .text(WORLD.width / 2, 80, 'OVERTIME', {
        fontFamily: 'monospace',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffd08c',
        stroke: '#111e18',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(2200)
      .setVisible(false);
  }
  private position(unit: CombatUnit, timeMs: number): Point {
    const action = unit.action;
    if (action?.kind !== 'move') return hexToWorld(unit.position, this.projection);
    const from = hexToWorld(action.from, this.projection),
      to = hexToWorld(action.to, this.projection);
    const t = clamp((timeMs / TICK_MS - action.startTick) / (action.endTick - action.startTick));
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  }
  render(
    frame: PlaybackFrame,
    visuals: ReadonlyMap<string, PhaserUnitVisual>,
    selectedId: string | null,
  ): void {
    const g = this.graphics.clear();
    const { timeMs, state } = frame;
    this.overtimeLabel
      .setVisible(frame.overtime)
      .setScale(1 + (frame.overtime ? frame.overtimeIntro * 0.3 : 0));
    if (frame.overtime)
      g.lineStyle(4, 0xf5ae60, 0.25 + Math.max(0, frame.overtimeIntro) * 0.65).strokeRect(
        10,
        10,
        WORLD.width - 20,
        WORLD.height - 20,
      );
    const positions = new Map(state.units.map((u) => [u.id, this.position(u, timeMs)]));
    for (const unit of state.units) {
      const visual = visuals.get(unit.id),
        p = positions.get(unit.id);
      if (!visual || !p) continue;
      visual.sprite.setAngle(0).clearTint();
      visual.setOpacity(1);
      visual.setFootPosition(p.x, p.y);
      if (unit.deathTick !== null) {
        const death = clamp((timeMs - unit.deathTick * TICK_MS) / 550);
        visual.setOpacity(1 - death);
        visual.sprite.setAngle((unit.owner === 'south' ? -1 : 1) * death * 85);
        continue;
      }
      const action = unit.action;
      if (action?.kind === 'move') {
        visual.play('walk');
        const target = hexToWorld(action.to, this.projection);
        visual.setFacing(target.x >= p.x ? 'right' : 'left');
        visual.sprite.y -= Math.abs(Math.sin((timeMs - action.startTick * TICK_MS) / 75)) * 3;
      } else if (action?.kind === 'attack') {
        visual.play('attack');
        const target = positions.get(action.targetId);
        if (target) {
          visual.setFacing(target.x >= p.x ? 'right' : 'left');
          const progress = clamp(
            (timeMs / TICK_MS - action.startTick) / (action.endTick - action.startTick),
          );
          const lunge = Math.sin(progress * Math.PI) * (action.ranged ? 3 : 11);
          const d = Math.max(1, Math.hypot(target.x - p.x, target.y - p.y));
          visual.sprite.x += ((target.x - p.x) / d) * lunge;
          visual.sprite.y += ((target.y - p.y) / d) * lunge;
        }
      } else if (action?.kind === 'cast') {
        visual.play('ability');
        const progress = clamp(
          (timeMs / TICK_MS - action.startTick) / (action.endTick - action.startTick),
        );
        g.lineStyle(2, 0xc9b4ed, 0.6 + progress * 0.4).strokeEllipse(
          p.x,
          p.y,
          30 + progress * 30,
          12 + progress * 12,
        );
        visual.sprite.y -= progress * 4;
      } else visual.play('idle');
      const damage = [...frame.recentEvents]
        .reverse()
        .find((e) => e.type === 'damage' && e.payload.targetId === unit.id);
      if (damage && timeMs - damage.tick * TICK_MS < 120) visual.sprite.setTint(0xffb49b);
      const x = Math.round(p.x - 23),
        y = Math.round(p.y - 79);
      g.fillStyle(0x0a1510).fillRect(x - 2, y - 2, 50, 14);
      g.fillStyle(unit.owner === 'south' ? 0xb8d4a3 : 0xe2b47b).fillRect(
        x,
        y,
        (46 * unit.hp) / unit.profile.stats.maxHp,
        4,
      );
      g.fillStyle(0x78b6d1).fillRect(x, y + 6, (46 * unit.mana) / unit.profile.stats.maxMana, 3);
      const shield = unit.statuses
        .filter((s) => s.kind === 'shield')
        .reduce((sum, s) => sum + s.amount, 0);
      if (shield) {
        g.fillStyle(0xd8e7e7).fillRect(
          x,
          y + 10,
          Math.min(46, (46 * shield) / unit.profile.stats.maxHp),
          2,
        );
        g.lineStyle(1, 0xb5dcdf, 0.65).strokeEllipse(p.x, p.y - 28, 54, 66);
      }
      if (unit.statuses.some((s) => s.kind === 'stun')) {
        g.fillStyle(0xeed67f).fillRect(p.x - 3, y - 13, 6, 6);
        g.lineStyle(2, 0xeed67f).lineBetween(p.x - 9, y - 10, p.x + 9, y - 10);
      }
      if (unit.statuses.some((s) => s.kind === 'modifier'))
        g.fillStyle(0xa3db94).fillTriangle(x + 47, y + 5, x + 53, y + 5, x + 50, y - 2);
      if (unit.id === selectedId && unit.targetId) {
        const target = positions.get(unit.targetId);
        if (target) g.lineStyle(1, 0xdce4bb, 0.23).lineBetween(p.x, p.y, target.x, target.y);
      }
    }
    for (const projectile of state.projectiles) {
      const from = hexToWorld(projectile.from, this.projection);
      const to = positions.get(projectile.targetId) ?? hexToWorld(projectile.to, this.projection);
      const t = clamp(
        (timeMs / TICK_MS - projectile.launchTick) /
          (projectile.impactTick - projectile.launchTick),
      );
      const x = from.x + (to.x - from.x) * t,
        y = from.y - 25 + (to.y - from.y) * t;
      const trail = Math.max(0, t - 0.16);
      g.lineStyle(3, 0xf0d390, 0.9).lineBetween(
        from.x + (to.x - from.x) * trail,
        from.y - 25 + (to.y - from.y) * trail,
        x,
        y,
      );
      g.fillStyle(0xfff2c1).fillRect(x - 3, y - 3, 6, 6);
    }
    const activeLabels = new Set<string>();
    for (const event of frame.recentEvents) {
      const age = timeMs - event.tick * TICK_MS;
      if (event.type === 'ability_cast' && event.payload.stage === 'resolve' && age < 500) {
        const p = hexToWorld(event.payload.center, this.projection),
          t = age / 500;
        g.lineStyle(3, 0xc3a1e6, 1 - t).strokeEllipse(p.x, p.y, 25 + t * 125, 12 + t * 65);
      }
      if (event.type === 'damage' && age < 160) {
        const p =
          positions.get(event.payload.targetId) ??
          hexToWorld(event.payload.impact, this.projection);
        g.lineStyle(
          3,
          event.payload.damageType === 'magic' ? 0xccabe9 : 0xf3d7ac,
          1 - age / 160,
        ).lineBetween(p.x - 9, p.y - 22, p.x + 9, p.y - 40);
      }
      if ((event.type === 'damage' || event.type === 'heal') && age < 650) {
        const key = `${event.tick}:${event.order}`;
        activeLabels.add(key);
        const targetId = event.payload.targetId,
          p = positions.get(targetId);
        if (!p) continue;
        let text = this.labels.get(key);
        if (!text) {
          const content =
            event.type === 'heal'
              ? `+${event.payload.amount}`
              : event.payload.absorbed > 0
                ? `−${event.payload.amount} [${event.payload.absorbed}]`
                : `−${event.payload.amount}`;
          text = this.scene.add
            .text(0, 0, content, {
              fontFamily: 'monospace',
              fontSize: '13px',
              fontStyle: 'bold',
              color: event.type === 'heal' ? '#c4e8aa' : '#ffe0b7',
              stroke: '#101916',
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(2100);
          this.labels.set(key, text);
        }
        text
          .setPosition(p.x + ((event.order % 3) - 1) * 10, p.y - 90 - age / 28)
          .setAlpha(1 - age / 650);
      }
    }
    for (const [key, label] of this.labels)
      if (!activeLabels.has(key)) {
        label.destroy();
        this.labels.delete(key);
      }
  }
  clear(): void {
    this.overtimeLabel.setVisible(false);
    this.graphics.clear();
    this.labels.forEach((text) => text.destroy());
    this.labels.clear();
  }
  destroy(): void {
    this.clear();
    this.graphics.destroy();
    this.overtimeLabel.destroy();
  }
}
