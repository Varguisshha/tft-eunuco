import { randomUUID } from 'node:crypto';
import type { LobbySnapshot } from '@tft/shared';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
import type { MatchRepository } from './repository';
import { StoredMatchSchema, type StoredMatch } from './snapshot';
/** Copy-on-write: readers see only committed state. One serialized writer per match. */
export class DurableMatch {
  private tail: Promise<unknown> = Promise.resolve();
  private pending: { document: StoredMatch; candidate: AuthoritativeMatch } | null = null;
  private stopped = false;
  private closing = false;
  private attempts = 0;
  private retryAt = 0;
  private revision = 0;
  private finalCommitted = false;
  private expiresAt = Date.now() + 3_600_000;
  unavailable = false;

  constructor(
    public match: AuthoritativeMatch,
    private repository: MatchRepository,
    public lobby: LobbySnapshot,
    saved?: StoredMatch,
    private finalRetentionMs = 300_000,
  ) {
    if (saved) {
      this.revision = saved.revision;
      this.finalCommitted = saved.status === 'finished';
      this.expiresAt = saved.expiresAt;
    }
  }
  get retentionDeadline() {
    return this.expiresAt;
  }
  private clockSource() {
    // Capture numbers, never a previous clock instance (which would form a chain).
    const base = this.match.clock.now(),
      origin = performance.now();
    return { now: () => base + performance.now() - origin };
  }
  private async persist(document: StoredMatch, candidate: AuthoritativeMatch) {
    // Repeating the exact commit resolves an ambiguous network response safely.
    await this.repository.commit(this.revision, document);
    this.revision = document.revision;
    this.finalCommitted = document.status === 'finished';
    this.expiresAt = document.expiresAt;
    this.match = candidate;
    this.pending = null;
    this.unavailable = false;
    this.attempts = 0;
  }
  run<T>(operation: (match: AuthoritativeMatch) => T): Promise<T> {
    if (this.closing) return Promise.reject(new Error('Server restarting'));
    const work = this.tail.then(async () => {
      if (this.stopped || this.unavailable)
        throw new Error('Servicio temporalmente no disponible. La partida está pausada.');
      const candidate = AuthoritativeMatch.restore(
        this.match.exportState(),
        this.clockSource(),
        false,
      );
      const result = operation(candidate);
      const document = StoredMatchSchema.parse({
        id: candidate.id,
        revision: this.revision + 1,
        commitId: randomUUID(),
        status: candidate.finalResults ? 'finished' : 'active',
        expiresAt:
          candidate.finalResults && !this.finalCommitted
            ? Math.min(this.expiresAt, Date.now() + this.finalRetentionMs)
            : this.expiresAt,
        lobby: {
          ...this.lobby,
          matchId: candidate.id,
          status:
            candidate.clock.snapshot().currentPhase === 'not_started' ? 'starting' : 'in_match',
        },
        authority: candidate.exportState(),
      });
      try {
        await this.persist(document, candidate);
      } catch {
        this.pending = { document, candidate };
        this.unavailable = true;
        this.match.clock.pause();
        this.retryAt = Date.now() + 1000;
        throw new Error('Servicio temporalmente no disponible. La partida está pausada.');
      }
      return result;
    });
    this.tail = work.catch(() => {});
    return work;
  }
  async retry() {
    if (
      !this.unavailable ||
      !this.pending ||
      this.stopped ||
      this.attempts >= 5 ||
      Date.now() < this.retryAt
    )
      return;
    const pending = this.pending;
    this.retryAt = Infinity;
    this.attempts++;
    try {
      await this.persist(pending.document, pending.candidate);
      // Time spent waiting for storage is not competitive time.
      this.match = AuthoritativeMatch.restore(
        pending.document.authority,
        this.clockSource(),
        false,
      );
    } catch {
      this.retryAt = Date.now() + Math.min(16000, 1000 * 2 ** this.attempts);
    }
  }
  async shutdown() {
    if (this.match.finalResults && !this.unavailable) {
      this.closing = true;
      await this.tail;
      this.stopped = true;
      if (this.unavailable) throw new Error('Final checkpoint unavailable');
      return;
    }
    const final = this.run(() => {});
    this.closing = true;
    try {
      await final;
    } finally {
      this.stopped = true;
    }
  }
  async close() {
    if (this.stopped || this.closing) return;
    this.closing = true;
    await this.tail;
    if (this.unavailable) return; // Never overwrite an ambiguous durable commit.
    this.stopped = true;
    // Volatile eviction does not delete a durable result or extend its deadline.
    if (this.match.finalResults || this.expiresAt <= Date.now()) return;
    const document = StoredMatchSchema.parse({
      id: this.match.id,
      revision: this.revision + 1,
      commitId: randomUUID(),
      status: 'closed',
      expiresAt: this.expiresAt,
      lobby: { ...this.lobby, matchId: this.match.id },
      authority: this.match.exportState(),
    });
    await this.repository.commit(this.revision, document);
  }
}
