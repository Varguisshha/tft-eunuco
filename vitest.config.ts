import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: [
      'packages/**/*.test.ts',
      'apps/web/src/**/*.test.ts',
      'apps/server/src/**/*.test.ts',
      'scripts/**/*.test.mjs',
    ],
    environment: 'node',
    // Bound CPU/disk contention: the real sprite import test shares the suite with combat traces.
    maxWorkers: 4,
  },
});
