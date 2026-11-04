import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { DOLEA_ABILITY } from './dolea';
import { DOLEA_ABILITY as legacy } from '../legacy-traits';
import { DOLEA_ABILITY as publicApi } from '../abilities';
import { championAuthoringDefinition, withChampionValidation } from './authoring';
it('preserves the exact P12J DOLEA definition and historical exports after extraction', () => {
  // Captured from the independently compiled immutable P12J reference, not the candidate.
  expect(createHash('sha256').update(JSON.stringify(DOLEA_ABILITY)).digest('hex')).toBe(
    '3734c11d209db8d4d074bc61ffdd3cb7f46f3bfe71be66abbbbcdb11f92bbfa7',
  );
  expect(legacy).toBe(DOLEA_ABILITY);
  expect(publicApi).toBe(DOLEA_ABILITY);
  expect(championAuthoringDefinition('dolea').ability).toEqual(DOLEA_ABILITY);
  expect(championAuthoringDefinition('dolea').capabilities).toEqual([]);
});
it('records a reviewed view explicitly without changing the combat profile or default readiness', () => {
  const view = championAuthoringDefinition('dolea');
  const reviewed = withChampionValidation(view, 'd38f18bb8e0c4279c9ac92883942200225f0cb94', [
    '603 A/B cases; DOLEA directed area/shield/OT/death corpus',
  ]);
  expect(reviewed.readiness.kind).toBe('validated');
  expect(view.readiness.kind).toBe('implemented');
  expect(reviewed.baseProfile).toBe(view.baseProfile);
});
