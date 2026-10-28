import { log } from './telemetry';
export class Availability {
  ready = false;
  draining = false;
  private checked = 0;
  private pending: Promise<boolean> | undefined;
  constructor(
    private probe: () => Promise<void>,
    private now = () => Date.now(),
  ) {}
  check(force = false): Promise<boolean> {
    if (this.draining) return Promise.resolve(false);
    if (this.pending) return this.pending;
    if (!force && this.now() - this.checked < 5000) return Promise.resolve(this.ready);
    this.pending = this.probe()
      .then(
        () => {
          if (this.draining) return false;
          if (!this.ready) log('storage_recovered');
          this.ready = true;
          return true;
        },
        () => {
          this.ready = false;
          log('storage_failed');
          return false;
        },
      )
      .finally(() => {
        this.checked = this.now();
        this.pending = undefined;
      });
    return this.pending;
  }
  stop() {
    this.draining = true;
    this.ready = false;
  }
}
