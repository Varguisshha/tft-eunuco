import process from 'node:process';
import console from 'node:console';
import path from 'node:path';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { assertEquivalent, firstDifference } from './compare.mjs';

export const REFERENCE = 'd38f18bb8e0c4279c9ac92883942200225f0cb94';
const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const out = path.join(root, 'artifacts/p13b/equivalence');
const source = path.join(out, 'reference/source');
const require = createRequire(new URL('../../apps/server/package.json', import.meta.url));
const { build } = require('esbuild');
const clone = globalThis.structuredClone;
const hashSources = (values) => createHash('sha256').update(JSON.stringify(values)).digest('hex');
const hash = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
mkdirSync(out, { recursive: true });
// Always reconstruct from the exact local Git object; a stale cache cannot become the oracle.
rmSync(source, { recursive: true, force: true });
mkdirSync(source, { recursive: true });
const archive = execFileSync(
  'git',
  ['archive', '--format=tar', REFERENCE, 'packages', 'apps/server/src'],
  { cwd: root, maxBuffer: 64 * 1024 * 1024 },
);
execFileSync('tar', ['-xf', '-', '-C', source], { input: archive });
const provenance = {
  reference: REFERENCE,
  candidate: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(),
  implementations: [],
};
for (const [name, dir] of [
  ['reference', source],
  ['candidate', root],
]) {
  const aliases = Object.fromEntries(
    ['shared', 'game-core', 'game-data'].map((p) => [
      `@tft/${p}`,
      path.join(dir, `packages/${p}/src/index.ts`),
    ]),
  );
  Object.assign(aliases, {
    '@equivalence/authority': path.join(dir, 'apps/server/src/AuthoritativeMatch.ts'),
    '@equivalence/snapshot': path.join(dir, 'apps/server/src/persistence/snapshot.ts'),
    '@equivalence/codec': path.join(dir, 'apps/server/src/persistence/codec.ts'),
    '@equivalence/historical-saves': path.join(
      source,
      'packages/game-core/src/combat/fixtures/pre-p6b1-saves.json',
    ),
  });
  const built = await build({
    absWorkingDir: root,
    entryPoints: ['scripts/champion-equivalence/entry.ts'],
    outfile: path.join(out, `${name}.mjs`),
    bundle: true,
    platform: 'node',
    format: 'esm',
    metafile: true,
    alias: aliases,
    nodePaths: [
      path.join(root, 'node_modules/.pnpm/node_modules'),
      path.join(root, 'packages/shared/node_modules'),
      path.join(root, 'apps/server/node_modules'),
    ],
    logLevel: 'silent',
  });
  const engine = Object.keys(built.metafile.inputs).find((p) =>
    p.endsWith('game-core/src/combat/engine.ts'),
  );
  const resolved = path.resolve(root, engine);
  if (!resolved.startsWith(dir + path.sep)) throw Error('Implementation boundary mismatch');
  const moduleSources = Object.keys(built.metafile.inputs)
    .map((p) => path.resolve(root, p))
    .filter((p) => !p.includes('/node_modules/'))
    .map((p) => {
      if (
        p.includes('/packages/') &&
        !p.startsWith(dir + path.sep) &&
        p !== aliases['@equivalence/historical-saves']
      )
        throw Error('Mixed source genealogy');
      return {
        path: path.relative(root, p),
        sha256: createHash('sha256').update(readFileSync(p)).digest('hex'),
      };
    });
  provenance.implementations.push({
    name,
    engine: resolved,
    moduleSources,
    sourceDigest: hashSources(moduleSources),
    bundleSha256: createHash('sha256')
      .update(readFileSync(path.join(out, `${name}.mjs`)))
      .digest('hex'),
  });
}
writeFileSync(path.join(out, 'provenance.json'), JSON.stringify(provenance, null, 2));
const A = await import(pathToFileURL(path.join(out, 'reference.mjs')).href);
const B = await import(pathToFileURL(path.join(out, 'candidate.mjs')).href);
const report = {
  reference: REFERENCE,
  candidate: provenance.candidate,
  quick: process.argv.includes('--quick'),
  manifest: false,
  aa: 0,
  ab: 0,
  sensitivity: [],
  restores: 0,
  progressCases: 0,
  coverage: {},
  timingMs: [],
  cases: [],
};
const manifestA = A.manifest();
assertEquivalent(
  manifestA,
  B.manifest(),
  'all definitions, profiles, presentation, scaled profiles and fingerprints',
);
if (Object.keys(manifestA.fingerprints).length !== 19 || manifestA.definitions.length !== 34)
  throw Error('Incomplete baseline contracts');
