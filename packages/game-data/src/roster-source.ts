import source from './roster-excel-source.json';
/** Exact cell-level source extraction; no balancing decisions are imported from Excel. */
export const ROSTER_SOURCE = source;
export const ROSTER_VERSION = 'f0p10a-1' as const;
export const PLAYABLE_ROSTER_IDS = ['dolea', 'vargas', 'jaramillo', 'florin'] as const;
export const rosterIdentity = (id: string) => ROSTER_SOURCE.characters.find((c) => c.id === id);
