import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import console from 'node:console';
import { createHash } from 'node:crypto';
const publicRoot = 'apps/web/public',
  buildRoot = 'apps/web/dist';
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const files = walk(publicRoot),
  hash = (b) => createHash('sha256').update(b).digest('hex');
for (const source of files) {
  const dest = path.join(buildRoot, path.relative(publicRoot, source));
  assert.equal(hash(fs.readFileSync(dest)), hash(fs.readFileSync(source)), source);
}
const catalog = JSON.parse(fs.readFileSync('apps/web/src/assets/characters.json', 'utf8'));
let textures = 0;
function inspect(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, v] of Object.entries(value)) {
    if (key === 'url' && typeof v === 'string' && v.startsWith('/sprites/')) {
      assert.ok(fs.existsSync(buildRoot + v), v);
      textures++;
    } else inspect(v);
  }
}
inspect(catalog);
for (const id of ['dolea', 'vargas', 'florin', 'jaramillo'])
  assert.ok(fs.existsSync(`${buildRoot}/assets/splash/${id}.webp`));
assert.match(
  fs.readFileSync(publicRoot + '/assets/fonts/bungee-OFL.txt', 'utf8'),
  /SIL Open Font License/,
);
console.log(
  JSON.stringify({
    publicFiles: files.length,
    textureReferences: textures,
    characters: catalog.map((c) => c.id),
    bytes: files.reduce((n, f) => n + fs.statSync(f).size, 0),
    fontSha256: hash(fs.readFileSync(publicRoot + '/assets/fonts/bungee.ttf')),
    identicalBuildAssets: true,
  }),
);
