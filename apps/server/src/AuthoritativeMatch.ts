import { purchasePreviews } from '@tft/game-core';
import { canUseCombatEconomy } from '@tft/game-core';
import { isP11Catalog } from '@tft/shared';
import { planItemDrop, type DropJournal } from './item-drops';
import {
  AuthoritySnapshotSchema,
  CATALOG,
  FLORIN_CATALOG_HASH,
  TFT_POOL_CATALOG_HASH,
  INTEGRATED_CATALOG_HASH,
  P11_CATALOG_HASH,
  P11B_CATALOG_HASH,
  P11C_CATALOG_HASH,
  P11G_CATALOG_HASH,
  P11H_CATALOG_HASH,
  P11K_CATALOG_HASH,
  P12B_CATALOG_HASH,
  P12D_CATALOG_HASH,
  ROSTER_CATALOG_HASH,
  COMPOSITE_CATALOG,
  ITEM_CATALOG_HASH,
  STANDARD_ITEM_CATALOG_HASH,
  EFFECT_ITEM_CATALOG_HASH,
  DROP_ITEM_CATALOG_HASH,
  snapshotConfig,
  type AuthoritySnapshot,
} from './persistence/snapshot';
import { eliminationPlaces } from './competition';
import { randomBytes } from 'node:crypto';
import { pairRound, deriveSeed, type PairingHistory } from './pairings';
import { VARGAS_ECONOMY_CONFIG, matchCatalog, combatRulesFor, traitsFor } from '@tft/game-data';
import {
  applySharedEconomy,
  commandFor,
  createMatch,
  copiesOf,
  MatchClock,
  runCombat,
  scaledOwnedProfile,
  clearMatchProgress,
  returnUnitItems,
  grantItemInstances,
  grantRoundRemover,
  withGhostArmy,
  validateMatchState,
  validateItemState,
  type TimeSource,
} from '@tft/game-core';
import { refreshShop } from '../../../packages/game-core/src/match/shop';
import {
  COMPETITIVE_VERSION,
  CompetitiveSnapshotSchema,
  FinalResultsSchema,
  SpectateRequestSchema,
  SpectateFrameSchema,
  type FinalResults,
  PAIRING_VERSION,
  PlayerProfileSchema,
  RoundSnapshotSchema,
  PlayerSettlementSchema,
  DuelRecordSchema,
  type Pairing,
  type PairingPlan,
  type PlayerSettlement,
  type RoundSnapshot,
  type PlayerIdentity,
  CombatInputSchema,
  COMBAT_PROTOCOL,
  MAX_COMBAT_TICKS,
  NETWORK_VERSION,
  NetworkCommandSchema,
  PrivatePlayerSchema,
  PREPARATION_MS,
  RESOLUTION_MS,
  VISUAL_TAIL_MS,
  reverseHex,
  reversePerspective,
  type MatchState,
  type CombatReplay,
  type ActionReceipt,
  type NetworkSnapshot,
} from '@tft/shared';
interface Participant {
  id: string;
  sessionId: string;
  generation: number;
  name: string;
  connected: boolean;
  avatarId: PlayerIdentity['avatarId'];
  eliminated: boolean;
  eliminatedRound: number | null;
  finalPosition: number | null;
  hpBeforeElimination: number | null;
  eliminationDamage: number | null;
  poolReleased: boolean;
  spectating: boolean;
  spectatingDuelId: string | null;
  spectateSequence: number;
  opponents: { round: number; opponentId: string; ghost: boolean }[];
  state: MatchState;
  sequence: number;
  receipts: Map<string, { payload: string; receipt: ActionReceipt }>;
}
export interface Duel {
  pairing: Pairing;
  replay: CombatReplay;
  settlement: 'pending' | 'settled';
}
/** Synchronous transactions: socket callbacks are serialized by the Node event loop. */
export class AuthoritativeMatch {
  readonly players: Participant[] = [];
  readonly clock: MatchClock;
  pool: Record<string, number>;
  replay: CombatReplay | null = null;
  revision = 0;
  settlementId: string | null = null;
  simulations = 0;
  private seed: () => number;
  private rng = randomBytes(4).readUInt32LE();
  private itemDrops: DropJournal | undefined;
  readonly duels: Duel[] = [];
  readonly pairingHistory: PairingHistory[] = [];
  readonly settlements = new Map<string, PlayerSettlement>();
  plan: PairingPlan | null = null;
  private pairingSeed: number | null = null;
  private finalResult: FinalResults | null = null;
  private completedDuels = new Set<string>();
  constructor(
    readonly id: string,
    time: TimeSource = { now: () => performance.now() },
    seed?: () => number,
    readonly capacity: 2 | 3 | 4 = 2,
    readonly config = VARGAS_ECONOMY_CONFIG,
  ) {
    if (['f0p8d-1', 'f0p11b-18.5-1', 'f0p11h-18.5-1'].includes(config.itemCatalog ?? ''))
      this.itemDrops = { seed: randomBytes(4).readUInt32LE(), rounds: [] };
    if (![2, 3, 4].includes(capacity)) throw new Error('Invalid capacity');
    this.clock = new MatchClock(time, id);
    this.seed =
      seed ??
      (() => {
        this.rng = (Math.imul(this.rng, 1664525) + 1013904223) >>> 0;
        return this.rng;
      });
    this.pool = Object.fromEntries(
      matchCatalog(this.config).map((d) => [d.id, this.config.copiesByCost[d.cost - 1]!]),
    );
  }
  exportState(): AuthoritySnapshot {
    const { phaseStart: _start, phaseDeadline: _deadline, ...clock } = this.clock.snapshot();
    void _start;
    void _deadline;
    return AuthoritySnapshotSchema.parse({
      schema: 1,
      rules: combatRulesFor(this.config.catalog),
      catalog: this.config.shopLockPolicy
        ? P12D_CATALOG_HASH
        : this.config.removerPolicy?.version === 'f0p12b-remover-1'
          ? P12B_CATALOG_HASH
          : this.config.removerPolicy?.version === 'f0p11k-remover-1'
            ? P11K_CATALOG_HASH
            : this.config.catalog === 'f0p11h-1'
              ? P11H_CATALOG_HASH
              : this.config.catalog === 'f0p11g-1'
                ? P11G_CATALOG_HASH
                : this.config.catalog === 'f0p11c-1'
                  ? P11C_CATALOG_HASH
                  : this.config.catalog === 'f0p11b-1'
                    ? P11B_CATALOG_HASH
                    : isP11Catalog(this.config.catalog)
                      ? P11_CATALOG_HASH
                      : this.config.poolVersion === 'tft-set18-pool-1' &&
                          this.config.catalog === 'f0p8d-florin-1'
                        ? TFT_POOL_CATALOG_HASH
                        : this.config.catalog === 'f0p10a-1'
                          ? ROSTER_CATALOG_HASH
                          : this.config.catalog === 'f0p8d-florin-1'
                            ? INTEGRATED_CATALOG_HASH
                            : this.config.catalog === 'florin-1'
                              ? FLORIN_CATALOG_HASH
                              : this.config.itemCatalog
                                ? this.config.itemCatalog === 'f0p8d-1'
                                  ? DROP_ITEM_CATALOG_HASH
                                  : this.config.itemCatalog === 'f0p8c-1'
                                    ? EFFECT_ITEM_CATALOG_HASH
                                    : this.config.itemCatalog === 'f0p8b-14.1-1'
                                      ? STANDARD_ITEM_CATALOG_HASH
                                      : ITEM_CATALOG_HASH
                                : this.config.catalog === 'f0p6c'
                                  ? COMPOSITE_CATALOG
                                  : CATALOG,
      id: this.id,
      capacity: this.capacity,
      revision: this.revision,
      rng: this.rng,
      ...(this.itemDrops ? { itemDrops: this.itemDrops } : {}),
      pool: this.pool,
      clock,
      players: this.players.map((p) => ({ ...p, receipts: [...p.receipts] })),
      duels: this.duels,
      pairingHistory: this.pairingHistory,
      settlements: [...this.settlements],
      plan: this.plan,
      pairingSeed: this.pairingSeed,
      finalResult: this.finalResult,
      completedDuels: [...this.completedDuels],
      settlementId: this.settlementId,
      simulations: this.simulations,
    });
  }
  static restore(
    value: unknown,
    time: TimeSource = { now: () => performance.now() },
    disconnect = true,
  ) {
    const s = AuthoritySnapshotSchema.parse(value);
    if (
      s.clock.matchId !== s.id ||
      s.players.length > s.capacity ||
      new Set(s.players.map((p) => p.id)).size !== s.players.length ||
      s.clock.remainingMs > s.clock.phaseDuration
    )
      throw new Error('Invalid authority snapshot');
    const m = new AuthoritativeMatch(
      s.id,
      time,
      undefined,
      s.capacity,
      snapshotConfig(s.rules, s.catalog),
    );
    m.rng = s.rng;
    if (
      !!s.itemDrops !==
      ['f0p8d-1', 'f0p11b-18.5-1', 'f0p11h-18.5-1'].includes(m.config.itemCatalog ?? '')
    )
      throw Error('Missing or historical drop journal');
    m.itemDrops = s.itemDrops;
    m.pool = s.pool;
    m.revision = s.revision;
    m.settlementId = s.settlementId;
    m.simulations = s.simulations;
    m.plan = s.plan;
    if (
      s.plan &&
      s.plan.decision.policy !==
        (m.config.pvpPolicy ? 'balanced-history-v2' : 'balanced-history-v1')
    )
      throw Error('Pairing policy fingerprint mismatch');
    m.pairingSeed = s.pairingSeed;
    m.finalResult = s.finalResult;
    m.completedDuels = new Set(s.completedDuels);
    for (const p of s.players) {
      if (
        p.state.development ||
        JSON.stringify(p.state.config) !== JSON.stringify(m.config) ||
        JSON.stringify(p.state.pool) !== JSON.stringify(s.pool)
      )
        throw new Error('Incompatible economy');
      m.players.push({
        ...p,
        connected: disconnect ? false : p.connected,
        receipts: new Map(p.receipts),
      });
    }
    m.duels.push(...s.duels);
    m.pairingHistory.push(...s.pairingHistory);
    for (const [id, entry] of s.settlements) {
      if (id !== entry.id) throw new Error('Invalid settlement');
      m.settlements.set(id, entry);
    }
    for (const d of s.duels) {
      if (
        d.replay.input.combatId !== d.pairing.combatId ||
        d.replay.input.rulesVersion !== combatRulesFor(m.config.catalog) ||
        !m.players.some((p) => p.id === d.pairing.southPlayerId) ||
        !m.players.some((p) => p.id === d.pairing.northPlayerId)
      )
        throw new Error('Invalid duel');
      const ghost = d.replay.input.ghost;
      if (m.config.pvpPolicy && d.pairing.kind === 'ghost') {
        if (
          !ghost ||
          ghost.side !== 'north' ||
          ghost.sourcePlayerId !== d.pairing.ghostOwnerId ||
          ghost.realPlayerId !== d.pairing.ghostFacingId
        )
          throw Error('Invalid ghost policy binding');
        const original = s.duels.find(
          (x) =>
            x.pairing.round === d.pairing.round &&
            x.pairing.kind === 'human' &&
            [x.pairing.southPlayerId, x.pairing.northPlayerId].includes(ghost.sourcePlayerId),
        );
        if (!original) throw Error('Missing ghost source duel');
        const side = original.pairing.southPlayerId === ghost.sourcePlayerId ? 'south' : 'north';
        const source = original.replay.input.units.filter((u) => u.owner === side);
        if (
          source.length !== ghost.units.length ||
          ghost.units.some((u) => {
            const from = source.find((x) => x.id === u.sourceUnitId),
              clone = d.replay.input.units.find((x) => x.id === u.unitId);
            return (
              !from ||
              !clone ||
              from.definitionId !== clone.definitionId ||
              JSON.stringify(clone.position) !==
                JSON.stringify(side === 'north' ? from.position : reverseHex(from.position)) ||
              JSON.stringify(from.profile) !== JSON.stringify(clone.profile)
            );
          })
        )
          throw Error('Ghost army provenance mismatch');
      } else if (ghost) throw Error('Ghost policy in historical/human duel');
    }
    if (
      s.clock.currentPhase === 'combat' &&
      (!s.duels.length || s.duels.some((d) => d.settlement !== 'pending'))
    )
      throw new Error('Invalid combat phase');
    if ((s.clock.currentPhase === 'finished') !== !!s.finalResult) throw new Error('Invalid final');
    m.replay = s.capacity === 2 ? (s.duels[0]?.replay ?? null) : null;
    m.clock.restore({ ...s.clock, phaseStart: 0, phaseDeadline: s.clock.remainingMs });
    m.validateDrops();
    m.assertConservation();
    return m;
  }
  join(
    sessionId: string,
    identity?: { userId: string; name: string; avatarId?: PlayerIdentity['avatarId'] },
  ) {
    if (this.capacity > 2 && !PlayerProfileSchema.shape.user_id.safeParse(identity?.userId).success)
      throw new Error('Multi-player authority requires verified UUID identities');
    if (this.players.some((p) => p.sessionId === sessionId)) throw new Error('Duplicate session');
    if (identity && this.players.some((p) => p.id === identity.userId))
      throw new Error('Esta cuenta ya participa.');
    if (
      this.players.length >= this.capacity ||
      this.clock.snapshot().currentPhase !== 'not_started'
    )
      throw new Error('Session full');
    const index = this.players.length,
      id =
        identity?.userId ?? (index === 0 ? 'vargas' : index === 1 ? 'florin' : `fixture-${index}`);
    const state = createMatch(this.seed(), this.config, id);
    state.shop = Array(5).fill(null);
    if (state.shopRolls)
      state.shopRolls = state.shopRolls.map((r) => ({ ...r, outcome: 'released' }));
    state.shopRng = (state.seed ^ 0x9e3779b9) >>> 0;
    state.pool = { ...this.pool };
    refreshShop(state, `${id}-`);
    const p: Participant = {
      id,
      sessionId,
      generation: 1,
      name: identity?.name ?? (index === 0 ? 'Vargas' : 'Florin'),
      connected: true,
      avatarId: identity?.avatarId ?? 'jade',
      eliminated: false,
      eliminatedRound: null,
      finalPosition: null,
      hpBeforeElimination: null,
      eliminationDamage: null,
      poolReleased: false,
      spectating: false,
      spectatingDuelId: null,
      spectateSequence: -1,
      opponents: [],
      state,
      sequence: 0,
      receipts: new Map(),
    };
    this.players.push(p);
    this.pool = state.pool;
    this.syncPool();
    this.assertConservation();
    this.revision++;
    return p;
  }
  /** Called only after server-side identity and frozen membership verification. */
  resume(sessionId: string, userId: string) {
    const p = this.players.find((p) => p.id === userId);
    if (!p || this.players.some((other) => other.sessionId === sessionId))
      throw new Error('Invalid recovery');
    p.sessionId = sessionId;
    p.generation++;
    p.connected = true;
    this.revision++;
    return p;
  }
  disconnect(sessionId: string) {
    const p = this.players.find((p) => p.sessionId === sessionId);
    if (p) {
      p.connected = false;
      this.revision++;
    }
  }
  start(sessionId: string) {
    if (
      !this.players.some((p) => p.sessionId === sessionId && p.connected) ||
      this.players.length !== this.capacity ||
      this.players.some((p) => !p.connected) ||
      this.clock.snapshot().currentPhase !== 'not_started'
    )
      return false;
    this.clock.enter('preparation', 1, PREPARATION_MS);
    this.revision++;
    return true;
  }
  private external(p: Participant) {
    const result: Record<string, number> = {};
    for (const other of this.players)
      if (other !== p) {
        for (const u of other.state.units)
          result[u.definitionId] = (result[u.definitionId] ?? 0) + copiesOf(u, other.state.config);
        for (const o of other.state.shop)
          if (o) result[o.definitionId] = (result[o.definitionId] ?? 0) + 1;
      }
    return result;
  }
  private syncPool() {
    for (const p of this.players) p.state.pool = { ...this.pool };
  }
  assertConservation() {
    for (const p of this.players) {
      validateMatchState(p.state, this.external(p));
      if (p.state.items && p.state.items.ownerId !== p.id)
        throw Error('Item participant owner mismatch');
    }
  }
  grantItems(playerId: string, grantId: string, definitionIds: readonly string[]) {
    const player = this.players.find((p) => p.id === playerId && !p.eliminated);
    if (!player || this.finalResult || !player.state.items)
      throw Error('Invalid item grant recipient');
    const candidate = structuredClone(player.state);
    grantItemInstances(candidate, grantId, definitionIds);
    validateMatchState(candidate, this.external(player));
    if (JSON.stringify(candidate) === JSON.stringify(player.state)) return;
    player.state = candidate;
    this.revision++;
    this.assertConservation();
  }
  submit(sessionId: string, raw: unknown): ActionReceipt {
    const parsed = NetworkCommandSchema.safeParse(raw);
    const fallback: ActionReceipt = {
      requestId: 'invalid',
      sequence: 0,
      accepted: false,
      reason: 'invalid-payload',
      revision: this.revision,
    };
    if (!parsed.success) return fallback;
    const c = parsed.data,
      p = this.players.find((p) => p.sessionId === sessionId && p.connected);
    const receipt = (accepted: boolean, reason: string): ActionReceipt => ({
      requestId: c.requestId,
      sequence: c.sequence,
      accepted,
      reason,
      revision: this.revision,
    });
    if (!p || c.sessionId !== sessionId || c.matchId !== this.id) return receipt(false, 'identity');
    const payload = JSON.stringify({ ...c, sessionId: p.id }),
      prior = p.receipts.get(c.requestId);
    if (prior)
      return prior.payload === payload ? prior.receipt : receipt(false, 'request-conflict');
    if (c.sequence !== p.sequence) return receipt(false, 'sequence');
    p.sequence++;
    const before = this.clock.snapshot();
    this.pulse();
    const phase = this.clock.snapshot();
    let result: ActionReceipt;
    if (p.eliminated || this.finalResult) result = receipt(false, 'not-active');
    else if (
      (phase.currentPhase !== 'preparation' && !canUseCombatEconomy(p.state, c.action)) ||
      phase.remainingMs <= 0 ||
      before.remainingMs <= 0 ||
      c.phaseId !== phase.phaseId
    )
      result = receipt(false, 'wrong-phase');
    else {
      const outcome = applySharedEconomy(p.state, c.action, {
        externalCopies: this.external(p),
        prefix: `${p.id}-`,
      });
      if (outcome.ok) {
        p.state = outcome.state;
        this.pool = p.state.pool;
        this.syncPool();
        this.assertConservation();
        this.revision++;
      }
      result = receipt(outcome.ok, outcome.ok ? 'accepted' : outcome.error);
    }
    p.receipts.set(c.requestId, { payload, receipt: result });
    if (p.receipts.size > 128) p.receipts.delete(p.receipts.keys().next().value!);
    return result;
  }
  pulse() {
    const phase = this.clock.snapshot();
    if (phase.currentPhase === 'combat') {
      for (const duel of this.duels) {
        if (
          this.clock.now() >= phase.phaseStart + duel.replay.result.tick * 100 + VISUAL_TAIL_MS &&
          !this.completedDuels.has(duel.pairing.combatId)
        ) {
          this.completedDuels.add(duel.pairing.combatId);
          this.revision++;
        }
      }
    }
    if (phase.clockState !== 'running' || phase.remainingMs > 0) return;
    if (phase.currentPhase === 'preparation') this.begin();
    else if (phase.currentPhase === 'combat') this.settle();
    else if (phase.currentPhase === 'resolution') {
      for (const p of this.players.filter((p) => !p.eliminated)) {
        const out = applySharedEconomy(
          p.state,
          commandFor(p.state, { type: 'next_round', round: p.state.round }),
          { externalCopies: this.external(p), prefix: `${p.id}-` },
        );
        if (!out.ok) throw new Error(out.error);
        p.state = out.state;
        this.pool = p.state.pool;
        this.syncPool();
      }
      this.replay = null;
      this.duels.length = 0;
      this.plan = null;
      this.completedDuels.clear();
      this.clock.enter(
        'preparation',
        this.players.find((p) => !p.eliminated)!.state.round,
        PREPARATION_MS,
      );
      this.revision++;
      this.assertConservation();
    }
  }
  private begin() {
    const active = this.players.filter((p) => !p.eliminated);
    const round = active[0]!.state.round;
    // Legacy two-player seed calls and orientation remain byte-for-byte compatible.
    const roundSeed = this.seed();
    this.pairingSeed ??= roundSeed;
    this.plan = pairRound(
      active.map((p) => p.id),
      round,
      this.pairingHistory,
      this.pairingSeed,
      this.id,
      this.config.pvpPolicy ? { recentWindow: 6, version: 'f0p12b-1' } : undefined,
    );
    if (this.capacity === 2) {
      const d = this.plan.pairings[0]!;
      d.southPlayerId = this.players[0]!.id;
      d.northPlayerId = this.players[1]!.id;
      d.combatId = `${this.id}/combat/${round}`;
    }
    const seedBase = deriveSeed(this.pairingSeed, `combat:${round}:${roundSeed}`);
    const duels = this.plan.pairings.map((pairing, index): Duel => {
      const teams = [pairing.southPlayerId, pairing.northPlayerId].map(
        (id) => this.players.find((p) => p.id === id)!,
      );
      let input = CombatInputSchema.parse({
        protocolVersion: COMBAT_PROTOCOL,
        rulesVersion: combatRulesFor(this.config.catalog),
        combatId: pairing.combatId,
        seed: this.capacity === 2 ? roundSeed : (seedBase + index) >>> 0,
        maxTicks: MAX_COMBAT_TICKS,
        obstacles: [],
        traits: traitsFor(this.config.catalog),
        units: teams.flatMap((p, i) =>
          p.state.units.flatMap((u) =>
            u.location.kind === 'board'
              ? [
                  {
                    id: u.id,
                    definitionId: u.definitionId,
                    owner: i === 0 ? 'south' : 'north',
                    position: i === 0 ? u.location.hex : reverseHex(u.location.hex),
                    profile: scaledOwnedProfile(
                      u,
                      p.state.config,
                      p.state.items,
                      p.state.round,
                      p.state.seed,
                    ),
                  },
                ]
              : [],
          ),
        ),
      });
      if (pairing.kind === 'ghost' && this.config.pvpPolicy)
        input = withGhostArmy(input, pairing.ghostOwnerId, pairing.ghostFacingId);
      const replay = runCombat(input);
      DuelRecordSchema.parse({
        version: PAIRING_VERSION,
        pairing,
        rulesVersion: input.rulesVersion,
        seed: input.seed,
        result: replay.result,
        finalTick: replay.result.tick,
        settlement: 'pending',
      });
      return { pairing, replay, settlement: 'pending' };
    });
    this.duels.push(...duels);
    this.simulations += duels.length;
    this.replay = this.capacity === 2 ? duels[0]!.replay : null;
    this.pairingHistory.push(structuredClone({ round, pairings: this.plan.pairings }));
    for (const p of active) {
      const duel = this.duelFor(p.sessionId)!;
      const side = duel.pairing.southPlayerId === p.id ? 'south' : 'north';
      p.opponents.push({
        round,
        opponentId: side === 'south' ? duel.pairing.northPlayerId : duel.pairing.southPlayerId,
        ghost: duel.pairing.kind === 'ghost',
      });
      p.state.phase = 'combat';
      p.state.combat = {
        round,
        bank: p.state.gold,
        input: side === 'south' ? duel.replay.input : reversePerspective(duel.replay.input),
        result: null,
      };
    }
    for (const p of this.players.filter((p) => p.eliminated)) p.spectatingDuelId = null;
    // One shared phase; short duels wait for the longest replay and its visual tail.
    this.clock.enter(
      'combat',
      round,
      Math.max(...duels.map((d) => d.replay.result.tick)) * 100 + VISUAL_TAIL_MS,
    );
    this.revision++;
  }
  duelFor(sessionId: string): Duel | null {
    const p = this.players.find((p) => p.sessionId === sessionId);
    if (!p) throw new Error('Unknown session');
    return (
      this.duels.find(
        (d) =>
          d.pairing.southPlayerId === p.id ||
          (d.pairing.kind === 'human' && d.pairing.northPlayerId === p.id),
      ) ?? null
    );
  }
  private settle() {
    const active = this.players.filter((p) => !p.eliminated);
    const round = active[0]!.state.round,
      id = `${this.id}/round/${round}/settlement`;
    if (this.settlementId === id) return;
    const states = active.map((p) => {
      const duel = this.duelFor(p.sessionId)!;
      const trace =
        duel.pairing.southPlayerId === p.id ? duel.replay : reversePerspective(duel.replay);
      const out = applySharedEconomy(
        p.state,
        commandFor(p.state, { type: 'resolve_round', round }),
        {
          externalCopies: this.external(p),
          prefix: `${p.id}-`,
          progressionEligible: duel.pairing.kind === 'human' || !!this.config.pvpPolicy,
          settlementId: `${id}/${p.id}`,
        },
        trace,
      );
      if (!out.ok) throw new Error(out.error);
      return out.state;
    });
    const settlements = active.map((p, i) => {
      const state = states[i]!;
      return PlayerSettlementSchema.parse({
        id: `${id}/${p.id}`,
        playerId: p.id,
        round,
        combatId: this.duelFor(p.sessionId)!.pairing.combatId,
        outcome: state.lastReward!.outcome,
        damage: state.healthLedger.at(-1)!.applied,
        gold: state.lastReward!.credited,
        xp: state.lastReward!.xp,
      });
    });
    const eligible = active.filter((_, i) => states[i]!.health.south > 0);
    let drop: DropJournal['rounds'][number] | undefined;
    if (
      this.itemDrops &&
      round % 3 === 0 &&
      eligible.length >= (this.config.removerPolicy?.version === 'f0p12b-remover-1' ? 1 : 2)
    ) {
      if (this.itemDrops.rounds.some((d) => d.round === round))
        throw Error('Duplicate distribution settlement');
      drop = planItemDrop(
        this.id,
        round,
        this.itemDrops.seed,
        eligible.map((p) => p.id),
        this.config.removerPolicy?.version === 'f0p12b-remover-1',
      );
      for (const reward of drop.players) {
        const state = states[active.findIndex((p) => p.id === reward.playerId)]!;
        grantItemInstances(state, reward.grantId, reward.definitionIds);
        reward.instanceIds = state
          .items!.grants.find((g) => g.id === reward.grantId)!
          .instances.map((i) => i.id);
        const removerIds = grantRoundRemover(state, reward.grantId);
        if (removerIds) reward.removerIds = removerIds;
        state.items!.distributions.push({
          ...(removerIds ? { removerIds } : {}),
          id: reward.grantId,
          round,
          quantity: drop.quantity,
          seed: reward.seed,
          instanceIds: reward.instanceIds,
        });
        validateItemState(state);
      }
      // Validate bounded journal before publishing any of the candidate states.
      if (this.itemDrops.rounds.length >= 1000) throw Error('Distribution journal capacity');
    }
    // Commit only after every player's economy and settlement has validated.
    active.forEach((p, i) => {
      p.state = states[i]!;
    });
    if (drop) this.itemDrops!.rounds.push(drop);
    for (const settlement of settlements) this.settlements.set(settlement.id, settlement);
    this.duels.forEach((d) => {
      d.settlement = 'settled';
    });
    this.settlementId = id;
    const eliminated = active.filter((p) => p.state.health.south === 0);
    const survivors = active.filter((p) => p.state.health.south > 0);
    const places = eliminationPlaces(
      eliminated.map((p) => ({
        id: p.id,
        hpBefore: p.state.healthLedger.at(-1)!.hpBefore,
        damage: p.state.healthLedger.at(-1)!.applied,
      })),
      survivors.length,
    );
    for (const p of eliminated) {
      p.eliminated = true;
      p.eliminatedRound = round;
      p.finalPosition = places.get(p.id)!;
      p.hpBeforeElimination = p.state.healthLedger.at(-1)!.hpBefore;
      p.eliminationDamage = p.state.healthLedger.at(-1)!.applied;
      if (!p.poolReleased) {
        for (const unit of p.state.units)
          this.pool[unit.definitionId]! += copiesOf(unit, p.state.config);
        for (const offer of p.state.shop) if (offer) this.pool[offer.definitionId]!++;
        for (const unit of p.state.units) returnUnitItems(p.state, unit);
        p.state.units = [];
        p.state.shop = Array(5).fill(null);
        if (p.state.shopRolls)
          p.state.shopRolls = p.state.shopRolls.map((r) => ({ ...r, outcome: 'released' }));
        p.state.lastUpgrades = [];
        p.poolReleased = true;
      }
    }
    this.syncPool();
    const finished = survivors.length <= 1;
    if (finished && survivors[0]) survivors[0].finalPosition = 1;
    this.clock.enter(finished ? 'finished' : 'resolution', round, finished ? 0 : RESOLUTION_MS);
    this.revision++;
    if (finished) {
      for (const player of this.players) clearMatchProgress(player.state);
      const standings = this.competitivePlayers();
      const winnerIds = standings.filter((p) => p.finalPosition === 1).map((p) => p.id);
      this.finalResult = FinalResultsSchema.parse({
        version: COMPETITIVE_VERSION,
        matchId: this.id,
        completionId: `${this.id}/finished/${round}`,
        round,
        sequence: this.revision,
        winnerIds,
        sharedFirst: winnerIds.length > 1,
        standings,
      });
    }
    this.assertConservation();
  }
  private validateDrops() {
    if (!this.itemDrops) return;
    const rounds = new Set<number>();
    for (const record of this.itemDrops.rounds) {
      if (
        rounds.has(record.round) ||
        record.round > Number(this.clock.snapshot().roundId.split('/').at(-1)) ||
        (this.finalResult &&
          (record.round > this.finalResult.round ||
            (record.round === this.finalResult.round && !this.config.pvpPolicy)))
      )
        throw Error('Invalid distribution round');
      const settledPlayers = this.players.filter(
        (p) => p.eliminatedRound === null || p.eliminatedRound >= record.round,
      );
      if (
        settledPlayers.some(
          (p) => !this.settlements.has(`${this.id}/round/${record.round}/settlement/${p.id}`),
        )
      )
        throw Error('Distribution before complete settlement');
      rounds.add(record.round);
      const eligible = this.players
        .filter((p) => p.eliminatedRound === null || p.eliminatedRound > record.round)
        .map((p) => p.id);
      const expected = planItemDrop(
        this.id,
        record.round,
        this.itemDrops.seed,
        eligible,
        this.config.removerPolicy?.version === 'f0p12b-remover-1',
      );
      expected.players.forEach((reward) => {
        const p = this.players.find((p) => p.id === reward.playerId)!;
        const grant = p.state.items!.grants.find((g) => g.id === reward.grantId);
        if (
          !grant ||
          JSON.stringify(grant.instances.map((i) => i.definitionId)) !==
            JSON.stringify(reward.definitionIds)
        )
          throw Error('Invalid distribution grant');
        reward.instanceIds = grant.instances.map((i) => i.id);
        if (this.config.removerPolicy?.version === 'f0p12b-remover-1')
          reward.removerIds = [`${p.id}/remover/round-${reward.grantId.slice(0, 24)}`];
        const own = p.state.items!.distributions.find((d) => d.id === reward.grantId);
        if (
          !own ||
          JSON.stringify(own.removerIds) !== JSON.stringify(reward.removerIds) ||
          own.round !== record.round ||
          own.quantity !== record.quantity ||
          own.seed !== reward.seed ||
          JSON.stringify(own.instanceIds) !== JSON.stringify(reward.instanceIds)
        )
          throw Error('Invalid distribution inventory');
      });
      if (JSON.stringify(record) !== JSON.stringify(expected))
        throw Error('Invalid distribution journal');
    }
    for (const [, settlement] of this.settlements) {
      if (
        settlement.round % 3 ||
        (this.finalResult &&
          settlement.round >= this.finalResult.round &&
          (!this.config.pvpPolicy || this.players.every((p) => p.state.health.south === 0)))
      )
        continue;
      if (!rounds.has(settlement.round)) throw Error('Missing settled distribution');
    }
    for (const p of this.players)
      for (const own of p.state.items!.distributions)
        if (
          !this.itemDrops.rounds.some(
            (d) => d.id === own.id && d.players.some((r) => r.playerId === p.id),
          )
        )
          throw Error('Orphan distribution');
  }
  private competitivePlayers() {
    const legacy = this.players.map((p) => ({
      id: p.id,
      userId: p.id,
      name: p.name,
      avatarId: p.avatarId,
      connected: p.connected,
      hp: p.state.health.south,
      level: p.state.level,
      eliminated: p.eliminated,
      formation: p.state.units.filter((u) => u.location.kind === 'board'),
      opponentId: p.opponents.at(-1)?.opponentId ?? null,
      status:
        this.clock.snapshot().currentPhase === 'combat' && !p.eliminated
          ? this.completedDuels.has(this.duelFor(p.sessionId)?.pairing.combatId ?? '')
            ? ('awaiting_round' as const)
            : ('fighting' as const)
          : ('waiting' as const),
      provisionalPosition: 1,
      lastOutcome: p.state.lastReward?.outcome ?? null,
    }));
    const alive = this.players.filter((p) => !p.eliminated);
    return legacy
      .map((view) => {
        const p = this.players.find((p) => p.id === view.id)!;
        return {
          ...view,
          competitiveState: p.eliminated ? ('eliminated' as const) : ('alive' as const),
          eliminated: p.eliminated,
          eliminatedRound: p.eliminatedRound,
          finalPosition: p.finalPosition,
          hpBeforeElimination: p.hpBeforeElimination,
          eliminationDamage: p.eliminationDamage,
          spectating: p.spectating,
          opponentId: p.eliminated ? null : view.opponentId,
          provisionalPosition:
            p.finalPosition ??
            1 + alive.filter((a) => a.state.health.south > p.state.health.south).length,
        };
      })
      .sort((a, b) => a.provisionalPosition - b.provisionalPosition);
  }
  get finalResults() {
    return this.finalResult ? structuredClone(this.finalResult) : null;
  }
  competitiveSnapshot(sessionId: string) {
    const p = this.players.find((p) => p.sessionId === sessionId)!;
    return CompetitiveSnapshotSchema.parse({
      ...this.roundSnapshot(sessionId),
      version: COMPETITIVE_VERSION,
      players: this.competitivePlayers(),
      combatId: p.eliminated ? null : (this.duelFor(sessionId)?.pairing.combatId ?? null),
      spectatingDuelId: p.spectatingDuelId,
      finalResults: this.finalResults,
    });
  }
  spectate(sessionId: string, raw: unknown): boolean {
    this.pulse();
    const parsed = SpectateRequestSchema.safeParse(raw);
    const p = this.players.find((p) => p.sessionId === sessionId && p.connected);
    if (!parsed.success || !p?.eliminated || this.finalResult) return false;
    const r = parsed.data;
    if (
      r.matchId !== this.id ||
      r.phaseId !== this.clock.snapshot().phaseId ||
      r.sequence <= p.spectateSequence
    )
      return false;
    if (r.duelId !== null && !this.duels.some((d) => d.pairing.combatId === r.duelId)) return false;
    p.spectating = true;
    p.spectatingDuelId = r.duelId;
    p.spectateSequence = r.sequence;
    this.revision++;
    return true;
  }
  spectatorFrame(sessionId: string) {
    const p = this.players.find((p) => p.sessionId === sessionId && p.connected);
    const phase = this.clock.snapshot();
    if (!p?.eliminated || !p.spectating || !p.spectatingDuelId || phase.currentPhase !== 'combat')
      return null;
    const duel = this.duels.find((d) => d.pairing.combatId === p.spectatingDuelId);
    if (!duel) return null;
    const ms = Math.max(0, this.clock.now() - phase.phaseStart);
    const tick = Math.min(duel.replay.result.tick, Math.floor(ms / 100));
    const { rngState: _rng, ...state } = duel.replay.snapshots[tick]!;
    void _rng;
    return SpectateFrameSchema.parse({
      version: COMPETITIVE_VERSION,
      matchId: this.id,
      playerId: p.id,
      combatId: duel.pairing.combatId,
      round: duel.pairing.round,
      sequence: tick,
      selectionSequence: p.spectateSequence,
      startedAt: phase.phaseStart,
      observedThroughMs: Math.min(ms, duel.replay.result.tick * 100 + 600),
      southPlayerId: duel.pairing.southPlayerId,
      northPlayerId: duel.pairing.northPlayerId,
      state,
      events: duel.replay.events.filter(
        (e) =>
          e.type !== 'combat_start' &&
          e.tick <= tick &&
          (e.tick >= tick - 25 || e.type === 'overtime_start'),
      ),
    });
  }
  private privateView(state: MatchState) {
    const view = PrivatePlayerSchema.parse(
      Object.fromEntries(
        Object.keys(PrivatePlayerSchema.shape)
          .filter(
            (k) =>
              (k !== 'lastCombatStatistics' || state.lastCombatStatistics !== undefined) &&
              (k !== 'shopRolls' || state.shopRolls !== undefined),
          )
          .map((k) => [k, state[k as keyof MatchState]]),
      ),
    );
    // Seed is an authority-only field. Zero is the wire sentinel, never used to restore.
    if (view.items) for (const drop of view.items.distributions) drop.seed = 0;
    return view;
  }
  snapshot(sessionId: string): NetworkSnapshot {
    if (this.capacity !== 2)
      throw new Error('Use the versioned round snapshot for multi-duel diagnostics');
    const own = this.players.find((p) => p.sessionId === sessionId);
    if (!own) throw new Error('Unknown session');
    const purchases = purchasePreviews(own.state, {
      externalCopies: this.external(own),
      prefix: `${own.id}-`,
    });
    return {
      version: NETWORK_VERSION,
      matchId: this.id,
      revision: this.revision,
      serverTime: this.clock.now(),
      playerId: own.id,
      players: this.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        side: i === 0 ? 'south' : 'north',
        connected: p.connected,
        hp: p.state.health.south,
        level: p.state.level,
        formation: p.state.units.filter((u) => u.location.kind === 'board'),
      })),
      purchaseErrors: purchases.map((p) => p.error),
      ...(['f0p11g-1', 'f0p11h-1'].includes(own.state.config.catalog ?? '')
        ? { purchaseUpgrades: purchases.map((p) => p.upgrade) }
        : {}),
      clock: this.clock.snapshot(),
      own: this.privateView(own.state),
      combatId: this.replay?.input.combatId ?? null,
      settlementId: this.settlementId,
    };
  }
  roundSnapshot(sessionId: string): RoundSnapshot {
    const own = this.players.find((p) => p.sessionId === sessionId);
    if (!own) throw new Error('Unknown session');
    const clock = this.clock.snapshot();
    const ranking = [...this.players].sort(
      (a, b) => b.state.health.south - a.state.health.south || (a.id < b.id ? -1 : 1),
    );
    const privateState = this.privateView(own.state);
    const purchases = purchasePreviews(own.state, {
      externalCopies: this.external(own),
      prefix: `${own.id}-`,
    });
    return RoundSnapshotSchema.parse({
      version: PAIRING_VERSION,
      matchId: this.id,
      revision: this.revision,
      serverTime: this.clock.now(),
      playerId: own.id,
      clock,
      own: {
        ...Object.fromEntries(
          Object.entries(privateState).filter(([k]) => k !== 'health' && k !== 'healthLedger'),
        ),
        hp: own.state.health.south,
        healthLedger: own.state.healthLedger.filter((e) => e.side === 'south'),
      },
      players: this.players.map((p) => {
        const duel = this.duelFor(p.sessionId);
        const opponentId = duel
          ? duel.pairing.southPlayerId === p.id
            ? duel.pairing.northPlayerId
            : duel.pairing.southPlayerId
          : null;
        return {
          id: p.id,
          userId: p.id,
          name: p.name,
          avatarId: p.avatarId,
          connected: p.connected,
          hp: p.state.health.south,
          level: p.state.level,
          eliminated: p.eliminated,
          formation: p.state.units.filter((u) => u.location.kind === 'board'),
          opponentId,
          provisionalPosition:
            ranking.findIndex((x) => x.state.health.south === p.state.health.south) + 1,
          lastOutcome: p.state.lastReward?.outcome ?? null,
          status:
            clock.currentPhase === 'combat'
              ? duel && this.completedDuels.has(duel.pairing.combatId)
                ? 'awaiting_round'
                : 'fighting'
              : ['resolution', 'finished'].includes(clock.currentPhase)
                ? 'resolved'
                : 'waiting',
        };
      }),
      pairings: this.plan?.pairings ?? [],
      results: this.duels
        .filter((d) => d.settlement === 'settled')
        .map((d) => ({ combatId: d.pairing.combatId, result: d.replay.result })),
      combatId: this.duelFor(sessionId)?.pairing.combatId ?? null,
      settlementId: this.settlementId,
      ownSettlement: this.settlementId
        ? (this.settlements.get(`${this.settlementId}/${own.id}`) ?? null)
        : null,
      purchaseErrors: purchases.map((p) => p.error),
      ...(['f0p11g-1', 'f0p11h-1'].includes(own.state.config.catalog ?? '')
        ? { purchaseUpgrades: purchases.map((p) => p.upgrade) }
        : {}),
    });
  }
}
