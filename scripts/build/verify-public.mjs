import console from 'node:console';
import { assertPublicCredentials } from './public-security.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = 'apps/web/dist/assets';
const forbidden = [
  'tft-r2-local-only',
  '/assets/items/tft-reference/',
  '/__local/identity',
  'LOCAL · Acceso de diagnóstico',
  'tft-eunuco-isolated-dev-f0p6b3',
  'dev-unit-',
  'Laboratorio de partida',
  'DevelopmentCommandSchema',
  'dev-florin-',
  'dev-p10a-',
  'Galería P10A',
  'Referencia P10A · cuatro personajes',
  'Prueba FLORIN',
  'florin-reference-',
  'P9A_SIGNING_KEY',
  'authority_fenced_commit',
  'authority_lease_acquire',
  'P9B_FIXTURE_KEY',
  'p9b-local-only',
  'p9a-local-only',
  'SUPABASE_SERVICE_ROLE_KEY',
  'Persistence commit unavailable',
  'Identificador reutilizado con otro comando',
];
for (const file of await fs.readdir(root))
  if (file.endsWith('.js')) {
    const text = await fs.readFile(path.join(root, file), 'utf8');
    assertPublicCredentials(text);
    for (const token of forbidden)
      if (text.includes(token))
        throw new Error(`Public build contains DEV tooling: ${file} / ${token}`);
    if (file.includes('DevelopmentAccess')) throw new Error('Public DEV chunk');
  }
try {
  await fs.access('apps/web/dist/assets/items/tft-reference');
  throw Error('LOCAL-only reference item art in public build');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
console.log('Public bundle: no DEV controller, panel, command schema or isolated storage code.');
