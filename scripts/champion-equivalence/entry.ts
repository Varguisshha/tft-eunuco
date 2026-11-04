// Compiled twice with disjoint aliases. No imports from the other implementation.
import * as data from '@tft/game-data';
import * as core from '@tft/game-core';
import {
  CombatInputSchema,
  MatchStateSchema,
  DEFAULT_OVERTIME,
  NETWORK_VERSION,
  LOBBY_VERSION,
  type CombatInput,
  type CombatProfile,
  type OwnedUnit,
  type ItemInstance,
  type EconomyConfig,
} from '@tft/shared';
import * as snapshots from '@equivalence/snapshot';
import { AuthoritativeMatch } from '@equivalence/authority';
import { encodeStoredMatch, decodeStoredMatch } from '@equivalence/codec';
import historicalSaves from '@equivalence/historical-saves';

const owner = '00000000-0000-4000-8000-000000000001';
export const fullIds = ['dolea', 'vargas', 'jaramillo', 'florin'] as const;
export type Fixture = {
  kind:
    | 'natural'
    | 'equipment'
    | 'ghost'
    | 'dolea-area'
    | 'dolea-threshold'
    | 'dolea-overtime'
    | 'dolea-death'
    | 'florin-recovery'
    | 'overtime';
  champion: string;
  stars: 1 | 2 | 3;
  side: 'south' | 'north';
  seed: number;
};
export function manifest() {
  return {
    definitions: data.P11_ROSTER,
    sourceIdentities: data.ROSTER_SOURCE.characters,
    profiles: data.P11_COMBAT_PROFILES,
    scaled: data.P11_ROSTER.flatMap((u) =>
      ([1, 2, 3] as const).map((stars) => ({
        id: u.id,
        stars,
        profile: core.scaledProfile(u.id, stars, data.P12F_ECONOMY_CONFIG),
      })),
    ),
    presentation: data.P11_ROSTER.map((u) => data.characterPresentation(u.id)),
    fingerprints: Object.fromEntries(
      Object.entries(snapshots).filter(
        ([k]) =>
          ![
            'P13S_CATALOG_HASH',
            'P13T_CATALOG_HASH',
            'P13T1_CATALOG_HASH',
            'P13_CATALOG_HASH',
            'P13U_CATALOG_HASH',
          ].includes(k) &&
          (k.endsWith('_HASH') || ['CATALOG', 'COMPOSITE_CATALOG'].includes(k)),
      ),
    ),
  };
}
function equipped(id: string, stars: 1 | 2 | 3, seed: number): CombatProfile {
  const state = core.createMatch(seed, data.P12F_ECONOMY_CONFIG),
    inventory = state.items!;
  inventory.ownerId = owner;
  const available = data.P11H_ITEM_CATALOG.definitions.filter(
    (d) => d.availability === 'available' && d.kind === 'completed',
  );
  const equipment: ItemInstance[] = available
    .slice(seed % available.length, (seed % available.length) + 3)
    .map((d, i) => ({
      id: `lab-item-${i}`,
      ownerId: owner,
      definitionId: d.id,
      definitionVersion: 1,
      kind: d.kind,
      origin: { kind: 'grant', grantId: 'synthetic-equivalence' },
    }));
  return core.scaledOwnedProfile(
    {
      id: 'subject',
      definitionId: id,
      stars,
      location: { kind: 'board', hex: { q: 0, r: 4 } },
      equipment,
    },
    data.P12F_ECONOMY_CONFIG,
    inventory,
    3,
    seed,
  );
}
function dummy(): CombatProfile {
  const p = core.scaledProfile('cosmin', 1, data.P12F_ECONOMY_CONFIG);
  p.stats = {
    ...p.stats,
    maxHp: 100000,
    attack: 0,
    attackSpeedMilli: 1,
    armor: 0,
    magicResist: 0,
    maxMana: 0,
    startingMana: 0,
  };
  p.traits = [];
  return p;
}
export function fixture(request: Fixture): CombatInput {
  const { kind, champion, stars, side, seed } = request;
  const profile =
    kind === 'equipment'
      ? equipped(champion, stars, seed)
      : core.scaledProfile(champion, stars, data.P12F_ECONOMY_CONFIG);
  let target = core.scaledProfile(
    kind === 'florin-recovery' ? 'vargas' : 'dolea',
    stars,
    data.P12F_ECONOMY_CONFIG,
  );
  const directed = kind.startsWith('dolea-');
  if (directed) {
    target = dummy();
    if (kind === 'dolea-area') {
      profile.stats.startingMana = 70;
      profile.championAbility!.active!.initialMana = 70;
      profile.stats.attack = 0;
      profile.stats.attackSpeedMilli = 1;
    } else if (kind === 'dolea-overtime') {
      target.passive = {
        id: 'lab-periodic',
        trigger: 'combat_start',
        effects: [
          {
            kind: 'periodic',
            target: 'enemies',
            radius: 14,
            amount: Math.floor((profile.stats.maxHp * 800) / 1000),
            damageType: 'physical',
            intervalTicks: 301,
            duration: 449,
            responsible: 'source',
          },
        ],
      };
    } else {
      target.stats.attack = kind === 'dolea-death' ? 100000 : 150;
      target.stats.attackSpeedMilli = 1000;
    }
  }
  if (kind === 'overtime') {
    profile.stats.attack = 1;
    target.stats.attack = 1;
    profile.stats.maxHp = 100000;
    target.stats.maxHp = 100000;
  }
  const input: CombatInput = {
    protocolVersion: 3,
    rulesVersion: 'f0p11h-1',
    combatId: `lab-${kind}-${champion}-${stars}-${side}-${seed}`,
    seed,
    maxTicks: 450,
    overtime: DEFAULT_OVERTIME,
    obstacles: [],
    traits: [...data.traitsFor(data.P12F_ECONOMY_CONFIG.catalog)],
    units: [
      { id: 'subject', definitionId: champion, owner: 'south', position: { q: 0, r: 4 }, profile },
      {
        id: 'enemy',
        definitionId: directed ? 'synthetic-dummy' : 'dolea',
        owner: 'north',
        position: { q: 0, r: 3 },
        profile: target,
      },
    ],
  };
  if (kind === 'natural' || kind === 'equipment' || kind === 'florin-recovery') {
    input.units.push({
      id: 'ally',
      definitionId: 'cosmin',
      owner: 'south',
      position: { q: -2, r: 6 },
      profile: core.scaledProfile('cosmin', 1, data.P12F_ECONOMY_CONFIG),
    });
    if (kind === 'florin-recovery') {
      input.units[2]!.profile = dummy();
      input.units[1]!.profile.stats.attack = 35;
      input.units[1]!.profile.stats.range = 14;
    }
  }
  if (kind === 'dolea-area')
    input.units.push({
      id: 'enemy-2',
      definitionId: 'synthetic-dummy-2',
      owner: 'north',
      position: { q: 1, r: 3 },
      profile: dummy(),
    });
  const view = side === 'north' ? dataReverse(input) : input;
  return CombatInputSchema.parse(
    kind === 'ghost' ? core.withGhostArmy(view, 'synthetic-owner', 'synthetic-player') : view,
  );
}
// Same public perspective contract in both independently compiled implementations.
import { reversePerspective as dataReverse } from '@tft/shared';
export function simulate(input: CombatInput) {
  const replay = core.runCombat(input);
  return {
    input: replay.input,
    snapshots: replay.snapshots,
    events: replay.events,
    result: replay.result,
  };
}
export function progress(seed: number) {
  const s = core.createMatch(seed, data.P12F_ECONOMY_CONFIG);
  s.round = 3;
  const unit: OwnedUnit = {
    id: 'subject',
    definitionId: 'jaramillo',
    stars: 1,
    location: { kind: 'board', hex: { q: 0, r: 4 } },
  };
  s.units = [unit, { ...structuredClone(unit), id: 'bench', location: { kind: 'bench', slot: 0 } }];
  const input = fixture({ kind: 'natural', champion: 'jaramillo', stars: 1, side: 'south', seed });
  s.combat = {
    round: s.round,
    bank: 0,
    input,
    result: { winner: 'south', outcome: 'win', reason: 'elimination', tick: 1 },
  };
  core.awardRoundProgress(s, false);
  const excluded = structuredClone(s.units);
  core.awardRoundProgress(s, true);
  const awarded = structuredClone(s.units);
  core.awardRoundProgress(s, true);
  const retried = structuredClone(s.units);
  s.round = 4;
  core.awardRoundProgress(s, true);
  const copies = [
    structuredClone(s.units[0]!),
    {
      ...structuredClone(s.units[0]!),
      id: 'earned',
      progress: { version: 1 as const, stacks: [{ id: 'kilometros', count: 7, lastRound: 4 }] },
    },
  ];
  core.mergeUnitProgress(s.units[0]!, copies, s.config);
  const merged = structuredClone(s.units),
    effective = core.scaledOwnedProfile(s.units[0]!, s.config);
  const restored = MatchStateSchema.parse(JSON.parse(JSON.stringify(s)));
  core.clearMatchProgress(s);
  return { excluded, awarded, retried, merged, effective, restored, cleared: s.units };
}
export function historical() {
  return historicalSaves.map((s) => {
    const parsed = MatchStateSchema.parse(JSON.parse(s.text));
    return {
      parsed,
      restored: core.replayMatch(parsed.seed, parsed.history, parsed.config),
      replay: core.runCombat(parsed.combat!.input),
    };
  });
}
export function authorityInput(configName: string, seed: number) {
  const config = data[configName as keyof typeof data] as EconomyConfig;
  const m = new AuthoritativeMatch(
    '00000000-0000-4000-8000-000000000010',
    { now: () => 1000 },
    () => seed,
    2,
    config,
  );
  m.join('s0', { userId: owner, name: 'Synthetic One' });
  m.join('s1', { userId: '00000000-0000-4000-8000-000000000002', name: 'Synthetic Two' });
  m.start('s0');
  for (const [i, p] of m.players.entries()) {
    const offer = p.state.shop.find(Boolean)!;
    const purchase = core.commandFor(p.state, { type: 'buy_unit', offerId: offer.id });
    const submit = (action: typeof purchase, ordinal: number) =>
      m.submit(p.sessionId, {
        version: NETWORK_VERSION,
        sessionId: p.sessionId,
        matchId: m.id,
        phaseId: m.clock.snapshot().phaseId,
        sequence: p.sequence,
        requestId: `lab-${i}-${ordinal}`,
        action,
      });
    if (!submit(purchase, 1).accepted) throw Error('Synthetic purchase rejected');
    const move = core.commandFor(p.state, {
      type: 'move_unit',
      unitId: p.state.units[0]!.id,
      to: { kind: 'board', hex: { q: 0, r: 4 } },
    });
    if (!submit(move, 2).accepted) throw Error('Synthetic deployment rejected');
  }
  const saved = m.exportState();
  // Seed the common INPUT snapshot before either restore, never normalize any output.
  saved.rng = seed;
  if (saved.itemDrops) saved.itemDrops.seed = seed;
  return saved;
}
export function restoreAuthority(input: ReturnType<typeof authorityInput>) {
  let now = 1000;
  const m = AuthoritativeMatch.restore(input, { now: () => now }, false);
  const initial = m.exportState();
  now += m.clock.snapshot().remainingMs;
  m.pulse();
  const combat = m.exportState();
  const lobby = {
    version: LOBBY_VERSION,
    roomId: '00000000-0000-4000-8000-000000000011',
    roomCode: 'ABCDEFGH',
    hostUserId: owner,
    capacity: 2 as const,
    participants: m.players.map((p) => ({
      userId: p.id,
      name: p.name,
      avatarId: p.avatarId,
      readyState: true,
      connected: true,
    })),
    status: 'in_match' as const,
    createdAt: 1000,
    expiresAt: 901000,
    matchId: m.id,
    revision: 1,
  };
  const document = {
    id: m.id,
    revision: 1,
    commitId: '00000000-0000-4000-8000-000000000012',
    expiresAt: 901000,
    status: 'active' as const,
    lobby,
    authority: combat,
  };
  const encoded = encodeStoredMatch(document),
    decoded = decodeStoredMatch(JSON.parse(JSON.stringify(encoded)));
  const recovery = AuthoritativeMatch.restore(decoded.authority, { now: () => now }, false);
  const restored = recovery.exportState();
  const p = recovery.players[0]!;
  const previous = p.receipts.values().next().value;
  if (!previous) throw Error('Missing synthetic receipt');
  const retry = recovery.submit(p.sessionId, {
    ...JSON.parse(previous.payload),
    sessionId: p.sessionId,
  });
  now += recovery.clock.snapshot().remainingMs;
  recovery.pulse();
  now += recovery.clock.snapshot().remainingMs;
  recovery.pulse();
  const nextRound = recovery.exportState();
  return { initial, combat, encoded, decoded, restored, retry, nextRound };
}
