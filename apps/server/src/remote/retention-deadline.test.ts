import { it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { MatchRoom } from '../MatchRoom';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
it('keeps a final available when a room timer fires before its wall-clock deadline', async () => {
  let time = 0;
  const match = new AuthoritativeMatch(randomUUID(), { now: () => time });
  for (let i = 0; i < 2; i++)
    match.join(`s${i}`, {
      userId: randomUUID(),
      name: 'Fixture',
      avatarId: 'jade',
    });
  match.start('s0');
  for (let i = 0; i < 200 && !match.finalResults; i++) {
    time += match.clock.snapshot().remainingMs;
    match.pulse();
  }
  expect(match.finalResults).not.toBeNull();
  class FinalRoom extends MatchRoom {
    show() {
      this.match = match;
      this.finalRetentionMs = 1000;
      this.publish();
    }
  }
  const room = new FinalRoom();
  const disconnect = vi.spyOn(room, 'disconnect').mockResolvedValue(undefined);
  const timer = vi.spyOn(room.clock, 'setTimeout');
  const now = vi.spyOn(Date, 'now').mockReturnValue(10000);
  try {
    room.show();
    now.mockReturnValue(10999);
    timer.mock.calls[0]![0]();
    expect(disconnect).not.toHaveBeenCalled();
    now.mockReturnValue(11000);
    timer.mock.calls[1]![0]();
    expect(disconnect).toHaveBeenCalledTimes(1);
  } finally {
    room.clock.clear();
    vi.restoreAllMocks();
  }
});
