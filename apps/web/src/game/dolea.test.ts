import { CombatInputSchema } from '@tft/shared';
import { expect, it } from 'vitest';
import {
  CHARACTER_ROSTER,
  COMBAT_PROFILES,
  CURRENT_ECONOMY_CONFIG,
  ECONOMY_CONFIG,
} from '@tft/game-data';
import { createMatch, validateMatchState, runCombat, scaledProfile } from '@tft/game-core';
import { LocalSession, restoreMatch } from '../match/LocalSession';
import { BoardSession } from './session';
import { CombatPlayback } from './combatPlayback';
import { unitAnimationCue } from './animationPlayback';
it('adds a neutral provisional cost-2 melee tank without removing reference units', () => {
  expect(CHARACTER_ROSTER).toHaveLength(5);
  expect(CHARACTER_ROSTER.find((d) => d.id === 'dolea')).toMatchObject({
    cost: 2,
    role: 'vanguard',
    synergies: ['prototype-neutral'],
  });
  expect(COMBAT_PROFILES.dolea!.stats.range).toBe(1);
  expect(COMBAT_PROFILES.dolea!.ability?.id).toBe('test-bastion');
});
it('new catalogs reserve 22 DOLEA copies, keep odds, and sample it in shops', () => {
  expect(CURRENT_ECONOMY_CONFIG.levels).toEqual(ECONOMY_CONFIG.levels);
  const games = Array.from({ length: 40 }, (_, i) => createMatch(i, CURRENT_ECONOMY_CONFIG));
  for (const s of games)
    expect(s.pool.dolea! + s.shop.filter((o) => o?.definitionId === 'dolea').length).toBe(22);
  expect(games.some((s) => s.shop.some((o) => o?.definitionId === 'dolea'))).toBe(true);
});
it('buys nine copies, upgrades twice, preserves board survivor/selection, sells all copies', () => {
  // Transaction fixture: reserve legal offers before each purchase, with conserved pool.
  const initial = createMatch(5, { ...CURRENT_ECONOMY_CONFIG, initialGold: 500 });
  for (const offer of initial.shop) if (offer) initial.pool[offer.definitionId]!++;
  initial.shop.fill(null);
  let state = initial;
  let survivor = '';
  for (let i = 0; i < 9; i++) {
    state = structuredClone(state);
    state.pool.dolea!--;
    state.shop[0] = { id: `fixture-offer-${i}`, definitionId: 'dolea' };
    const session = new LocalSession(validateMatchState(state));
    expect(session.dispatch({ type: 'buy_unit', offerId: state.shop[0]!.id })).toBe(true);
    if (i === 0) {
      survivor = session.getMatch().units[0]!.id;
      expect(session.move(survivor, { q: 0, r: 4 })).toBe(true);
    }
    state = session.getMatch();
    if (i === 2 || i === 8) {
      expect(state.units.find((u) => u.id === survivor)).toMatchObject({
        stars: i === 2 ? 2 : 3,
        location: { kind: 'board', hex: { q: 0, r: 4 } },
      });
      expect(session.getSnapshot().selectedId).toBe(survivor);
    }
  }
  expect(state.units).toHaveLength(1);
  expect(state.pool.dolea).toBe(13);
  expect(scaledProfile('dolea', 3, state.config).stats.maxHp).toBe(1944);
  const session = new LocalSession(state);
  expect(session.dispatch({ type: 'sell_unit', unitId: survivor })).toBe(true);
  expect(session.getMatch().pool.dolea).toBe(22);
  expect(session.getMatch().gold).toBe(500);
});
it.each([ECONOMY_CONFIG, CURRENT_ECONOMY_CONFIG])(
  'recovers old and expanded catalogs exactly, including accepted purchases',
  (config) => {
    const session = new LocalSession(createMatch(42, config));
    session.dispatch({ type: 'buy_unit', offerId: session.getMatch().shop[0]!.id });
    expect(restoreMatch(JSON.stringify(session.getMatch()))).toEqual(session.getMatch());
  },
);
it('rejects injected catalog changes rather than reinterpreting a save', () => {
  const s = createMatch();
  s.config.catalog = 'f0p4.1';
  expect(() => restoreMatch(JSON.stringify(s))).toThrow();
});
it.each([1, 2, 3] as const)(
  'Arena provides DOLEA %s-star duel, repeated deterministic replay and death',
  (stars) => {
    const s = new BoardSession();
    s.loadCharacterDuel(stars);
    expect(s.starsFor('dolea-south')).toBe(stars);
    s.startCombat();
    const frame = s.combatFrame()!;
    expect(frame.state.units[0]!.profile.stats.maxHp).toBe(
      scaledProfile('dolea', stars, ECONOMY_CONFIG).stats.maxHp,
    );
    s.advanceCombat(50000);
    const result = s.getSnapshot().combat.result;
    s.startCombat(true);
    s.advanceCombat(50000);
    expect(s.getSnapshot().combat.result).toEqual(result);
    s.reset();
    expect(s.getSnapshot().board.units).toHaveLength(4);
  },
);
it('visual fallbacks cannot change damage events or replay, pause freezes sampled animation', () => {
  const s = new BoardSession();
  s.loadCharacterDuel(1);
  s.startCombat();
  // Reconstruct a standalone trace from the legal input shown by this Arena fixture.
  const units = s
    .combatFrame()!
    .state.units.map(({ id, definitionId, owner, position, profile }) => ({
      id,
      definitionId,
      owner,
      position,
      profile,
    }));
  const input = CombatInputSchema.parse({
    protocolVersion: 3 as const,
    rulesVersion: 'f0p3.1-1' as const,
    seed: 42,
    maxTicks: 450,
    obstacles: [],
    units,
  });
  const replay = runCombat(input),
    before = JSON.stringify(replay),
    playback = new CombatPlayback(replay);
  for (let i = 0; i < 500; i++) {
    playback.advance(50);
    playback.frame();
  }
  playback.setPaused(true);
  const frozen = playback.frame();
  playback.advance(10000);
  expect(playback.frame()).toEqual(frozen);
  expect(JSON.stringify(replay)).toBe(before);
  expect(runCombat(input)).toEqual(replay);
  const attack = replay.events.find((e) => e.type === 'attack_start')!;
  if (attack.type !== 'attack_start') throw Error('missing attack');
  const u = replay.snapshots[attack.tick]!.units.find((u) => u.id === attack.payload.unitId)!;
  expect(unitAnimationCue(u, attack.tick * 100, replay.events)).toMatchObject({
    state: 'attack',
    timing: { impactMs: attack.payload.releaseTick * 100 },
  });
  expect(
    unitAnimationCue({ ...u, deathTick: attack.tick }, attack.tick * 100, replay.events).state,
  ).toBe('death');
});
it('single-tick Arena stepping preserves pause, then death supersedes attack and holds', () => {
  const s = new BoardSession();
  s.loadCharacterDuel(1, 'death');
  s.startCombat();
  s.pauseCombat();
  s.stepCombat();
  expect(s.getSnapshot().combat.tick).toBe(1);
  expect(s.getSnapshot().combat.mode).toBe('paused');
  s.advanceCombat(5000);
  expect(s.getSnapshot().combat.tick).toBe(1);
  for (let i = 0; i < 5; i++) s.stepCombat();
  expect(s.combatFrame()!.state.units.every((u) => u.deathTick !== null)).toBe(true);
  expect([...s.combatFrame()!.animationCues.values()].every((c) => c.state === 'death')).toBe(true);
});
it('walk and ability interrupt recovery and visual requests remain independent of mechanics', () => {
  const s = new BoardSession();
  s.loadCharacterDuel(1);
  s.startCombat();
  const u = s.combatFrame()!.state.units[0]!;
  expect(
    unitAnimationCue(
      {
        ...u,
        action: {
          kind: 'move',
          startTick: 1,
          endTick: 5,
          from: { q: 0, r: 4 },
          to: { q: 0, r: 3 },
        },
      },
      200,
      [],
    ).state,
  ).toBe('walk');
  expect(
    unitAnimationCue(
      {
        ...u,
        action: {
          kind: 'cast',
          startTick: 1,
          endTick: 5,
          targetId: 'enemy',
          abilityId: 'test-bastion',
        },
      },
      200,
      [],
    ).state,
  ).toBe('ability');
});
it('does not resurrect an attack after a cancellation', () => {
  const s = new BoardSession();
  s.loadCharacterDuel(1);
  s.startCombat();
  const u = s.combatFrame()!.state.units[0]!;
  const events = [
    {
      type: 'attack_start' as const,
      protocolVersion: 3 as const,
      tick: 1,
      order: 0,
      payload: { unitId: u.id, targetId: 'dolea-north', releaseTick: 3, ranged: false },
    },
    {
      type: 'action_cancel' as const,
      protocolVersion: 3 as const,
      tick: 2,
      order: 0,
      payload: { unitId: u.id, action: 'attack' as const, reason: 'stun' as const },
    },
  ];
  expect(unitAnimationCue({ ...u, action: null }, 200, events).state).toBe('idle');
  expect(unitAnimationCue({ ...u, action: null }, 400, events).state).toBe('idle');
});