report.manifest = true;
report.fingerprints = manifestA.fingerprints;
writeFileSync(path.join(out, 'baseline-contracts.json'), JSON.stringify(manifestA, null, 2));
const complete = ['dolea', 'vargas', 'jaramillo', 'florin'];
const cases = [];
for (const champion of complete)
  for (const stars of [1, 2, 3])
    for (const side of ['south', 'north']) {
      cases.push(
        { kind: 'natural', champion, stars, side, seed: 42 },
        { kind: 'equipment', champion, stars, side, seed: 73 },
      );
    }
for (const champion of complete)
  for (const stars of [1, 2, 3])
    cases.push({ kind: 'ghost', champion, stars, side: 'north', seed: 122 });
for (const kind of ['dolea-area', 'dolea-threshold', 'dolea-overtime', 'dolea-death'])
  for (const stars of [1, 2, 3])
    for (const side of ['south', 'north'])
      cases.push({ kind, champion: 'dolea', stars, side, seed: 42 });
for (const stars of [1, 2, 3])
  for (const side of ['south', 'north'])
    cases.push({ kind: 'florin-recovery', champion: 'florin', stars, side, seed: 42 });
cases.push({ kind: 'overtime', champion: 'dolea', stars: 1, side: 'south', seed: 42 });
const seeds = report.quick ? [1, 42] : Array.from({ length: 128 }, (_, i) => i + 1);
for (const champion of complete)
  for (const seed of seeds)
    cases.push({
      kind: 'natural',
      champion,
      stars: 1 + (seed % 3),
      side: seed % 2 ? 'north' : 'south',
      seed,
    });
