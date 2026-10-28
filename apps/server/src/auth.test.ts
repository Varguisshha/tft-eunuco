import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { makeVerifier } from './auth';
const id = '00000000-0000-4000-8000-000000000001';
function fixture({
  invalid = false,
  confirmed = true,
  expired = false,
  active = true,
  profileId = id,
  anonymous = false,
} = {}) {
  const getUser = vi.fn().mockResolvedValue({
    data: {
      user: invalid
        ? null
        : { id, email_confirmed_at: confirmed ? 'date' : null, is_anonymous: anonymous },
    },
    error: invalid ? {} : null,
  });
  const client = {
    auth: {
      getUser,
      getClaims: vi.fn().mockResolvedValue({
        data: { claims: { exp: Date.now() / 1000 + (expired ? -1 : 3600) } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
  const single = vi.fn().mockResolvedValue({
    data: {
      user_id: profileId,
      username: 'player_one',
      display_name: 'Player One',
      avatar_id: 'jade',
      created_at: 'date',
      updated_at: 'date',
    },
    error: null,
  });
  const scoped = {
    rpc: vi.fn().mockResolvedValue({ data: active, error: null }),
    from: () => ({ select: () => ({ eq: () => ({ single }) }) }),
  } as unknown as SupabaseClient;
  return { verify: makeVerifier(client, () => scoped), getUser };
}
describe('Supabase server verification with controlled provider', () => {
  it('uses provider identity, confirmed email, live session and database profile', async () => {
    const { verify, getUser } = fixture();
    const p = await verify('valid-provider-token-123');
    expect(p.userId).toBe(id);
    expect(p.name).toBe('Player One');
    expect(getUser).toHaveBeenCalledWith('valid-provider-token-123');
  });
  it.each([undefined, null, 42, '', {}, 'a'.repeat(8193)])(
    'rejects missing/malformed credentials %s',
    async (token) => {
      await expect(fixture().verify(token)).rejects.toThrow();
    },
  );
  it.each([
    { invalid: true },
    { confirmed: false },
    { expired: true },
    { active: false },
    { anonymous: true },
    { profileId: '00000000-0000-4000-8000-000000000002' },
  ])('rejects unsafe identity %j', async (flags) => {
    await expect(fixture(flags).verify('valid-provider-token-123')).rejects.toThrow();
  });
});
