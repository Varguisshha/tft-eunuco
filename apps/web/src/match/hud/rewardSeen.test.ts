import { it, expect } from 'vitest';
import { RewardSeen } from './rewardSeen';
it('consumes match/round/settlement once across renders, reconnects and restoration', () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
  const seen = new RewardSeen(storage);
  expect(seen.consume('match-a/owner/round-1/settlement')).toBe(true);
  expect(seen.consume('match-a/owner/round-1/settlement')).toBe(false);
  expect(new RewardSeen(storage).consume('match-a/owner/round-1/settlement')).toBe(false);
  expect(seen.consume('match-a/owner/round-2/settlement')).toBe(true);
  expect(seen.consume('match-b/owner/round-1/settlement')).toBe(true);
});
it('handles disabled or corrupt storage with memory deduplication', () => {
  for (const storage of [
    undefined,
    {
      getItem: () => '{',
      setItem: () => {
        throw Error('blocked');
      },
    },
  ]) {
    const seen = new RewardSeen(storage);
    expect(seen.consume('x')).toBe(true);
    expect(seen.consume('x')).toBe(false);
  }
});
