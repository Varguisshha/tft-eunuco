import { useState } from 'react';
import type { Point } from '@tft/game-core';
import type { HexCoord } from '@tft/shared';
import { calibrationErrors, type ArenaDefinition } from './arena';
import type { Quad } from './geometry';
import './calibration.css';
export interface CalibrationState {
  showGrid?: boolean;
  showUnits?: boolean;
  enabled: boolean;
  controls: Quad;
}
const names = ['Fondo', 'Derecha', 'Frente', 'Izquierda'];
export function ArenaCalibration({
  arena,
  state,
  onChange,
  hover,
}: {
  arena: ArenaDefinition;
  state: CalibrationState;
  onChange: (state: CalibrationState) => void;
  hover: { hex: HexCoord | null; point: Point } | null;
}) {
  const [message, setMessage] = useState('');
  const errors = calibrationErrors(arena, state.controls);
  const storageKey = `tft-arena-calibration-v1:${arena.id}`;
  const adjust = (dx: number, dy: number, scale = 1) => {
    const c = state.controls.reduce((sum, p) => ({ x: sum.x + p.x / 4, y: sum.y + p.y / 4 }), {
      x: 0,
      y: 0,
    });
    onChange({
      ...state,
      controls: state.controls.map((p) => ({
        x: c.x + (p.x - c.x) * scale + dx,
        y: c.y + (p.y - c.y) * scale + dy,
      })) as unknown as Quad,
    });
  };
  const load = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (
        raw?.contractVersion !== 1 ||
        raw?.arenaId !== arena.id ||
        raw?.sourceSha256 !== arena.image.sha256 ||
        !Array.isArray(raw.controls) ||
        raw.controls.length !== 4 ||
        raw.controls.some((p: Point) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) ||
        calibrationErrors(arena, raw.controls).length
      )
        throw new Error();
      onChange({ enabled: true, controls: raw.controls });
      setMessage('Calibración recuperada solo para esta vista de desarrollo.');
    } catch {
      setMessage('No hay una calibración válida guardada para esta imagen.');
    }
  };
  const exported = JSON.stringify(
    {
      contractVersion: 1,
      arenaId: arena.id,
      sourceSha256: arena.image.sha256,
      controls: state.controls,
    },
    null,
    2,
  );
  return (
    <div
      className="arena-calibration"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onChange({ ...state, enabled: false });
        }
      }}
    >
      <button
        className="button"
        aria-expanded={state.enabled}
        onClick={() => onChange({ ...state, enabled: !state.enabled })}
      >
        {state.enabled ? 'Cerrar calibración' : 'Calibrar arena'}
      </button>
      {state.enabled && (
        <section aria-label="Calibración de arena">
          <h3>Mar de Cristal · calibración</h3>
          <p>56 celdas · jade / ámbar · perímetro amarillo · controles blancos</p>
          <label>
            <input
              type="checkbox"
              checked={state.showGrid ?? true}
              onChange={(e) => onChange({ ...state, showGrid: e.target.checked })}
            />{' '}
            Mostrar cuadrícula
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.showUnits ?? true}
              onChange={(e) => onChange({ ...state, showUnits: e.target.checked })}
            />{' '}
            Mostrar unidades
          </label>
          <div className="calibration-points">
            {state.controls.map((p, i) => (
              <fieldset key={i}>
                <legend>{names[i]}</legend>
                {(['x', 'y'] as const).map((axis) => (
                  <label key={axis}>
                    {axis.toUpperCase()}
                    <input
                      aria-label={`${names[i]} ${axis.toUpperCase()}`}
                      type="number"
                      step="1"
                      value={Math.round(p[axis] * 100) / 100}
                      onChange={(e) =>
                        onChange({
                          ...state,
                          controls: state.controls.map((v, j) =>
                            j === i ? { ...v, [axis]: Number(e.target.value) } : v,
                          ) as unknown as Quad,
                        })
                      }
                    />
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <div className="calibration-actions">
            <button onClick={() => adjust(-5, 0)} aria-label="Desplazar cuadrícula a la izquierda">
              ←
            </button>
            <button onClick={() => adjust(5, 0)} aria-label="Desplazar cuadrícula a la derecha">
              →
            </button>
            <button onClick={() => adjust(0, -5)} aria-label="Desplazar cuadrícula arriba">
              ↑
            </button>
            <button onClick={() => adjust(0, 5)} aria-label="Desplazar cuadrícula abajo">
              ↓
            </button>
            <button onClick={() => adjust(0, 0, 0.98)}>Escala −</button>
            <button onClick={() => adjust(0, 0, 1.02)}>Escala +</button>
          </div>
          <p role="status">
            {errors.length
              ? `${errors.join(' ')} Se conserva la última proyección válida.`
              : '56 / 56 celdas dentro del pavimento seguro.'}
          </p>
          <output>
            {hover
              ? `Axial ${hover.hex ? `${hover.hex.q}, ${hover.hex.r}` : 'fuera'} · Imagen ${hover.point.x.toFixed(1)}, ${hover.point.y.toFixed(1)}`
              : 'Mueve el cursor por el tablero para inspeccionar coordenadas.'}
          </output>
          <div className="calibration-actions">
            <button
              onClick={() => onChange({ enabled: true, controls: arena.projection.controls })}
            >
              Restablecer
            </button>
            <button
              disabled={!!errors.length}
              onClick={() => {
                try {
                  localStorage.setItem(storageKey, exported);
                  setMessage(
                    'Guardada en este navegador. No altera la partida ni la configuración normal.',
                  );
                } catch {
                  setMessage('No se pudo guardar; copia el JSON.');
                }
              }}
            >
              Guardar calibración
            </button>
            <button onClick={load}>Recuperar calibración</button>
            <button
              disabled={!!errors.length}
              onClick={() => {
                const url = URL.createObjectURL(new Blob([exported], { type: 'application/json' }));
                const a = document.createElement('a');
                a.href = url;
                a.download = `${arena.id}-calibration.json`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Exportar JSON
            </button>
          </div>
          <details>
            <summary>Configuración reproducible</summary>
            <textarea aria-label="JSON de calibración" readOnly value={exported} />
          </details>
          {message && <p role="status">{message}</p>}
        </section>
      )}
    </div>
  );
}
