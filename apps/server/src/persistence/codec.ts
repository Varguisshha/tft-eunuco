import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { StoredMatchSchema, EFFECT_ITEM_CATALOG_HASH, type StoredMatch } from './snapshot';
// SQL's existing 16 MiB envelope limit remains unchanged. Decode has its own hard budget.
const MAX_RAW = 128 * 1024 * 1024;
const Packed = z.strictObject({
  version: z.literal(1),
  codec: z.literal('gzip-base64'),
  bytes: z.number().int().min(2).max(MAX_RAW),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  data: z
    .string()
    .max(12 * 1024 * 1024)
    .regex(/^[A-Za-z0-9+/]*={0,2}$/),
});
const digest = (data: Buffer) => createHash('sha256').update(data).digest('hex');
export function encodeStoredMatch(document: StoredMatch) {
  if (document.authority.catalog !== EFFECT_ITEM_CATALOG_HASH || !document.authority.duels.length)
    return document;
  const raw = Buffer.from(JSON.stringify(document.authority.duels));
  if (raw.length > MAX_RAW) throw Error('Replay persistence decode budget exceeded');
  const packedDuels = Packed.parse({
    version: 1,
    codec: 'gzip-base64',
    bytes: raw.length,
    sha256: digest(raw),
    data: gzipSync(raw, { level: 6 }).toString('base64'),
  });
  return { ...document, authority: { ...document.authority, duels: [], packedDuels } };
}
export function decodeStoredMatch(raw: unknown): StoredMatch {
  if (!raw || typeof raw !== 'object' || !('authority' in raw)) return StoredMatchSchema.parse(raw);
  const authority = raw.authority;
  if (!authority || typeof authority !== 'object' || !('packedDuels' in authority))
    return StoredMatchSchema.parse(raw);
  if (
    !('catalog' in authority) ||
    authority.catalog !== EFFECT_ITEM_CATALOG_HASH ||
    !('duels' in authority) ||
    !Array.isArray(authority.duels) ||
    authority.duels.length
  )
    throw Error('Invalid packed replay envelope');
  const packed = Packed.parse(authority.packedDuels);
  const bytes = gunzipSync(Buffer.from(packed.data, 'base64'), {
    maxOutputLength: Math.min(MAX_RAW, packed.bytes),
  });
  if (bytes.length !== packed.bytes || digest(bytes) !== packed.sha256)
    throw Error('Replay integrity mismatch');
  const { packedDuels: _packed, ...rest } = authority;
  void _packed;
  return StoredMatchSchema.parse({
    ...raw,
    authority: { ...rest, duels: JSON.parse(bytes.toString('utf8')) },
  });
}
