import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command, mode }) => ({
  define: { __DEVTOOLS__: JSON.stringify(command === 'serve' || mode === 'local-test') },
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: { codeSplitting: { groups: [{ name: 'phaser', test: /node_modules\/.*phaser/ }] } },
    },
  },
}));
