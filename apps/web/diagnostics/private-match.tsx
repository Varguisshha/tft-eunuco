/** Explicit loopback fixture entry; not an input of the production build. */
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '../src/styles.css';
import '../src/auth/auth.css';
import { Multiplayer } from '../src/network/Multiplayer';
if (!import.meta.env.DEV || location.hostname !== '127.0.0.1' || location.port !== '4174')
  throw Error('Local diagnostics only');
const i = Number(new URLSearchParams(location.search).get('player') ?? 0);
if (![0, 1, 2, 3].includes(i)) throw Error('Unknown fixture');
const session = {
  access_token: `fixture-${i}`,
  user: { id: `00000000-0000-4000-8000-00000000000${i + 1}` },
} as Session;
createRoot(document.getElementById('root')!).render(
  <Multiplayer accountSession={session} onAccount={() => {}} onLocal={() => {}} />,
);
