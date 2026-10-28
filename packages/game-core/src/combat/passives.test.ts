import { expect, it } from 'vitest';
import { CURRENT_COMBAT_RULES, type ChampionAbility, type PassiveRule } from '@tft/shared';
import { DOLEA_ABILITY, createAbilityScenario } from '@tft/game-data';
import { runCombat } from './engine';
import { effectiveStat } from './math';
import { input, spec } from './fixtures.test-support';
const rule = (trigger: PassiveRule['trigger']): PassiveRule => ({
  id: 'generic',
  trigger,
  conditions: [],
  maxActivations: 3,
  cooldownTicks: 0,
  effects: [{ kind: 'shield', target: 'self', radius: 0, amount: 10, duration: 2, key: 'pulse' }],
});
function subject(rules: PassiveRule[], active = false) {
  const u = spec(
    'a',
    'south',
    { q: 0, r: 4 },
    { maxHp: 1000, attack: 20, maxMana: active ? 70 : 0, startingMana: active ? 70 : 0 },
  );
  const a = structuredClone(DOLEA_ABILITY);
  const passive = { name: 'Diagnostic', description: 'Generic trigger test', rules };
  u.profile.championAbility = active
    ? ({ ...a, passive, active: { ...a.active!, initialMana: 70 } } as ChampionAbility)
    : { ...a, type: 'passive', active: null, passive };
  return u;
}
const opponent = () => spec('b', 'north', { q: 0, r: 3 }, { maxHp: 10000, attack: 10 });
const simulate = (u: ReturnType<typeof subject>, b = opponent(), maxTicks = 80) =>
  runCombat(input([u, b], { rulesVersion: CURRENT_COMBAT_RULES, maxTicks }));
it.each(['combat_start', 'damage_received', 'ability_cast', 'kill', 'effect_expired'] as const)(
  'dispatches generic %s without character-specific code',
  (kind) => {
    const r = rule({ kind });
    const rules =
      kind === 'effect_expired' ? [{ ...rule({ kind: 'combat_start' }), id: 'initial' }, r] : [r];
    const u = subject(rules, kind === 'ability_cast');
    const b = opponent();
    if (kind === 'kill') b.profile.stats.maxHp = 1;
    const t = simulate(u, b);
    expect(
      t.events.some(
        (e) =>
          e.type === 'passive_trigger' &&
          e.payload.ruleId === 'generic' &&
          e.payload.trigger === kind,
      ),
    ).toBe(true);
    expect(
      t.snapshots.every((s) =>
        s.units.every(
          (u) => !u.passiveState || Object.values(u.passiveState).every((r) => r.count <= 3),
        ),
      ),
    ).toBe(true);
  },
);
it('counts every second released attack, caps activations, cooldown and conditions', () => {
  const r = rule({ kind: 'attack', every: 2 });
  r.cooldownTicks = 30;
  r.maxActivations = 2;
  const t = simulate(subject([r]));
  const triggers = t.events.filter((e) => e.type === 'passive_trigger');
  expect(triggers).toHaveLength(2);
  expect(triggers[1]!.tick - triggers[0]!.tick).toBeGreaterThanOrEqual(30);
  const blocked = rule({ kind: 'combat_start' });
  blocked.conditions = [{ kind: 'hp_below', ratioMilli: 500 }];
  expect(simulate(subject([blocked])).events.some((e) => e.type === 'passive_trigger')).toBe(false);
});
it('temporary max HP raises current/max HP together and expiration clamps without changing base', () => {
  const r = rule({ kind: 'combat_start' });
  r.effects = [
    { kind: 'modifier', stat: 'maxHp', target: 'self', radius: 0, amount: 100, duration: 2 },
  ];
  const t = simulate(subject([r]));
  expect(t.snapshots[0]!.units[0]!.hp).toBe(1100);
  expect(effectiveStat(t.snapshots[0]!.units[0]!, 'maxHp')).toBe(1100);
  expect(t.snapshots[2]!.units[0]!.hp).toBeLessThanOrEqual(1000);
  expect(t.snapshots[0]!.units[0]!.profile.stats.maxHp).toBe(1000);
});
it('refreshes effects by key, does not stack armor, consumes mana once and stun cancels cast', () => {
  const r = rule({ kind: 'attack', every: 1 });
  r.effects = [
    {
      kind: 'modifier',
      stat: 'armor',
      target: 'self',
      radius: 0,
      amount: 20,
      duration: 40,
      key: 'armor',
      stacking: 'refresh',
    },
  ];
  const t = simulate(subject([r]));
  expect(t.snapshots.every((s) => effectiveStat(s.units[0]!, 'armor') <= 20)).toBe(true);
  const u = subject([rule({ kind: 'combat_start' })], true);
  const b = opponent();
  b.profile.stats.startingMana = 1;
  b.profile.ability = {
    id: 'interrupt',
    name: 'interrupt',
    manaCost: 1,
    castTicks: 1,
    effects: [{ kind: 'stun', target: 'target', radius: 0, duration: 10 }],
  };
  const interrupted = simulate(u, b, 8);
  expect(
    interrupted.events.some(
      (e) => e.type === 'action_cancel' && e.payload.unitId === 'a' && e.payload.reason === 'stun',
    ),
  ).toBe(true);
  expect(
    interrupted.events.some(
      (e) => e.type === 'ability_cast' && e.payload.unitId === 'a' && e.payload.stage === 'resolve',
    ),
  ).toBe(false);
});
it.each([
  'ability-1',
  'ability-2',
  'ability-3',
  'traits-2',
  'traits-3',
  'passive-overtime',
] as const)('diagnostic %s is serializable and deterministic', (scenario) => {
  const i = createAbilityScenario(scenario, 42);
  const t = runCombat(i);
  expect(runCombat(JSON.parse(JSON.stringify(i)))).toEqual(t);
  expect(
    i.units
      .filter((u) => u.owner === 'south')
      .map((u) => u.definitionId)
      .every((id) => ['dolea', 'test-k01', 'test-v02'].includes(id)),
  ).toBe(true);
});
