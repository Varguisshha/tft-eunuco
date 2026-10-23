import { it, expect } from 'vitest';
import { resolveAnimation, CharacterManifestSchema, animationCoverage } from '@tft/sprite-contract';
import { characterManifest } from './characterAssets';
import { BoardSession } from './session';
import fs from 'node:fs';
it('records original star2 provenance and exactly one physical attack sheet', () => {
  const m = characterManifest('vargas')!;
  expect(m.provenance).toEqual({
    characterId: 'vargas',
    sourceStarLevel: 2,
    nativeAppearance: 'star2',
    pending: ['idle', 'walk', 'ability', 'death'],
  });
  expect(m.evolutions.star1.attack).toBeNull();
  expect(m.evolutions.star3.attack).toBeNull();
  expect(m.evolutions.star2.attack!.frameCount).toBe(5);
  expect(fs.existsSync('apps/web/public/sprites/vargas/star1')).toBe(false);
  expect(fs.existsSync('apps/web/public/sprites/vargas/star3')).toBe(false);
  expect(animationCoverage(m)).toHaveLength(15);
});
it.each([1, 2, 3] as const)(
  '%s★ resolves every pending state to native star2, separating logical and visual state',
  (stars) => {
    const m = characterManifest('vargas')!;
    for (const requested of ['idle', 'walk', 'attack', 'ability', 'death'] as const) {
      const r = resolveAnimation(m, stars, requested);
      expect(r).toMatchObject({
        requested,
        requestedStars: stars,
        selected: 'attack',
        selectedStars: 2,
        status: stars === 2 && requested === 'attack' ? 'available' : 'fallback',
      });
      expect(r.asset).toBe(m.evolutions.star2.attack);
    }
  },
);
it('future native appearances override only their own fallback without changing gameplay or DOLEA', () => {
  const m = structuredClone(characterManifest('vargas')!),
    asset = structuredClone(m.evolutions.star2.attack!);
  m.evolutions.star1.attack = { ...asset, textureKey: 'future-1', url: '/future-1.png' };
  expect(resolveAnimation(CharacterManifestSchema.parse(m), 1, 'attack').selectedStars).toBe(1);
  expect(resolveAnimation(m, 3, 'attack').selectedStars).toBe(2);
  m.evolutions.star3.attack = { ...asset, textureKey: 'future-3', url: '/future-3.png' };
  expect(resolveAnimation(m, 3, 'idle').selectedStars).toBe(3);
  expect(resolveAnimation(m, 2, 'attack').selectedStars).toBe(2);
  const dolea = characterManifest('dolea')!;
  expect(dolea.fallbacks).toBeUndefined();
  expect(resolveAnimation(dolea, 1, 'walk').selectedStars).toBe(1);
  expect(resolveAnimation(dolea, 3, 'attack').selectedStars).toBe(2);
});
it.each(['vargas-1', 'vargas-2', 'vargas-3', 'upm-6', 'depredador-10'] as const)(
  'Arena runs %s with its own authored profile and stars',
  (name) => {
    const session = new BoardSession();
    session.loadVargasScenario(name);
    const before = session.getSnapshot().board;
    session.startCombat();
    expect(session.getSnapshot().invalid).toBe(false);
    expect(session.combatFrame()!.state.rulesVersion).toBe('f0p6b3-1');
    expect(session.getSnapshot().board).toEqual(before);
    if (name.startsWith('vargas'))
      expect(session.starsFor('diagnostic-vargas')).toBe(Number(name.slice(-1)));
  },
);
