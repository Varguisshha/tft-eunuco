import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { createAbilityScenario, createCombatScenario } from '@tft/game-data';
import { MatchStateSchema } from '@tft/shared';
import traces from './fixtures/pre-p6b1-traces.json';
import saves from './fixtures/pre-p6b1-saves.json';
import { runCombat } from './engine';
import { replayMatch } from '../match/engine';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
describe('pre-P6B.1 immutable traces captured before engine changes', () => {
  it.each(traces.cases)(
    '$scenario seed $seed preserves every event, snapshot and PRNG byte',
    ({ scenario, seed, hash: expected }) => {
      expect(
        hash(
          runCombat(
            createAbilityScenario(scenario as Parameters<typeof createAbilityScenario>[0], seed),
          ),
        ),
      ).toBe(expected);
    },
  );
  it.each(traces.legacy)(
    'legacy $scenario remains identical',
    ({ scenario, seed, hash: expected }) => {
      expect(
        hash(
          runCombat(
            createCombatScenario(scenario as Parameters<typeof createCombatScenario>[0], seed),
          ),
        ),
      ).toBe(expected);
    },
  );
  it.each(saves)('restores a captured old match using its original config/history', (fixture) => {
    const state = MatchStateSchema.parse(JSON.parse(fixture.text));
    expect(hash(state)).toBe(fixture.hash);
    expect(replayMatch(state.seed, state.history, state.config)).toEqual(state);
    expect(hash(runCombat(state.combat!.input))).toBe(fixture.trace);
  });
});
