import { randomUUID, createHash } from 'node:crypto';
import { it, expect } from 'vitest';
import {
  ITEMS_ECONOMY_CONFIG,
  JARAMILLO_ECONOMY_CONFIG,
  VARGAS_ECONOMY_CONFIG,
  matchCatalog,
} from '@tft/game-data';
import { NETWORK_VERSION, PrivatePlayerSchema, type MatchCommand } from '@tft/shared';
import { AuthoritativeMatch } from './AuthoritativeMatch';
import { CATALOG, COMPOSITE_CATALOG, ITEM_CATALOG_HASH } from './persistence/snapshot';
function setup() {
  const m = new AuthoritativeMatch(
    randomUUID(),
    { now: () => 0 },
    () => 42,
    2,
    ITEMS_ECONOMY_CONFIG,
  );
  for (let i = 0; i < 2; i++) m.join(`s${i}`, { userId: randomUUID(), name: `Player${i}` });
  m.start('s0');
  return m;
}
function send(
  m: AuthoritativeMatch,
  index: number,
  action: MatchCommand,
  requestId = randomUUID(),
) {
  const p = m.players[index]!;
  return m.submit(p.sessionId, {
    version: NETWORK_VERSION,
    sessionId: p.sessionId,
    requestId,
    sequence: p.sequence,
    matchId: m.id,
    phaseId: m.clock.snapshot().phaseId,
    action: { ...action, seq: p.state.nextActionSeq, expectedRevision: p.state.revision },
  });
}
it('normal authority owns independent UUID inventories and publishes only the requesting bag', () => {
  const m = setup();
  for (const p of m.players) m.grantItems(p.id, `grant-${p.id}`, ['component-ad']);
  const a = m.competitiveSnapshot('s0'),
    b = m.competitiveSnapshot('s1');
  expect(a.own.items!.ownerId).toBe(m.players[0]!.id);
  expect(b.own.items!.ownerId).toBe(m.players[1]!.id);
  expect(JSON.stringify(a)).not.toContain(m.players[1]!.state.items!.components[0]!.id);
  expect(PrivatePlayerSchema.safeParse(a.own).success).toBe(false); // modern view replaces health with hp
  expect(a.players.every((p) => !('items' in p))).toBe(true);
});
it('server commands enforce owner, phase, instances and exact duplicate receipts', () => {
  const m = setup();
  const p = m.players[0]!;
  expect(send(m, 0, { type: 'buy_unit', offerId: p.state.shop.find(Boolean)!.id }).accepted).toBe(
    true,
  );
  m.grantItems(p.id, 'g', ['component-ad']);
  const item = p.state.items!.components[0]!.id;
  // Unit and item identifiers from the other player's private inventory cannot be applied.
  expect(
    send(m, 1, { type: 'equip_item', itemId: item, unitId: p.state.units[0]!.id }),
  ).toMatchObject({ accepted: false, reason: 'item-owner' });
  const envelope = {
    version: NETWORK_VERSION,
    sessionId: p.sessionId,
    requestId: randomUUID(),
    sequence: p.sequence,
    matchId: m.id,
    phaseId: m.clock.snapshot().phaseId,
    action: {
      type: 'equip_item' as const,
      itemId: item,
      unitId: p.state.units[0]!.id,
      seq: p.state.nextActionSeq,
      expectedRevision: p.state.revision,
    },
  };
  const before = m.submit(p.sessionId, envelope);
  expect(before.accepted).toBe(true);
  expect(m.submit(p.sessionId, envelope)).toEqual(before);
  expect(p.state.units[0]!.equipment).toHaveLength(1);
  expect(
    m.submit(p.sessionId, { ...envelope, action: { ...envelope.action, itemId: 'other' } }),
  ).toMatchObject({ accepted: false, reason: 'request-conflict' });
  const saved = m.exportState(),
    restored = AuthoritativeMatch.restore(JSON.parse(JSON.stringify(saved)));
  restored.resume('new', p.id);
  expect(restored.submit('new', { ...envelope, sessionId: 'new' })).toEqual(before);
  expect(restored.players[0]!.state.items).toEqual(p.state.items);
  const c = m.clock.snapshot();
  m.clock.restore({ ...c, remainingMs: 0 });
  m.pulse();
  expect(send(m, 0, { type: 'inspect_item', itemId: item })).toMatchObject({
    accepted: false,
    reason: 'wrong-phase',
  });
});
it('catalog fingerprints preserve both previous generations and reject crossed inventory versions', () => {
  expect(CATALOG).toBe(
    createHash('sha256')
      .update(JSON.stringify([VARGAS_ECONOMY_CONFIG, matchCatalog(VARGAS_ECONOMY_CONFIG)]))
      .digest('hex'),
  );
  expect(COMPOSITE_CATALOG).toBe(
    createHash('sha256')
      .update(JSON.stringify([JARAMILLO_ECONOMY_CONFIG, matchCatalog(JARAMILLO_ECONOMY_CONFIG)]))
      .digest('hex'),
  );
  const m = setup(),
    saved = m.exportState();
  expect(saved.catalog).toBe(ITEM_CATALOG_HASH);
  expect(AuthoritativeMatch.restore(saved).config).toEqual(ITEMS_ECONOMY_CONFIG);
  expect(() => AuthoritativeMatch.restore({ ...saved, catalog: COMPOSITE_CATALOG })).toThrow();
  saved.players[0]!.state.items!.ownerId = m.players[1]!.id;
  expect(() => AuthoritativeMatch.restore(saved)).toThrow();
});
it('normal server rejects diagnostic item grants and client-controlled inventory replacement', () => {
  const m = setup();
  const before = m.exportState();
  expect(() => m.grantItems(m.players[0]!.id, 'bad', ['diagnostic-double-ad'])).toThrow(
    'item-unavailable',
  );
  expect(m.exportState()).toEqual(before);
  expect(m.submit('s0', { type: 'grant_items', definitionIds: ['component-ad'] })).toMatchObject({
    accepted: false,
    reason: 'invalid-payload',
  });
  m.grantItems(m.players[0]!.id, 'valid', ['component-ap']);
  const once = m.exportState();
  m.grantItems(m.players[0]!.id, 'valid', ['component-ap']);
  expect(m.exportState()).toEqual(once);
});

