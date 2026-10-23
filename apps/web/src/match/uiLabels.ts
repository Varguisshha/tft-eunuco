import { getTraitDefinition } from '@tft/game-data';
export const synergyLabel = (id: string) =>
  getTraitDefinition(id)?.name ??
  { 'test-alloy': 'Aleación', 'test-pulse': 'Pulso', 'prototype-neutral': 'Provisional' }[id] ??
  id;
