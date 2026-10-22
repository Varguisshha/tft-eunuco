import { expect, it } from 'vitest';
import { BoardSession } from './session';
it('routes selection, deployment, move and rejection through the same rules', () => {
  const session = new BoardSession();
  session.choose('test-m04');
  session.activate({ q: -3, r: 7 });
  expect(session.getSnapshot().board.units).toHaveLength(5);
  const id = session.getSnapshot().selectedId!;
  session.move(id, { q: 0, r: 0 });
  expect(session.getSnapshot().invalid).toBe(true);
  expect(session.getSnapshot().board.units.find((u) => u.id === id)?.position).toEqual({
    q: -3,
    r: 7,
  });
  session.move(id, { q: -2, r: 7 });
  expect(session.getSnapshot().invalid).toBe(false);
  session.reset();
  expect(session.getSnapshot().board.units).toHaveLength(4);
});
it('supports switching teams and cancels a pending palette choice', () => {
  const session = new BoardSession();
  session.choose('test-k01');
  session.setSide('north');
  expect(session.getSnapshot().paletteId).toBeNull();
  session.choose('test-k01');
  session.activate({ q: 0, r: 0 });
  expect(session.getSnapshot().board.units.at(-1)?.owner).toBe('north');
});
it('notifies subscribers, unsubscribes, and preserves old snapshots', () => {
  const session = new BoardSession();
  const before = session.getSnapshot();
  let calls = 0;
  const off = session.subscribe(() => {
    calls++;
  });
  session.cancel();
  off();
  session.reset();
  expect(calls).toBe(1);
  expect(before.selectedId).toBe('demo-0');
  expect(before.revision).toBe(0);
});
