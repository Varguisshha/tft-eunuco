import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { runCombat, createMatch, LocalMatchCoordinator, combatStatsView } from '@tft/game-core';
import {
  createMechanicsScenario,
  MECHANICS_SCENARIOS,
  MECHANICS_ECONOMY_CONFIG,
  ADVANCED_ECONOMY_CONFIG,
} from '@tft/game-data';
import { BoardSession } from '../game/session';
import { CombatPlayback } from '../game/combatPlayback';
import { mechanicsReadout } from '../game/mechanicsReadout';
import { MechanicsStatus } from '../game/MechanicsStatus';
import { mechanicsFeedback, combatVisualPosition } from '../game/mechanicsVisuals';
import { CombatTraitRail } from './hud/TraitRail';
import { unitAnimationCue } from '../game/animationPlayback';
import { arenaProjection } from '../arenas/arena';
import { MAR_DE_CRISTAL } from '../arenas/marDeCristal';
import { createProjection, hexToWorld } from '../game/projection';
import { LocalSession } from './LocalSession';
import { UnitInspector } from './UnitInspector';
import { encodeSave, decodeSave } from './automaticSave';
import type { FeedbackMoment } from '../game/combatFeedback';
describe('P6B2 authoritative presentation and local game integration', () => {
  it.each(MECHANICS_SCENARIOS)('Arena can start %s through its real adapter', (name) => {
    const s = new BoardSession();
    s.loadMechanicsScenario(name);
    s.startCombat();
    expect(s.getSnapshot().invalid).toBe(false);
    expect(s.combatFrame()!.state.rulesVersion).toBe('f0p6b2-1');
  });
  it.each([
    ['stack-cycle', 'stack'],
    ['stack-cycle', 'stack-consume'],
    ['kill-marks', 'kill'],
    ['progress-6', 'empower'],
    ['free-repeat', 'repeat'],
    ['jump-chain', 'jump'],
    ['jump-chain', 'chain'],
  ] as const)('seeks %s / %s from actual events and replaying preserves it', (name, moment) => {
    const s = new BoardSession();
    s.loadMechanicsScenario(name);
    s.startCombat();
    s.seekFeedback(moment);
    const f = s.combatFrame()!;
    expect(f.tick).toBeGreaterThan(0);
    expect(s.getSnapshot().combat.mode).toBe('paused');
    s.startCombat(true);
    s.seekFeedback(moment);
    expect(s.combatFrame()!.state).toEqual(f.state);
  });
  it('keeps edited diagnostic formations valid when a real trait-bearing champion is added', () => {
    const s = new BoardSession();
    s.loadMechanicsScenario('progress-team');
    s.choose('dolea');
    s.activate({ q: 0, r: 6 });
    s.startCombat();
    expect(s.getSnapshot().invalid).toBe(false);
    expect(s.combatFrame()!.state.units).toHaveLength(8);
    expect(
      s
        .combatFrame()!
        .state.units.some(
          (u) => u.definitionId === 'dolea' && u.profile.championAbility?.id === 'volumen-sucio',
        ),
    ).toBe(true);
  });
  it('renders exact current stacks, counters, durations and effective speed; consumption is visible', () => {
    const s = new BoardSession();
    s.loadMechanicsScenario('stack-cycle');
    s.startCombat();
    s.seekFeedback('stack');
    const frame = s.combatFrame()!,
      unit = frame.state.units.find((u) => u.id === 'mechanics-source')!;
    const view = mechanicsReadout(unit, frame.state)!;
    expect(view.stacks[0]).toMatchObject({ count: 1, max: 5, duration: '6.0 s' });
    expect(combatStatsView(unit).attackSpeedMilli).toBe(1040);
    const html = renderToStaticMarkup(createElement(MechanicsStatus, { value: view }));
    expect(html).toContain('Pulso de prueba');
    expect(html).toContain('Velocidad +4%');
    s.seekFeedback('stack-consume');
    expect(
      mechanicsReadout(
        s.combatFrame()!.state.units.find((u) => u.id === unit.id),
        s.combatFrame()!.state,
      )!.stacks[0]!.count,
    ).toBe(0);
  });
  it('shows membership 1/1 separately from per-unit kills, and team cast scope in trait tooltips', () => {
    for (const name of ['kill-marks', 'progress-team'] as const) {
      const input = createMechanicsScenario(name, 42),
        t = runCombat(input),
        state = t.snapshots[Math.min(25, t.result.tick)]!;
      const html = renderToStaticMarkup(createElement(CombatTraitRail, { input, state }));
      expect(html).toContain('No añade miembros');
      if (name === 'kill-marks') {
        expect(html).toContain('/1');
        expect(html).toContain('Marca singular');
      } else expect(html).toContain('compartido por equipo');
    }
  });
  it('samples special feedback and snapshots repeatedly without mutating simulation', () => {
    for (const [name, moment, label] of [
      ['stack-cycle', 'stack-consume', 'Umbral activado'],
      ['kill-marks', 'kill', 'Eliminación +1'],
      ['progress-6', 'empower', 'Habilidad ×1.5'],
      ['free-repeat', 'repeat', 'Reejecución'],
      ['jump-chain', 'chain', 'Ataque encadenado'],
    ] as const) {
      const s = new BoardSession();
      s.loadMechanicsScenario(name);
      s.startCombat();
      s.seekFeedback(moment as FeedbackMoment);
      const f = s.combatFrame()!,
        u = f.state.units.find((u) => u.id === 'mechanics-source')!,
        before = JSON.stringify(f.state);
      expect(mechanicsFeedback(u, f.feedbackEvents!, f.timeMs)!.name).toBe(label);
      for (let i = 0; i < 20; i++) s.combatFrame();
      expect(JSON.stringify(s.combatFrame()!.state)).toBe(before);
    }
  });
  it('projects the same jump endpoints onto both technical and Mar de Cristal boards, with no logical movement', () => {
    const t = runCombat(createMechanicsScenario('jump-chain', 42)),
      state = t.snapshots.find((s) => s.units.some((u) => u.action?.kind === 'jump'))!,
      u = state.units.find((u) => u.action?.kind === 'jump')!,
      a = u.action!;
    if (a.kind !== 'jump') throw Error();
    const original = JSON.stringify(u);
    for (const p of [createProjection(), arenaProjection(MAR_DE_CRISTAL)]) {
      expect(combatVisualPosition(u, a.startTick * 100, p)).toEqual(hexToWorld(a.from, p));
      const end = combatVisualPosition(u, a.endTick * 100, p),
        expected = hexToWorld(a.to, p);
      expect(end.x).toBeCloseTo(expected.x);
      expect(end.y).toBeCloseTo(expected.y);
    }
    expect(unitAnimationCue(u, (a.startTick + 1) * 100, t.events).state).toBe('walk');
    expect(JSON.stringify(u)).toBe(original);
    const hit = t.events.find((e) => e.type === 'chain_attack')!;
    const live = t.snapshots[hit.tick]!.units.find((u) => u.id === 'mechanics-source')!;
    expect(unitAnimationCue(live, hit.tick * 100, t.events).state).toBe('attack');
  });
  it('keeps the authoritative readout logical while omitting progress from the normal inspector', () => {
    const s = new LocalSession(createMatch(42, MECHANICS_ECONOMY_CONFIG));
    const offer = s.getMatch().shop.find((o) => o?.definitionId === 'dolea')!;
    s.dispatch({ type: 'buy_unit', offerId: offer.id });
    const id = s.getMatch().units[0]!.id;
    s.move(id, { q: 0, r: 4 });
    s.select(id);
    const input = createMechanicsScenario('stack-cycle', 42);
    input.units[0]!.id = id;
    const playback = new CombatPlayback(runCombat(input));
    playback.seek(300);
    s.combatFrame = () => playback.frame();
    const html = renderToStaticMarkup(
      createElement(UnitInspector, { session: s, view: s.getSnapshot() }),
    );
    expect(html).not.toContain('Progreso de combate');
    expect(html).not.toContain('mechanics-status');
    expect(html).toContain('Habilidad principal');
    expect(s.inspection()!.mechanics!.stacks[0]!.count).toBe(1);
  });
  it('roundtrips a new save and settles automatic rounds once with the same economy and DOLEA art', () => {
    let now = 0;
    const time = { now: () => now },
      c = new LocalMatchCoordinator(createMatch(42, MECHANICS_ECONOMY_CONFIG), {
        time,
        development: true,
        matchId: 'mechanics-integration',
      });
    c.start();
    const s = new LocalSession(c.getMatch(), undefined, c);
    const offer = c.getMatch().shop.find((o) => o?.definitionId === 'dolea')!;
    s.dispatch({ type: 'buy_unit', offerId: offer.id });
    s.move(c.getMatch().units[0]!.id, { q: 0, r: 4 });
    for (let i = 0; i < 610; i++) {
      now += 50;
      c.pulse();
    }
    expect(c.getReplay()!.input.rulesVersion).toBe('f0p6b2-1');
    const restored = decodeSave(encodeSave(c.exportSave()), time);
    expect(restored.getReplay()).toEqual(c.getReplay());
    for (let i = 0; i < 1600 && c.getMatch().round < 2; i++) {
      now += 50;
      c.pulse();
      restored.pulse();
    }
    expect(c.getMatch().round).toBe(2);
    expect(c.settlementIds).toHaveLength(1);
    expect(restored.getMatch()).toEqual(c.getMatch());
    expect({ ...MECHANICS_ECONOMY_CONFIG, catalog: 'f0p6b1' }).toEqual(ADVANCED_ECONOMY_CONFIG);
  });
  it('DOLEA retains damage, shielding, mana, HP, critical policy, timing and overtime under the new opt-in', () => {
    const modern = runCombat(createMechanicsScenario('dolea-mechanics', 42));
    const oldInput = structuredClone(modern.input);
    oldInput.rulesVersion = 'f0p6b1-1';
    delete oldInput.combatId;
    const old = runCombat(oldInput);
    const results = (t: typeof old) =>
      t.snapshots.map((s) => ({
        tick: s.tick,
        rng: s.rngState,
        units: s.units.map((u) => ({
          hp: u.hp,
          mana: u.mana,
          charge: u.attackCharge,
          death: u.deathTick,
          stats: combatStatsView(u, s.tick),
        })),
      }));
    expect(results(modern)).toEqual(results(old));
    expect(modern.result).toEqual(old.result);
  });
});
