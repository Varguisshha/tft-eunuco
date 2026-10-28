import { it, expect } from 'vitest';
import { Buffer } from 'node:buffer';
import { auditBlob } from './verify-public-safe.mjs';
it('rejects official paths, sensitive files and generated contexts in any historical blob', () => {
  expect(auditBlob('elsewhere/tft-reference/copied.webp', Buffer.from('image'))).toContain(
    'official-reference-art',
  );
  for (const p of ['.env', 'nested/.env.local', 'tls/client.pem'])
    expect(auditBlob(p, Buffer.from('value'))).toContain('sensitive-file');
  for (const p of ['artifacts/private.json', 'apps/web/dist/index.html'])
    expect(auditBlob(p, Buffer.from('value'))).toContain('private-or-generated-tree');
  expect(auditBlob('infra/.env.example', Buffer.from('SUPABASE_SERVICE_ROLE_KEY='))).toEqual([]);
});
it('rejects credentials without returning their value and permits only the exact invalid test vector in its test', () => {
  const key = 'sb_' + 'secret_' + 'x'.repeat(30);
  const findings = auditBlob('safe.ts', Buffer.from(key));
  expect(findings).toEqual(['supabase-secret']);
  expect(JSON.stringify(findings)).not.toContain(key);
  expect(auditBlob('scripts/build/public-security.test.mjs', Buffer.from(key))).toEqual([
    'supabase-secret',
  ]);
});
