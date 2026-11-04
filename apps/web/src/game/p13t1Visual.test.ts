import { expect, it } from 'vitest';
import { applyMatchAction, commandFor, runCombat } from '@tft/game-core';
import { resolveComposite } from '@tft/sprite-contract';
import { p13t1Fixture } from '../development/p13t1Fixture';
import { characterManifest } from './characterAssets';
import { compositeBody } from './compositeVisuals';
import { CombatPlayback } from './combatPlayback';
it.each([1, 2, 3] as const)(
  'new Jew catalog keeps PEIBOL %i★ body, own projectile and replay speed independent from payment',
  (stars) => {
    const state = p13t1Fixture(stars),
      start = applyMatchAction(state, commandFor(state, { type: 'start_combat' }));
    if (!start.ok) throw Error(start.error);
    const replay = runCombat(start.state.combat!.input),
      before = JSON.stringify(replay),
      one = new CombatPlayback(replay),
      two = new CombatPlayback(replay);
    one.advance(400);
    two.setSpeed(2);
    two.advance(200);
    expect(two.frame()).toEqual(one.frame());
    const frame = one.frame(),
      unit = frame.state.units.find((u) => u.id === 'p13t-1')!,
      cue = frame.animationCues.get(unit.id)!;
    expect(frame.state.projectiles.some((p) => p.sourceId === unit.id)).toBe(true);
    expect(unit.hp).toBeGreaterThan(0);
    const manifest = characterManifest('peibol')!,
      visual = resolveComposite(manifest, stars)!;
    const body = compositeBody(
      manifest,
      'attack',
      frame.timeMs,
      cue.timing!.startMs,
      cue.timing!.impactMs ?? cue.timing!.endMs,
      stars,
    );
    expect(body.asset.textureKey).toContain(`star${stars}`);
    expect(body.asset.textureKey).toContain('attack');
    expect(visual.projectileAnimation.url).toContain(`star${stars}`);
    expect(body.asset).not.toBe(visual.projectileAnimation);
    one.setPaused(true);
    one.advance(20000);
    expect(one.frame()).toEqual(frame);
    expect(JSON.stringify(replay)).toBe(before);
    expect(runCombat(replay.input)).toEqual(replay);
    expect(state).not.toHaveProperty('lastReward.jew');
  },
);
