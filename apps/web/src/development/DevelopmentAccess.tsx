import { createP11HReference, createP11KReference } from './p11hReference';
import { ItemArtGallery } from './ItemArtGallery';
import { createP11GReference } from './p11gReference';
import { createP11BReference, createP11CReference } from './p11bReference';
import { RosterGallery } from './RosterGallery';
import { createRosterReference } from './rosterReference';
import { createP11Reference } from './p11Reference';
import { P12B_ECONOMY_CONFIG } from '@tft/game-data';
import {
  createFlorinItemReference,
  createItemHudReference,
  createFlorinReference,
  createNeonReference,
} from './neonReference';
import { useEffect, useRef, useState } from 'react';
import { DevelopmentController } from '@tft/game-core/development';
import type { DevelopmentCommand } from '@tft/shared/development';
import { combatRulesFor, matchCatalog } from '@tft/game-data';
import type { LocalMatchCoordinator } from '@tft/game-core';
import type { LocalSession } from '../match/LocalSession';
import { decodeSave, encodeSave } from '../match/automaticSave';
import { GameButton } from '../match/hud/GameButton';
import './development.css';
export const DEV_STORAGE_KEY = 'tft-eunuco-isolated-dev-f0p6b3';
const time = { now: () => performance.now() };
export default function DevelopmentAccess({
  session,
  seed,
  onReplace,
  onNormal,
}: {
  session: LocalSession | null;
  seed: number;
  onReplace: (c: LocalMatchCoordinator) => void;
  onNormal: (c: LocalMatchCoordinator | null) => void;
}) {
  const [controller, setController] = useState<DevelopmentController | null>(null);
  const [opened, setOpened] = useState(false);
  const [, render] = useState(0);
  const [message, setMessage] = useState('');
  const normal = useRef<LocalMatchCoordinator | null>(null);
  const [gold, setGold] = useState(100),
    [xp, setXp] = useState(4),
    [level, setLevel] = useState(7),
    [hp, setHp] = useState(100);
  const [character, setCharacter] = useState('vargas'),
    [stars, setStars] = useState<1 | 2 | 3>(3);
  const [destination, setDestination] = useState('bench'),
    [cell, setCell] = useState('1,4'),
    [removeId, setRemoveId] = useState('');
  const active = controller !== null && session?.coordinator === controller.coordinator;
  useEffect(() => {
    if (!controller) return;
    let lastSaved = -Infinity,
      lastRevision = -1,
      lastPhase = '';
    const persist = () => {
      render((n) => n + 1);
      const phase = controller.coordinator.getClock().phaseId;
      if (
        controller.revision === lastRevision &&
        phase === lastPhase &&
        performance.now() - lastSaved < 500
      )
        return;
      try {
        const snapshot = controller.exportSnapshot();
        localStorage.setItem(
          DEV_STORAGE_KEY,
          JSON.stringify({
            version: 1,
            save: encodeSave(snapshot.save),
            checkpoint: snapshot.checkpoint ? encodeSave(snapshot.checkpoint) : null,
            audit: snapshot.audit,
          }),
        );
        lastSaved = performance.now();
        lastRevision = controller.revision;
        lastPhase = phase;
      } catch {
        setMessage('No se pudo guardar DEV. La prueba continúa en memoria.');
      }
    };
    const unsubscribe = controller.onChange(persist);
    persist();
    return unsubscribe;
  }, [controller]);
  useEffect(() => () => controller?.dispose(), [controller]);
  const enter = (recover: boolean) => {
    try {
      normal.current = session?.coordinator?.development
        ? normal.current
        : (session?.coordinator ?? null);
      let next: DevelopmentController;
      if (recover) {
        const raw = localStorage.getItem(DEV_STORAGE_KEY);
        if (!raw) throw new Error('Todavía no hay una prueba DEV guardada.');
        const value = JSON.parse(raw);
        if (value.version !== 1) throw new Error('Guardado DEV incompatible.');
        next = DevelopmentController.restore(
          {
            save: decodeSave(value.save, time).exportSave(),
            checkpoint: value.checkpoint ? decodeSave(value.checkpoint, time).exportSave() : null,
            audit: value.audit,
          },
          time,
        );
      } else next = new DevelopmentController(time, seed, undefined, P12B_ECONOMY_CONFIG);
      setController(next);
      setOpened(true);
      setMessage('Prueba aislada lista. El guardado normal se conserva.');
      onReplace(next.coordinator);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo abrir DEV.');
    }
  };
  const run = (command: DevelopmentCommand) => {
    if (!controller) return false;
    const result = controller.execute({
      id: crypto.randomUUID(),
      origin: 'panel',
      expectedRevision: controller.revision,
      command,
    });
    setMessage(result.message);
    if (result.ok) onReplace(controller.coordinator);
    return result.ok;
  };
  const action = (label: string, command: DevelopmentCommand, disabled = false) => (
    <GameButton
      label={label}
      icon={
        command.type === 'gold'
          ? 'gold'
          : command.type === 'xp' || command.type === 'level'
            ? 'xp'
            : command.type === 'health'
              ? 'pulse'
              : command.type === 'spawn'
                ? 'neutral'
                : command.type === 'formation'
                  ? 'alloy'
                  : command.type === 'repeat' || command.type === 'reset'
                    ? 'refresh'
                    : 'check'
      }
      disabled={disabled}
      onAction={() => run(command)}
    />
  );
  if (!active)
    return (
      <aside className="dev-access" aria-label="Acceso a desarrollo">
        <details>
          <summary>Modo DEV</summary>
          <p>Partida de pruebas con guardado propio.</p>
          <button className="button" onClick={() => enter(false)}>
            Crear prueba DEV
          </button>
          <button className="button" onClick={() => enter(true)}>
            Recuperar DEV
          </button>
          <p role="status">{message}</p>
        </details>
      </aside>
    );
  const c = controller.coordinator,
    state = c.getMatch(),
    clock = c.getClock();
  const editable = ['not_started', 'preparation'].includes(clock.currentPhase);
  const selected = state.units.find((u) => u.id === removeId);
  const coordinates = cell.split(',').map(Number);
  return (
    <aside
      className={`developer-console ${opened ? 'is-open' : ''}`}
      aria-label="Modo Desarrollador"
    >
      <header>
        <button className="dev-fold" aria-expanded={opened} onClick={() => setOpened((v) => !v)}>
          DEV · {opened ? 'Plegar herramientas' : 'Abrir herramientas'}
        </button>
        <button
          className="dev-return"
          onClick={() => {
            setOpened(false);
            onNormal(normal.current);
          }}
        >
          Volver a normal
        </button>
      </header>
      {opened && (
        <div className="dev-scroll">
          <h2>Laboratorio de partida</h2>
          <GameButton
            label="Referencia P11K · removedor"
            icon="stats"
            disabled={false}
            onAction={() => {
              const next = createP11KReference();
              setController(next);
              onReplace(next.coordinator);
              setMessage(
                'Prueba aislada: removedor inicial de la política competitiva, DOLEA equipada y FLORIN en banquillo.',
              );
              return true;
            }}
          />
          <GameButton
            label="Referencia P11H · objetos y combate"
            icon="stats"
            disabled={false}
            onAction={() => {
              const next = createP11HReference();
              setController(next);
              onReplace(next.coordinator);
              setMessage(
                'P11H · 32 objetos disponibles, cuatro pendientes explícitos · compras de combate solo al banquillo.',
              );
              return true;
            }}
          />
          <ItemArtGallery />
          {[false, true].map((full) => (
            <GameButton
              key={String(full)}
              label={
                full ? 'Referencia P11G · inventario lleno' : 'Laboratorio P11G · reparto 3/6/9'
              }
              icon="stats"
              disabled={false}
              onAction={() => {
                const next = createP11GReference(full);
                setController(next);
                onReplace(next.coordinator);
                setMessage(
                  'P11G · rival simulado · vida de laboratorio 1000 · reloj fijo. Avanza las fases para obtener componentes reales en 3/6/9. Los guardados antiguos conservan sus reglas.',
                );
                return true;
              }}
            />
          ))}
          <GameButton
            label="Referencia P10A · cuatro personajes"
            icon="stats"
            disabled={false}
            onAction={() => {
              const next = createRosterReference();
              setController(next);
              onReplace(next.coordinator);
              setMessage(
                'Referencia P10A de diagnóstico · reloj fijo · pool real de cuatro personajes.',
              );
              return true;
            }}
          />
          <GameButton
            label="Referencia P11A · roster completo"
            icon="stats"
            disabled={false}
            onAction={() => {
              const next = createP11Reference();
              setController(next);
              onReplace(next.coordinator);
              setMessage(
                'Referencia DEV P11A · 34 identidades · parámetros provisionales · reloj fijo.',
              );
              return true;
            }}
          />
          <GameButton
            label="Referencia P11B · objetos y removedor"
            icon="stats"
            disabled={false}
            onAction={() => {
              const next = createP11BReference();
              setController(next);
              onReplace(next.coordinator);
              setMessage('Referencia P11B · TFT 18.5 con pendientes explícitos · removedor DEV.');
              return true;
            }}
          />
          <GameButton
            label="Referencia P11C · combate y estadísticas"
            icon="stats"
            disabled={false}
            onAction={() => {
              const next = createP11CReference();
              setController(next);
              onReplace(next.coordinator);
              setMessage('Referencia P11C · combate fijo · venta de banquillo y estadísticas.');
              return true;
            }}
          />
          {([2, 3] as const).map((stars) => (
            <GameButton
              key={stars}
              label={`Referencia P11G · fusión ${stars} estrellas`}
              icon="star"
              disabled={false}
              onAction={() => {
                const next = createP11GReference(true, stars);
                setController(next);
                onReplace(next.coordinator);
                setMessage(
                  `Compra DOLEA para comprobar el ascenso a ${stars} estrellas. Pool y compra reales.`,
                );
                return true;
              }}
            />
          ))}
          <RosterGallery modern />
          <GameButton
            label="Cargar referencia Neon"
            icon="stats"
            disabled={false}
            onAction={() => {
              const next = createNeonReference();
              setController(next);
              setMessage(
                'Referencia Neon · reloj fijo 18.4 s · datos reales. Usa avanzar fase para combatir.',
              );
              onReplace(next.coordinator);
              return true;
            }}
          />
          <GameButton
            label="Prueba FLORIN y splash arts"
            icon="stats"
            disabled={false}
            onAction={() => {
              const next = createFlorinReference();
              setController(next);
              setMessage(
                'Tienda de cuatro personajes · reloj fijo · FLORIN 1/2/3★ disponible en Generar.',
              );
              onReplace(next.coordinator);
              return true;
            }}
          />
          <div className="dev-actions">
            {([1, 2, 3] as const).map((stars) => (
              <GameButton
                key={stars}
                label={`FLORIN ${stars}★ con objetos`}
                icon="stats"
                disabled={false}
                onAction={() => {
                  const next = createFlorinItemReference(stars);
                  setController(next);
                  setMessage(
                    `FLORIN ${stars}★ equipado con 3 objetos reales · inicia combate para revisar sus efectos.`,
                  );
                  onReplace(next.coordinator);
                  return true;
                }}
              />
            ))}
          </div>
          <label>
            Objetos · diagnóstico aislado
            <select
              aria-label="Diagnóstico de objetos"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                const next = createItemHudReference(
                  e.target.value as Parameters<typeof createItemHudReference>[0],
                );
                setController(next);
                onReplace(next.coordinator);
                setMessage('Inventario de diagnóstico; utiliza los controles normales del HUD.');
              }}
            >
              <option value="">Cargar escenario…</option>
              <option value="empty">Sin objetos</option>
              <option value="components">Ocho componentes × 2</option>
              <option value="all">36 objetos y pendientes</option>
              <option value="full">Bandejas llenas</option>
              <option value="two">Reparto de 2 · ronda 3</option>
              <option value="three">Reparto de 3 · ronda 6</option>
              <option value="fusion">Fusión y venta</option>
            </select>
          </label>
          <p>Pool real reservado · guardado aislado · semilla {state.seed}</p>
          <p
            className={`dev-result ${controller.audit.at(-1)?.ok === false ? 'is-error' : ''}`}
            role="status"
          >
            {message}
          </p>
          {!editable && (
            <p>El combate está fijado. Repite la ronda para editar unidades, oro o vida.</p>
          )}
          <fieldset disabled={!editable}>
            <legend>Economía</legend>
            <div className="dev-actions">
              {action('+10 oro', { type: 'gold', mode: 'add', amount: 10 })}
              {action('+50 oro', { type: 'gold', mode: 'add', amount: 50 })}
              {action('Oro máximo', { type: 'gold', mode: 'max' })}
              {action('Oro inicial', { type: 'gold', mode: 'initial' })}
            </div>
            <label>
              Cantidad de oro
              <input
                type="number"
                min={0}
                max={999}
                value={gold}
                onChange={(e) => setGold(Number(e.target.value))}
              />
            </label>
            {action('Establecer oro', { type: 'gold', mode: 'set', amount: gold })}
          </fieldset>
          <fieldset disabled={!editable}>
            <legend>Nivel y experiencia</legend>
            <label>
              Nivel
              <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
                {[2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <div className="dev-actions">
              {action('Establecer nivel', { type: 'level', value: level })}
              {action(
                'Subir un nivel',
                { type: 'level', value: Math.min(7, state.level + 1) },
                state.level === 7,
              )}
            </div>
            <label>
              Cantidad de XP
              <input
                type="number"
                min={0}
                max={10000}
                value={xp}
                onChange={(e) => setXp(Number(e.target.value))}
              />
            </label>
            <div className="dev-actions">
              {action('Añadir XP', { type: 'xp', mode: 'add', amount: xp })}
              {action('Establecer XP', { type: 'xp', mode: 'set', amount: xp })}
            </div>
            <small>
              Capacidad {state.level} · ofertas por coste:{' '}
              {state.config.levels.find((l) => l.level === state.level)!.odds.join(' / ')} %
            </small>
          </fieldset>
          <fieldset disabled={!editable}>
            <legend>Personajes</legend>
            <label>
              Personaje
              <select value={character} onChange={(e) => setCharacter(e.target.value)}>
                {matchCatalog(state.config).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {state.pool[d.id]} copias libres
                  </option>
                ))}
              </select>
            </label>
            <label>
              Estrellas
              <select value={stars} onChange={(e) => setStars(Number(e.target.value) as 1 | 2 | 3)}>
                <option value={1}>1★ · 1 copia</option>
                <option value={2}>2★ · 3 copias</option>
                <option value={3}>3★ · 9 copias</option>
              </select>
            </label>
            <label>
              Destino
              <select value={destination} onChange={(e) => setDestination(e.target.value)}>
                <option value="bench">Primer hueco de banquillo</option>
                <option value="board">Celda del tablero</option>
              </select>
            </label>
            {destination === 'board' && (
              <label>
                Celda axial q,r
                <input value={cell} onChange={(e) => setCell(e.target.value)} placeholder="1,4" />
              </label>
            )}
            {action('Generar personaje', {
              type: 'spawn',
              definitionId: character,
              stars,
              ...(destination === 'board'
                ? {
                    to: {
                      kind: 'board',
                      hex: { q: coordinates[0] ?? NaN, r: coordinates[1] ?? NaN },
                    },
                  }
                : {}),
            })}
            <label>
              Unidad que retirar
              <select value={removeId} onChange={(e) => setRemoveId(e.target.value)}>
                <option value="">Selecciona una unidad</option>
                {state.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.definitionId} {u.stars}★ · {u.id}
                  </option>
                ))}
              </select>
            </label>
            {action('Retirar y devolver copias', { type: 'remove', unitId: removeId }, !selected)}
            <div className="dev-actions">
              {(['vargas', 'dolea', 'mixed', 'empty'] as const).map((preset, i) => (
                <span key={preset}>
                  {action(
                    ['Formación VARGAS', 'Formación DOLEA', 'Formación mixta', 'Vaciar formación'][
                      i
                    ]!,
                    { type: 'formation', preset },
                  )}
                </span>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={!editable}>
            <legend>Vida y eliminación</legend>
            <label>
              Vida (1–100)
              <input
                type="number"
                min={1}
                max={100}
                value={hp}
                onChange={(e) => setHp(Number(e.target.value))}
              />
            </label>
            <div className="dev-actions">
              {action('Vida de Vargas', { type: 'health', side: 'south', value: hp })}
              {action('Vida de Florin', { type: 'health', side: 'north', value: hp })}
              {action('Restaurar jugador', { type: 'health', side: 'south', value: 100 })}
              {action('Probar eliminación', { type: 'health', side: 'south', value: 1 })}
            </div>
          </fieldset>
          <fieldset>
            <legend>Rondas y reloj</legend>
            <div className="dev-actions">
              {action(
                clock.clockState === 'paused' ? 'Reanudar reloj' : 'Pausar reloj',
                { type: 'pause', paused: clock.clockState !== 'paused' },
                !['running', 'paused'].includes(clock.clockState),
              )}
              {action(
                clock.currentPhase === 'combat'
                  ? 'Ir a resolución'
                  : clock.currentPhase === 'preparation'
                    ? 'Iniciar combate'
                    : 'Avanzar fase',
                { type: 'advance' },
                clock.currentPhase === 'finished',
              )}
              {action('Duraciones cortas', {
                type: 'durations',
                preparation: 8000,
                resolution: 2000,
              })}
              {action('Duraciones normales', {
                type: 'durations',
                preparation: 30000,
                resolution: 5000,
              })}
              {action('Repetir ronda y semilla', { type: 'repeat' })}
              {action('Reiniciar partida DEV', { type: 'reset' })}
            </div>
          </fieldset>
          <details className="dev-diagnostics" open>
            <summary>Diagnóstico</summary>
            <dl>
              <dt>Partida</dt>
              <dd>{clock.matchId}</dd>
              <dt>Ronda / fase</dt>
              <dd>
                {state.round} / {clock.currentPhase}
              </dd>
              <dt>Reglas / catálogo</dt>
              <dd>
                {combatRulesFor(state.config.catalog)} / {state.config.catalog}
              </dd>
              <dt>Reloj</dt>
              <dd>
                {clock.clockState} · {Math.ceil(clock.remainingMs / 1000)} s
              </dd>
              <dt>Última liquidación</dt>
              <dd>{c.settlementIds.at(-1) ?? 'Ninguna'}</dd>
            </dl>
            <ol>
              {controller.audit
                .slice(-8)
                .reverse()
                .map((a) => (
                  <li key={a.id}>
                    {a.revision} · {a.origin} · {a.ok ? 'Aplicada' : 'Rechazada'} · {a.message}
                  </li>
                ))}
            </ol>
          </details>
        </div>
      )}
    </aside>
  );
}
