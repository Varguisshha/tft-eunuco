/** Isolated, fixed-clock visual fixture. Never imported by the production entry. */
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-700.css';
import '../styles.css';
import './development.css';
import { P12F_ECONOMY_CONFIG } from '@tft/game-data';
import { createP11HReference } from './p11hReference';
import { LocalSession } from '../match/LocalSession';
import { LocalGame } from '../match/LocalGame';
import { ItemArtGallery } from './ItemArtGallery';

if (import.meta.env.DEV) {
  const controller = createP11HReference(P12F_ECONOMY_CONFIG);
  const session = new LocalSession(
    controller.coordinator.getMatch(),
    undefined,
    controller.coordinator,
  );
  const gallery = location.search.includes('gallery');
  createRoot(document.getElementById('root')!).render(
    gallery ? (
      <main style={{ padding: 24 }}>
        <ItemArtGallery />
      </main>
    ) : (
      <LocalGame session={session} onNew={() => location.reload()} onReplace={() => undefined} />
    ),
  );
}
