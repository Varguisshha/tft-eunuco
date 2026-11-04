/** Explicit LOCAL visual fixture; excluded from the production entry. */
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-700.css';
import '../styles.css';
import { createMatch, validateMatchState } from '@tft/game-core';
import { P13S_ECONOMY_CONFIG } from '@tft/game-data';
import { LocalSession } from '../match/LocalSession';
import { LocalGame } from '../match/LocalGame';
import { ArenaIdSchema } from '@tft/shared';
if (import.meta.env.DEV) {
  const state = createMatch(42, { ...P13S_ECONOMY_CONFIG, initialGold: 50 });
  state.level = 7;
  state.xp = 0;
  state.units = ['dolea', 'vargas', 'jaramillo', 'peibol', 'danigm', 'jota', 'focho'].map(
    (definitionId, i) => ({
      id: `lab-${i}`,
      definitionId,
      stars: 1,
      location: { kind: 'board', hex: { q: i - 2, r: 4 } },
    }),
  );
  for (const u of state.units) state.pool[u.definitionId]!--;
  const session = new LocalSession(validateMatchState(state));
  const arena = ArenaIdSchema.parse(
    new URLSearchParams(location.search).get('arena') ?? 'mar-de-cristal',
  );
  createRoot(document.getElementById('root')!).render(
    <LocalGame
      session={session}
      arenaId={arena}
      onNew={() => location.reload()}
      onReplace={() => {}}
    />,
  );
}
