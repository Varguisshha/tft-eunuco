/** Persist receipt identities only; never balances, account data or credentials. */
export class RewardSeen {
  private seen = new Set<string>();
  constructor(private storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    try {
      const values: unknown = JSON.parse(storage?.getItem('tft-round-receipts-v1') ?? '[]');
      if (Array.isArray(values))
        for (const id of values.slice(-256)) if (typeof id === 'string') this.seen.add(id);
    } catch {
      /* Memory-only deduplication remains available. */
    }
  }
  consume(id: string): boolean {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    this.seen = new Set([...this.seen].slice(-256));
    try {
      this.storage?.setItem('tft-round-receipts-v1', JSON.stringify([...this.seen]));
    } catch {
      /* Storage may be unavailable. */
    }
    return true;
  }
}
