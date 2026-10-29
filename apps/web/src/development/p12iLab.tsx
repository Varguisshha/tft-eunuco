/** Isolated browser lab. Not part of the public entry. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-700.css';
import '../styles.css';
import '../auth/auth.css';
import { Multiplayer } from '../network/Multiplayer';
function Lab() {
  const [id, setId] = useState<number | null>(null);
  if (!import.meta.env.DEV) return null;
  if (id === null)
    return (
      <main style={{ padding: 32 }}>
        <h1>P12I · Laboratorio de arenas</h1>
        {['Vargas', 'Florin', 'Nora', 'Alex'].map((name, i) => (
          <button key={name} onClick={() => setId(i)}>
            {name} LAB
          </button>
        ))}
      </main>
    );
  const session = {
    access_token: `fixture-${id}`,
    user: { id: `00000000-0000-4000-8000-00000000000${id + 1}` },
  } as Session;
  return (
    <>
      <Multiplayer
        accountSession={session}
        onAccount={() => setId(null)}
        onLocal={() => setId(null)}
      />
      <button
        style={{ position: 'fixed', right: 8, bottom: 0, zIndex: 20000 }}
        onClick={() => void fetch('http://127.0.0.1:2595/advance', { method: 'POST' })}
      >
        LAB · Avanzar fase
      </button>
    </>
  );
}
createRoot(document.getElementById('root')!).render(<Lab />);
