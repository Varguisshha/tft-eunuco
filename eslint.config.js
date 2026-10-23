import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-dev/**',
      '**/node_modules/**',
      'artifacts/**',
      '.impeccable/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['packages/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react/*', 'phaser', 'phaser/*', '**/apps/**'] },
      ],
    },
  },
  {
    files: ['packages/shared/**/*.ts', 'packages/sprite-contract/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'react',
            'react/*',
            'phaser',
            'phaser/*',
            '**/apps/**',
            '@tft/game-core',
            '@tft/game-data',
          ],
        },
      ],
    },
  },
);
