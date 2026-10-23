import { describe, it, expect } from 'vitest';
import { DevelopmentController } from './controller';
import { createMatch, commandFor, applyMatchAction } from '../match/engine';
import { LocalMatchCoordinator } from '../match/coordinator';
import { validateMatchState } from '../match/invariants';
import { VARGAS_ECONOMY_CONFIG, matchCatalog } from '@tft/game-data';
import { MatchActionSchema, type MatchState } from '@tft/shared';
import type { DevelopmentCommand } from '@tft/shared/development';
const time = { now: () => 0 };
const fixture = () => new DevelopmentController(time, 42, 'dev-test');
const run = (c: DevelopmentController, command: DevelopmentCommand, id = `request-${c.revision}`) =>
  c.execute({ id, origin: 'test', expectedRevision: c.revision, command });
const state = (c: DevelopmentController) => c.coordinator.getMatch();
const conservation = (s: MatchState) => {
  validateMatchState(s);
  for (const d of matchCatalog(s.config))
    expect(
      s.pool[d.id]! +
        s.units
          .filter((u) => u.definitionId === d.id)
          .reduce((sum, u) => sum + s.config.starCopies[u.stars - 1]!, 0) +
        s.shop.filter((o) => o?.definitionId === d.id).length,
    ).toBe(s.config.copiesByCost[d.cost - 1]);
};
describe('isolated DEV controller', () => {
  it('uses an explicit taint, DEV ID and a separate typed contract', () => {
    const c = fixture();
    expect(c.coordinator.getClock().matchId).toMatch(/^dev-/);
    expect(state(c).development?.tainted).toBe(true);
    expect(() => new DevelopmentController(time, 42, 'normal-id')).toThrow();
    expect(() => new LocalMatchCoordinator(state(c), { matchId: 'normal', time })).toThrow();
    for (const command of [
      { type: 'gold', mode: 'max' },
      { type: 'spawn', definitionId: 'vargas', stars: 3 },
    ])
      expect(MatchActionSchema.safeParse({ seq: 0, expectedRevision: 0, ...command }).success).toBe(
        false,
      );
    const save = c.coordinator.exportSave();
    save.development = false;
    expect(() => LocalMatchCoordinator.restore(save, time)).toThrow();
  });
  it('idempotently applies requests and rejects stale or conflicting requests', () => {
    const c = fixture(),
      request = {
        id: 'same',
        origin: 'test',
        expectedRevision: 0,
        command: { type: 'gold', mode: 'add', amount: 10 },
      };
    expect(c.execute(request).ok).toBe(true);
    expect(c.audit[0]!.message).toBe('Oro +10; saldo 20.');
    expect(c.execute(request)).toEqual(c.audit[0]);
    expect(state(c).gold).toBe(20);
    expect(c.audit).toHaveLength(1);
    expect(c.execute({ ...request, command: { type: 'gold', mode: 'max' } }).ok).toBe(false);
    expect(state(c).gold).toBe(20);
    expect(c.execute({ ...request, id: 'stale' }).ok).toBe(false);
    expect(c.audit).toHaveLength(2);
  });
  it.each([NaN, Infinity, -1, 1.5, 10001])(
    'rejects invalid gold %s atomically and records rejection',
    (amount) => {
      const c = fixture(),
        before = JSON.stringify(state(c));
      expect(run(c, { type: 'gold', mode: 'set', amount }).ok).toBe(false);
      expect(JSON.stringify(state(c))).toBe(before);
      expect(c.audit.at(-1)).toMatchObject({ origin: 'test', ok: false });
    },
  );
  it('adds, caps, sets, maximizes and restores initial gold with conserved ledger', () => {
    const c = fixture();
    for (const command of [
      { type: 'gold', mode: 'add', amount: 50 },
      { type: 'gold', mode: 'set', amount: 800 },
      { type: 'gold', mode: 'add', amount: 500 },
      { type: 'gold', mode: 'max' },
      { type: 'gold', mode: 'initial' },
    ] as const) {
      expect(run(c, command).ok).toBe(true);
      conservation(state(c));
    }
    expect(state(c).gold).toBe(10);
    expect(state(c).ledger.at(-1)!.reason).toBe('development');
  });
  it('sets level and XP, promotes levels, changes capacity and preserves configured odds', () => {
    const c = fixture();
    expect(run(c, { type: 'xp', mode: 'add', amount: 8 }).ok).toBe(true);
    expect(state(c)).toMatchObject({ level: 4, xp: 0 });
    expect(run(c, { type: 'xp', mode: 'set', amount: 9 }).ok).toBe(true);
    expect(run(c, { type: 'xp', mode: 'set', amount: 10 }).ok).toBe(false);
    expect(run(c, { type: 'level', value: 7 }).ok).toBe(true);
    expect(state(c)).toMatchObject({ level: 7, xp: 0, totalXp: 74 });
    expect(state(c).config.levels).toEqual(VARGAS_ECONOMY_CONFIG.levels);
    expect(run(c, { type: 'xp', mode: 'set', amount: 1 }).ok).toBe(false);
  });
  it('withdraws excess deployments on a lower level, or rejects the whole edit when bench is full', () => {
    const c = fixture();
    run(c, { type: 'formation', preset: 'mixed' });
    expect(state(c).units.filter((u) => u.location.kind === 'board')).toHaveLength(4);
    expect(run(c, { type: 'level', value: 2 }).ok).toBe(true);
    expect(state(c).units.filter((u) => u.location.kind === 'board')).toHaveLength(2);
    conservation(state(c));
  });
  it.each([1, 2, 3] as const)('reserves exact %s★ copies and returns them on remove', (stars) => {
    const c = fixture(),
      before = state(c).pool.vargas!;
    expect(run(c, { type: 'spawn', definitionId: 'vargas', stars }).ok).toBe(true);
    expect(state(c).pool.vargas).toBe(before - [1, 3, 9][stars - 1]!);
    conservation(state(c));
    expect(run(c, { type: 'remove', unitId: state(c).units[0]!.id }).ok).toBe(true);
    expect(state(c).pool.vargas).toBe(before);
    conservation(state(c));
  });
  it('fuses nine generated copies into one three-star unit and sells through the normal reducer', () => {
    const c = fixture();
    for (let i = 0; i < 9; i++) {
      expect(run(c, { type: 'spawn', definitionId: 'vargas', stars: 1 }).ok).toBe(true);
      conservation(state(c));
    }
    expect(state(c).units).toHaveLength(1);
    expect(state(c).units[0]!.stars).toBe(3);
    const unit = state(c).units[0]!,
      outcome = applyMatchAction(
        state(c),
        commandFor(state(c), { type: 'sell_unit', unitId: unit.id }),
      );
    expect(outcome.ok).toBe(true);
    expect(outcome.state.units).toHaveLength(0);
    conservation(outcome.state);
  });
  it('rejects exhaustion, overlaps, invalid cells and capacity without partial pool mutation', () => {
    const c = fixture();
    expect(run(c, { type: 'spawn', definitionId: 'vargas', stars: 3 }).ok).toBe(true);
    expect(run(c, { type: 'spawn', definitionId: 'vargas', stars: 3 }).ok).toBe(true);
    let before = JSON.stringify(state(c));
    expect(run(c, { type: 'spawn', definitionId: 'vargas', stars: 1 }).ok).toBe(false);
    expect(JSON.stringify(state(c))).toBe(before);
    run(c, { type: 'formation', preset: 'vargas' });
    before = JSON.stringify(state(c));
    expect(
      run(c, { type: 'spawn', definitionId: 'dolea', stars: 1, to: state(c).units[0]!.location })
        .ok,
    ).toBe(false);
    expect(JSON.stringify(state(c))).toBe(before);
    expect(
      run(c, {
        type: 'spawn',
        definitionId: 'dolea',
        stars: 1,
        to: { kind: 'board', hex: { q: 0, r: 3 } },
      }).ok,
    ).toBe(false);
    expect(JSON.stringify(state(c))).toBe(before);
    conservation(state(c));
  });
  it('sets health without changing or forging round-damage entries and validates recovery', () => {
    const c = fixture();
    for (const side of ['north', 'south'] as const)
      expect(run(c, { type: 'health', side, value: 1 }).ok).toBe(true);
    expect(state(c).health).toEqual({ north: 1, south: 1 });
    expect(state(c).healthLedger).toHaveLength(0);
    conservation(state(c));
    const restored = DevelopmentController.restore(
      JSON.parse(JSON.stringify(c.exportSnapshot())),
      time,
    );
    expect(state(restored)).toEqual(state(c));
    expect(restored.audit).toEqual(c.audit);
    expect(run(restored, { type: 'health', side: 'south', value: 100 }).ok).toBe(true);
    conservation(state(restored));
  });
  it('advances safely, pauses, resumes, settles exactly once, restores checkpoints and repeats seed', () => {
    const c = fixture();
    run(c, { type: 'formation', preset: 'mixed' });
    run(c, { type: 'advance' });
    expect(c.coordinator.getClock().currentPhase).toBe('preparation');
    expect(run(c, { type: 'pause', paused: true }).ok).toBe(true);
    expect(c.coordinator.getClock().clockState).toBe('paused');
    expect(run(c, { type: 'pause', paused: false }).ok).toBe(true);
    expect(run(c, { type: 'durations', preparation: 8000, resolution: 2000 }).ok).toBe(true);
    const before = JSON.stringify(state(c));
    expect(run(c, { type: 'advance' }).ok).toBe(true);
    expect(c.coordinator.getClock().currentPhase).toBe('combat');
    const replay = c.coordinator.getReplay();
    expect(run(c, { type: 'gold', mode: 'max' }).ok).toBe(false);
    expect(run(c, { type: 'advance' }).ok).toBe(true);
    expect(c.coordinator.settlementIds).toHaveLength(1);
    conservation(state(c));
    const restored = DevelopmentController.restore(
      JSON.parse(JSON.stringify(c.exportSnapshot())),
      time,
    );
    expect(run(restored, { type: 'repeat' }).ok).toBe(true);
    expect(JSON.stringify(state(restored))).toBe(before);
    expect(restored.coordinator.settlementIds).toHaveLength(0);
    expect(run(restored, { type: 'advance' }).ok).toBe(true);
    expect(restored.coordinator.getReplay()).toEqual(replay);
    expect(run(restored, { type: 'advance' }).ok).toBe(true);
    expect(restored.coordinator.settlementIds).toHaveLength(1);
    expect(run(restored, { type: 'advance' }).ok).toBe(true);
    expect(state(restored).round).toBe(2);
    conservation(state(restored));
  });
  it('resets DEV with a fresh identity while normal match remains byte-identical', () => {
    const normal = createMatch(42, VARGAS_ECONOMY_CONFIG),
      before = JSON.stringify(normal),
      c = fixture();
    run(c, { type: 'formation', preset: 'mixed' });
    run(c, { type: 'gold', mode: 'max' });
    const id = c.coordinator.getClock().matchId;
    expect(run(c, { type: 'reset' }).ok).toBe(true);
    expect(state(c)).toMatchObject({ gold: 10, level: 2, units: [], round: 1 });
    expect(c.coordinator.getClock().matchId).not.toBe(id);
    expect(JSON.stringify(normal)).toBe(before);
    conservation(state(c));
  });
  it('rolls back a lower level atomically when no bench space remains', () => {
    const c = fixture();
    run(c, { type: 'formation', preset: 'mixed' });
    for (const id of ['test-k01', 'test-v02', 'test-r03', 'dolea'])
      for (let i = 0; i < 2; i++)
        expect(run(c, { type: 'spawn', definitionId: id, stars: 3 }).ok).toBe(true);
    expect(run(c, { type: 'spawn', definitionId: 'test-m04', stars: 3 }).ok).toBe(true);
    const before = JSON.stringify(state(c));
    expect(run(c, { type: 'level', value: 2 }).ok).toBe(false);
    expect(JSON.stringify(state(c))).toBe(before);
    conservation(state(c));
  });
  it('preserves health adjustments across a paid round and later restoration', () => {
    const c = fixture();
    run(c, { type: 'health', side: 'south', value: 1 });
    run(c, { type: 'advance' });
    run(c, { type: 'advance' });
    run(c, { type: 'advance' });
    expect(c.coordinator.getClock().currentPhase).toBe('finished');
    expect(state(c).health.south).toBe(0);
    conservation(state(c));
    const recovered = DevelopmentController.restore(
      JSON.parse(JSON.stringify(c.exportSnapshot())),
      time,
    );
    expect(state(recovered)).toEqual(state(c));
    expect(recovered.coordinator.settlementIds).toHaveLength(1);
  });
});