it('durable copy-on-write does not publish equipment when storage rejects a commit', async () => {
  const { DurableMatch } = await import('./persistence/DurableMatch');
  const { LOBBY_VERSION } = await import('@tft/shared');
  const m = setup(),
    p = m.players[0]!;
  expect(send(m, 0, { type: 'buy_unit', offerId: p.state.shop.find(Boolean)!.id }).accepted).toBe(
    true,
  );
  m.grantItems(p.id, 'durable-grant', ['component-ad']);
  let unavailable = false;
  const repo = {
    async commit() {
      if (unavailable) throw Error('offline');
    },
    async load() {
      return [];
    },
  };
  const lobby = {
    version: LOBBY_VERSION,
    roomId: randomUUID(),
    roomCode: 'ABCDEFGH',
    hostUserId: p.id,
    capacity: 2 as const,
    participants: m.players.map((p) => ({
      userId: p.id,
      name: p.name,
      avatarId: p.avatarId,
      readyState: true,
      connected: true,
    })),
    status: 'in_match' as const,
    createdAt: Date.now(),
    expiresAt: Date.now() + 900000,
    matchId: m.id,
    revision: 1,
  };
  const d = new DurableMatch(m, repo, lobby);
  await d.run(() => {});
  const before = structuredClone(d.match.players[0]!.state);
  unavailable = true;
  await expect(
    d.run((candidate) =>
      send(candidate, 0, {
        type: 'equip_item',
        itemId: before.items!.components[0]!.id,
        unitId: before.units[0]!.id,
      }),
    ),
  ).rejects.toThrow();
  expect(d.match.players[0]!.state).toEqual(before);
  expect(d.unavailable).toBe(true);
});
