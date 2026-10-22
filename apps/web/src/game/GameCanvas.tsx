import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import Phaser from 'phaser';
import { axialToOffset, offsetToAxial } from '@tft/game-core';
import { BoardScene } from './BoardScene';
import type { BoardPort } from './boardPort';
import { WORLD } from './projection';
import { canvasSize } from './viewport';
export function GameCanvas({
  session,
  zoom,
  fitted = false,
  hideTimer = false,
}: {
  session: BoardPort;
  zoom: number;
  fitted?: boolean;
  hideTimer?: boolean;
}) {
  useSyncExternalStore(session.subscribe, session.getSnapshot);
  const frame = session.combatFrame();
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<BoardScene | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!host.current) return;
    let live = true;
    let game: Phaser.Game | undefined;
    let observer: ResizeObserver | undefined;
    let densityQuery: MediaQueryList | undefined;
    const resize = () => {
      if (!game?.isBooted || !host.current) return;
      const rect = host.current.getBoundingClientRect();
      const size = canvasSize(rect.width, rect.height, window.devicePixelRatio);
      game.scale.setZoom(1 / size.density);
      game.scale.resize(size.width, size.height);
      scene.current?.fitView();
      densityQuery?.removeEventListener('change', resize);
      densityQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      densityQuery.addEventListener('change', resize, { once: true });
    };
    try {
      const board = new BoardScene(
        session,
        () => {
          if (live) {
            setReady(true);
            if (fitted) resize();
          }
        },
        fitted,
      );
      scene.current = board;
      game = new Phaser.Game({
        type: Phaser.WEBGL,
        parent: host.current,
        width: WORLD.width,
        height: WORLD.height,
        backgroundColor: '#111e18',
        scene: [board],
        banner: false,
        audio: { noAudio: true },
        render: { pixelArt: true, antialias: false, roundPixels: true },
        scale: {
          mode: fitted ? Phaser.Scale.NONE : Phaser.Scale.FIT,
          autoCenter: fitted ? Phaser.Scale.NO_CENTER : Phaser.Scale.CENTER_BOTH,
        },
        input: { mouse: { preventDefaultWheel: false } },
        callbacks: {
          postBoot: (instance) => {
            instance.canvas.setAttribute('aria-hidden', 'true');
          },
        },
      });
      if (fitted) {
        observer = new ResizeObserver(resize);
        observer.observe(host.current);
        window.addEventListener('resize', resize);
      }
    } catch (cause) {
      if (live) setError(cause instanceof Error ? cause.message : 'WebGL no disponible.');
    }
    return () => {
      live = false;
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      densityQuery?.removeEventListener('change', resize);
      scene.current?.dispose();
      scene.current = null;
      game?.destroy(true);
    };
  }, [session, fitted]);
  useEffect(() => {
    if (ready) scene.current?.setViewZoom(zoom);
  }, [zoom, ready]);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const { cursor } = session.getSnapshot();
    const { column, row } = axialToOffset(cursor);
    const movement: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const delta = movement[event.key];
    if (delta) {
      event.preventDefault();
      session.setCursor(offsetToAxial(column + delta[0], row + delta[1]));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      session.activate(cursor);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      session.cancel();
    }
  }
  return (
    <div
      className="canvas-shell"
      ref={host}
      tabIndex={0}
      role="group"
      aria-label="Tablero interactivo de 7 columnas y 8 filas"
      aria-describedby="board-instructions"
      onKeyDown={onKeyDown}
      onDragOver={(event) => {
        if (session.editable) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const id = event.dataTransfer.getData('application/x-tft-unit');
        if (id && session.editable) scene.current?.dropFromBench(id, event.clientX, event.clientY);
      }}
    >
      {frame && !hideTimer && (
        <div
          className={`battle-timer ${frame.overtime ? 'is-overtime' : ''}`}
          aria-label="Tiempo de combate"
        >
          <strong>{frame.overtime ? 'OVERTIME' : 'COMBATE'}</strong>
          <span>{(frame.remainingTicks / 10).toFixed(1)} s restantes</span>
        </div>
      )}
      {!ready && !error && <div className="canvas-notice">Preparando la arena…</div>}
      {error && (
        <div className="canvas-notice" role="alert">
          No se pudo iniciar WebGL: {error}. Activa la aceleración gráfica y recarga la página.
        </div>
      )}
    </div>
  );
}
