import { it, expect } from 'vitest';
import { P11G_ECONOMY_CONFIG } from '@tft/game-data';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { fixtureUsers } from './multi-fixture';
import { RoundSnapshotSchema } from '@tft/shared';
import { P11G_CATALOG_HASH, P11C_CATALOG_HASH } from './persistence/snapshot';
it.each([2, 3, 4] as const)(
  'P11G %i players: private preview, receipts, stock, drops and restore',
  (count) => {
    let now = 0,
      m = new AuthoritativeMatch(
        'p11g-authority',
        { now: () => now },
        () => 360,
        count,
        P11G_ECONOMY_CONFIG,
      );
    for (let i = 0; i < count; i++) m.join(`s${i}`, { userId: fixtureUsers[i]!, name: `P${i}` });
    m.start('s0');
    const snapshot = RoundSnapshotSchema.parse(m.roundSnapshot('s0'));
    expect(snapshot.purchaseUpgrades).toHaveLength(5);
    expect(snapshot.own.shopRolls).toHaveLength(5);
    expect(snapshot.own).not.toHaveProperty('pool');
    for (let n = 0; n < 12 && m.players[0]!.state.round < 4; n++) {
      now += 60000;
      m.pulse();
      const saved = m.exportState();
      expect(saved.catalog).toBe(P11G_CATALOG_HASH);
      expect(saved.catalog).not.toBe(P11C_CATALOG_HASH);
      m = AuthoritativeMatch.restore(saved, { now: () => now });
      m.assertConservation();
    }
    expect(m.exportState().itemDrops!.rounds.map((r) => r.round)).toContain(3);
    for (const p of m.players) {
      const r = p.state.lastReward!;
      expect(r.receipt).toBeDefined();
      expect(r.receipt!.base + r.receipt!.interest + r.receipt!.victory + r.receipt!.streak).toBe(
        r.credited,
      );
      expect(r.receipt!.id).toContain(p.id);
      expect(p.state.items!.distributions.some((d) => d.round === 3)).toBe(true);
    }
    for (let n = 0; n < 120 && !m.exportState().finalResult; n++) {
      now += 60000;
      m.pulse();
      m = AuthoritativeMatch.restore(m.exportState(), { now: () => now });
      m.assertConservation();
    }
    expect(m.exportState().finalResult).not.toBeNull();
    expect(
      m.players
        .filter((p) => p.eliminated)
        .every(
          (p) =>
            p.state.shop.every((o) => o === null) &&
            p.state.shopRolls!.every((r) => r.outcome === 'released'),
        ),
    ).toBe(true);
  },
);
