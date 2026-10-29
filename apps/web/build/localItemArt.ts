import type { Plugin, ResolvedConfig } from 'vite';
import { rm } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import {
  verifyIconBuildOutput,
  iconResourceMiddleware,
  type ResourcePlan,
} from '../../../scripts/assets/item-icon-pack.mjs';
/** A single verified plan drives dev serving, LOCAL builds and public artifacts. */
export function itemIconResourcePlugin(plan: ResourcePlan, local: boolean): Plugin {
  let config: ResolvedConfig;
  const resources = new Map(plan.files.map((f) => [f.src, f.bytes]));
  return {
    name: 'item-icon-resource-policy',
    configResolved(value) {
      config = value;
      const output = resolve(config.root, config.build.outDir);
      if (output === resolve(config.root, 'public') || output === config.root)
        throw Error('Unsafe icon build output');
    },
    configureServer(server) {
      server.middlewares.use(iconResourceMiddleware(plan));
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'item-icon-resources.json',
        source: JSON.stringify(plan.manifest),
      });
      for (const [src, bytes] of resources)
        this.emitFile({ type: 'asset', fileName: src.slice(1), source: bytes });
    },
    async closeBundle() {
      if (local || config.command !== 'build') return;
      const output = resolve(config.root, config.build.outDir),
        target = resolve(output, 'assets/items/tft-reference');
      const scope = relative(output, target);
      if (scope.startsWith('..') || isAbsolute(scope)) throw Error('Unsafe reference art boundary');
      // Preserve private sources while removing any legacy publicDir copy from this public output.
      await rm(target, { recursive: true, force: true });
      await verifyIconBuildOutput(output, { root: plan.verificationRoot });
    },
  };
}
