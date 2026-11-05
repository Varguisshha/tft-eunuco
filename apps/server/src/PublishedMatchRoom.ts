import { SANCHEZ_ECONOMY_CONFIG } from '@tft/game-data';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { MatchRoom } from './MatchRoom';
/** Production composition only. Restored matches keep their stored configuration. */
export class PublishedMatchRoom extends MatchRoom {
  protected createMatch(capacity: 2 | 3 | 4 = 2) {
    return new AuthoritativeMatch(
      this.roomId,
      undefined,
      undefined,
      capacity,
      SANCHEZ_ECONOMY_CONFIG,
    );
  }
}