const start = performance.now();
function observe(replay) {
  for (const e of replay.events) report.coverage[e.type] = (report.coverage[e.type] ?? 0) + 1;
}
function doleaContract(request, replay) {
  const { kind, stars } = request;
  if (!kind.startsWith('dolea-')) return;
  const shield = replay.events.filter(
    (e) => e.type === 'shield_apply' && e.payload.unitId === 'subject',
  );
  if (kind === 'dolea-area') {
    const damage = replay.events.filter(
      (e) =>
        e.type === 'damage' && e.payload.sourceId === 'subject' && e.payload.cause === 'ability',
    );
    if (
      damage.length !== 2 ||
      damage.some(
        (e) =>
          e.payload.damageType !== 'physical' ||
          e.payload.accounting.requested !== [100, 180, 324][stars - 1],
      )
    )
      throw Error('DOLEA baseline area contract differs');
    const armor = replay.events.find(
      (e) => e.type === 'status_apply' && e.payload.status.key === 'press-armor',
    );
    if (
      !armor ||
      armor.payload.status.amount !== 20 ||
      armor.payload.status.expiresTick - armor.tick !== 40
    )
      throw Error('DOLEA baseline armor contract differs');
    if (
      !replay.events.some(
        (e) =>
          e.type === 'status_expire' &&
          e.payload.statusId === armor.payload.status.id &&
          e.payload.reason === 'duration',
      )
    )
      throw Error('DOLEA armor did not expire');
    const firstDamage = damage[0];
    if (armor.tick !== firstDamage.tick || armor.order >= firstDamage.order)
      throw Error('DOLEA support ordering changed');
  } else if (kind === 'dolea-death') {
    if (
      shield.length ||
      !replay.events.some((e) => e.type === 'unit_death' && e.payload.unitId === 'subject')
    )
      throw Error('DOLEA lethal boundary differs');
  } else {
    if (shield.length !== 1)
      throw Error(
        `DOLEA shield activation differs: ${JSON.stringify(request)}, count=${shield.length}`,
      );
    const e = shield[0],
      u = replay.input.units.find((u) => u.id === 'subject');
    const amount = Math.floor(
      (Math.floor((u.profile.stats.maxHp * 120) / 1000) *
        (e.tick < 300 ? 1000 : Math.floor((800 * (449 - e.tick) + 400 * (e.tick - 300)) / 149))) /
        1000,
    );
    if (e.payload.status.amount !== amount || e.payload.status.expiresTick - e.tick !== 450)
      throw Error(
        `DOLEA shield amount/duration differs: ${JSON.stringify(request)} tick=${e.tick} actual=${e.payload.status.amount} expected=${amount}`,
      );
    const crossing = replay.events.find(
      (x) =>
        x.type === 'damage' &&
        x.payload.targetId === 'subject' &&
        x.tick === e.tick &&
        x.payload.hpAfter * 2 < u.profile.stats.maxHp &&
        (x.payload.hpAfter + x.payload.amount) * 2 >= u.profile.stats.maxHp,
    );
    if (!crossing) throw Error('DOLEA shield requires the actual health crossing');
  }
}
for (const [i, c] of cases.entries()) {
  const name = `${i}/${c.kind}/${c.champion}/${c.stars}/${c.side}/${c.seed}`;
  const input = A.fixture(c);
  assertEquivalent(input, B.fixture(c), name + '/input');
  const t = performance.now(),
    a = A.simulate(clone(input)),
    aa = A.simulate(clone(input));
  assertEquivalent(a, aa, name + '/A-A');
  report.aa++;
  const b = B.simulate(clone(input));
  assertEquivalent(a, b, name + '/A-B');
  report.ab++;
  doleaContract(c, a);
  doleaContract(c, b);
  observe(b);
  if (!report.sensitivity.length && a.events.some((e) => e.type === 'damage')) {
    for (const category of ['event', 'state']) {
      const changed = clone(a);
      if (category === 'event') changed.events.find((e) => e.type === 'damage').payload.amount++;
      else changed.snapshots[1].units[0].hp--;
      assertEquivalent(a.result, changed.result, 'sensitivity preserves winner/result');
      const diff = firstDifference(a, changed);
      if (!diff || diff.tick === null) throw Error('Insensitive comparator');
      report.sensitivity.push({ category, path: diff.path, tick: diff.tick });
    }
  }
  report.timingMs.push(performance.now() - t);
  report.cases.push({ name, hash: hash(a), ticks: a.result.tick, eventCount: a.events.length });
  if (i % 25 === 0)
    console.log(
      JSON.stringify({
        completed: i + 1,
        total: cases.length,
        elapsedSeconds: Math.round((performance.now() - start) / 1000),
      }),
    );
}
for (const seed of [1, 42, 128]) {
  const a = A.progress(seed);
  assertEquivalent(a, B.progress(seed), 'persistent progression');
  report.progressCases++;
}
assertEquivalent(A.historical(), B.historical(), 'historical match restore and replays');
const configs = [
  'VARGAS_ECONOMY_CONFIG',
  'JARAMILLO_ECONOMY_CONFIG',
  'ITEMS_ECONOMY_CONFIG',
  'STANDARD_ITEMS_ECONOMY_CONFIG',
  'EFFECT_ITEMS_ECONOMY_CONFIG',
  'DROP_ITEMS_ECONOMY_CONFIG',
  'FLORIN_ECONOMY_CONFIG',
  'INTEGRATED_ECONOMY_CONFIG',
  'TFT_POOL_ECONOMY_CONFIG',
  'ROSTER_ECONOMY_CONFIG',
  'P11_ECONOMY_CONFIG',
  'P11B_ECONOMY_CONFIG',
  'P11C_ECONOMY_CONFIG',
  'P11G_ECONOMY_CONFIG',
  'P11H_ECONOMY_CONFIG',
  'P11K_ECONOMY_CONFIG',
  'P12B_ECONOMY_CONFIG',
  'P12D_ECONOMY_CONFIG',
  'P12F_ECONOMY_CONFIG',
];
for (const config of configs) {
  const input = A.authorityInput(config, 42);
  const a = A.restoreAuthority(clone(input));
  assertEquivalent(a, A.restoreAuthority(clone(input)), config + '/A-A restore');
  assertEquivalent(
    a,
    B.restoreAuthority(clone(input)),
    config + '/A-B restore, codec and authority',
  );
  report.restores++;
}
for (const name of [
  'shield_apply',
  'heal',
  'projectile_launch',
  'unit_presence',
  'stack_gain',
  'overtime_start',
  'status_expire',
  'unit_death',
])
  if (!report.coverage[name]) throw Error(`Missing exercised capability: ${name}`);
report.elapsedMs = performance.now() - start;
report.passed = true;
writeFileSync(path.join(out, 'result.json'), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    passed: true,
    aa: report.aa,
    ab: report.ab,
    restores: report.restores,
    progress: report.progressCases,
    elapsedSeconds: Math.round(report.elapsedMs / 1000),
    sensitivity: report.sensitivity,
    coverage: report.coverage,
  }),
);
