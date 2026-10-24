import { randomBytes } from 'node:crypto';
import { VARGAS_ECONOMY_CONFIG, matchCatalog, combatRulesFor, traitsFor } from '@tft/game-data';
import {
  applySharedEconomy,
  commandFor,
  createMatch,
  copiesOf,
  MatchClock,
  runCombat,
  scaledProfile,
  validateMatchState,
  type TimeSource,
} from '@tft/game-core';
import { refreshShop } from '../../../packages/game-core/src/match/shop';
import {
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
  name: 'Vargas' | 'Florin';
  connected: boolean;
  state: MatchState;
  sequence: number;
  receipts: Map<string, { payload: string; receipt: ActionReceipt }>;
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
  constructor(
    readonly id: string,
    time: TimeSource = { now: () => performance.now() },
    seed: () => number = () => randomBytes(4).readUInt32LE(),
  ) {
    this.clock = new MatchClock(time, id);
    this.seed = seed;
    this.pool = Object.fromEntries(
      matchCatalog(VARGAS_ECONOMY_CONFIG).map((d) => [
        d.id,
        VARGAS_ECONOMY_CONFIG.copiesByCost[d.cost - 1]!,
      ]),
    );
  }
  join(sessionId: string) {
    if (this.players.length >= 2 || this.clock.snapshot().currentPhase !== 'not_started')
      throw new Error('Session full');
    const index = this.players.length,
      id = index === 0 ? 'vargas' : 'florin';
    const state = createMatch(this.seed(), VARGAS_ECONOMY_CONFIG);
    state.shop = Array(5).fill(null);
    state.shopRng = (state.seed ^ 0x9e3779b9) >>> 0;
    state.pool = { ...this.pool };
    refreshShop(state, `${id}-`);
    const p: Participant = {
      id,
      sessionId,
      name: index === 0 ? 'Vargas' : 'Florin',
      connected: true,
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
      this.players.length !== 2 ||
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
    for (const p of this.players) validateMatchState(p.state, this.external(p));
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
    const payload = JSON.stringify(c),
      prior = p.receipts.get(c.requestId);
    if (prior)
      return prior.payload === payload ? prior.receipt : receipt(false, 'request-conflict');
    if (c.sequence !== p.sequence) return receipt(false, 'sequence');
    p.sequence++;
    const before = this.clock.snapshot();
    this.pulse();
    const phase = this.clock.snapshot();
    let result: ActionReceipt;
    if (
      phase.currentPhase !== 'preparation' ||
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
    if (phase.clockState !== 'running' || phase.remainingMs > 0) return;
    if (phase.currentPhase === 'preparation') this.begin();
    else if (phase.currentPhase === 'combat') this.settle();
    else if (phase.currentPhase === 'resolution') {
      for (const p of this.players) {
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
      this.clock.enter('preparation', this.players[0]!.state.round, PREPARATION_MS);
      this.revision++;
      this.assertConservation();
    }
  }
  private begin() {
    const round = this.players[0]!.state.round;
    const input = CombatInputSchema.parse({
      protocolVersion: COMBAT_PROTOCOL,
      rulesVersion: combatRulesFor(VARGAS_ECONOMY_CONFIG.catalog),
      combatId: `${this.id}/combat/${round}`,
      seed: this.seed(),
      maxTicks: MAX_COMBAT_TICKS,
      obstacles: [],
      traits: traitsFor(VARGAS_ECONOMY_CONFIG.catalog),
      units: this.players.flatMap((p, i) =>
        p.state.units.flatMap((u) =>
          u.location.kind === 'board'
            ? [
                {
                  id: u.id,
                  definitionId: u.definitionId,
                  owner: i === 0 ? 'south' : 'north',
                  position: i === 0 ? u.location.hex : reverseHex(u.location.hex),
                  profile: scaledProfile(u.definitionId, u.stars, p.state.config),
                },
              ]
            : [],
        ),
      ),
    });
    this.replay = runCombat(input);
    this.simulations++;
    for (const [i, p] of this.players.entries()) {
      p.state.phase = 'combat';
      p.state.combat = {
        round,
        bank: p.state.gold,
        input: i === 0 ? input : reversePerspective(input),
        result: null,
      };
    }
    // Absolute deadline includes only the existing 600ms visual tail, never renderer acknowledgement.
    this.clock.enter('combat', round, this.replay.result.tick * 100 + VISUAL_TAIL_MS);
    this.revision++;
  }
  private settle() {
    const round = this.players[0]!.state.round,
      id = `${this.id}/round/${round}/settlement`;
    if (this.settlementId === id) throw new Error('Duplicate settlement');
    const states = this.players.map((p, i) => {
      const trace = i === 0 ? this.replay! : reversePerspective(this.replay!);
      const out = applySharedEconomy(
        p.state,
        commandFor(p.state, { type: 'resolve_round', round }),
        { externalCopies: this.external(p), prefix: `${p.id}-` },
        trace,
      );
      if (!out.ok) throw new Error(out.error);
      return out.state;
    });
    this.players.forEach((p, i) => {
      p.state = states[i]!;
    });
    this.settlementId = id;
    const finished = this.players.some((p) => p.state.health.south === 0);
    this.clock.enter(finished ? 'finished' : 'resolution', round, finished ? 0 : RESOLUTION_MS);
    this.revision++;
    this.assertConservation();
  }
  snapshot(sessionId: string): NetworkSnapshot {
    const own = this.players.find((p) => p.sessionId === sessionId);
    if (!own) throw new Error('Unknown session');
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
      purchaseErrors: own.state.shop.map((o) => {
        if (!o) return 'Sin oferta';
        const r = applySharedEconomy(
          own.state,
          commandFor(own.state, { type: 'buy_unit', offerId: o.id }),
          { externalCopies: this.external(own), prefix: `${own.id}-` },
        );
        return r.ok ? null : r.error;
      }),
      clock: this.clock.snapshot(),
      own: PrivatePlayerSchema.parse(
        Object.fromEntries(
          Object.keys(PrivatePlayerSchema.shape).map((k) => [k, own.state[k as keyof MatchState]]),
        ),
      ),
      combatId: this.replay?.input.combatId ?? null,
      settlementId: this.settlementId,
    };
  }
}
