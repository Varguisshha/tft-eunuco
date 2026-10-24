import { getTraitDefinition } from '@tft/game-data';
export const synergyLabel = (id: string) =>
  ({
    hortaleza: 'Hortaleza',
    'llama-de-padel': 'Llama de Pádel',
    'el-depredador': 'El Depredador',
    upm: 'UPM',
  })[id] ??
  getTraitDefinition(id)?.name ??
  { 'test-alloy': 'Aleación', 'test-pulse': 'Pulso', 'prototype-neutral': 'Provisional' }[id] ??
  id;
