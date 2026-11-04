import { expect, it } from 'vitest';
import { P11_ROSTER, P11_COMBAT_PROFILES } from '../p11-roster';
import { ROSTER_SOURCE } from '../roster-source';
import {
  championAuthoringCatalog,
  championAuthoringDefinition,
  validateChampionBindings,
  withChampionValidation,
} from './authoring';

it('derives exactly the 34 existing identities, order, bindings and null abilities without copies', () => {
  const before = JSON.stringify([P11_ROSTER, P11_COMBAT_PROFILES]);
  const views = championAuthoringCatalog();
  expect(views.map((v) => v.identity.id)).toEqual(ROSTER_SOURCE.characters.map((u) => u.id));
  expect(views).toHaveLength(34);
  expect(views.filter((v) => v.readiness.kind === 'implemented')).toHaveLength(4);
  expect(views.filter((v) => v.readiness.kind === 'provisional')).toHaveLength(30);
  for (const v of views) {
    expect(v.identity).toBe(P11_ROSTER.find((u) => u.id === v.identity.id));
    expect(v.baseProfile).toBe(P11_COMBAT_PROFILES[v.identity.id]);
    expect(v.baseProfile.traits).toEqual(v.identity.synergies);
    if (v.identity.provisional) {
      expect(v.ability).toBeNull();
      expect(v.baseProfile.ability).toBeNull();
      expect(v.baseProfile.passive).toBeNull();
      expect(v.identity.activeAbilityId).toBeNull();
      expect(v.identity.passiveAbilityId).toBeNull();
      expect(v.assets.splashArtKey).toBeNull();
    }
  }
  expect(JSON.stringify([P11_ROSTER, P11_COMBAT_PROFILES])).toBe(before);
});
it('keeps FLORIN component references and special capabilities separate from dispatch', () => {
  const f = championAuthoringDefinition('florin');
  expect(f.identity.passiveAbilityId).toBe('suela-reforzada');
  expect(f.ability?.id).toBe('pisoton-carmesi');
  expect(f.capabilities).toEqual(['attack_cycle', 'off_board_recovery']);
  expect(championAuthoringDefinition('jaramillo').capabilities).toEqual([
    'projectile_delivery',
    'competitive_round_progress',
  ]);
  expect(championAuthoringDefinition('dolea').capabilities).toEqual([]);
  expect(f.assets).toEqual({ spriteId: 'florin', splashArtKey: 'florin:splash:1' });
});
it('rejects broken affiliations, aliases, schema and invented provisional skills', () => {
  const d = championAuthoringDefinition('dolea');
  const identity = structuredClone(P11_ROSTER.find((u) => u.id === 'dolea')!);
  const profile = structuredClone(P11_COMBAT_PROFILES.dolea!);
  expect(() => validateChampionBindings({ ...identity, synergies: ['unknown'] }, profile)).toThrow(
    'affinity',
  );
  expect(() =>
    validateChampionBindings({ ...identity, passiveAbilityId: 'unknown' }, profile),
  ).toThrow('reference');
  expect(() =>
    validateChampionBindings({ ...identity, cost: 0 } as unknown as typeof identity, profile),
  ).toThrow();
  const provisional = P11_ROSTER.find((u) => u.provisional)!;
  expect(() =>
    validateChampionBindings(
      { ...provisional, activeAbilityId: 'invented' },
      P11_COMBAT_PROFILES[provisional.id]!,
    ),
  ).toThrow('Provisional');
  expect(() => championAuthoringDefinition('not-in-roster')).toThrow('Unknown');
  expect(d.readiness.kind).toBe('implemented');
});
it('requires explicit review evidence for validated, without altering serializable profiles', () => {
  const d = championAuthoringDefinition('dolea'),
    before = JSON.stringify(d.baseProfile);
  const reviewed = withChampionValidation(d, 'd38f18bb8e0c4279c9ac92883942200225f0cb94', [
    'A/B corpus',
  ]);
  expect(reviewed.readiness.kind).toBe('validated');
  expect(d.readiness.kind).toBe('implemented');
  expect(JSON.stringify(reviewed.baseProfile)).toBe(before);
  expect(() => withChampionValidation(d, 'bad', [])).toThrow();
  expect(() =>
    withChampionValidation(
      championAuthoringDefinition('cosmin'),
      'd38f18bb8e0c4279c9ac92883942200225f0cb94',
      ['x'],
    ),
  ).toThrow();
});
