import { expect, it } from 'vitest';
import {
  P13_ECONOMY_CONFIG,
  P13S_ECONOMY_CONFIG,
  P13T1_ECONOMY_CONFIG,
  combatRulesFor,
  matchCatalog,
  traitsFor,
} from '@tft/game-data';
import { EconomyConfigSchema } from '@tft/shared';
import { createMatch, commandFor, applyMatchAction } from './engine';
import { validateMatchState } from './invariants';
import { scaledProfile } from './selectors';
import { runCombat } from '../combat/engine';

it('production composes new characters and full synergies with one Jew payer, retaining old presets', () => {
  expect(P13_ECONOMY_CONFIG.jewPolicy).toBeUndefined();
  expect(() =>
    EconomyConfigSchema.parse({ ...P13_ECONOMY_CONFIG, jewPolicy: P13T1_ECONOMY_CONFIG.jewPolicy }),
  ).toThrow();
  expect(
    combatRulesFor(
      P13_ECONOMY_CONFIG.catalog,
      P13_ECONOMY_CONFIG.characterPolicy,
      P13_ECONOMY_CONFIG.synergyPolicy,
    ),
  ).toBe('f0p13-1');
  expect(combatRulesFor(P13S_ECONOMY_CONFIG.catalog, P13S_ECONOMY_CONFIG.synergyPolicy)).toBe(
    'f0p13s-1',
  );
  expect(combatRulesFor(P13T1_ECONOMY_CONFIG.catalog, P13T1_ECONOMY_CONFIG.characterPolicy)).toBe(
    'f0p13t-1',
  );
  expect(matchCatalog(P13_ECONOMY_CONFIG)).toHaveLength(34);
  expect(
    matchCatalog(P13_ECONOMY_CONFIG).find((u) => u.id === 'peibol')!.provisional,
  ).toBeUndefined();
  const profile = scaledProfile('peibol', 1, P13_ECONOMY_CONFIG);
  expect(profile.stats.range).toBe(3);
  expect(profile.championAbility?.id).toBe(
    scaledProfile('peibol', 1, P13T1_ECONOMY_CONFIG).championAbility?.id,
  );
  expect(
    traitsFor(P13_ECONOMY_CONFIG.catalog, P13_ECONOMY_CONFIG.synergyPolicy).find(
      (t) => t.id === 'jew',
    )?.planning?.effectState,
  ).toBe('implemented');
});
it.each([1, 2, 3] as const)(
  'combined %i★ replay runs new Jaramillo/Peibol mechanics and full synergy settlement once',
  (stars) => {
    let s = createMatch(42, { ...P13_ECONOMY_CONFIG, initialGold: 71 });
    s.level = 7;
    s.xp = 0;
    s.units = ['jaramillo', 'peibol', 'dolea'].map((definitionId, i) => ({
      id: 'combined-' + i,
      definitionId,
      stars,
      location: { kind: 'board' as const, hex: { q: i - 1, r: 4 } },
    }));
    for (const u of s.units) s.pool[u.definitionId]! -= s.config.starCopies[stars - 1]!;
    s = validateMatchState(s);
    const started = applyMatchAction(s, commandFor(s, { type: 'start_combat' }));
    if (!started.ok) throw Error(started.error);
    const input = started.state.combat!.input;
    expect(input.rulesVersion).toBe('f0p13-1');
    const replay = runCombat(input);
    expect(replay.snapshots[0]!.synergies?.version).toBe('f0p13s-1');
    expect(
      replay.input.units
        .find((u) => u.definitionId === 'jaramillo' && u.owner === 'south')
        ?.profile.mechanics?.stacks.some((x) => x.scope === 'per_enemy'),
    ).toBe(true);
    const command = commandFor(started.state, { type: 'resolve_round', round: 1 });
    const settled = applyMatchAction(started.state, command);
    if (!settled.ok) throw Error(settled.error);
    const interest = settled.state.synergies!.receipts.filter((r) => r.kind === 'interest');
    expect(interest).toHaveLength(1);
    expect(interest[0]!.gold).toBe([2, 4, 8][stars - 1]);
    expect(settled.state.lastReward?.jew).toBeUndefined();
    expect(settled.state.ledger.some((e) => e.reason === 'jew_interest')).toBe(false);
    expect(applyMatchAction(settled.state, command).ok).toBe(false);
  },
);
