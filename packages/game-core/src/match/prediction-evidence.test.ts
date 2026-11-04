import { expect, it } from 'vitest';
import { CombatEventV3Schema, type CombatReplay } from '@tft/shared';
import { P13S_ECONOMY_CONFIG } from '@tft/game-data';
import { scaledProfile } from './selectors';
import { predictionEvidence } from './synergies';
import { runCombat } from '../combat/engine';
/** Authored reducer-contract trace. Values are explicit fixture inputs, never inferred from animation. */
function trace(): CombatReplay {
  const p = scaledProfile('cosmin', 1, P13S_ECONOMY_CONFIG);
  p.stats = {
    ...p.stats,
    maxHp: 100,
    attack: 0,
    maxMana: 0,
    startingMana: 0,
    armor: 0,
    magicResist: 0,
  };
  p.traits = [];
  const r = runCombat({
    protocolVersion: 3,
    rulesVersion: 'f0p13s-1',
    combatId: 'prediction-fixture',
    seed: 1,
    maxTicks: 310,
    obstacles: [],
    units: [
      { id: 'tank', definitionId: 'cosmin', owner: 'south', position: { q: -1, r: 4 }, profile: p },
      { id: 'ally', definitionId: 'cosmin', owner: 'south', position: { q: 0, r: 4 }, profile: p },
      {
        id: 'x',
        definitionId: 'cosmin',
        owner: 'north',
        position: { q: 0, r: 2 },
        profile: { ...p, stats: { ...p.stats, maxHp: 150 } },
      },
      {
        id: 'y',
        definitionId: 'cosmin',
        owner: 'north',
        position: { q: 1, r: 2 },
        profile: { ...p, stats: { ...p.stats, maxHp: 150 } },
      },
    ],
    overtime: {
      damageMilli: [1250, 2000],
      attackSpeedMilli: [1200, 1750],
      healMilli: [800, 400],
      shieldMilli: [800, 400],
    },
  });
  const event = (type: string, tick: number, payload: unknown) =>
    CombatEventV3Schema.parse({ protocolVersion: 3, type, tick, order: 0, payload });
  const damage = (
    tick: number,
    targetId: string,
    amount: number,
    hpAfter: number,
    sourceId = 'x',
  ) =>
    event('damage', tick, {
      sourceId,
      targetId,
      amount,
      absorbed: 0,
      hpAfter,
      shieldAfter: 0,
      damageType: 'physical',
      cause: 'attack',
      impact: { q: 0, r: 4 },
    });
  const death = (id: string, tick: number) =>
    event('unit_death', tick, { unitId: id, position: { q: 0, r: 4 } });
  const kill = (id: string, tick: number) =>
    event('kill_attributed', tick, {
      combatId: 'prediction-fixture',
      victimId: id,
      killerId: 'tank',
      sourceId: 'tank',
      damageType: 'physical',
      cause: 'attack',
      damageEvent: { tick: tick - 1, order: 0 },
      causalId: `hit-${id}`,
    });
  r.result = { outcome: 'win', winner: 'south', reason: 'elimination', tick: 310 };
  r.events = [
    r.events[0]!,
    damage(10, 'tank', 80, 20),
    damage(11, 'ally', 100, 0),
    death('ally', 12),
    kill('x', 14),
    death('x', 15),
    kill('y', 19),
    death('y', 20),
    ...r.events.filter((e) => e.type === 'overtime_start'),
    event('combat_end', 310, r.result),
  ];
  const last = structuredClone(r.snapshots.at(-1)!);
  last.result = r.result;
  for (const u of last.units) {
    if (u.id !== 'tank') {
      u.hp = 0;
      u.deathTick = u.id === 'ally' ? 12 : 20;
    } else u.hp = 20;
  }
  r.snapshots = [r.snapshots[0]!, last];
  return r;
}
it('eight predictions follow event evidence: wins, explicit losses, attribution, ten-tick window and health minima', () => {
  const r = trace(),
    evaluate = predictionEvidence(r);
  for (const k of ['survival', 'comeback', 'underdog', 'double-kill', 'overtime'] as const)
    expect(evaluate(k), k).toBe(true);
  expect(evaluate('individual-comeback', 'tank')).toBe(true);
  expect(evaluate('wall', 'tank')).toBe(true);
  expect(evaluate('untouchable', 'tank')).toBe(false);
  expect(evaluate('untouchable', 'missing')).toBe(false);
  const lost = structuredClone(r);
  lost.result = { ...lost.result, winner: 'north' };
  const fail = predictionEvidence(lost);
  for (const k of ['survival', 'comeback', 'underdog', 'overtime'] as const)
    expect(fail(k)).toBe(false);
  const noAttribution = structuredClone(r);
  noAttribution.events = noAttribution.events.filter((e) => e.type !== 'kill_attributed');
  expect(predictionEvidence(noAttribution)('individual-comeback', 'tank')).toBe(false);
  const window = structuredClone(r);
  window.events.find((e) => e.type === 'unit_death' && e.payload.unitId === 'y')!.tick = 26;
  expect(predictionEvidence(window)('double-kill')).toBe(false);
});
it('self/ally damage cannot farm wall; zero damage and initial-strength ties never qualify', () => {
  const r = trace();
  for (const e of r.events) if (e.type === 'damage') e.payload.sourceId = 'tank';
  expect(predictionEvidence(r)('wall', 'tank')).toBe(false);
  const safe = trace();
  safe.events = safe.events.filter((e) => e.type !== 'damage');
  expect(predictionEvidence(safe)('wall', 'tank')).toBe(false);
  expect(predictionEvidence(safe)('untouchable', 'tank')).toBe(true);
  for (const u of safe.snapshots[0]!.units) u.profile.stats.maxHp = 100;
  expect(predictionEvidence(safe)('underdog')).toBe(false);
});
