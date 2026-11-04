import { expect, it } from 'vitest';
import { P13U_ECONOMY_CONFIG, P13U_TRAITS } from '@tft/game-data';
import { createMatch, RoundAuthority } from './engine';
import { validateMatchState } from './invariants';
it('credits combat-earned gold before the Jew bank and never pays a resolved round twice', () => {
  const members = P13U_TRAITS.find((t) => t.id === 'rata')!.planning!.members;
  let verified = false;
  for (let seed = 1; seed <= 30 && !verified; seed++) {
    const state = createMatch(seed, {
      ...P13U_ECONOMY_CONFIG,
      initialGold: 19,
      opponents: [{ fromRound: 1, definitions: ['cosmin'], stars: 1 }],
    });
    state.level = 7;
    state.xp = 0;
    state.units = members.map((definitionId, i) => ({
      id: `member-${i}`,
      definitionId,
      stars: 1,
      location: { kind: 'board', hex: { q: i - 2, r: 4 } },
    }));
    for (const u of state.units) state.pool[u.definitionId]!--;
    validateMatchState(state);
    const authority = new RoundAuthority(),
      combat = authority.begin(state);
    const gold = combat.replay.events
      .filter((e) => e.type === 'synergy_gold' && e.payload.side === 'south')
      .reduce((n, e) => n + (e.type === 'synergy_gold' ? e.payload.amount : 0), 0);
    if (!gold) continue;
    const result = authority.settle(combat.state);
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error(result.error);
    const s = result.state,
      receipt = s.synergies!.receipts.find((r) => r.kind === 'interest' && r.round === 1)!;
    expect(receipt.details).toContain(`bank:${19 + gold}`);
    expect(receipt.gold).toBe(2);
    expect(s.ledger.filter((e) => e.reference === 'p13u-combat-gold-1')).toHaveLength(1);
    expect(s.ledger.findIndex((e) => e.reference === 'p13u-combat-gold-1')).toBeLessThan(
      s.ledger.findIndex((e) => e.reason === 'base'),
    );
    validateMatchState(s);
    const retry = authority.settle(s);
    expect(retry.ok).toBe(false);
    verified = true;
  }
  expect(verified).toBe(true);
});
