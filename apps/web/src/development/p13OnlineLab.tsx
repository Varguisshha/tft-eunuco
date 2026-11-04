/** Local asset/replay fixture. Never imported by the public entry. */
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-700.css';
import '../styles.css';
import { p13tFixture } from './p13tFixture';
import { P13_ECONOMY_CONFIG } from '@tft/game-data';
import { createMatch, validateMatchState } from '@tft/game-core';
import { ArenaIdSchema } from '@tft/shared';
import { LocalSession } from '../match/LocalSession';
import { LocalGame } from '../match/LocalGame';
if (import.meta.env.DEV) {
  const query = new URLSearchParams(location.search),
    stars = Math.max(1, Math.min(3, Number(query.get('stars') ?? 1))) as 1 | 2 | 3;
  const prior = p13tFixture(stars);
  const state = validateMatchState({
    ...createMatch(42, { ...P13_ECONOMY_CONFIG, initialGold: 50 }),
    level: prior.level,
    xp: prior.xp,
    units: prior.units,
    pool: prior.pool,
    shop: prior.shop,
    shopRolls: prior.shopRolls,
  });
  const session = new LocalSession(state);
  if (query.has('combat')) {
    session.dispatch({ type: 'start_combat' });
    session.advanceCombat(Number(query.get('time') ?? 1500));
    if (query.has('pause')) session.pauseCombat();
  }
  if (query.has('inspect')) session.select('p13t-1');
  createRoot(document.getElementById('root')!).render(
    <LocalGame
      session={session}
      arenaId={ArenaIdSchema.parse(query.get('arena') ?? 'mar-de-cristal')}
      onNew={() => location.reload()}
      onReplace={() => {}}
    />,
  );
}
