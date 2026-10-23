import { describe, it, expect, vi } from 'vitest';
import {
  createMatch,
  applyMatchAction,
  commandFor,
  LocalMatchCoordinator,
  MatchClock,
  offsetToAxial,
  runCombat,
  type TimeSource,
} from '@tft/game-core';
import { CURRENT_ECONOMY_CONFIG } from '@tft/game-data';
import type { MatchCommand } from '@tft/shared';
import * as simulation from '../../../../packages/game-core/src/combat/engine';
import { decodeSave, encodeSave } from './automaticSave';
import { LocalSession, restoreMatch } from './LocalSession';
import { BoardSession } from '../game/session';
class FakeTime implements TimeSource {
  value = 100_000;
  now = () => this.value;
  add(ms: number) {
    this.value += ms;
  }
}
function setup(development = false, seed = 360, config = CURRENT_ECONOMY_CONFIG) {
  const time = new FakeTime();
  const c = new LocalMatchCoordinator(createMatch(seed, config), {
    matchId: 'test-match',
    time,
    development,
  });
  const send = (command: MatchCommand) =>
    c.submit({
      matchId: c.getClock().matchId,
      phaseId: c.getClock().phaseId,
      expectedRevision: c.getMatch().revision,
      command,
    });
  const tick = (ms: number) => {
    for (let t = 0; t < ms; t += 50) {
      time.add(Math.min(50, ms - t));
      c.pulse();
    }
  };
  const dolea = () => {
    for (const offer of c.getMatch().shop)
      if (offer?.definitionId === 'dolea') send({ type: 'buy_unit', offerId: offer.id });
    const unit = c.getMatch().units[0]!;
    expect(unit.definitionId).toBe('dolea');
    send({ type: 'move_unit', unitId: unit.id, to: { kind: 'board', hex: offsetToAxial(2, 4) } });
  };
  return { c, time, send, tick, dolea };
}
function finishCombat(c: LocalMatchCoordinator, time: FakeTime) {
  for (let i = 0; i < 1000 && c.getClock().currentPhase === 'combat'; i++) {
    time.add(50);
    c.pulse();
  }
  expect(['resolution', 'finished']).toContain(c.getClock().currentPhase);
}
describe('automatic authority and monotonic clock', () => {
  it('creates a ready match without running a clock or buying until explicit start', () => {
    const { c, time, send } = setup();
    time.add(1e6);
    c.pulse();
    expect(c.getClock().currentPhase).toBe('not_started');
    expect(c.getMatch().gold).toBe(10);
    expect(c.getMatch().health.south).toBe(100);
    expect(send({ type: 'buy_xp' })).toBe(false);
    expect(c.start()).toBe(true);
    expect(c.start()).toBe(false);
    expect(c.getClock().remainingMs).toBe(30000);
  });
  it('uses absolute deadlines without drift under irregular pulses', () => {
    const { c, time } = setup();
    c.start();
    for (const n of [123, 1117, 4521, 13, 9237]) {
      time.add(n);
      c.pulse();
    }
    expect(c.getClock().remainingMs).toBe(30000 - 15011);
    time.add(14988);
    c.pulse();
    expect(c.getClock().remainingMs).toBe(1);
    time.add(1);
    c.pulse();
    expect(c.getClock().currentPhase).toBe('combat');
  });
  it('rejects late economic and placement commands without requiring a scheduler callback', () => {
    const { c, time, send, dolea } = setup();
    c.start();
    dolea();
    const before = c.getMatch();
    time.add(30000);
    expect(send({ type: 'buy_xp' })).toBe(false);
    expect(
      send({ type: 'move_unit', unitId: before.units[0]!.id, to: { kind: 'bench', slot: 0 } }),
    ).toBe(false);
    expect(c.getMatch().gold).toBe(before.gold);
    expect(c.getMatch().units).toEqual(before.units);
    expect(c.getClock().currentPhase).toBe('combat');
  });
  it('rejects stale phase/revision/match envelopes and manual transition intents', () => {
    const { c, send } = setup();
    c.start();
    const clock = c.getClock();
    const base = {
      matchId: clock.matchId,
      phaseId: clock.phaseId,
      expectedRevision: 0,
      command: { type: 'buy_xp' as const },
    };
    expect(c.submit({ ...base, matchId: 'other' })).toBe(false);
    expect(c.submit({ ...base, phaseId: 'old' })).toBe(false);
    expect(send({ type: 'start_combat' })).toBe(false);
    expect(c.submit(base)).toBe(true);
    expect(c.submit(base)).toBe(false);
  });
  it('starts exactly one simulation and settles the cached trace once after the visual tail', () => {
    const spy = vi.spyOn(simulation, 'runCombat');
    const { c, time, dolea } = setup();
    c.start();
    dolea();
    time.add(30000);
    c.pulse();
    expect(spy).toHaveBeenCalledTimes(1);
    const end = c.getReplay()!.result.tick * 100;
    while (c.getPlaybackMs() < end + 550) {
      time.add(50);
      c.pulse();
    }
    expect(c.getMatch().lastReward).toBeNull();
    time.add(50);
    c.pulse();
    expect(c.getMatch().lastReward?.round).toBe(1);
    const gold = c.getMatch().gold;
    for (let i = 0; i < 10; i++) c.pulse();
    expect(c.getMatch().gold).toBe(gold);
    expect(c.settlementIds).toHaveLength(1);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
  it('resolves an early DOLEA victory without waiting for 45 seconds, then exactly five seconds of resolution', () => {
    const { c, time, dolea } = setup();
    c.start();
    dolea();
    time.add(30000);
    c.pulse();
    expect(c.getReplay()!.result.winner).toBe('south');
    expect(c.getReplay()!.result.tick).toBeLessThan(300);
    finishCombat(c, time);
    const gold = c.getMatch().gold;
    const pool = c.getMatch().pool;
    time.add(4999);
    c.pulse();
    expect(c.getClock().currentPhase).toBe('resolution');
    time.add(1);
    c.pulse();
    expect(c.getClock().currentPhase).toBe('preparation');
    expect(c.getClock().remainingMs).toBe(30000);
    expect(c.getMatch().round).toBe(2);
    expect(c.getMatch().gold).toBe(gold);
    expect(Object.keys(c.getMatch().pool)).toEqual(Object.keys(pool));
  });
  it('freezes visual time on a long suspension while closing preparation at its deadline', () => {
    const { c, time, dolea } = setup();
    c.start();
    dolea();
    time.add(10 * 60_000);
    c.pulse();
    expect(c.getClock().currentPhase).toBe('combat');
    expect(c.getPlaybackMs()).toBe(0);
    time.add(10 * 60_000);
    c.pulse();
    expect(c.getPlaybackMs()).toBe(100);
    expect(c.getMatch().lastReward).toBeNull();
  });
  it('does not replay missed rounds after a delayed resolution callback', () => {
    const { c, time } = setup();
    c.start();
    time.add(30000);
    c.pulse();
    finishCombat(c, time);
    time.add(1e8);
    c.pulse();
    expect(c.getMatch().round).toBe(2);
    expect(c.getClock().remainingMs).toBe(30000);
    expect(c.settlementIds).toHaveLength(1);
  });
  it('locks editing and pauses/resumes development deadlines without elapsed pause time', () => {
    const { c, time, send } = setup(true);
    c.start();
    time.add(7000);
    c.debugPause();
    expect(send({ type: 'buy_xp' })).toBe(false);
    time.add(1e6);
    c.pulse();
    expect(c.getClock().remainingMs).toBe(23000);
    c.debugPause();
    time.add(22999);
    c.pulse();
    expect(c.getClock().remainingMs).toBe(1);
    time.add(1);
    c.pulse();
    expect(c.getClock().currentPhase).toBe('combat');
  });
  it('rejects all debug controls on a normal match', () => {
    const { c, time } = setup();
    expect(() => c.debugPause()).toThrow();
    expect(() => c.debugAdvance()).toThrow();
    expect(() => c.debugDurations(100, 100)).toThrow();
    expect(() => c.debugRepeat(time)).toThrow();
  });
  it('supports short phases and isolated round repetition with identical seed/formation/result', () => {
    const { c, time, dolea } = setup(true);
    c.debugDurations(8000, 2000);
    c.start();
    dolea();
    time.add(8000);
    c.pulse();
    const replay = c.getReplay();
    finishCombat(c, time);
    const originalGold = c.getMatch().gold;
    const repeated = c.debugRepeat(time);
    time.add(8000);
    repeated.pulse();
    expect(repeated.getReplay()).toEqual(replay);
    expect(repeated.settlementIds).toHaveLength(0);
    expect(c.getMatch().gold).toBe(originalGold);
  });
  it('settles repeated empty-board losses and stops permanently at zero HP after paying the final round', () => {
    const { c, time } = setup(true);
    c.start();
    for (let i = 0; i < 200 && c.getClock().currentPhase !== 'finished'; i++) c.debugAdvance();
    expect(c.getClock().currentPhase).toBe('finished');
    expect(c.getMatch().health.south).toBe(0);
    expect(c.getMatch().lastReward?.round).toBe(c.getMatch().round);
    const state = c.getMatch();
    time.add(1e9);
    c.pulse();
    c.debugAdvance();
    expect(c.getMatch()).toBe(state);
    expect(c.start()).toBe(false);
    const restored = decodeSave(encodeSave(c.exportSave()), time);
    expect(restored.getClock().currentPhase).toBe('finished');
  });
  it('tolerates an accidental backward time source without extending a deadline', () => {
    const time = new FakeTime();
    const clock = new MatchClock(time, 'm');
    clock.enter('preparation', 1, 30000);
    time.add(1000);
    expect(clock.snapshot().remainingMs).toBe(29000);
    time.add(-500);
    expect(clock.snapshot().remainingMs).toBe(29000);
  });
});
describe('automatic persistence, migration and adapters', () => {
  for (const phase of ['not_started', 'preparation', 'combat', 'resolution'] as const) {
    it(`restores ${phase} without offline time or simulation/reward duplication`, () => {
      const { c, time, dolea } = setup();
      if (phase !== 'not_started') {
        c.start();
        dolea();
      }
      if (phase === 'combat' || phase === 'resolution') {
        time.add(30000);
        c.pulse();
      }
      if (phase === 'combat')
        for (let i = 0; i < 30; i++) {
          time.add(50);
          c.pulse();
        }
      if (phase === 'resolution') finishCombat(c, time);
      if (phase === 'preparation' || phase === 'resolution') {
        time.add(1234);
        c.pulse();
      }
      const saved = encodeSave(c.exportSave());
      const spy = vi.spyOn(simulation, 'runCombat');
      time.add(1e8);
      const restored = decodeSave(saved, time);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
      expect(restored.getClock().currentPhase).toBe(phase);
      expect(restored.getMatch()).toEqual(c.getMatch());
      expect(restored.getPlaybackMs()).toBe(c.getPlaybackMs());
      expect(restored.getReplay()).toEqual(c.getReplay());
      if (phase !== 'combat')
        expect(restored.getClock().remainingMs).toBe(JSON.parse(saved).clock.remainingMs);
      if (phase === 'combat') {
        finishCombat(restored, time);
        expect(restored.settlementIds).toHaveLength(1);
      }
    });
  }
  it('restores a development pause across a new monotonic origin', () => {
    const { c, time } = setup(true);
    c.start();
    time.add(5000);
    c.debugPause();
    const restored = decodeSave(encodeSave(c.exportSave()), { now: () => 10 });
    expect(restored.getClock().remainingMs).toBe(25000);
    expect(restored.getClock().clockState).toBe('paused');
  });
  it('retains old saves and their frozen catalog/configuration through explicit migration', () => {
    const legacy = new LocalSession(createMatch());
    legacy.dispatch({ type: 'buy_unit', offerId: legacy.getMatch().shop[0]!.id });
    legacy.move(legacy.getMatch().units[0]!.id, offsetToAxial(2, 4));
    legacy.dispatch({ type: 'start_combat' });
    legacy.advanceCombat(45000);
    const oldText = JSON.stringify(legacy.getMatch());
    const state = restoreMatch(oldText);
    const time = new FakeTime();
    const c = LocalMatchCoordinator.migrate(state, runCombat(state.combat!.input), {
      matchId: 'migrated',
      time,
    });
    expect(JSON.stringify(c.getMatch())).toBe(oldText);
    expect(c.getMatch().config.catalog).toBeUndefined();
    expect(c.settlementIds).toEqual(['migrated/round/1/settlement']);
    expect(decodeSave(encodeSave(c.exportSave()), time).getMatch()).toEqual(state);
  });
  it('validates phase, settlement, replay and save version inconsistencies without silently repairing', () => {
    const { c, time } = setup(true);
    c.start();
    c.debugAdvance();
    c.debugAdvance();
    const saved = c.exportSave();
    expect(() => LocalMatchCoordinator.restore({ ...saved, saveVersion: 2 }, time)).toThrow();
    expect(() => LocalMatchCoordinator.restore({ ...saved, settlements: [] }, time)).toThrow();
    expect(() =>
      LocalMatchCoordinator.restore(
        { ...saved, clock: { ...saved.clock, currentPhase: 'combat' } },
        time,
      ),
    ).toThrow();
    expect(() => LocalMatchCoordinator.restore({ ...saved, replay: null }, time)).toThrow();
  });
  it('preserves DOLEA fusion, selection, movement and pool through adapter/recovery; Phaser cannot advance time', () => {
    const { c, time } = setup();
    c.start();
    const session = new LocalSession(c.getMatch(), undefined, c);
    for (const offer of c.getMatch().shop)
      if (offer?.definitionId === 'dolea')
        session.dispatch({ type: 'buy_unit', offerId: offer.id });
    expect(session.selected()?.stars).toBe(2);
    session.move(session.selected()!.id, offsetToAxial(2, 4));
    const state = c.getMatch();
    time.add(30000);
    c.pulse();
    session.advanceCombat(1000000);
    expect(c.getPlaybackMs()).toBe(0);
    expect(c.getMatch().pool).toEqual(state.pool);
    const recovered = decodeSave(encodeSave(c.exportSave()), time);
    const adapter = new LocalSession(recovered.getMatch(), undefined, recovered);
    expect(adapter.starsFor(state.units[0]!.id)).toBe(2);
    expect(adapter.combatFrame()?.timeMs).toBe(0);
  });
  it('leaves the independent Arena playback and star-3 fallback scenario functional', () => {
    const arena = new BoardSession();
    arena.loadCharacterDuel(3);
    arena.startCombat();
    arena.advanceCombat(1000);
    expect(arena.combatFrame()?.tick).toBe(10);
    expect(arena.starsFor('dolea-south')).toBeDefined();
  });
  it('preserves a locked shop and finite pool across automatic rounds', () => {
    const { c, time, send, dolea } = setup();
    c.start();
    dolea();
    send({ type: 'lock_shop', locked: true });
    const shop = c.getMatch().shop,
      pool = c.getMatch().pool;
    time.add(30000);
    c.pulse();
    finishCombat(c, time);
    time.add(5000);
    c.pulse();
    expect(c.getMatch().shop).toEqual(shop);
    expect(c.getMatch().pool).toEqual(pool);
  });
});

it('carries a deterministic overtime trace through tick 300, double loss at 450, recovery and one settlement', () => {
  const { c, time, dolea } = setup();
  c.start();
  dolea();
  time.add(30000);
  c.pulse();
  // Controlled technical fixture uses the same simulator; no economy or OT rules are replaced.
  const state = structuredClone(c.getMatch());
  for (const unit of state.combat!.input.units) {
    unit.profile.ability = null;
    unit.profile.passive = null;
    unit.profile.stats.maxHp = 100000;
    unit.profile.stats.attack = 1;
  }
  const trace = runCombat(state.combat!.input);
  expect(trace.events.filter((e) => e.type === 'overtime_start')).toHaveLength(1);
  expect(trace.result).toMatchObject({ tick: 450, winner: null, reason: 'timeout' });
  let coordinated = LocalMatchCoordinator.migrate(state, trace, { matchId: 'overtime', time });
  const adapter = new LocalSession(state, undefined, coordinated);
  for (let i = 0; i < 600; i++) {
    time.add(50);
    coordinated.pulse();
  }
  expect(adapter.combatFrame()?.overtime).toBe(true);
  expect(adapter.combatFrame()?.tick).toBe(300);
  const save = encodeSave(coordinated.exportSave());
  expect(save.length).toBeLessThan(JSON.stringify(coordinated.exportSave()).length / 2);
  coordinated = decodeSave(save, time);
  finishCombat(coordinated, time);
  expect(coordinated.getMatch().lastReward).toMatchObject({
    outcome: 'double_loss',
    victory: 0,
    streak: 0,
  });
  expect(coordinated.settlementIds).toEqual(['overtime/round/1/settlement']);
});

it('pauses combat visual position and resumes without consuming the paused gap', () => {
  const { c, time, dolea } = setup(true);
  c.start();
  dolea();
  c.debugAdvance();
  time.add(50);
  c.pulse();
  c.debugPause();
  const position = c.getPlaybackMs();
  time.add(1000000);
  c.pulse();
  expect(c.getPlaybackMs()).toBe(position);
  c.debugPause();
  time.add(50);
  c.pulse();
  expect(c.getPlaybackMs()).toBe(position + 50);
});

it('rebases saved logical timestamps coherently without advancing playback at a fresh time origin', () => {
  const { c, time, dolea } = setup();
  c.start();
  dolea();
  time.add(30000);
  c.pulse();
  for (let i = 0; i < 50; i++) {
    time.add(50);
    c.pulse();
  }
  const saved = c.exportSave();
  const fresh = new FakeTime();
  fresh.value = 5;
  const restored = LocalMatchCoordinator.restore(saved, fresh);
  const clock = restored.getClock();
  expect(clock.phaseDeadline - clock.phaseStart).toBe(clock.phaseDuration);
  restored.pulse();
  expect(restored.getPlaybackMs()).toBe(saved.playbackMs);
  fresh.add(50);
  restored.pulse();
  expect(restored.getPlaybackMs()).toBe(saved.playbackMs + 50);
});

it('finishes a historical zero-HP preparation without playing or paying another round', () => {
  const { c, time } = setup(true);
  c.start();
  for (let i = 0; i < 200 && c.getClock().currentPhase !== 'finished'; i++) c.debugAdvance();
  const outcome = applyMatchAction(
    c.getMatch(),
    commandFor(c.getMatch(), { type: 'next_round', round: c.getMatch().round }),
  );
  if (!outcome.ok) throw new Error(outcome.error);
  const migrated = LocalMatchCoordinator.migrate(outcome.state, null, {
    matchId: 'old-zero',
    time,
  });
  expect(migrated.getClock().currentPhase).toBe('finished');
  expect(decodeSave(encodeSave(migrated.exportSave()), time).getMatch()).toEqual(outcome.state);
  time.add(100000);
  migrated.pulse();
  expect(migrated.getMatch()).toEqual(outcome.state);
});
