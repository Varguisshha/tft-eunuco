import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
import path from 'node:path';
const official = JSON.parse(
  readFileSync(
    new URL('../../apps/web/src/match/items/tftOfficialItemIcons.json', import.meta.url),
  ),
);
const forbiddenHashes = new Set(Object.values(official).flatMap((r) => [r.sha256, r.sourceSha256]));
export function auditBlob(name, bytes) {
  const failures = [];
  if (
    /\/tft-reference\//i.test('/' + name) ||
    forbiddenHashes.has(createHash('sha256').update(bytes).digest('hex'))
  )
    failures.push('official-reference-art');
  if (
    /(^|\/)(\.env(?:\..*)?|[^/]*\.(?:pem|key|pfx|p12))$/i.test(name) &&
    !name.endsWith('.example')
  )
    failures.push('sensitive-file');
  if (/(^|\/)(?:artifacts|node_modules|dist|dist-dev|\.approved-item-icons)\//.test(name))
    failures.push('private-or-generated-tree');
  const text = bytes.toString('utf8');
  // The only matching static secret literal is a deliberately invalid rejection-test vector.
  const withoutTestVector =
    name === 'scripts/build/public-security.test.mjs'
      ? text.replaceAll('sb_' + 'secret_' + '1234567890abcdefghijklmnop', '')
      : text;
  for (const [kind, pattern] of [
    ['supabase-secret', /sb_secret_[A-Za-z0-9_-]{16,}/],
    ['supabase-access-token', /sbp_[A-Za-z0-9]{20,}/],
    ['github-token', /(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/],
    ['jwt', /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{16,}/],
    ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ])
    if (pattern.test(withoutTestVector)) failures.push(kind);
  return failures;
}
export function verifyHistory(ref = 'HEAD') {
  const git = (...args) => execFileSync('git', args, { maxBuffer: 512 * 1024 * 1024 });
  const rows = git('rev-list', '--objects', ref)
    .toString()
    .trim()
    .split('\n')
    .map((line) => {
      const [oid, ...parts] = line.split(' ');
      return { oid, name: parts.join(' ') };
    });
  const data = execFileSync('git', ['cat-file', '--batch'], {
    input: rows.map((r) => r.oid).join('\n') + '\n',
    maxBuffer: 512 * 1024 * 1024,
  });
  let offset = 0,
    blobs = 0;
  const failures = [];
  for (const row of rows) {
    const end = data.indexOf(10, offset),
      header = data.subarray(offset, end).toString().split(' ');
    const length = Number(header[2]);
    offset = end + 1;
    if (header[1] === 'blob') {
      blobs++;
      const kinds = auditBlob(row.name, data.subarray(offset, offset + length));
      if (kinds.length) failures.push({ path: row.name, blob: row.oid, kinds });
    }
    offset += length + 1;
  }
  const result = { commit: git('rev-parse', ref).toString().trim(), blobs, failures };
  if (failures.length)
    throw Object.assign(Error('Public release boundary failed; credential values suppressed'), {
      result,
    });
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(verifyHistory(process.argv[2] ?? 'HEAD')));
  } catch (error) {
    console.error(
      JSON.stringify(error.result ?? { error: 'Release audit failed; values suppressed' }),
    );
    process.exitCode = 1;
  }
}
