export const FLORIN_FRAMES: readonly (readonly string[])[];
export function importFlorin(root: string): Promise<{ manifest: unknown; report: unknown[] }>;
