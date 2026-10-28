import type { Plugin, ResolvedConfig } from 'vite';
import { rm } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
/** Reference artwork is a LOCAL review asset, never part of a public distribution. */
export function localItemArtBoundary(local: boolean): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'local-item-art-boundary',
    apply: 'build',
    configResolved(value) {
      config = value;
    },
    async closeBundle() {
      if (local) return;
      const output = resolve(config.root, config.build.outDir);
      const target = resolve(output, 'assets/items/tft-reference');
      const scope = relative(output, target);
      if (scope.startsWith('..') || isAbsolute(scope) || output === resolve(config.root, 'public'))
        throw Error('Unsafe build output boundary');
      await rm(target, { recursive: true, force: true });
    },
  };
}
