import { describe, it, expect } from 'vitest';
import {
  createVargasScenario,
  VARGAS_SCENARIOS,
  VARGAS_ECONOMY_CONFIG,
  VARGAS_ABILITY,
  VARGAS_COMBAT_PROFILES,
  MECHANICS_ECONOMY_CONFIG,
  CHARACTER_ROSTER,
  matchCatalog,
} from '@tft/game-data';
import {
  CombatInputSchema,
  CombatEventV3Schema,
  CombatStateSchema,
  type CombatEventV3,
  type CombatInput,
} from '@tft/shared';
import { runCombat } from './engine';
import { scaledProfile, matchTraits } from '../match/selectors';
import { createMatch } from '../match/engine';
import { effectiveStat } from './math';
import { overtimeModifiers, scaleCombatAmount } from './overtime';
const events = <T extends CombatEventV3['type']>(t: ReturnType<typeof runCombat>, type: T) =>
  t.events.filter((e): e is Extract<CombatEventV3, { type: T }> => e.type === type);
const source = (t: ReturnType<typeof runCombat>, tick: number, id = 'diagnostic-vargas') =>
  t.snapshots[tick]!.units.find((u) => u.id === id)!;
const fixture = () => createVargasScenario('vargas-1', 42);
function castFixture(stars: 1 | 2 | 3): CombatInput {
  const input = fixture(),
    p = input.units[0]!.profile;
  input.units[0]!.profile = scaledProfile('vargas', stars, VARGAS_ECONOMY_CONFIG);
  // Consistent authored mana and an early wound before the first spell lands.
  const principal = input.units[0]!.profile.championAbility!;
  principal.active!.initialMana = 70;
  input.units[0]!.profile.stats.startingMana = 70;
  input.units[1]!.profile.stats.attack = 100;
  input.units[1]!.profile.stats.attackSpeedMilli = 1;
  p.stats.armor = 25;
  input.maxTicks = 15;
  return input;
}
describe('VARGAS B3 data and versioning', () => {
  it('adds exactly one cost-3 assassin without editing old catalogs or economy', () => {
    expect(CHARACTER_ROSTER).toHaveLength(5);
    expect(matchCatalog(VARGAS_ECONOMY_CONFIG)).toHaveLength(6);
    expect(matchCatalog(VARGAS_ECONOMY_CONFIG).at(-1)).toMatchObject({
      id: 'vargas',
      cost: 3,
      role: 'assassin',
      synergies: ['upm', 'el-depredador'],
    });
    expect(VARGAS_ECONOMY_CONFIG).toEqual({ ...MECHANICS_ECONOMY_CONFIG, catalog: 'f0p6b3' });
    expect(VARGAS_COMBAT_PROFILES.vargas!.stats).toMatchObject({
      maxHp: 700,
      attack: 70,
      abilityPower: 0,
      attackSpeedMilli: 800,
      armor: 25,
      magicResist: 25,
      critChanceMilli: 200,
      critMultiplierMilli: 1500,
      maxMana: 70,
      startingMana: 0,
      range: 1,
    });
    expect(VARGAS_ABILITY).toMatchObject({
      name: 'Copita Perhaps',
      type: 'mixed',
      passive: { name: 'Resaca Controlada' },
      active: { name: 'Blackhaus RPP' },
    });
  });
  it.each(VARGAS_SCENARIOS)('%s deterministically roundtrips real mechanics', (name) => {
    const input = createVargasScenario(name, 42),
      before = JSON.stringify(input),
      trace = runCombat(input);
    expect(runCombat(input)).toEqual(trace);
    expect(JSON.stringify(input)).toBe(before);
    expect(trace.result.tick).toBeLessThanOrEqual(450);
    for (const e of trace.events) expect(CombatEventV3Schema.parse(e)).toEqual(e);
    for (const s of trace.snapshots) expect(CombatStateSchema.parse(s)).toEqual(s);
  });
  it('rejects B3 operations under B2 rules', () => {
    const input = fixture();
    input.rulesVersion = 'f0p6b2-1';
    expect(() => CombatInputSchema.parse(input)).toThrow();
  });
  it('unique trait counts deployed definitions once and excludes bench', () => {
    const s = createMatch(42, VARGAS_ECONOMY_CONFIG);
    s.units = [{ id: 'a', definitionId: 'vargas', stars: 1, location: { kind: 'bench', slot: 0 } }];
    expect(matchTraits(s).find((t) => t.trait.id === 'el-depredador')!.count).toBe(0);
    s.units[0]!.location = { kind: 'board', hex: { q: 0, r: 4 } };
    s.units.push({
      ...s.units[0]!,
      id: 'b',
      stars: 3,
      location: { kind: 'board', hex: { q: 1, r: 4 } },
    });
    const row = matchTraits(s).find((t) => t.trait.id === 'el-depredador')!;
    expect(row.count).toBe(1);
    expect(row.active).toBe(true);
  });
});
describe('Resaca and Blackhaus', () => {
  it('confirmed basics cycle at five, remove stack speed, heal, and permit coexistence with the next cycle', () => {
    const t = runCombat(fixture()),
      hits = events(t, 'attack_confirmed').filter((e) => e.payload.unitId === 'diagnostic-vargas');
    expect(hits.length).toBeGreaterThan(10);
    const thresholds = events(t, 'stack_threshold').filter((e) => e.payload.stackId === 'resaca');
    expect(thresholds.length).toBeGreaterThan(1);
    for (const e of thresholds) {
      expect(e.payload.count).toBe(5);
      const unit = source(t, e.tick);
      expect(unit.mechanics!.stacks.find((s) => s.definitionId === 'resaca')!.count).toBe(0);
      expect(
        unit.statuses.some(
          (s) => s.key === 'resaca-speed' && s.amount === 200 && s.expiresTick === e.tick + 30,
        ),
      ).toBe(true);
    }
    expect(
      t.snapshots.some((s) => {
        const u = s.units.find((u) => u.id === 'diagnostic-vargas')!;
        return (
          u.mechanics!.stacks[0]!.count > 0 && u.statuses.some((s) => s.key === 'resaca-speed')
        );
      }),
    ).toBe(true);
    expect(
      events(t, 'heal').some(
        (e) =>
          thresholds.some((th) => th.tick === e.tick) && e.payload.sourceId === 'diagnostic-vargas',
      ),
    ).toBe(true);
    expect(events(t, 'stack_gain').filter((e) => e.payload.stackId === 'resaca')).toHaveLength(
      hits.length,
    );
    expect(source(t, 0).mechanics!.stacks.every((s) => s.count === 0)).toBe(true);
  });
  it.each([1, 2, 3] as const)(
    '%s★ uses one star scale, effective AD ratio, actual HP healing and matching buff duration',
    (stars) => {
      const t = runCombat(castFixture(stars));
      const spell = events(t, 'damage').find(
        (e) => e.payload.sourceId === 'diagnostic-vargas' && e.payload.cause === 'ability',
      )!;
      expect(spell).toBeDefined();
      const ad = [70, 126, 226][stars - 1]!,
        ratio = [2800, 4200, 7000][stars - 1]!;
      expect(spell.payload.amount).toBe(Math.floor((ad * ratio) / 1000));
      expect(spell.payload.critical).toBe(false);
      const healing = events(t, 'heal').find(
        (e) => e.tick === spell.tick && e.payload.sourceId === 'diagnostic-vargas',
      )!;
      const missing =
        effectiveStat(source(t, spell.tick - 1), 'maxHp') - source(t, spell.tick - 1).hp;
      expect(healing.payload.amount).toBe(
        Math.min(missing, Math.floor((spell.payload.amount * [150, 200, 300][stars - 1]!) / 1000)),
      );
      const buff = events(t, 'status_apply').find(
        (e) =>
          e.tick === spell.tick &&
          e.payload.unitId === 'diagnostic-vargas' &&
          e.payload.status.key === 'blackhaus-speed',
      )!;
      expect(buff.payload.status.amount).toBe([250, 350, 500][stars - 1]);
      expect(buff.payload.status.expiresTick).toBe(spell.tick + [30, 40, 50][stars - 1]!);
      expect(buff.order).toBeGreaterThan(spell.order);
      expect(healing.order).toBeGreaterThan(spell.order);
      expect(buff.order).toBeGreaterThan(healing.order);
      expect(
        source(t, spell.tick).mechanics!.stacks.find((s) => s.definitionId === 'resaca')!.count,
      ).toBe(0);
    },
  );
  it('casts naturally at 70 mana and never credits the special as a basic', () => {
    const t = runCombat(fixture()),
      starts = events(t, 'ability_cast').filter(
        (e) => e.payload.unitId === 'diagnostic-vargas' && e.payload.stage === 'start',
      );
    expect(starts.length).toBeGreaterThan(0);
    expect(starts[0]!.payload.manaAfter).toBe(0);
    expect(starts[0]!.tick).toBeGreaterThan(10);
  });
  it('spell crit permission is explicit and configurable independently from basic crits', () => {
    const input = castFixture(1);
    input.units[0]!.profile.stats.critChanceMilli = 1000;
    const no = runCombat(input);
    expect(
      events(no, 'damage').find(
        (e) => e.payload.sourceId === 'diagnostic-vargas' && e.payload.cause === 'ability',
      )!.payload.critical,
    ).toBe(false);
    const damage = input.units[0]!.profile.championAbility!.active!.effects[0]!;
    if (damage.kind !== 'damage') throw Error();
    damage.canCrit = true;
    const yes = runCombat(input);
    expect(
      events(yes, 'damage').find(
        (e) => e.payload.sourceId === 'diagnostic-vargas' && e.payload.cause === 'ability',
      )!.payload,
    ).toMatchObject({ critical: true, amount: 294 });
  });
  it('overkill and shields are excluded from damage-based recovery', () => {
    const input = castFixture(1),
      target = input.units[1]!;
    target.profile.stats.maxHp = 10;
    target.profile.passive = {
      id: 'shield',
      trigger: 'combat_start',
      effects: [{ kind: 'shield', target: 'self', radius: 0, amount: 100, duration: 30 }],
    };
    const t = runCombat(input),
      hit = events(t, 'damage').find(
        (e) => e.payload.sourceId === 'diagnostic-vargas' && e.payload.cause === 'ability',
      )!;
    expect(hit.payload).toMatchObject({ amount: 10, absorbed: 100 });
    expect(
      events(t, 'heal').find((e) => e.payload.sourceId === 'diagnostic-vargas')!.payload.amount,
    ).toBe(1);
  });
  it('applies Overtime healing reduction after actual damage, once', () => {
    const input = fixture(),
      v = input.units[0]!,
      target = input.units[1]!;
    v.profile.mechanics!.stacks[0]!.thresholds[0]!.effects =
      v.profile.mechanics!.stacks[0]!.thresholds[0]!.effects.filter((e) => e.kind !== 'heal');
    v.profile.stats.maxHp = 20000;
    v.profile.stats.attack = 20;
    target.profile.stats.attack = 10;
    target.profile.stats.maxHp = 100000;
    const t = runCombat(input),
      hit = events(t, 'damage').find(
        (e) => e.tick >= 300 && e.payload.sourceId === v.id && e.payload.cause === 'ability',
      )!;
    expect(hit).toBeDefined();
    const recovery = events(t, 'heal').find(
      (e) => e.tick === hit.tick && e.payload.sourceId === v.id,
    )!;
    const expected = scaleCombatAmount(
      Math.floor((hit.payload.amount * 150) / 1000),
      overtimeModifiers(hit.tick, input.overtime).healMilli,
    );
    if (expected > 0) expect(recovery.payload.amount).toBe(expected);
    else expect(recovery).toBeUndefined();
  });
});
describe('UPM and El Depredador actual data', () => {
  it.each([2, 4, 6])(
    'UPM %s gives +100 HP and +20 AP only once and tracks individual natural casts',
    (members) => {
      const input = createVargasScenario(`upm-${members}` as 'upm-2', 42),
        t = runCombat(input),
        unit = t.snapshots[0]!.units.find((u) => u.id === 'mechanics-source')!;
      expect(effectiveStat(unit, 'maxHp')).toBe(input.units[0]!.profile.stats.maxHp + 100);
      expect(effectiveStat(unit, 'abilityPower')).toBe(
        input.units[0]!.profile.stats.abilityPower! + 20,
      );
      const starts = events(t, 'ability_cast').filter(
        (e) => e.payload.unitId === unit.id && e.payload.stage === 'start' && !e.payload.additional,
      );
      expect(source(t, t.result.tick, unit.id).mechanics!.casts).toBe(starts.length);
      expect(starts.length).toBeGreaterThan(0);
      expect(
        t.snapshots
          .at(-1)!
          .mechanics!.traits.find((p) => p.traitId === 'upm' && p.unitId === unit.id)!.casts,
      ).toBe(starts.length);
      const empower = events(t, 'ability_empowered').filter((e) => e.payload.unitId === unit.id);
      expect(empower.length).toBe(members === 6 ? Math.floor(starts.length / 3) : 0);
      if (members === 6) {
        const repeats = events(t, 'ability_repeat').filter(
          (e) => e.payload.stage === 'resolve' && e.payload.unitId === unit.id,
        );
        expect(repeats.length).toBeGreaterThan(0);
        for (const a of t.snapshots
          .flatMap((s) => s.mechanics!.actions)
          .filter((a) => a.kind === 'repeat'))
          expect(a.context).toMatchObject({
            additional: true,
            grantMana: false,
            countAsCast: false,
            allowSourceProcs: false,
          });
      }
    },
  );
  it('UPM four heals on casts, not on free repetitions', () => {
    const t = runCombat(createVargasScenario('upm-6', 42));
    const rules = events(t, 'passive_trigger').filter((e) => e.payload.ruleId === 'upm-cast-heal');
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.length).toBe(
      events(t, 'ability_cast').filter((e) => e.payload.stage === 'start' && !e.payload.additional)
        .length,
    );
  });
  it('predator attribution grants AD, fourth bonus once, extra healing from kill three and jumps from kill seven', () => {
    const t = runCombat(createVargasScenario('depredador-10', 42));
    const kills = events(t, 'kill_attributed').filter(
      (e) => e.payload.killerId === 'diagnostic-vargas',
    );
    expect(kills.length).toBeGreaterThanOrEqual(8);
    const gains = events(t, 'stack_gain').filter((e) => e.payload.stackId === 'depredador');
    expect(gains.length).toBe(kills.length);
    const fourth = events(t, 'stack_threshold').filter(
      (e) => e.payload.thresholdId === 'depredador-four',
    );
    expect(fourth).toHaveLength(1);
    expect(effectiveStat(source(t, fourth[0]!.tick), 'attack')).toBe(70 + 4 * 5 + 15);
    const extra = events(t, 'passive_trigger').filter(
      (e) => e.payload.ruleId === 'predator-extra-heal',
    );
    expect(extra[0]!.tick).toBe(kills[2]!.tick);
    const jumps = events(t, 'passive_trigger').filter((e) => e.payload.ruleId === 'predator-jump');
    expect(jumps[0]!.tick).toBe(kills[6]!.tick);
    expect(new Set(jumps.map((e) => `${e.tick}:${e.payload.activation}`)).size).toBe(jumps.length);
    expect(events(t, 'chain_attack').length).toBeGreaterThan(0);
    expect(
      t.snapshots
        .flatMap((s) => s.mechanics!.actions)
        .every((a) => a.context.depth <= 8 && a.context.remaining >= 0),
    ).toBe(true);
  });
});
