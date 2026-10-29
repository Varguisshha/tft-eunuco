import { useSyncExternalStore } from 'react';
import { getIconResourcePolicy, themeAllowed, type ItemIconTheme } from './iconResourcePolicy';
export type { ItemIconTheme } from './iconResourcePolicy';
export const localItemArtEnabled = !!getIconResourcePolicy().packages['tft-reference'];
let settings = {
  theme: getIconResourcePolicy().defaultTheme,
  simulateMissingOfficial: false,
};
const listeners = new Set<() => void>();
export const getItemIconSettings = () => settings;
export function setItemIconTheme(theme: ItemIconTheme, simulateMissingOfficial = false) {
  const policy = getIconResourcePolicy();
  if (!themeAllowed(policy, theme) || (simulateMissingOfficial && !policy.allowSimulation))
    throw Error('Item artwork is not permitted by this resource configuration');
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
