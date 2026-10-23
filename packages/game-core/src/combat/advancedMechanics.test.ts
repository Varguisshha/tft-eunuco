import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  createMechanicsScenario,
  MECHANICS_SCENARIOS,
  createStatsScenario,
  MECHANICS_ECONOMY_CONFIG,
  cycleStack,
  mechanicRule,
} from '@tft/game-data';
import {
  CombatInputSchema,
  CombatEventV3Schema,
  CombatStateSchema,
  MatchStateSchema,
  MECHANICS_RULES,
  type CombatInput,
  type CombatEffect,
  type CombatEventV3,
} from '@tft/shared';
import { CombatEngine, runCombat } from './engine';
import { effectiveStat } from './math';
import { analyzeTraits } from './traits';
import { createMatch, replayMatch, applyMatchAction } from '../match/engine';
import { matchTraits } from '../match/selectors';
import historical from './fixtures/pre-p6b2.json';
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fixture = (name: Parameters<typeof createMechanicsScenario>[0] = 'stack-cycle') =>
  createMechanicsScenario(name, 42);
const source = (t: ReturnType<typeof runCombat>, tick: number) =>
  t.snapshots[tick]!.units.find((u) => u.id === 'mechanics-source')!;
const events = <T extends CombatEventV3['type']>(t: ReturnType<typeof runCombat>, type: T) =>
  t.events.filter((e): e is Extract<CombatEventV3, { type: T }> => e.type === type);
