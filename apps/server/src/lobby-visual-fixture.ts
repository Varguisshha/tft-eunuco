/** Run explicitly on loopback for browser QA. No production import, account or DEV wire command. */
import { createServer } from './server';
import { MatchRoom } from './MatchRoom';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { equip, fixtureUsers } from './multi-fixture';
import type { Client } from '@colyseus/core';
import type { VerifiedIdentity } from './auth';
async function verify(token: unknown): Promise<VerifiedIdentity> {
  const i =
    typeof token === 'string'
      ? ['fixture-0', 'fixture-1', 'fixture-2', 'fixture-3'].indexOf(token)
      : -1;
  if (i < 0) throw Error('Only explicit local fixtures');
  return {
    token: String(token),
    userId: fixtureUsers[i]!,
    name: ['Vargas', 'Florin', 'Nora', 'Alex'][i]!,
    avatarId: i === 1 ? 'pulse' : i === 2 ? 'spark' : 'jade',
    expiresAt: Date.now() + 3600000,
  };
}
class BrowserFixture extends MatchRoom {
  static onAuth = verify;
  protected verify = verify;
  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    return new AuthoritativeMatch(this.roomId, undefined, () => 360, capacity);
  }
  onJoin(c: Client, o: unknown, a?: VerifiedIdentity) {
    super.onJoin(c, o, a);
    if (this.match.players.length === this.match.capacity) {
      equip(this.match, [0], ['vargas']);
      equip(this.match, [1], ['dolea', 'vargas']);
      if (this.match.capacity > 2) equip(this.match, [2], ['dolea', 'vargas']);
      if (this.match.capacity > 3) equip(this.match, [3], ['dolea', 'vargas']);
      this.match.revision++;
    }
  }
}
await createServer(BrowserFixture, verify).listen(2574, '127.0.0.1');
console.log('Explicit local fixture server: 2574. Production authentication is untouched.');
