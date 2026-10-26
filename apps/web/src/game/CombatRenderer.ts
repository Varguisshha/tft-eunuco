import { characterManifest } from './characterAssets';
import { compositeFlight } from './compositeVisuals';
import { sampleAnimationFrame, type AnimationAsset } from '@tft/sprite-contract';
import { combatVisualPosition, mechanicsFeedback } from './mechanicsVisuals';
import { shieldBar, unitFeedback, feedbackLanes, FEEDBACK_WINDOW_MS } from './combatFeedback';
import Phaser from 'phaser';
import { TICK_MS, type CombatUnit } from '@tft/shared';
import type { Point } from '@tft/game-core';
import { WORLD, hexToWorld, type Projection } from './projection';
import type { PlaybackFrame } from './combatPlayback';
import type { PhaserUnitVisual } from './visualAdapter';
const clamp = (n: number) => Math.max(0, Math.min(1, n));
/** Frame sampling, never timers that resolve combat. Every stat comes from an authority snapshot. */
export class CombatRenderer {
  private effects = new Map<string, Phaser.GameObjects.Sprite>();
  private effect(
    key: string,
    asset: AnimationAsset,
    x: number,
    y: number,
    time: number,
    scale: number,
    angle = 0,
  ) {
    if (!this.scene.textures.exists(asset.textureKey)) return false;
    let sprite = this.effects.get(key);
    if (!sprite) {
      sprite = this.scene.add.sprite(x, y, asset.textureKey).setDepth(4100);
      this.effects.set(key, sprite);
    }
    sprite
      .setTexture(asset.textureKey, sampleAnimationFrame(asset, 'idle', time))
      .setOrigin(asset.foot.x / asset.frameWidth, asset.foot.y / asset.frameHeight)
      .setPosition(x, y)
      .setScale(asset.scale * scale)
      .setRotation(angle)
      .setVisible(true);
    return true;
  }
  private graphics: Phaser.GameObjects.Graphics;
  private overtimeLabel: Phaser.GameObjects.Text;
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private reducedMotion =
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  private label(
    key: string,
    content: string,
    color: string,
    x: number,
    y: number,
    alpha = 1,
    size = 13,
  ) {
    let text = this.labels.get(key);
    if (!text) {
      text = this.scene.add
        .text(0, 0, content, {
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: `${size}px`,
          fontStyle: 'bold',
          color,
          backgroundColor: '#101f1a',
          padding: { x: 3, y: 2 },
          stroke: '#101916',
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(4200);
      this.labels.set(key, text);
    }
    text.setText(content).setPosition(Math.round(x), Math.round(y)).setAlpha(alpha);
  }
  constructor(
    private scene: Phaser.Scene,
    private projection: Projection,
    private overtimeDecoration = true,
  ) {
    this.graphics = scene.add.graphics().setDepth(4000);
    this.overtimeLabel = scene.add
      .text(WORLD.width / 2, 80, 'OVERTIME', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffd08c',
        stroke: '#111e18',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(4300)
      .setVisible(false);
  }
  private position(unit: CombatUnit, timeMs: number): Point {
    return combatVisualPosition(unit, timeMs, this.projection);
  }

  render(
    frame: PlaybackFrame,
    visuals: ReadonlyMap<string, PhaserUnitVisual>,
    selectedId: string | null,
  ): void {
    const g = this.graphics.clear();
    const activeEffects = new Set<string>();
    const activeLabels = new Set<string>();
    const { timeMs, state } = frame;
    this.overtimeLabel
      .setVisible(frame.overtime && this.overtimeDecoration)
      .setScale(1 + (frame.overtime ? frame.overtimeIntro * 0.3 : 0));
    if (frame.overtime && this.overtimeDecoration)
      g.lineStyle(4, 0xf5ae60, 0.25 + Math.max(0, frame.overtimeIntro) * 0.65).strokeRect(
        10,
        10,
        WORLD.width - 20,
        WORLD.height - 20,
      );
    const positions = new Map(state.units.map((u) => [u.id, this.position(u, timeMs)]));
    const feedbackByUnit = new Map(
      state.units.map((u) => [
        u.id,
        (() => {
          const events = frame.feedbackEvents ?? frame.recentEvents;
          const feedback = unitFeedback(u, events, timeMs);
          return { ...feedback, passive: mechanicsFeedback(u, events, timeMs) ?? feedback.passive };
        })(),
      ]),
    );
    const lanes = feedbackLanes(
      state.units.flatMap((u) => {
        const f = feedbackByUnit.get(u.id)!,
          p = positions.get(u.id)!;
        if (u.deathTick !== null || (!f.passive && !f.shield)) return [];
        return [
          {
            id: u.id,
            x: p.x,
            y: p.y - 79 * (visuals.get(u.id)?.renderScale ?? 1) - 32,
            width: Math.max(100, Math.min(28, f.passive?.name.length ?? 0) * 8 + 8),
          },
        ];
      }),
      selectedId,
    );
    for (const unit of state.units) {
      const visual = visuals.get(unit.id),
        p = positions.get(unit.id);
      if (!visual || !p) continue;
      const cue = frame.animationCues.get(unit.id);
      visual.play(cue?.state ?? 'idle', timeMs, cue?.timing);
      visual.sprite.setAngle(0).clearTint();
      visual.setOpacity(1);
      visual.setFootPosition(p.x, p.y);
      if (unit.deathTick !== null) {
        const death = clamp((timeMs - unit.deathTick * TICK_MS) / 550);
        visual.setOpacity(1 - death);
        if (!visual.hasRealAsset)
          visual.sprite.setAngle((unit.owner === 'south' ? -1 : 1) * death * 85);
        continue;
      }
      const action = unit.action;
      if (action?.kind === 'jump') {
        const to = hexToWorld(action.to, this.projection);
        visual.setFacing(to.x >= p.x ? 'right' : 'left');
        const t = clamp(
          (timeMs / TICK_MS - action.startTick) / (action.endTick - action.startTick),
        );
        if (!this.reducedMotion?.matches) visual.sprite.y -= Math.sin(t * Math.PI) * 26;
        g.lineStyle(1, 0xb7e0c3, 0.45).strokeEllipse(p.x, p.y, 22, 8);
      } else if (action?.kind === 'move') {
        const target = hexToWorld(action.to, this.projection);
        visual.setFacing(target.x >= p.x ? 'right' : 'left');
        if (!visual.hasRealAsset)
          visual.sprite.y -= Math.abs(Math.sin((timeMs - action.startTick * TICK_MS) / 75)) * 3;
      } else if (action?.kind === 'attack') {
        const target = positions.get(action.targetId);
        if (target) {
          visual.setFacing(target.x >= p.x ? 'right' : 'left');
          const progress = clamp(
            (timeMs / TICK_MS - action.startTick) / (action.endTick - action.startTick),
          );
          const lunge = visual.hasRealAsset
            ? 0
            : Math.sin(progress * Math.PI) * (action.ranged ? 3 : 11);
          const d = Math.max(1, Math.hypot(target.x - p.x, target.y - p.y));
          visual.sprite.x += ((target.x - p.x) / d) * lunge;
          visual.sprite.y += ((target.y - p.y) / d) * lunge;
        }
      } else if (action?.kind === 'cast') {
        const progress = clamp(
          (timeMs / TICK_MS - action.startTick) / (action.endTick - action.startTick),
        );
        g.lineStyle(2, 0xc9b4ed, 0.6 + progress * 0.4).strokeEllipse(
          p.x,
          p.y,
          30 + progress * 30,
          12 + progress * 12,
        );
        if (!visual.hasRealAsset) visual.sprite.y -= progress * 4;
      }
      const damage = [...frame.recentEvents]
        .reverse()
        .find((e) => e.type === 'damage' && e.payload.targetId === unit.id);
      if (damage && timeMs - damage.tick * TICK_MS < 120) visual.sprite.setTint(0xffb49b);
      const x = Math.round(p.x - 23),
        y = Math.round(p.y - 79 * visual.renderScale);
      const bar = shieldBar(unit);
      g.fillStyle(0x0a1510).fillRect(x - 2, y - 2, 50, 16);
      if (!this.reducedMotion?.matches && damage?.type === 'damage') {
        const age = Math.max(0, timeMs - damage.tick * TICK_MS);
        if (age < 180) {
          const lost = damage.payload.amount / unit.profile.stats.maxHp;
          g.fillStyle(0xe5b794, 0.75).fillRect(
            x,
            y,
            46 * Math.min(1, bar.hpFraction + lost * (1 - age / 180)),
            6,
          );
        }
      }
      g.fillStyle(unit.owner === 'south' ? 0xb8d4a3 : 0xe2b47b).fillRect(
        x,
        y,
        46 * bar.hpFraction,
        6,
      );
      if (unit.profile.stats.maxMana > 0)
        g.fillStyle(0x78b6d1).fillRect(x, y + 9, (46 * unit.mana) / unit.profile.stats.maxMana, 3);
      if (bar.shield > 0) {
        const start = x + 46 * bar.hpFraction;
        const width = 46 * bar.shieldFraction;
        g.fillStyle(0x8ce9e8).fillRect(start, y, width, 6);
        g.lineStyle(1, 0x142f33).lineBetween(start, y, start, y + 6);
        const key = `shield:${unit.id}`;
        activeLabels.add(key);
        this.label(key, `${bar.shield} ESC`, '#acf2ef', x + 70, y + 3, 1, 11);
        g.lineStyle(2, 0x8ce9e8, 0.65).strokeRect(p.x - 26, p.y - 62, 52, 60);
      }
      const stacks = unit.mechanics?.stacks ?? [];
      if (stacks.length) {
        const key = `stacks:${unit.id}`;
        activeLabels.add(key);
        this.label(
          key,
          stacks
            .slice(0, 2)
            .map(
              (s) =>
                `${s.definitionId === 'resaca' ? 'R' : s.definitionId === 'depredador' ? 'D' : 'A'} ${s.count}${s.maxStacks <= 9 ? `/${s.maxStacks}` : ''}`,
            )
            .join(' · '),
          '#e8d7a8',
          p.x,
          y + 27,
          1,
          11,
        );
      }
      const feedback = feedbackByUnit.get(unit.id)!;
      const lane = lanes.get(unit.id);
      const fade = (age: number) => Math.min(1, (FEEDBACK_WINDOW_MS - age) / 200);
      if (feedback.passive) {
        const f = feedback.passive,
          key = `passive:${unit.id}:${f.key}`;
        const name =
          unit.id === selectedId
            ? f.name.length > 28
              ? `${f.name.slice(0, 27)}…`
              : f.name
            : f.name.startsWith('Eliminación')
              ? 'Eliminación'
              : 'Activación';
        if (lane !== undefined) {
          activeLabels.add(key);
          this.label(key, name, '#ecf6d0', p.x, y - 42 + lane, fade(f.age));
        }
        // A single defensive flash, sampled from event time; no timer or gameplay side effect.
        if (f.age < 240) {
          const strength = this.reducedMotion?.matches ? 0.45 : 1 - f.age / 240;
          g.lineStyle(3, feedback.shield ? 0xacf2ef : 0xd2ebc1, strength);
          for (const dx of [-1, 1])
            for (const dy of [-1, 1]) {
              const cx = p.x + dx * 30,
                cy = p.y - 32 + dy * 34;
              g.lineBetween(cx, cy, cx - dx * 10, cy).lineBetween(cx, cy, cx, cy - dy * 10);
            }
        }
      }
      if (feedback.shield && lane !== undefined) {
        const f = feedback.shield,
          key = `grant:${unit.id}:${f.key}`;
        activeLabels.add(key);
        this.label(key, `+${f.amount} escudo`, '#acf2ef', p.x, y - 22 + lane, fade(f.age));
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
      const source = state.units.find((u) => u.id === projectile.sourceId);
      const composite = projectile.itemSource
        ? undefined
        : characterManifest(source?.definitionId ?? '')?.composite;
      if (composite) {
        const scale = visuals.get(projectile.sourceId)?.renderScale ?? 1;
        const flight = compositeFlight(
          from,
          to,
          projectile.launchTick * TICK_MS,
          projectile.impactTick * TICK_MS,
          timeMs,
          composite.projectileOrigin,
          composite.targetAnchor,
          scale,
        );
        const key = `flight-${projectile.id}`;
        if (
          this.effect(
            key,
            composite.projectileAnimation,
            flight.x,
            flight.y,
            timeMs - projectile.launchTick * TICK_MS,
            scale,
            flight.angle,
          )
        ) {
          activeEffects.add(key);
          continue;
        }
      }
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
    for (const event of frame.recentEvents) {
      const age = timeMs - event.tick * TICK_MS;
      if (event.type === 'ability_cast' && event.payload.stage === 'resolve' && age < 500) {
        const p = hexToWorld(event.payload.center, this.projection),
          t = age / 500;
        g.lineStyle(3, 0xc3a1e6, 1 - t).strokeEllipse(p.x, p.y, 25 + t * 125, 12 + t * 65);
      }
      if (event.type === 'damage' && event.payload.projectileId && age >= 0) {
        const source = state.units.find((u) => u.id === event.payload.sourceId);
        const c = event.payload.itemSource
          ? undefined
          : characterManifest(source?.definitionId ?? '')?.composite;
        if (c && age < c.visualTiming.impactMs) {
          const p = hexToWorld(event.payload.impact, this.projection),
            scale = visuals.get(event.payload.sourceId)?.renderScale ?? 1,
            key = `impact-${event.payload.projectileId}`;
          if (
            this.effect(
              key,
              c.impactAnimation,
              p.x + c.targetAnchor.x * scale,
              p.y + c.targetAnchor.y * scale,
              age,
              scale,
            )
          )
            activeEffects.add(key);
        }
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
                ? `${event.payload.critical ? 'CRÍTICO ' : ''}−${event.payload.amount} [${event.payload.absorbed}]`
                : `${event.payload.critical ? 'CRÍTICO ' : ''}−${event.payload.amount}`;
          text = this.scene.add
            .text(0, 0, content, {
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '13px',
              fontStyle: 'bold',
              color:
                event.type === 'heal' ? '#c4e8aa' : event.payload.critical ? '#f7d78a' : '#ffe0b7',
              stroke: '#101916',
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(4100);
          this.labels.set(key, text);
        }
        text
          .setPosition(
            p.x - 45 + ((event.order % 3) - 1) * 10,
            p.y -
              79 * (visuals.get(targetId)?.renderScale ?? 1) -
              (this.reducedMotion?.matches ? 12 : age / 28),
          )
          .setAlpha(1 - age / 650);
      }
    }
    for (const [key, sprite] of this.effects)
      if (!activeEffects.has(key)) {
        sprite.destroy();
        this.effects.delete(key);
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
    this.effects.forEach((sprite) => sprite.destroy());
    this.effects.clear();
    this.labels.forEach((text) => text.destroy());
    this.labels.clear();
  }
  destroy(): void {
    this.clear();
    this.graphics.destroy();
    this.overtimeLabel.destroy();
  }
}