function passive(
  input: CombatInput,
  effects: CombatEffect[],
  trigger: Parameters<typeof mechanicRule>[1] = { kind: 'combat_start' },
) {
  const p = input.units[0]!.profile;
  p.ability = null;
  p.passive = null;
  p.stats.maxMana = 0;
  p.stats.startingMana = 0;
  p.championAbility = {
    id: 'fixture-rule',
    name: 'Fixture',
    description: 'Technical',
    icon: 'unknown',
    version: 1,
    type: 'passive',
    passive: {
      name: 'Fixture',
      description: 'Technical',
      rules: [mechanicRule('fixture-rule', trigger, effects)],
    },
  };
}
describe('mechanics diagnostics and frozen history', () => {
  it.each(MECHANICS_SCENARIOS)(
    '%s terminates, roundtrips and reproduces every event/snapshot',
    (name) => {
      const input = fixture(name),
        before = JSON.stringify(input),
        t = runCombat(input);
      expect(t.result.tick).toBeLessThanOrEqual(450);
      expect(t.input.rulesVersion).toBe(MECHANICS_RULES);
      expect(runCombat(JSON.parse(before))).toEqual(t);
      expect(JSON.stringify(input)).toBe(before);
      for (const e of t.events) expect(CombatEventV3Schema.parse(e)).toEqual(e);
      for (const s of t.snapshots) expect(CombatStateSchema.parse(s)).toEqual(s);
    },
  );
  it.each(historical.traces)(
    'preserves the complete pre-P6B2 $scenario trace',
    ({ scenario, seed, hash: expected }) => {
      expect(
        hash(
          runCombat(
            createStatsScenario(scenario as Parameters<typeof createStatsScenario>[0], seed),
          ),
        ),
      ).toBe(expected);
    },
  );
  it('restores the captured advanced save byte for byte and uses its original engine', () => {
    const state = MatchStateSchema.parse(JSON.parse(historical.save.text));
    expect(hash(state)).toBe(historical.save.hash);
    expect(replayMatch(state.seed, state.history, state.config)).toEqual(state);
    expect(hash(runCombat(state.combat!.input))).toBe(historical.save.trace);
  });
});
describe('confirmed basics and cyclic stacks', () => {
  it('grants exactly one stack per valid impact, consumes five before healing and restarts', () => {
    const t = runCombat(fixture()),
      gains = events(t, 'stack_gain'),
      hits = events(t, 'attack_confirmed').filter((e) => e.payload.unitId === 'mechanics-source'),
      thresholds = events(t, 'stack_threshold');
    expect(gains.length).toBe(hits.length);
    expect(thresholds.length).toBeGreaterThan(2);
    expect(gains.slice(0, 6).map((e) => e.payload.count)).toEqual([1, 2, 3, 4, 5, 1]);
    const tick = thresholds[0]!.tick;
    const cycle = t.events.filter((e) => e.tick === tick);
    expect(cycle.findIndex((e) => e.type === 'stack_consume')).toBeLessThan(
      cycle.findIndex((e) => e.type === 'heal'),
    );
    expect(events(t, 'heal')[0]!.payload.amount).toBe(75);
    expect(source(t, tick).mechanics!.stacks[0]!.count).toBe(0);
    expect(effectiveStat(source(t, tick), 'attackSpeedMilli')).toBe(1200);
    expect(source(t, tick).statuses.find((s) => s.key === 'bonus-attackSpeedMilli')!.origin).toBe(
      'passive',
    );
    expect(
      source(t, tick).statuses.find((s) => s.key === 'bonus-attackSpeedMilli')!.expiresTick,
    ).toBe(tick + 30);
  });
  it('applies base-relative +4% per stack and preserves existing charge progress', () => {
    const t = runCombat(fixture()),
      first = events(t, 'stack_gain')[0]!;
    const u = source(t, first.tick);
    expect(effectiveStat(u, 'attackSpeedMilli')).toBe(1040);
    expect(u.profile.stats.attackSpeedMilli).toBe(1000);
    expect(
      events(t, 'attack_start')
        .filter((e) => e.payload.unitId === u.id)
        .slice(0, 6)
        .at(-1)!.tick,
    ).toBeLessThan(51);
  });
  it('caps stacks without duplicating a non-consuming threshold', () => {
    const input = fixture(),
      d = input.units[0]!.profile.mechanics!.stacks[0]!;
    d.maxStacks = 3;
    d.consumption = 'none';
    d.thresholds = [
      {
        id: 'once',
        count: 2,
        consume: 0,
        repeatable: false,
        effects: [{ kind: 'shield', target: 'self', radius: 0, amount: 1, duration: 1 }],
      },
    ];
    const t = runCombat(input);
    expect(Math.max(...events(t, 'stack_gain').map((e) => e.payload.count))).toBe(3);
    expect(events(t, 'stack_threshold')).toHaveLength(1);
  });
  it.each(['on_gain', 'keep'] as const)(
    'honors duration refresh %s and removes derived modifiers',
    (refresh) => {
      const input = fixture();
      input.maxTicks = 100;
      const d = input.units[0]!.profile.mechanics!.stacks[0]!;
      d.durationTicks = 12;
      d.refresh = refresh;
      d.thresholds = [];
      const t = runCombat(input),
        gain = events(t, 'stack_gain')[0]!,
        expired = events(t, 'stack_consume').find((e) => e.payload.reason === 'duration');
      if (refresh === 'keep') {
        expect(expired!.tick).toBe(gain.tick + 12);
        expect(source(t, expired!.tick).statuses.some((s) => s.key?.startsWith('stack:'))).toBe(
          false,
        );
      } else expect(expired).toBeUndefined();
    },
  );
  it('supports manual consumption and the seven declared triggers', () => {
    const input = fixture(),
      p = input.units[0]!.profile,
      d = p.mechanics!.stacks[0]!;
    d.consumption = 'manual';
    d.thresholds = [];
    passive(
      input,
      [{ kind: 'stack_consume', target: 'self', radius: 0, stackId: d.id, amount: 2 }],
      { kind: 'attack_hit', every: 3 },
    );
    const t = runCombat(input);
    expect(events(t, 'stack_consume')[0]!.payload).toMatchObject({
      amount: 2,
      reason: 'manual',
      count: 0,
    });
    expect(d.trigger.kind).toBe('attack_hit');
  });
  it.each([
    'ability_cast',
    'damage_dealt',
    'damage_received',
    'kill',
    'combat_start',
    'effect_expired',
  ] as const)('can compile a %s stack source into ordinary passive rules', (kind) => {
    const input = fixture(
        kind === 'kill' ? 'kill-marks' : kind === 'ability_cast' ? 'progress-2' : 'stack-cycle',
      ),
      p = input.units[0]!.profile;
    p.mechanics = {
      version: 1,
      stacks: [
        {
          ...structuredClone(cycleStack),
          id: 'check',
          trigger: kind === 'effect_expired' ? { kind, key: 'short' } : { kind },
          thresholds: [],
        },
      ],
    };
    if (kind === 'effect_expired')
      p.passive = {
        id: 'expiry',
        trigger: 'combat_start',
        effects: [
          { kind: 'shield', target: 'self', radius: 0, amount: 1, duration: 1, key: 'short' },
        ],
      };
    const t = runCombat(input);
    expect(events(t, 'stack_gain').some((e) => e.payload.stackId === 'check')).toBe(true);
  });
  it('ranged basics grant only at impact and retain one attack identity through the projectile', () => {
    const input = fixture();
    input.units[0]!.profile.stats.range = 3;
    const t = runCombat(input),
      launch = events(t, 'projectile_launch')[0]!,
      gain = events(t, 'stack_gain')[0]!,
      hit = events(t, 'attack_confirmed').find((e) => e.payload.unitId === 'mechanics-source')!;
    expect(gain.tick).toBe(launch.payload.impactTick);
    expect(gain.tick).toBeGreaterThan(launch.tick);
    expect(hit.payload.attackId).toBe(launch.payload.attackId);
    expect(new Set(events(t, 'attack_confirmed').map((e) => e.payload.attackId)).size).toBe(
      events(t, 'attack_confirmed').length,
    );
  });
  it('cancelled windups and projectiles whose targets die yield no confirmed stack', () => {
    const input = fixture('simultaneous-credit');
    input.units[0]!.profile.mechanics = { version: 1, stacks: [structuredClone(cycleStack)] };
    input.units[0]!.profile.stats.range = 3;
    input.units[0]!.profile.stats.attackWindupTicks = 6;
    const t = runCombat(input);
    expect(events(t, 'stack_gain')).toHaveLength(0);
    expect(events(t, 'action_cancel').some((e) => e.payload.reason === 'death')).toBe(true);
  });
  it('resets all counters for a new combat and never mutates the profile', () => {
    const input = fixture(),
      t = runCombat(input);
    expect(source(t, 0).mechanics!.stacks[0]!.count).toBe(0);
    expect(
      new CombatEngine(input).snapshot().units[0]!.mechanics!.stacks.every((s) => s.count === 0),
    ).toBe(true);
  });
});
describe('attributed kills and data-driven rewards', () => {
  it.each(['kill-marks', 'periodic-credit', 'environment-credit', 'simultaneous-credit'] as const)(
    '%s records one lethal reference for each dead unit',
    (name) => {
      const t = runCombat(fixture(name)),
        kills = events(t, 'kill_attributed');
      expect(kills.length).toBeGreaterThan(0);
      expect(new Set(kills.map((k) => k.payload.victimId)).size).toBe(kills.length);
      for (const { payload: k } of kills) {
        const lethal = t.events.find(
          (e) => e.tick === k.damageEvent.tick && e.order === k.damageEvent.order,
        )!;
        expect(lethal).toMatchObject({
          type: 'damage',
          payload: { targetId: k.victimId, hpAfter: 0 },
        });
        expect(k.combatId).toBe(t.input.combatId);
      }
    },
  );
  it('credits direct and ranged kills to the original source', () => {
    const direct = runCombat(fixture('kill-marks'));
    expect(events(direct, 'kill_attributed')[0]!.payload.killerId).toBe('mechanics-source');
    const input = fixture('kill-marks');
    input.units[0]!.profile.stats.range = 3;
    const t = runCombat(input);
    expect(events(t, 'projectile_launch').length).toBeGreaterThan(0);
    expect(
      events(t, 'kill_attributed').some(
        (e) => e.payload.cause === 'attack' && e.payload.killerId === 'mechanics-source',
      ),
    ).toBe(true);
  });
  it('periodic damage preserves the source after it dies; environmental damage has no killer', () => {
    const input = fixture('periodic-credit');
    input.units[0]!.profile.stats.maxHp = 1;
    input.units[1]!.profile.stats.attack = 10;
    const ally = structuredClone(input.units[1]!);
    ally.id = 'surviving-ally';
    ally.owner = 'south';
    ally.position = { q: 1, r: 4 };
    ally.profile.stats.maxHp = 10000;
    ally.profile.stats.attack = 0;
    input.units.push(ally);
    const t = runCombat(input),
      kill = events(t, 'kill_attributed').find((e) => e.payload.victimId === 'mechanics-target')!;
    expect(kill.payload).toMatchObject({
      cause: 'periodic',
      killerId: 'mechanics-source',
      sourceId: 'mechanics-source',
    });
    expect(source(t, kill.tick).deathTick).not.toBeNull();
    expect(
      events(runCombat(fixture('environment-credit')), 'kill_attributed')[0]!.payload,
    ).toMatchObject({ cause: 'environment', killerId: null, sourceId: null });
  });
  it('simultaneous committed attacks both retain credit, with no post-mortem rewards', () => {
    const input = fixture('simultaneous-credit');
    passive(input, [{ kind: 'heal', target: 'self', radius: 0, amount: 100 }], { kind: 'kill' });
    const t = runCombat(input);
    expect(t.result.outcome).toBe('double_loss');
    expect(events(t, 'kill_attributed')).toHaveLength(2);
    expect(events(t, 'heal')).toHaveLength(0);
  });
  it('onKill grants one mark and supports heal/shield/AD/AP/AS with normal effects', () => {
    const input = fixture('kill-marks');
    passive(
      input,
      [
        {
          kind: 'modifier',
          target: 'self',
          radius: 0,
          stat: 'abilityPower',
          amount: 10,
          duration: null,
          mode: 'flat',
        },
        {
          kind: 'modifier',
          target: 'self',
          radius: 0,
          stat: 'attackSpeedMilli',
          amount: 10,
          duration: 30,
          mode: 'flat',
        },
      ],
      { kind: 'kill' },
    );
    const t = runCombat(input),
      kills = events(t, 'kill_attributed').filter((e) => e.payload.killerId === 'mechanics-source');
    expect(events(t, 'stack_gain').filter((e) => e.payload.stackId === 'marks')).toHaveLength(
      kills.length,
    );
    expect(events(t, 'shield_apply').length).toBeGreaterThan(0);
    expect(events(t, 'status_apply').some((e) => e.payload.status.stat === 'abilityPower')).toBe(
      true,
    );
  });
  it.each(['reset', 'reduce'] as const)(
    'can %s a declared passive cooldown without resetting its activation cap',
    (mode) => {
      const input = fixture(),
        p = input.units[0]!.profile;
      passive(input, [{ kind: 'shield', target: 'self', radius: 0, amount: 1, duration: 1 }], {
        kind: 'attack_hit',
        every: 1,
      });
      const rules = p.championAbility!.passive!.rules;
      rules[0]!.cooldownTicks = 100;
      rules[0]!.maxActivations = 3;
      rules.push(
        mechanicRule('refresh', { kind: 'attack_hit', every: 1 }, [
          { kind: 'cooldown', target: 'self', radius: 0, ruleId: 'fixture-rule', mode, ticks: 100 },
        ]),
      );
      const t = runCombat(input);
      expect(
        events(t, 'passive_trigger').filter((e) => e.payload.ruleId === 'fixture-rule'),
      ).toHaveLength(3);
      expect(events(t, 'shield_apply')[1]!.tick).toBeLessThan(100);
    },
  );
});
describe('membership is independent from combat progress', () => {
  it('activates 1/1 with unique deployed definitions, excluding bench, copies and stars', () => {
    const trait = fixture('kill-marks').traits![0]!;
    const units = [
      { definitionId: 'one', traits: [trait.id], deployed: false },
      { definitionId: 'one', traits: [trait.id], deployed: true },
      { definitionId: 'one', traits: [trait.id], deployed: true },
    ];
    expect(analyzeTraits(units, [trait])[0]).toMatchObject({
      count: 1,
      active: true,
      nextThreshold: null,
    });
    expect(
      analyzeTraits(
        units.map((u) => ({ ...u, deployed: false })),
        [trait],
      )[0],
    ).toMatchObject({ count: 0, active: false });
  });
  it.each([2, 4, 6] as const)(
    'progressive %s members applies initial stats once and enables the declared rules only',
    (members) => {
      const t = runCombat(fixture(`progress-${members}`));
      expect(effectiveStat(source(t, 0), 'attack')).toBe(22);
      expect(source(t, 0).profile.stats.attack).toBe(20);
      expect(events(t, 'passive_trigger').some((e) => e.payload.ruleId === 'cast-heal')).toBe(
        members >= 4,
      );
      expect(events(t, 'ability_empowered').length > 0).toBe(members === 6);
    },
  );
  it('individual third casts use each unit counter and add a shield to that cast', () => {
    const t = runCombat(fixture('progress-6')),
      emp = events(t, 'ability_empowered').filter((e) => e.payload.unitId === 'mechanics-source');
    expect(emp.length).toBeGreaterThan(1);
    for (const e of emp) {
      const casts = events(t, 'ability_cast').filter(
        (c) =>
          c.payload.unitId === e.payload.unitId && c.payload.stage === 'start' && c.tick <= e.tick,
      );
      expect(casts.length % 3).toBe(0);
    }
    expect(events(t, 'shield_apply').some((e) => e.payload.status.amount === 45)).toBe(true);
  });
  it('shared counter empowers only team casts 3, 6, 9, even when several start in one tick', () => {
    const t = runCombat(fixture('progress-team')),
      emp = events(t, 'ability_empowered');
    expect(emp.length).toBeGreaterThan(1);
    const castIds = events(t, 'ability_cast')
      .filter((e) => e.payload.stage === 'start')
      .map((e) => e.payload.castId);
    for (const e of emp) expect((castIds.indexOf(e.payload.castId) + 1) % 3).toBe(0);
    expect(t.snapshots[1]!.mechanics!.traits).toHaveLength(1);
    expect(t.snapshots[1]!.mechanics!.traits[0]!.casts).toBe(6);
  });
  it('free repeats are additional, do not pay mana or increment counts, and cannot repeat themselves', () => {
    const t = runCombat(fixture('free-repeat')),
      repeat = events(t, 'ability_repeat');
    expect(repeat.some((e) => e.payload.stage === 'resolve')).toBe(true);
    const starts = events(t, 'ability_cast').filter((e) => e.payload.stage === 'start');
    expect(starts.some((e) => e.payload.additional)).toBe(true);
    expect(
      repeat
        .filter((e) => e.payload.stage === 'scheduled')
        .every((e) => !e.payload.parentCastId.startsWith('repeat-')),
    ).toBe(true);
    const last = source(t, t.snapshots.length - 1);
    expect(last.mechanics!.casts).toBe(
      starts.filter((e) => e.payload.unitId === last.id && !e.payload.additional).length,
    );
  });
});
describe('reserved tactical jumps and controlled chains', () => {
  it('lands only on free adjacent cells then attacks exactly once, with critical metadata', () => {
    const t = runCombat(fixture('jump-chain')),
      jumps = events(t, 'jump_start'),
      ends = events(t, 'jump_end').filter((e) => e.payload.outcome === 'landed');
    expect(jumps.length).toBeGreaterThan(1);
    expect(ends.length).toBeGreaterThan(0);
    expect(events(t, 'chain_attack')).toHaveLength(ends.length);
    expect(
      events(t, 'damage').some(
        (e) => e.payload.attackId?.startsWith('chain-') && e.payload.critical,
      ),
    ).toBe(true);
    for (const state of t.snapshots) {
      const keys = state.units
        .filter((u) => u.hp > 0)
        .map((u) => `${u.position.q},${u.position.r}`);
      expect(new Set(keys).size).toBe(keys.length);
      const reservations = state.units.flatMap((u) =>
        u.action?.kind === 'jump' || u.action?.kind === 'move'
          ? [`${u.action.to.q},${u.action.to.r}`]
          : [],
      );
      expect(new Set(reservations).size).toBe(reservations.length);
    }
  });
  it('does not jump when the remaining target has no free adjacent destination', () => {
    const t = runCombat(fixture('jump-blocked'));
    expect(events(t, 'kill_attributed').length).toBeGreaterThan(0);
    expect(events(t, 'jump_start')).toHaveLength(0);
  });
  it('interrupts a reserved jump on stun, emits a cancelled end and does not attack', () => {
    const t = runCombat(fixture('jump-cancel')),
      cancel = events(t, 'jump_end').find((e) => e.payload.outcome === 'cancelled');
    expect(cancel).toBeDefined();
    expect(
      events(t, 'chain_attack').some(
        (e) => e.tick === cancel!.tick && e.payload.unitId === cancel!.payload.unitId,
      ),
    ).toBe(false);
  });
  it('stops chain procs when explicitly disabled', () => {
    const input = fixture('jump-chain'),
      effect = input.units[0]!.profile.championAbility!.passive!.rules[0]!.effects[0]!;
    if (effect.kind !== 'jump') throw Error();
    effect.allowKillChain = false;
    const t = runCombat(input);
    expect(events(t, 'chain_attack').length).toBeGreaterThan(0);
    const roots = t.snapshots.flatMap((s) =>
      s.mechanics!.actions.filter((a) => a.kind === 'jump').map((a) => a.context.depth),
    );
    expect(Math.max(...roots)).toBe(2);
  });
  it('bounds malicious effect feedback and exposes a limit event rather than looping', () => {
    const input = fixture(),
      d = input.units[0]!.profile.mechanics!.stacks[0]!;
    d.trigger = { kind: 'damage_dealt' };
    d.maxStacks = 1;
    d.thresholds = [
      {
        id: 'loop',
        count: 1,
        consume: 1,
        repeatable: true,
        effects: [{ kind: 'damage', target: 'enemies', radius: 14, amount: 1, damageType: 'true' }],
      },
    ];
    const t = runCombat(input);
    expect(events(t, 'mechanics_limit').some((e) => e.payload.reason === 'chain_budget')).toBe(
      true,
    );
    expect(t.events.length).toBeLessThan(50000);
  });
});
describe('new matches opt in without changing economic rules', () => {
  it('uses new rules and deterministic combat IDs while preserving prices, pool, clocks and history', () => {
    let state = createMatch(42, MECHANICS_ECONOMY_CONFIG);
    const offer = state.shop.find((o) => o?.definitionId === 'dolea')!;
    for (const action of [
      { type: 'buy_unit', offerId: offer.id },
      { type: 'move_unit', unitId: 'unit-5', to: { kind: 'board', hex: { q: 0, r: 4 } } },
      { type: 'start_combat' },
    ] as const) {
      const result = applyMatchAction(state, {
        ...action,
        seq: state.nextActionSeq,
        expectedRevision: state.revision,
      });
      if (!result.ok) throw Error(JSON.stringify(result));
      state = result.state;
    }
    expect(state.combat!.input.rulesVersion).toBe(MECHANICS_RULES);
    expect(state.combat!.input.combatId).toBe('match-42-round-1');
    expect(state.gold).toBe(8);
    expect(replayMatch(42, state.history, state.config)).toEqual(state);
    expect(matchTraits(state).find((t) => t.trait.id === 'hortaleza')!.count).toBe(1);
  });
  it('rejects new operations hidden in historical trait effects and unknown stack references', () => {
    const input = createStatsScenario('dolea-advanced', 42);
    input.traits![0]!.thresholds[0]!.effects = [
      { kind: 'stack_gain', target: 'self', radius: 0, stackId: 'unknown', amount: 1 },
    ];
    expect(CombatInputSchema.safeParse(input).success).toBe(false);
    const modern = fixture();
    passive(modern, [
      { kind: 'stack_gain', target: 'self', radius: 0, stackId: 'unknown', amount: 1 },
    ]);
    expect(CombatInputSchema.safeParse(modern).success).toBe(false);
  });
});

