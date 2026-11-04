import { CharacterManifestSchema } from '@tft/sprite-contract';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { it, expect } from 'vitest';
import { resolveAnimation, resolveComposite, sampleAnimationFrame } from '@tft/sprite-contract';
import { characterManifest, legacyCharacterManifest } from './characterAssets';
import { compositeBody, compositeFlight } from './compositeVisuals';
import report from '../../../../docs/TFTPERU2_IMPORT_REPORT.json';
import { p13tFixture } from '../development/p13tFixture';
import { applyMatchAction, commandFor, runCombat } from '@tft/game-core';
import { CombatPlayback } from './combatPlayback';
it.each([1, 2, 3] as const)(
  'Jaramillo %i★ stays below the upright body reference in every physical combat frame',
  async (stars) => {
    const manifest = characterManifest('jaramillo')!;
    const asset = resolveAnimation(manifest, stars, 'attack').asset!;
    const reference = resolveAnimation(characterManifest('peibol'), 1, 'attack').asset!;
    const referenceHeight = (reference.frameHeight - 16) * reference.scale;
    for (const frame of asset.frames) {
      const { data, info } = await sharp('apps/web/public' + asset.url)
        .extract({
          left: frame * asset.frameWidth,
          top: 0,
          width: asset.frameWidth,
          height: asset.frameHeight,
        })
        .raw()
        .toBuffer({ resolveWithObject: true });
      let top = info.height,
        bottom = -1;
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++)
          if (data[(y * info.width + x) * 4 + 3]! > 8) {
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      const height = (bottom - top + 1) * asset.scale;
      // Includes smoke: Jaramillo must remain readable without dwarfing peers.
      expect(height / referenceHeight).toBeGreaterThan(0.65);
      expect(height / referenceHeight).toBeLessThan(0.95);
    }
    const compound = resolveComposite(manifest, stars)!;
    expect(compound.recoveryAnimation!.scale).toBe(asset.scale);
    // The launch stays within the resized body instead of its former outer edge.
    expect(Math.abs(compound.projectileOrigin.y)).toBeLessThan(0.65 * referenceHeight);
    expect(Math.abs(compound.projectileOrigin.x)).toBeLessThan(0.5 * referenceHeight);
  },
);
it('every imported derivative has exact supplied identity, source hash, transparent canvas and complete physical frames', async () => {
  for (const d of report.derivatives) {
    const bytes = fs.readFileSync('apps/web/public/' + d.output);
    expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(d.sha256);
    const m = await sharp(bytes).metadata();
    expect(m.hasAlpha).toBe(true);
    const stats = await sharp(bytes).stats();
    expect(stats.channels[3]!.min).toBe(0);
    for (const s of d.frames)
      expect(crypto.createHash('sha256').update(fs.readFileSync(s.file)).digest('hex')).toBe(
        s.sha256,
      );
  }
});
it.each([1, 2, 3] as const)(
  '%i★ bodies remain visible through independent launch, flight, recovery and seek',
  (stars) => {
    for (const id of ['jaramillo', 'peibol']) {
      const m = characterManifest(id)!,
        c = resolveComposite(m, stars)!;
      expect(c).toBeDefined();
      const attack = resolveAnimation(m, stars, 'attack');
      expect(attack.selectedStars).toBe(stars);
      expect(new Set(attack.asset!.sources.map((s) => s.sha256)).size).toBe(
        attack.asset!.frameCount,
      );
      for (const t of [0, 100, 199, 200, 250, 300, 419, 420, 800]) {
        const body = compositeBody(m, 'attack', t, 0, 200, stars);
        expect(body.asset.textureKey).toContain(`star${stars}`);
        expect(body.asset.textureKey).toContain('attack');
        expect(body.asset.frames).toContain(body.frame);
        expect(body.asset).not.toBe(c.projectileAnimation);
        expect(sampleAnimationFrame(body.asset, 'attack', t)).toBeGreaterThanOrEqual(0);
      }
      expect(c.projectileAnimation.sources[0]!.file).toContain(`Nivel${stars}`);
      expect(
        compositeFlight(
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          200,
          400,
          300,
          c.projectileOrigin,
          c.targetAnchor,
          1,
        ).x,
      ).toBeCloseTo((100 + c.projectileOrigin.x) / 2, 10);
    }
  },
);
it('partial replacements preserve higher evolutions and absent identities; missing rock impact is explicit', () => {
  for (const id of ['dolea', 'vargas'])
    for (const stars of [2, 3] as const)
      expect(characterManifest(id)!.evolutions[`star${stars}`]).toEqual(
        legacyCharacterManifest(id)!.evolutions[`star${stars}`],
      );
  expect(resolveAnimation(characterManifest('vargas'), 1, 'walk')).toMatchObject({
    selectedStars: 1,
    status: 'fallback',
  });
  expect(resolveAnimation(characterManifest('dolea'), 1, 'idle').status).toBe('available');
  expect(characterManifest('provisional-peibol')?.id).toBe('peibol');
  expect(characterManifest('provisional-cosmin')).toBeUndefined();
  expect(resolveComposite(characterManifest('jaramillo'), 1)!.impactAnimation).toBeNull();
  expect(resolveComposite(characterManifest('jaramillo'), 2)!.projectileAnimation.url).not.toBe(
    resolveComposite(characterManifest('jaramillo'), 3)!.projectileAnimation.url,
  );
});
it.each([1, 2, 3] as const)(
  '%i★ real replay sampling at ×1/×2 and pause preserves both bodies and authoritative damage',
  (stars) => {
    const state = p13tFixture(stars),
      started = applyMatchAction(state, commandFor(state, { type: 'start_combat' }));
    if (!started.ok) throw Error(started.error);
    const r = runCombat(started.state.combat!.input),
      before = JSON.stringify(r),
      one = new CombatPlayback(r),
      two = new CombatPlayback(r);
    two.setSpeed(2);
    one.advance(400);
    two.advance(200);
    expect(two.frame()).toEqual(one.frame());
    const frame = one.frame();
    expect(
      frame.state.projectiles.filter((p) => p.sourceId === 'p13t-0' || p.sourceId === 'p13t-1'),
    ).toHaveLength(2);
    for (const id of ['p13t-0', 'p13t-1']) {
      const u = frame.state.units.find((u) => u.id === id)!;
      expect(u.hp).toBeGreaterThan(0);
      const cue = frame.animationCues.get(id)!;
      expect(cue.timing).toBeDefined();
      const body = compositeBody(
        characterManifest(u.definitionId)!,
        cue.state === 'ability' ? 'ability' : 'attack',
        frame.timeMs,
        cue.timing!.startMs,
        cue.timing!.impactMs ?? cue.timing!.endMs,
        stars,
      );
      expect(body.asset.textureKey).toContain('attack');
      expect(body.asset.textureKey).not.toContain('projectile');
    }
    one.setPaused(true);
    one.advance(10000);
    expect(one.frame()).toEqual(frame);
    expect(JSON.stringify(r)).toBe(before);
    expect(runCombat(r.input)).toEqual(r);
  },
);

it('rejects a projectile bound to another evolution body or an absent release pose', () => {
  const m = structuredClone(characterManifest('jaramillo')!);
  m.evolutions.star2.attack = null;
  expect(() => CharacterManifestSchema.parse(m)).toThrow(/own body/);
  const wrong = structuredClone(characterManifest('peibol')!);
  wrong.composites!.star3!.releaseMarker = 100;
  expect(() => CharacterManifestSchema.parse(wrong)).toThrow(/release pose/);
});
