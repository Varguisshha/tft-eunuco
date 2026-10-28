import { defineRailway, project, service, preserve } from 'railway/iac';
/** Offline-reviewed intent. Applying this file is a separate, authorized P9B action. */
export default defineRailway(() =>
  project('TFT EUNUCO', {
    resources: [
      service('tft-eunuco', {
        rootDirectory: '/',
        build: {
          builder: 'RAILPACK',
          buildCommand:
            'pnpm install --frozen-lockfile --prod=false && pnpm build && pnpm verify:public',
        },
        start: 'node apps/server/dist/main.js',
        healthcheck: '/readyz',
        healthcheckTimeout: 120,
        replicas: 1,
        deploy: {
          sleepApplication: false,
          restartPolicyType: 'ON_FAILURE',
          restartPolicyMaxRetries: 3,
          overlapSeconds: 0,
          drainingSeconds: 35,
          limitOverride: { containers: { memoryBytes: 2147483648, cpu: 2 } },
        },
        networking: { tcpProxies: {} },
        tracing: { enabled: false, autoInstrumentation: false },
        cdn: { enabled: false },
        env: {
          NODE_ENV: 'production',
          TFT_ENV: 'private',
          HOST: '0.0.0.0',
          TFT_PROXY_MODE: 'railway',
          TFT_FINAL_RETENTION_MS: '300000',
          TFT_STATIC_DIR: 'apps/web/dist',
          RAILPACK_NODE_VERSION: '26.9.0',
          RAILPACK_NO_SPA: '1',
          NODE_OPTIONS: '--max-old-space-size=1280',
          VITE_APP_ENV: 'private',
          TFT_PUBLIC_URL: preserve(),
          TFT_ALLOWED_ORIGINS: preserve(),
          SUPABASE_URL: preserve(),
          SUPABASE_PUBLISHABLE_KEY: preserve(),
          SUPABASE_SERVICE_ROLE_KEY: preserve(),
          VITE_SUPABASE_URL: preserve(),
          VITE_SUPABASE_PUBLISHABLE_KEY: preserve(),
        },
      }),
    ],
  }),
);
