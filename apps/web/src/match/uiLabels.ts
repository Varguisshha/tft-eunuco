export const synergyLabel = (id: string) =>
  ({ 'test-alloy': 'Aleación', 'test-pulse': 'Pulso', 'prototype-neutral': 'Provisional' })[id] ??
  id;
