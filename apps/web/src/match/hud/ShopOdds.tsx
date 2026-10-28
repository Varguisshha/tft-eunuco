import { useRef, useState } from 'react';
import { TFT185_SHOP_ODDS } from '@tft/game-data';
import type { MatchState } from '@tft/shared';
export function ShopOdds({ state }: { state: MatchState }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={trigger}
        className="odds-trigger"
        aria-label={`Nivel ${state.level}: probabilidades de tienda`}
        aria-expanded={open}
        aria-controls="shop-odds-table"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        <span>
          Nivel <strong>{state.level}</strong>
          <small>Ver probabilidades</small>
        </span>
      </button>
      {open && (
        <section
          id="shop-odds-table"
          className="odds-popover"
          aria-label="Probabilidades nominales de tienda"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              trigger.current?.focus();
            }
          }}
        >
          <button
            className="odds-close"
            onClick={() => {
              setOpen(false);
              trigger.current?.focus();
            }}
          >
            Cerrar
          </button>
          <h2>Tienda · TFT 18.5</h2>
          <table>
            <thead>
              <tr>
                <th>Nivel</th>
                {[1, 2, 3, 4, 5].map((n) => (
                  <th key={n}>C{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TFT185_SHOP_ODDS.map((row) => (
                <tr key={row.level} aria-current={row.level === state.level ? 'true' : undefined}>
                  <th>{row.level}</th>
                  {row.odds.map((value, i) => (
                    <td key={i}>{value}%</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Costes 4 y 5: sin personajes en este catálogo. Nivel máximo de esta partida:{' '}
            {state.config.maxLevel}. Los demás niveles son referencia.
          </p>
          <p>
            Probabilidades nominales antes del stock compartido. Un coste sin catálogo o agotado
            deja el hueco vacío; no se vuelve a sortear ni se redistribuye su peso.
          </p>
        </section>
      )}
    </>
  );
}
