import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  runCombat,
  shieldTotal,
  analyzeTraits,
  prepareTraitProfiles,
  createMatch,
} from '@tft/game-core';
import {
  createAbilityScenario,
  TRAIT_DEFINITIONS,
  CURRENT_ECONOMY_CONFIG,
  COMBAT_PROFILES,
} from '@tft/game-data';
import { CombatEventV3Schema, CombatInputSchema, type CombatInput } from '@tft/shared';
import { CombatPlayback } from './combatPlayback';
import {
  feedbackMoment,
  passiveReadout,
  shieldBar,
  unitFeedback,
  feedbackLanes,
} from './combatFeedback';
import { PassiveStatus } from './PassiveStatus';
import { BoardSession } from './session';
import { LocalSession } from '../match/LocalSession';
import { UnitInspector } from '../match/UnitInspector';
const id = 'diagnostic-dolea';
const trace = () => runCombat(createAbilityScenario('ability-1', 42));
const at = (t: ReturnType<typeof trace>, tick: number) =>
  t.snapshots[tick]!.units.find((u) => u.id === id)!;

describe('authoritative shield lifecycle and event compatibility', () => {
  it('orders real crossing, one passive trigger and shield grant; no healing is needed', () => {
    const t = trace();
    const tick = feedbackMoment(t.events, id, 'passive')!;
    const events = t.events.filter((e) => e.tick === tick);
    const damage = events.find((e) => e.type === 'damage' && e.payload.targetId === id)!;
    const trigger = events.find((e) => e.type === 'passive_trigger')!;
    const shield = events.find((e) => e.type === 'shield_apply' && e.payload.unitId === id)!;
    expect(damage.order).toBeLessThan(trigger.order);
    expect(trigger.order).toBeLessThan(shield.order);
    expect(at(t, tick - 1).hp).toBeGreaterThanOrEqual(300);
    expect(at(t, tick).hp).toBeLessThan(300);
    expect(shieldTotal(at(t, tick))).toBe(72);
    expect(events.some((e) => e.type === 'heal')).toBe(false);
    expect(
      t.events.filter((e) => e.type === 'passive_trigger' && e.payload.unitId === id),
    ).toHaveLength(1);
    expect(runCombat(t.input)).toEqual(t);
  });
  it('absorbs partially then completely, retains real HP and removes the shield exactly', () => {
    const t = trace();
    const hits = t.events.filter(
      (e) => e.type === 'damage' && e.payload.targetId === id && e.payload.absorbed > 0,
    );
    const partial = hits.find((e) => e.type === 'damage' && e.payload.shieldAfter > 0)!;
    const full = hits.find((e) => e.type === 'damage' && e.payload.shieldAfter === 0)!;
    expect(partial.type === 'damage' && partial.payload.absorbed).toBeGreaterThan(0);
    expect(partial.type === 'damage' && partial.payload.amount).toBe(0);
    expect(shieldTotal(at(t, partial.tick))).toBeGreaterThan(0);
    expect(shieldBar(at(t, full.tick)).shieldFraction).toBe(0);
    expect(
      t.events.some(
        (e) =>
          e.tick === full.tick &&
          e.type === 'status_expire' &&
          e.payload.unitId === id &&
          e.payload.reason === 'consumed',
      ),
    ).toBe(true);
    expect(hits.reduce((s, e) => s + (e.type === 'damage' ? e.payload.absorbed : 0), 0)).toBe(72);
  });
  it('expires a shield by duration without a hit or a fake damage event', () => {
    const input = createAbilityScenario('ability-1', 42);
    const effect = input.units[0]!.profile.championAbility!.passive!.rules[0]!.effects[0]!;
    if (effect.kind !== 'shield') throw Error();
    effect.duration = 3;
    const t = runCombat(input),
      tick = feedbackMoment(t.events, id, 'expiration')!;
    expect(tick).toBeGreaterThan(0);
    expect(shieldTotal(at(t, tick - 1))).toBe(72);
    expect(shieldTotal(at(t, tick))).toBe(0);
    expect(
      t.events.some((e) => e.tick === tick && e.type === 'damage' && e.payload.targetId === id),
    ).toBe(false);
  });
  it('does not activate on lethal damage; dead units have no shield segment', () => {
    const input = createAbilityScenario('ability-1', 42);
    input.units.at(-1)!.profile.stats.attack = 10000;
    const t = runCombat(input);
    expect(feedbackMoment(t.events, id, 'passive')).toBeNull();
    expect(shieldBar(at(t, t.result.tick)).shield).toBe(0);
    expect(passiveReadout(at(t, 0).profile, at(t, t.result.tick), t.result.tick).state).toBe(
      'inactive',
    );
  });
  it('uses the actual reduced overtime grant and resets on a new combat', () => {
    const input = createAbilityScenario('passive-overtime', 42);
    const t = runCombat(input),
      tick = feedbackMoment(t.events, id, 'shield')!;
    expect(tick).toBeGreaterThanOrEqual(300);
    expect(shieldTotal(at(t, tick))).toBe(54);
    expect(unitFeedback(at(t, tick), t.events, tick * 100).shield?.amount).toBe(54);
    const next = runCombat(input);
    expect(passiveReadout(at(next, 0).profile, at(next, 0), 0).state).toBe('available');
    expect(next).toEqual(t);
  });
  it('stacks independent shields, preserves proportions and accepts existing v3 events', () => {
    const t = trace(),
      unit = structuredClone(at(t, feedbackMoment(t.events, id, 'shield')!));
    unit.statuses.push({
      id: 'another',
      sourceId: id,
      kind: 'shield',
      stat: null,
      amount: 600,
      expiresTick: 200,
    });
    const bar = shieldBar(unit);
    expect(bar.shield).toBe(672);
    expect(bar.hpFraction + bar.shieldFraction).toBeCloseTo(1);
    expect(bar.shieldFraction / bar.hpFraction).toBeCloseTo(672 / unit.hp);
    for (const event of t.events)
      expect(CombatEventV3Schema.parse(JSON.parse(JSON.stringify(event)))).toEqual(event);
    const old = createAbilityScenario('ability-1', 42);
    old.units[0]!.profile = structuredClone(COMBAT_PROFILES.dolea!);
    delete old.traits;
    old.rulesVersion = 'f0p3.1-1';
    const replay = runCombat(CombatInputSchema.parse(old));
    expect(replay.events.some((e) => e.type === 'passive_trigger')).toBe(false);
    expect(runCombat(JSON.parse(JSON.stringify(replay.input)))).toEqual(replay);
  });
});

