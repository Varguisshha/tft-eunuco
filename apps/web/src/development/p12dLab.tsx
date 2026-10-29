/** Explicit dev entry only. Never imported by index.html or the public bundle. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-700.css';
import '../styles.css';
import { Multiplayer } from '../network/Multiplayer';
function Lab() {
  const [identity, setIdentity] = React.useState<number | null>(null);
  if (!import.meta.env.DEV) return null;
  if (identity === null)
    return (
      <main style={{ padding: 32 }}>
        <h1>Laboratorio P12D</h1>
        <p>Identidades locales, sin cuentas ni datos remotos.</p>
        {['Vargas', 'Florin', 'Nora', 'Alex'].map((name, i) => (
          <button key={name} onClick={() => setIdentity(i)}>
            Entrar como {name} LAB
          </button>
        ))}
      </main>
    );
  const session = {
    access_token: `fixture-${identity}`,
    user: { id: `00000000-0000-4000-8000-00000000000${identity + 1}` },
  } as Session;
  return (
    <Multiplayer
      accountSession={session}
      onAccount={() => setIdentity(null)}
      onLocal={() => setIdentity(null)}
    />
  );
}
createRoot(document.getElementById('root')!).render(<Lab />);
