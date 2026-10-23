import console from 'node:console';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = 'apps/web/dist/assets';
const forbidden = [
  'tft-eunuco-isolated-dev-f0p6b3',
  'dev-unit-',
  'Laboratorio de partida',
  'DevelopmentCommandSchema',
  'Identificador reutilizado con otro comando',
];
for (const file of await fs.readdir(root))
  if (file.endsWith('.js')) {
    const text = await fs.readFile(path.join(root, file), 'utf8');
    for (const token of forbidden)
      if (text.includes(token))
        throw new Error(`Public build contains DEV tooling: ${file} / ${token}`);
    if (file.includes('DevelopmentAccess')) throw new Error('Public DEV chunk');
  }
console.log('Public bundle: no DEV controller, panel, command schema or isolated storage code.');
