import { defineConfig } from 'vitest/config';
import ReleaseSequencer from './scripts/diagnostics/p12r2/sequencer';
export default defineConfig({
  test: {
    include: [
      'packages/**/*.test.ts',
      'apps/web/src/**/*.test.ts',
      'apps/server/src/**/*.test.ts',
      'scripts/**/*.test.mjs',
    ],
    environment: 'node',
    setupFiles:
      process.env.P12R2_DIAGNOSTICS === '1' ? ['scripts/diagnostics/p12r2/metrics.ts'] : [],
    // Bound CPU/disk contention: the real sprite import test shares the suite with combat traces.
    maxWorkers: 1,
    fileParallelism: false,
    sequence: { sequencer: ReleaseSequencer },
  },
});
