/** Isolated PostgreSQL/SIGKILL laboratory. Never imported by production. */
import { DurableMatch } from './DurableMatch';
import { PostgresTestRepository } from './PostgresTestRepository';
import { AuthoritativeMatch } from '../AuthoritativeMatch';
const url = process.env.PERSISTENCE_TEST_URL;
if (!url || !/^postgres(?:ql)?:\/\/(?:[^/@]+@)?127\.0\.0\.1:55439\/tft_persistence_test$/.test(url))
  throw Error('Disposable local database required');
const repo = new PostgresTestRepository(url);
const id = process.argv[2]!,
  round = Number(process.argv[3]!),
  phase = process.argv[4]!;
const saved = (await repo.load()).find((d) => d.id === id);
if (!saved) throw Error('Missing local fixture');
const match = AuthoritativeMatch.restore(saved.authority, { now: () => 0 }, false);
const durable = new DurableMatch(
  match,
  {
    load: () => repo.load(),
    commit: async (expected, document) => {
      process.send?.({ type: 'sql-submit' });
      await repo.commit(expected, document);
    },
  },
  saved.lobby,
  saved,
);
process.send?.({ type: 'ready' });
process.on('disconnect', () => {
  void repo.pool.end();
});
process.once('message', () => {
  const c = match.clock.snapshot();
  if (Number(c.roundId.split('/').at(-1)) !== round || c.currentPhase !== phase) {
    process.send?.({ type: 'committed' });
    return;
  }
  void durable
    .run((m) => {
      m.clock.restore({ ...m.clock.snapshot(), remainingMs: 0 });
      m.pulse();
    })
    .then(() => process.send?.({ type: 'committed' }))
    .catch(() => {
      process.send?.({ type: 'failed' });
      process.exitCode = 1;
    });
});
