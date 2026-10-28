import { LocalDropJournalSchema, type LocalDropJournal, type MatchState } from '@tft/shared';
import { deriveDropSeed, planItemDrop } from './drops';
import {
  grantItemInstances,
  grantRoundRemover,
  localItemOwner,
  validateItemState,
} from './inventory';
export function createLocalDropJournal(state: MatchState): LocalDropJournal | undefined {
  return ['f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '')
    ? {
        version: 'f0p11g-local-1',
        seed: deriveDropSeed(state.seed, 'local-component-drops'),
        rounds: [],
      }
    : undefined;
}
function plan(state: MatchState, journal: LocalDropJournal, matchId: string, round: number) {
  const owner = state.items!.ownerId,
    rival = localItemOwner((state.seed ^ 0x80000000) >>> 0);
  return planItemDrop(matchId, round, journal.seed, [owner, rival]).players.find(
    (p) => p.playerId === owner,
  )!;
}
/** Called on the settled transaction draft, before coordinator state/journal are committed together. */
export function settleLocalDrop(
  state: MatchState,
  journal: LocalDropJournal,
  matchId: string,
): LocalDropJournal {
  if (!['f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '') || !state.items)
    throw Error('Local drop catalog');
  if (
    state.round % 3 ||
    state.health.south <= 0 ||
    (state.health.north <= 0 && state.config.removerPolicy?.version !== 'f0p12b-remover-1')
  )
    return journal;
  if (journal.rounds.some((r) => r.round === state.round)) {
    validateLocalDrops(state, journal, matchId);
    return journal;
  }
  const reward = plan(state, journal, matchId, state.round);
  grantItemInstances(state, reward.grantId, reward.definitionIds);
  reward.instanceIds = state.items.grants
    .find((g) => g.id === reward.grantId)!
    .instances.map((i) => i.id);
  const removerIds = grantRoundRemover(state, reward.grantId);
  if (removerIds) reward.removerIds = removerIds;
  state.items.distributions.push({
    ...(removerIds ? { removerIds } : {}),
    id: reward.grantId,
    round: state.round,
    quantity: reward.definitionIds.length as 2 | 3,
    seed: reward.seed,
    instanceIds: reward.instanceIds,
  });
  const next = LocalDropJournalSchema.parse({
    ...journal,
    rounds: [
      ...journal.rounds,
      { ...reward, round: state.round, quantity: reward.definitionIds.length },
    ],
  });
  validateItemState(state);
  validateLocalDrops(state, next, matchId);
  return next;
}
export function validateLocalDrops(
  state: MatchState,
  raw: LocalDropJournal | undefined,
  matchId: string,
): void {
  if (!['f0p11g-1', 'f0p11h-1'].includes(state.config.catalog ?? '')) {
    if (raw) throw Error('Unexpected local drop journal');
    return;
  }
  const journal = LocalDropJournalSchema.parse(raw);
  if (journal.seed !== deriveDropSeed(state.seed, 'local-component-drops') || !state.items)
    throw Error('Local drop seed/inventory');
  const rounds = state.healthLedger
    .filter(
      (h) =>
        h.side === 'south' &&
        h.round % 3 === 0 &&
        h.hpAfter > 0 &&
        (state.config.removerPolicy?.version === 'f0p12b-remover-1' ||
          state.healthLedger.some(
            (n) => n.side === 'north' && n.round === h.round && n.hpAfter > 0,
          )),
    )
    .map((h) => h.round);
  if (rounds.length !== journal.rounds.length || state.items.distributions.length !== rounds.length)
    throw Error('Local drop settlement coverage');
  for (const [i, round] of rounds.entries()) {
    const record = journal.rounds[i]!,
      expected = plan(state, journal, matchId, round),
      grant = state.items.grants.find((g) => g.id === expected.grantId),
      distribution = state.items.distributions.find((d) => d.id === expected.grantId);
    if (
      JSON.stringify(record.removerIds) !== JSON.stringify(distribution?.removerIds) ||
      (state.config.removerPolicy?.version === 'f0p12b-remover-1'
        ? record.removerIds?.[0] !==
          `${state.items.ownerId}/remover/round-${expected.grantId.slice(0, 24)}`
        : record.removerIds !== undefined) ||
      record.round !== round ||
      record.playerId !== expected.playerId ||
      record.grantId !== expected.grantId ||
      record.seed !== expected.seed ||
      record.quantity !== expected.definitionIds.length ||
      JSON.stringify(record.definitionIds) !== JSON.stringify(expected.definitionIds) ||
      !grant ||
      !distribution ||
      JSON.stringify(record.instanceIds) !== JSON.stringify(grant.instances.map((i) => i.id)) ||
      JSON.stringify(record.instanceIds) !== JSON.stringify(distribution.instanceIds) ||
      distribution.round !== round ||
      distribution.quantity !== record.quantity ||
      distribution.seed !== record.seed ||
      JSON.stringify(grant.instances.map((i) => i.definitionId)) !==
        JSON.stringify(expected.definitionIds)
    )
      throw Error('Invalid local distribution');
  }
}
