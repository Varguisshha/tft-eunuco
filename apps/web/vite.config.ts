import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { localItemArtBoundary } from './build/localItemArt';
export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  if (
    env.VITE_ACCOUNT_REGISTRATION_MODE === 'open-local' &&
    !['local', 'local-isolated'].includes(env.VITE_APP_ENV ?? '')
  )
    throw Error('Open registration preparation is restricted to LOCAL');
  const remote = ['private', 'production'].includes(env.VITE_APP_ENV ?? '');
  if (remote) {
    if (command !== 'build' || mode === 'local-test')
      throw Error('Remote builds cannot include DEV tools');
    if (!env.VITE_SUPABASE_URL?.startsWith('https://') || !env.VITE_SUPABASE_PUBLISHABLE_KEY)
      throw Error('Remote public Auth configuration required');
    if (env.VITE_GAME_SERVER_URL && !env.VITE_GAME_SERVER_URL.startsWith('https://'))
      throw Error('Remote server requires HTTPS');
  }
  for (const [key, value] of Object.entries(env))
    if (key.startsWith('VITE_') && value) {
      if (/SECRET|PASSWORD|SERVICE_ROLE|DATABASE/i.test(key) || value.startsWith('sb_secret_'))
        throw Error('Private credential in public configuration');
      if (value.startsWith('eyJ')) {
        try {
          if (
            JSON.parse(Buffer.from(value.split('.')[1] ?? '', 'base64url').toString()).role ===
            'service_role'
          )
            throw Error('Private credential');
        } catch {
          throw Error('Invalid public JWT configuration');
        }
      }
    }
  return {
    define: { __DEVTOOLS__: JSON.stringify(command === 'serve' || mode === 'local-test') },
    plugins: [react(), localItemArtBoundary(mode === 'local-test')],
    build: {
      rolldownOptions: {
        output: { codeSplitting: { groups: [{ name: 'phaser', test: /node_modules\/.*phaser/ }] } },
      },
    },
  };
});
