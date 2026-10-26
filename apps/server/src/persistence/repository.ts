import { createClient } from '@supabase/supabase-js';
import { type StoredMatch } from './snapshot';
import { encodeStoredMatch, decodeStoredMatch } from './codec';
export interface MatchRepository {
  commit(expected: number, document: StoredMatch): Promise<void>;
  load(): Promise<StoredMatch[]>;
}
/** Only the backend receives the privileged key; RPCs are server-role-only. */
export class SupabaseMatchRepository implements MatchRepository {
  private client;
  constructor(url: string, key: string) {
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(5000) }) },
    });
  }
  async commit(expected: number, document: StoredMatch) {
    const { error } = await this.client.rpc('authority_commit', {
      expected,
      document: encodeStoredMatch(document),
    });
    if (error) throw new Error('Persistence commit unavailable');
  }
  async load() {
    const { data, error } = await this.client.rpc('authority_load');
    if (error) throw new Error('Persistence recovery unavailable');
    if (!Array.isArray(data)) throw Error('Invalid recovery response');
    return data.map(decodeStoredMatch);
  }
}