describe('passive and shield presentation reads authority', () => {
  it('available → activated → consumed without using HP as a trigger', () => {
    const t = trace(),
      tick = feedbackMoment(t.events, id, 'passive')!;
    expect(passiveReadout(at(t, 0).profile, at(t, 0), 0).label).toBe('Disponible');
    expect(passiveReadout(at(t, tick).profile, at(t, tick), tick).label).toBe('Activada');
    expect(passiveReadout(at(t, tick + 16).profile, at(t, tick + 16), tick + 16).label).toBe(
      'Consumida',
    );
    const unit = structuredClone(at(t, 0));
    unit.hp = 1;
    expect(passiveReadout(unit.profile, unit, 10).state).toBe('available');
    expect(unitFeedback(unit, [], 1000).passive).toBeNull();
  });
  it('handles bench, preparation, unknown records and characters without a tracked passive honestly', () => {
    const u = at(trace(), 0);
    expect(passiveReadout(u.profile, undefined, 0, false).label).toBe('Inactiva');
    expect(passiveReadout(u.profile, undefined, 0).label).toBe('Disponible al iniciar');
    const unknown = structuredClone(u);
    delete unknown.passiveState;
    expect(passiveReadout(u.profile, unknown, 0).label).toBe('Sin datos');
    expect(passiveReadout(COMBAT_PROFILES['test-v02']!, undefined, 0).label).toBe('No aplicable');
  });
  it('samples feedback identically after a jump, pause, repeated sample and rewind; never invents shield gain', () => {
    const t = trace(),
      tick = feedbackMoment(t.events, id, 'passive')!;
    const p = new CombatPlayback(t);
    p.seek(tick * 100);
    const frame = p.frame(),
      before = JSON.stringify(t);
    const feedback = unitFeedback(at(t, tick), frame.feedbackEvents!, frame.timeMs);
    expect(feedback.passive?.name).toBe('Volumen eterno');
    expect(feedback.shield?.amount).toBe(72);
    p.setPaused(true);
    p.advance(10000);
    expect(p.frame()).toEqual(frame);
    p.seek(0);
    expect(unitFeedback(at(t, 0), p.frame().feedbackEvents!, 0).passive).toBeNull();
    p.seek(tick * 100);
    expect(p.frame()).toEqual(frame);
    p.seek(tick * 100 + 1700);
    expect(
      unitFeedback(at(t, tick + 17), p.frame().feedbackEvents!, p.frame().timeMs).shield,
    ).toBeNull();
    expect(JSON.stringify(t)).toBe(before);
  });
  it('separates simultaneous labels in bounded lanes, prioritizing selected unit', () => {
    const groups = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      x: 100,
      y: 100,
      width: 150,
    }));
    const lanes = feedbackLanes(groups, '9');
    expect(lanes.get('9')).toBe(0);
    expect(new Set(lanes.values()).size).toBe(lanes.size);
    expect(lanes.size).toBeLessThanOrEqual(6);
  });
  it('renders true status and current shield in the actual local inspector', () => {
    const session = new LocalSession(createMatch(42, CURRENT_ECONOMY_CONFIG));
    const offer = session.getMatch().shop.find((o) => o?.definitionId === 'dolea')!;
    session.dispatch({ type: 'buy_unit', offerId: offer.id });
    const owned = session.getMatch().units[0]!;
    session.move(owned.id, { q: 0, r: 4 });
    session.select(owned.id);
    const input = createAbilityScenario('ability-1', 42);
    input.units[0]!.id = owned.id;
    const t = runCombat(input),
      p = new CombatPlayback(t);
    session.combatFrame = () => p.frame();
    const render = () =>
      renderToStaticMarkup(createElement(UnitInspector, { session, view: session.getSnapshot() }));
    expect(render()).toContain('Disponible');
    const tick = feedbackMoment(t.events, owned.id, 'shield')!;
    p.seek(tick * 100);
    expect(render()).toContain('Activada');
    expect(render()).toContain('Escudo activo');
    const end = feedbackMoment(t.events, owned.id, 'depleted')!;
    p.seek(end * 100);
    expect(render()).toContain('Consumida');
    expect(render()).not.toContain('Escudo activo');
    expect(
      renderToStaticMarkup(createElement(PassiveStatus, { value: session.inspection()!.passive })),
    ).toContain('No volverá');
  });
  it('Arena seeks actual events without resimulation and returns to available on replay', () => {
    const session = new BoardSession();
    session.loadAbilityScenario('ability-1');
    session.startCombat();
    session.seekFeedback('passive');
    expect(session.getSnapshot().combat.mode).toBe('paused');
    expect(session.combatFrame()!.recentEvents.some((e) => e.type === 'passive_trigger')).toBe(
      true,
    );
    session.seekFeedback('depleted');
    expect(shieldTotal(session.combatFrame()!.state.units.find((u) => u.id === id)!)).toBe(0);
    session.seekFeedback('expiration');
    expect(session.getSnapshot().message).toContain('no existe');
    session.startCombat(true);
    session.seekFeedback('start');
    const u = session.combatFrame()!.state.units.find((u) => u.id === id)!;
    expect(passiveReadout(u.profile, u, 0).state).toBe('available');
  });
});

