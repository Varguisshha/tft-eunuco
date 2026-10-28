import { describe, it, expect } from 'vitest';
import { createMatch, offsetToAxial } from '@tft/game-core';
import { LocalSession, restoreMatch } from './LocalSession';
function ready(save?: (state: ReturnType<typeof createMatch>) => void) {
  const session = new LocalSession(createMatch(), save);
  session.dispatch({ type: 'buy_unit', offerId: session.getMatch().shop[0]!.id });
  session.move(session.getMatch().units[0]!.id, offsetToAxial(2, 4));
  return session;
}
describe('local match presentation and saves', () => {
  it('serializes accepted actions and restores identical state by replay', () => {
    let saved = '';
    const session = ready((s) => {
      saved = JSON.stringify(s);
    });
    expect(restoreMatch(saved)).toEqual(session.getMatch());
  });
  it('settles once at visual completion and freezes preparation during combat', () => {
    const session = ready();
    session.dispatch({ type: 'start_combat' });
    expect(session.editable).toBe(false);
    const before = session.getMatch().gold;
    expect(session.dispatch({ type: 'buy_xp' })).toBe(false);
    expect(session.getMatch().gold).toBe(before);
    session.advanceCombat(40000);
    expect(session.getMatch().phase).toBe('resolution');
    const resolved = session.getMatch();
    session.advanceCombat(40000);
    expect(session.getMatch()).toBe(resolved);
  });
  it('reloads an in-flight combat without paying until playback finishes', () => {
    const session = ready();
    session.dispatch({ type: 'start_combat' });
    session.advanceCombat(100);
    const saved = restoreMatch(JSON.stringify(session.getMatch()));
    const restored = new LocalSession(saved);
    expect(restored.getMatch().gold).toBe(saved.gold);
    expect(restored.getSnapshot().combat.tick).toBe(0);
    restored.advanceCombat(40000);
    expect(restored.getMatch().lastReward?.round).toBe(1);
  });
  it('reloads resolution without duplicated income and advances the round once', () => {
    const session = ready();
    session.dispatch({ type: 'start_combat' });
    session.advanceCombat(40000);
    const state = restoreMatch(JSON.stringify(session.getMatch()));
    const resumed = new LocalSession(state);
    resumed.advanceCombat(40000);
    expect(resumed.getMatch()).toEqual(state);
    expect(resumed.getSnapshot().combat.tick).toBe(state.combat!.result!.tick);
    expect(resumed.dispatch({ type: 'resolve_round', round: 1 })).toBe(false);
    expect(resumed.dispatch({ type: 'next_round', round: 1 })).toBe(true);
    expect(resumed.getMatch().gold).toBe(state.gold);
  });
  it('rejects tampered saves even when superficial gold conservation is maintained', () => {
    const saved = structuredClone(ready().getMatch());
    saved.gold++;
    saved.ledger.at(-1)!.delta++;
    saved.ledger.at(-1)!.balance++;
    expect(() => restoreMatch(JSON.stringify(saved))).toThrow();
  });
  it('handles storage failure without losing the accepted action', () => {
    const session = ready(() => {
      throw new Error('quota');
    });
    expect(session.getMatch().units).toHaveLength(1);
    expect(session.getSnapshot().message).toContain('continúa en memoria');
  });
  it('keeps paused ticks fixed and preserves formation through next preparation', () => {
    const session = ready();
    const units = session.getMatch().units;
    session.dispatch({ type: 'start_combat' });
    session.pauseCombat();
    session.advanceCombat(10000);
    expect(session.getSnapshot().combat.tick).toBe(0);
    session.pauseCombat();
    session.setSpeed(2);
    session.advanceCombat(20000);
    session.dispatch({ type: 'next_round', round: 1 });
    expect(session.getMatch().units).toEqual(units);
    expect(session.editable).toBe(true);
  });
});
