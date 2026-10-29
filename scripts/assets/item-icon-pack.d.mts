import type { IncomingMessage, ServerResponse } from 'node:http';
import type { IconResourcePolicy } from '../../apps/web/src/match/items/iconResourcePolicy';
export interface ResourcePlan {
  verificationRoot: string;
  policy: IconResourcePolicy;
  files: { src: string; bytes: Uint8Array }[];
  missing: string[];
  manifest: Record<string, unknown>;
}
export function createIconResourcePlan(options?: {
  root?: string;
  local?: boolean;
  theme?: string;
  packId?: string;
  packRoot?: string;
  referenceRoot?: string;
}): Promise<ResourcePlan>;
export function verifyIconBuildOutput(
  output: string,
  options?: { root?: string },
): Promise<{ originals: number; authorized: number; officialLocal: number }>;
export function approvedPack(
  id: string,
  options?: { root?: string; sourceRoot?: string },
): Promise<unknown>;
export function stageApprovedIconPack(
  id: string,
  sourceRoot: string,
  destination: string,
  options?: { root?: string },
): Promise<unknown>;
export function sha256(bytes: Uint8Array | string): string;

export function iconResourceMiddleware(
  plan: ResourcePlan,
): (req: IncomingMessage, res: ServerResponse, next: () => void) => void;
