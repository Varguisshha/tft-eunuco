import { AuthorityLease } from '../remote/authorityLease';
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
  private lease?: AuthorityLease;
  async acquireAuthority(onLost: () => void) {
    const lease = new AuthorityLease(async (operation, owner) => {
      const { data, error } = await this.client.rpc(`authority_lease_${operation}`, {
        lease_owner: owner,
      });
      if (error) throw Error('Authority storage unavailable');
      return data === true;
    }, onLost);
    await lease.acquire();
    this.lease = lease;
    return lease;
  }
  async probeLease() {
    const { data, error } = await this.client.rpc('authority_lease_health');
    if (error || data !== true) throw Error('Authority migration unavailable');
  }
  constructor(url: string, key: string) {
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(5000) }) },
    });
  }
  async probe() {
    const { data, error } = await this.client.rpc('authority_health');
    if (error || data !== true) throw Error('Persistence unavailable');
  }
  async commit(expected: number, document: StoredMatch) {
    this.lease?.assert();
    const { error } = await this.client.rpc(
      this.lease ? 'authority_fenced_commit' : 'authority_commit',
      {
        ...(this.lease ? { lease_owner: this.lease.owner } : {}),
        expected,
        document: encodeStoredMatch(document),
      },
    );
    if (error) throw new Error('Persistence commit unavailable');
  }
  async load() {
    const { data, error } = await this.client.rpc('authority_load');
    if (error) throw new Error('Persistence recovery unavailable');
    if (!Array.isArray(data)) throw Error('Invalid recovery response');
    return data.map(decodeStoredMatch);
  }
}