describe('trait diagnostics and actual cadence', () => {
  it.each([1, 2, 3] as const)(
    'Llama %s: exact stats, tick cadence, overtime and no accumulated rounds',
    (n) => {
      const input = createAbilityScenario(`padel-${n}`, 42);
      const before = JSON.stringify(input),
        t = runCombat(input);
      expect(at(t, 0).profile.stats.attackSpeedMilli).toBe([800, 896, 1000][n - 1]);
      const starts = t.events
        .filter((e) => e.type === 'attack_start' && e.payload.unitId === id)
        .map((e) => e.tick);
      // Charge remainder is retained: 1 + ceil(N * 10000 / speed), not rounding each interval anew.
      expect(starts.filter((tick) => tick <= 40)).toEqual(
        [
          [1, 14, 26, 39],
          [1, 13, 24, 35],
          [1, 11, 21, 31],
        ][n - 1],
      );
      const pre = starts.filter((tick) => tick >= 100 && tick < 290),
        post = starts.filter((tick) => tick >= 310 && tick < 449);
      const average = (v: number[]) => (v.at(-1)! - v[0]!) / (v.length - 1);
      expect(average(post)).toBeLessThan(average(pre));
      expect(runCombat(input)).toEqual(t);
      expect(JSON.stringify(input)).toBe(before);
    },
  );
  it.each([2, 3] as const)('Hortaleza %s: exact life/armor and isolated trait recipients', (n) => {
    const input = createAbilityScenario(`hortaleza-${n}`, 42),
      t = runCombat(input);
    expect(at(t, 0).profile.stats.maxHp).toBe(n === 2 ? 700 : 820);
    expect(at(t, 0).profile.stats.armor).toBe(n === 2 ? 45 : 60);
    expect(at(t, 0).profile.stats.attackSpeedMilli).toBe(800);
    expect(t.events.filter((e) => e.type === 'trait_activate')).toHaveLength(1);
  });
  it('one member, repeated copies, bench and removal recalculate both traits without stacking', () => {
    const make = (definitionId: string, deployed = true) => ({
      definitionId,
      deployed,
      traits: ['hortaleza', 'llama-de-padel'],
    });
    expect(
      analyzeTraits([make('d'), make('d'), make('k', false)], TRAIT_DEFINITIONS).map(
        (r) => r.count,
      ),
    ).toEqual([1, 1]);
    const input = createAbilityScenario('traits-3', 42);
    expect(at(runCombat(input), 0).profile.stats).toMatchObject({
      maxHp: 820,
      armor: 60,
      attackSpeedMilli: 1000,
    });
    input.units = input.units.filter((u) => u.id !== 'diagnostic-member-2');
    expect(prepareTraitProfiles(input).units[0]!.profile.stats).toMatchObject({
      maxHp: 700,
      armor: 45,
      attackSpeedMilli: 896,
    });
    const duplicate = structuredClone(input.units[0]!);
    duplicate.id = 'copy';
    duplicate.position = { q: 2, r: 4 };
    input.units.push(duplicate);
    expect(prepareTraitProfiles(input).units[0]!.profile.stats.maxHp).toBe(700);
    input.units = input.units.filter((u) => u.id !== 'diagnostic-member-1');
    expect(prepareTraitProfiles(input as CombatInput).units[0]!.profile.stats).toMatchObject({
      maxHp: 600,
      armor: 45,
      attackSpeedMilli: 800,
    });
  });
});