describe('mechanics edge cases and explicit causal policies', () => {
  it('confirms a fully shielded valid impact once but does not invent effective damage', () => {
    const input = fixture();
    input.maxTicks = 8;
    input.units[1]!.profile.passive = {
      id: 'full-shield',
      trigger: 'combat_start',
      effects: [{ kind: 'shield', target: 'self', radius: 0, amount: 1000, duration: 20 }],
    };
    const t = runCombat(input),
      hit = events(t, 'damage').find((e) => e.payload.sourceId === 'mechanics-source')!;
    expect(hit.payload).toMatchObject({ amount: 0, absorbed: 60 });
    expect(events(t, 'stack_gain')).toHaveLength(1);
  });
  it('does not confirm a projectile against a target killed before impact', () => {
    const input = fixture();
    input.maxTicks = 10;
    input.units[0]!.profile.stats.range = 3;
    input.units[0]!.profile.stats.attackWindupTicks = 1;
    const victim = input.units[1]!;
    victim.profile.passive = {
      id: 'self-expire',
      trigger: 'combat_start',
      effects: [
        {
          kind: 'periodic',
          target: 'self',
          radius: 0,
          amount: 20000,
          damageType: 'true',
          intervalTicks: 3,
          duration: 5,
          responsible: 'none',
        },
      ],
    };
    const survivor = structuredClone(victim);
    survivor.id = 'other-enemy';
    survivor.position = { q: 3, r: 0 };
    survivor.profile.passive = null;
    input.units.push(survivor);
    const t = runCombat(input);
    expect(events(t, 'projectile_launch').some((e) => e.payload.targetId === victim.id)).toBe(true);
    expect(events(t, 'attack_confirmed').some((e) => e.payload.targetId === victim.id)).toBe(false);
  });
  it('counts independent normal and chain impacts separately, never by animation', () => {
    const input = fixture('jump-chain');
    input.units[0]!.profile.mechanics = { version: 1, stacks: [structuredClone(cycleStack)] };
    const jump = input.units[0]!.profile.championAbility!.passive!.rules[0]!.effects[0]!;
    if (jump.kind !== 'jump') throw Error();
    jump.allowKillChain = false;
    const t = runCombat(input);
    const ids = events(t, 'attack_confirmed').filter(
      (e) => e.payload.unitId === 'mechanics-source',
    );
    expect(ids.length).toBeGreaterThan(3);
    expect(events(t, 'stack_gain')).toHaveLength(ids.length);
  });
  it('cancels landing when its locked target dies and releases the reserved destination', () => {
    const input = fixture('jump-chain');
    const target = input.units.find((u) => u.id === 'victim-b')!;
    target.profile.passive = {
      id: 'self-expire',
      trigger: 'combat_start',
      effects: [
        {
          kind: 'periodic',
          target: 'self',
          radius: 0,
          amount: 70,
          damageType: 'true',
          intervalTicks: 4,
          duration: 5,
          responsible: 'none',
        },
      ],
    };
    const t = runCombat(input),
      start = events(t, 'jump_start').find((e) => e.payload.targetId === target.id)!;
    expect(start).toBeDefined();
    const end = events(t, 'jump_end').find((e) => e.payload.actionId === start.payload.actionId)!;
    expect(end.payload.outcome).toBe('cancelled');
    expect(events(t, 'chain_attack').some((e) => e.payload.targetId === target.id)).toBe(false);
  });
  it('re-targets a jump only to a living adjacent enemy when explicitly allowed', () => {
    const input = fixture('jump-chain'),
      e = input.units[0]!.profile.championAbility!.passive!.rules[0]!.effects[0]!;
    if (e.kind !== 'jump') throw Error();
    e.retarget = 'adjacent';
    const victim = input.units.find((u) => u.id === 'victim-b')!;
    victim.profile.passive = {
      id: 'self-expire',
      trigger: 'combat_start',
      effects: [
        {
          kind: 'periodic',
          target: 'self',
          radius: 0,
          amount: 70,
          damageType: 'true',
          intervalTicks: 4,
          duration: 5,
          responsible: 'none',
        },
      ],
    };
    const t = runCombat(input);
    for (const landed of events(t, 'jump_end').filter((e) => e.payload.outcome === 'landed')) {
      const target = t.snapshots[landed.tick]!.units.find((u) => u.id === landed.payload.targetId)!;
      expect(target.deathTick === null || target.deathTick === landed.tick).toBe(true);
    }
  });
  it('removes stacks and per-stack modifiers when their granting source dies', () => {
    const input = fixture();
    input.maxTicks = 10;
    const giver = input.units[1]!;
    giver.profile.stats.maxHp = 1;
    giver.profile.passive = {
      id: 'grant',
      trigger: 'combat_start',
      effects: [{ kind: 'stack_gain', target: 'enemies', radius: 14, stackId: 'tempo', amount: 1 }],
    };
    const t = runCombat(input),
      removed = events(t, 'stack_consume').find(
        (e) => e.payload.reason === 'death' && e.payload.sourceId === giver.id,
      );
    expect(removed).toBeDefined();
    expect(source(t, removed!.tick).mechanics!.stacks[0]!.sourceId).toBe('mechanics-source');
  });
  it('a cancelled original cast cancels its pending free repeat', () => {
    const input = fixture('free-repeat'),
      p = input.units[0]!.profile;
    const rule = p.championAbility!.passive!.rules[0]!;
    rule.trigger = { kind: 'ability_cast', every: 1 };
    p.championAbility!.active!.castTicks = 8;
    const stunner = input.units.at(-1)!;
    stunner.profile.stats.startingMana = 1;
    stunner.profile.stats.maxMana = 1;
    stunner.profile.ability = {
      id: 'interrupt-repeat',
      name: 'Interrupt',
      manaCost: 1,
      castTicks: 2,
      effects: [{ kind: 'stun', target: 'enemies', radius: 14, duration: 20 }],
    };
    const t = runCombat(input),
      scheduled = events(t, 'ability_repeat').find(
        (e) => e.payload.unitId === 'mechanics-source' && e.payload.stage === 'scheduled',
      )!;
    const stages = events(t, 'ability_repeat')
      .filter((e) => e.payload.actionId === scheduled.payload.actionId)
      .map((e) => e.payload.stage);
    expect(stages).toEqual(['scheduled', 'cancel']);
  });
  it('an additional counted cast updates the counter without recursively scheduling a repeat', () => {
    const input = fixture('free-repeat');
    for (const unit of input.units) {
      const e = unit.profile.championAbility?.passive?.rules[0]?.effects[0];
      if (e?.kind === 'ability_repeat') e.countAsCast = true;
    }
    const t = runCombat(input),
      starts = events(t, 'ability_cast').filter(
        (e) => e.payload.unitId === 'mechanics-source' && e.payload.stage === 'start',
      );
    expect(source(t, t.result.tick).mechanics!.casts).toBe(starts.length);
    expect(
      events(t, 'ability_repeat')
        .filter((e) => e.payload.stage === 'scheduled')
        .every((e) => !e.payload.parentCastId.startsWith('repeat-')),
    ).toBe(true);
  });
  it('serializes causal budgets and never exceeds the declared jump-chain depth', () => {
    const input = fixture('jump-chain'),
      e = input.units[0]!.profile.championAbility!.passive!.rules[0]!.effects[0]!;
    if (e.kind !== 'jump') throw Error();
    e.maxChain = 2;
    const t = runCombat(input),
      records = t.snapshots.flatMap((s) => s.mechanics!.actions);
    expect(records.length).toBeGreaterThan(0);
    expect(
      records.every(
        (a) => a.context.depth <= 8 && a.context.remaining >= 0 && a.context.remaining < 2,
      ),
    ).toBe(true);
    expect(events(t, 'mechanics_limit').length).toBeGreaterThan(0);
  });
});
