import { expect, it } from 'vitest';
import { UnitDefinitionSchema } from '@tft/shared';
import { UNIT_DEFINITIONS, getUnitDefinition } from './index';
it('ships four distinct, valid original definitions with all three reference costs', () => {
  expect(new Set(UNIT_DEFINITIONS.map((u) => u.id)).size).toBe(4);
  expect(new Set(UNIT_DEFINITIONS.map((u) => u.cost))).toEqual(new Set([1, 2, 3]));
  for (const definition of UNIT_DEFINITIONS)
    expect(UnitDefinitionSchema.parse(definition)).toEqual(definition);
  expect(getUnitDefinition('missing')).toBeUndefined();
});
