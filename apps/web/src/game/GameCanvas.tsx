import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Phaser from 'phaser';
import { axialToOffset, offsetToAxial } from '@tft/game-core';
import { BoardScene } from './BoardScene';
import type { BoardPort } from './boardPort';
import { WORLD } from './projection';
export function GameCanvas({ session, zoom }: { session: BoardPort; zoom: number }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<BoardScene | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!host.current) return;
    let live = true;
    let game: Phaser.Game | undefined;
    try {
      const board = new BoardScene(session, () => {
        if (live) setReady(true);
      });
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
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        input: { mouse: { preventDefaultWheel: false } },
        callbacks: {
          postBoot: (instance) => {
            instance.canvas.setAttribute('aria-hidden', 'true');
          },
        },
      });
    } catch (cause) {
      if (live) setError(cause instanceof Error ? cause.message : 'WebGL no disponible.');
    }
    return () => {
      live = false;
      scene.current?.dispose();
      scene.current = null;
      game?.destroy(true);
    };
  }, [session]);
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
      {!ready && !error && <div className="canvas-notice">Preparando la arena…</div>}
      {error && (
        <div className="canvas-notice" role="alert">
          No se pudo iniciar WebGL: {error}. Activa la aceleración gráfica y recarga la página.
        </div>
      )}
    </div>
  );
}
