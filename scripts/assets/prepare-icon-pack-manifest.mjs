/** Metadata only. This proposal grants no approval and never copies/downloads image bytes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import console from 'node:console';
import process from 'node:process';
import { sha256 } from './item-icon-pack.mjs';
const [id, output, ...extra] = process.argv.slice(2);
if (!id || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id) || !output || extra.length)
  throw Error('Usage: node scripts/assets/prepare-icon-pack-manifest.mjs PACK_ID NEW_JSON');
const root = fileURLToPath(new URL('../..', import.meta.url));
const reference = JSON.parse(
  await fs.readFile(path.join(root, 'apps/web/src/match/items/tftOfficialItemIcons.json'), 'utf8'),
);
const assets = Object.values(reference).map((a) => ({
  iconKey: a.iconKey,
  internalId: a.internalId,
  tftId: a.tftId,
  visibleName: a.visibleName,
  kind: a.kind,
  recipe: a.recipe,
  file: a.src.slice(1),
  sha256: a.sha256,
  width: a.width,
  height: a.height,
  format: 'webp',
}));
const json = JSON.stringify({ version: 1, id, assets }, null, 2) + '\n';
await fs.writeFile(output, json, { flag: 'wx' });
console.log(
  JSON.stringify({
    id,
    associations: assets.length,
    manifestSha256: sha256(json),
    approved: false,
    imagesCopied: 0,
  }),
);
