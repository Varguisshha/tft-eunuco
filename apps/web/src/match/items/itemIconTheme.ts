import { useSyncExternalStore } from 'react';
export type ItemIconTheme = 'eunuco' | 'tft-reference';
export const localItemArtEnabled = typeof __DEVTOOLS__ !== 'undefined' && __DEVTOOLS__;
let settings = {
  theme: (localItemArtEnabled ? 'tft-reference' : 'eunuco') as ItemIconTheme,
  simulateMissingOfficial: false,
};
const listeners = new Set<() => void>();
export const getItemIconSettings = () => settings;
export function setItemIconTheme(theme: ItemIconTheme, simulateMissingOfficial = false) {
  if (!localItemArtEnabled && (theme !== 'eunuco' || simulateMissingOfficial))
    throw Error('Official item artwork is restricted to LOCAL');
  settings = { theme, simulateMissingOfficial };
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export const useItemIconSettings = () =>
  useSyncExternalStore(subscribe, getItemIconSettings, getItemIconSettings);
