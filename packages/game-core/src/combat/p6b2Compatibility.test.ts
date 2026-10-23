import { it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { createMechanicsScenario, type MechanicsScenario } from '@tft/game-data';
import { runCombat } from './engine';
import cases from './fixtures/pre-p6b3.json';
it.each(cases)('preserves B2 $name byte for byte', ({ name, seed, hash }) => {
  expect(
    createHash('sha256')
      .update(JSON.stringify(runCombat(createMechanicsScenario(name as MechanicsScenario, seed))))
      .digest('hex'),
  ).toBe(hash);
});
