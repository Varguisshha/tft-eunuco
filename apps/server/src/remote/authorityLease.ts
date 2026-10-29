import { randomUUID } from 'node:crypto';
export type LeaseOperation = 'acquire' | 'renew' | 'release';
export type LeaseRpc = (operation: LeaseOperation, owner: string) => Promise<boolean>;
/** DB fence lives 60 s; local authority stops after 40 s at most, using a monotonic clock. */
export class AuthorityLease {
  readonly owner = randomUUID();
  private deadline = 0;
  private live = false;
  private lost = false;
  private closing = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private renewing = false;
  private watchdog: ReturnType<typeof setInterval> | undefined;
  constructor(
    private rpc: LeaseRpc,
    private onLost: () => void,
    private now = () => performance.now(),
  ) {}
  async acquire() {
    const began = this.now();
    if (!(await this.rpc('acquire', this.owner))) throw Error('Authority already owned');
    this.deadline = began + 40_000;
    this.live = true;
    this.assert();
    this.timer = setInterval(() => {
      void this.renew();
    }, 10_000);
    this.timer.unref();
    this.watchdog = setInterval(() => {
      if (this.live && this.now() >= this.deadline) this.fail();
    }, 1000);
    this.watchdog.unref();
  }
  assert() {
    if (!this.live || this.now() >= this.deadline) {
      this.fail();
      throw Error('Authority unavailable');
    }
  }
  private fail() {
    this.live = false;
    clearInterval(this.timer);
    clearInterval(this.watchdog);
    if (!this.lost && !this.closing) {
      this.lost = true;
      this.onLost();
    }
  }
  async renew() {
    if (this.renewing || !this.live) return;
    this.renewing = true;
    try {
      this.assert();
      const began = this.now();
      if (!(await this.rpc('renew', this.owner))) {
        // An explicit denial is different from an unavailable transport. Never reacquire here.
        this.fail();
        return;
      }
      // A late response must never revive a locally expired or released authority.
      if (this.closing) return;
      this.assert();
      this.deadline = began + 40_000;
    } catch {
      // A transient transport error does not revoke the still-valid DB fence. Keep the
      // original monotonic deadline; the watchdog stops authority before its 60 s DB TTL.
      // Fenced commits still verify ownership at the database on every write.
      if (this.now() >= this.deadline) this.fail();
    } finally {
      this.renewing = false;
    }
  }
  async release() {
    this.closing = true;
    this.live = false;
    clearInterval(this.timer);
    clearInterval(this.watchdog);
    await this.rpc('release', this.owner);
  }
}
