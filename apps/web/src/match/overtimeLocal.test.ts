import { expect, it } from 'vitest';
import { createMatch, offsetToAxial } from '@tft/game-core';
import { LocalSession, restoreMatch, SAVE_KEY } from './LocalSession';
it('plays a real three-round history into double loss, restores both ledgers and continues', () => {
  const session = new LocalSession(createMatch(42));
  session.dispatch({ type: 'buy_unit', offerId: session.getMatch().shop[0]!.id });
  session.move(session.getMatch().units[0]!.id, offsetToAxial(2, 4));
  session.dispatch({ type: 'buy_unit', offerId: session.getMatch().shop[2]!.id });
  session.dispatch({ type: 'reroll_shop' });
  session.dispatch({
    type: 'buy_unit',
    offerId: session.getMatch().shop.find((o) => o?.definitionId === 'test-k01')!.id,
  });
  expect(session.getMatch().units[0]?.stars).toBe(2);
  for (let round = 1; round <= 2; round++) {
    session.dispatch({ type: 'start_combat' });
    session.advanceCombat(50000);
    expect(session.getMatch().lastReward?.outcome).toBe('win');
    session.dispatch({ type: 'next_round', round });
  }
  const bank = session.getMatch().gold,
    pool = session.getMatch().pool;
  expect(session.getMatch().streak).toBe(2);
  session.dispatch({ type: 'start_combat' });
  session.advanceCombat(32000);
  expect(session.combatFrame()?.overtime).toBe(true);
  const saved = JSON.stringify(session.getMatch());
  const resumed = new LocalSession(restoreMatch(saved));
  expect(resumed.getMatch().gold).toBe(bank);
  expect(resumed.getMatch().healthLedger).toHaveLength(4);
  resumed.advanceCombat(50000);
  const end = resumed.getMatch();
  expect(end.combat?.result).toMatchObject({
    outcome: 'double_loss',
    reason: 'timeout',
    tick: 450,
  });
  expect(end.lastReward).toMatchObject({
    outcome: 'double_loss',
    victory: 0,
    streak: 0,
    interest: Math.floor(bank / 10),
  });
  expect(end.streak).toBe(0);
  expect(end.pool).toEqual(pool);
  expect(end.healthLedger).toHaveLength(6);
  expect(end.healthLedger.slice(-2).every((e) => e.applied > 0 && e.outcome === 'loss')).toBe(true);
  const loaded = new LocalSession(restoreMatch(JSON.stringify(end)));
  loaded.advanceCombat(50000);
  expect(loaded.getMatch()).toEqual(end);
  expect(loaded.combatFrame()?.tick).toBe(450);
  expect(loaded.dispatch({ type: 'resolve_round', round: 3 })).toBe(false);
  expect(loaded.dispatch({ type: 'next_round', round: 3 })).toBe(true);
  expect(loaded.getMatch().gold).toBe(end.gold);
  expect(loaded.getMatch().health).toEqual(end.health);
  expect(SAVE_KEY).toBe('tft-eunuco-local-f0p3.1-1');
});
it('rejects a legacy save explicitly rather than silently replaying new rules', () => {
  const legacy = { ...createMatch(), rulesVersion: 'f0p3-1' };
  expect(() => restoreMatch(JSON.stringify(legacy))).toThrow();
});
