import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { itemIconResourcePlugin } from './build/localItemArt';
import { createIconResourcePlan } from '../../scripts/assets/item-icon-pack.mjs';
export default defineConfig(async ({ command, mode }) => {
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
  const localMode = command === 'serve' || mode === 'local-test';
  const assetEnvironment = env.TFT_ITEM_ICON_ENV ?? (localMode ? 'local' : 'public');
  if (
    !['local', 'public'].includes(assetEnvironment) ||
    (assetEnvironment === 'local' && (!localMode || remote))
  )
    throw Error('LOCAL icon resources cannot be enabled in a public build');
  const localAssets = assetEnvironment === 'local';
  const resourcePlan = await createIconResourcePlan({
    local: localAssets,
    ...(env.TFT_ITEM_ICON_THEME ? { theme: env.TFT_ITEM_ICON_THEME } : {}),
    ...(env.TFT_ITEM_ICON_PACK_ID ? { packId: env.TFT_ITEM_ICON_PACK_ID } : {}),
    ...(env.TFT_ITEM_ICON_PACK_ROOT ? { packRoot: env.TFT_ITEM_ICON_PACK_ROOT } : {}),
    ...(env.TFT_REFERENCE_ART_ROOT ? { referenceRoot: env.TFT_REFERENCE_ART_ROOT } : {}),
  });
  return {
    define: {
      __DEVTOOLS__: JSON.stringify(localMode),
      __ITEM_ICON_RESOURCES__: JSON.stringify(resourcePlan.policy),
    },
    plugins: [react(), itemIconResourcePlugin(resourcePlan, localAssets)],
    build: {
      rolldownOptions: {
        output: { codeSplitting: { groups: [{ name: 'phaser', test: /node_modules\/.*phaser/ }] } },
      },
    },
  };
});
