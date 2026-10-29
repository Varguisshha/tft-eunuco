import { clampCameraZoom, CAMERA_ZOOM } from './cameraZoom';
import { CHARACTER_SCALE_CANDIDATES, DEFAULT_CHARACTER_SCALE } from './visualScale';
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import Phaser from 'phaser';
import { axialToOffset, offsetToAxial } from '@tft/game-core';
import { BoardScene } from './BoardScene';
import type { BoardPort } from './boardPort';
import { WORLD } from './projection';
import { canvasSize } from './viewport';
import type { ArenaDefinition } from '../arenas/arena';
import { ArenaCalibration, type CalibrationState } from '../arenas/ArenaCalibration';
import type { HexCoord } from '@tft/shared';
import type { Point } from '@tft/game-core';
export function GameCanvas({
  session,
  zoom,
  fitted = false,
  hideTimer = false,
  arena,
  development = false,
  itemDrop,
  itemPreview,
  itemReason,
  itemHover,
  onZoomChange,
}: {
  session: BoardPort;
  zoom: number;
  fitted?: boolean;
  hideTimer?: boolean;
  arena?: ArenaDefinition;
  development?: boolean;
  itemDrop?: (unitId: string, itemId: string) => void;
  itemPreview?: (unitId: string) => boolean;
  itemReason?: (unitId: string) => string | null;
  itemHover?: (unitId: string | undefined) => void;
  onZoomChange?: (zoom: number) => void;
}) {
  useSyncExternalStore(session.subscribe, session.getSnapshot);
  const frame = session.combatFrame();
  const [visualScale, setVisualScale] = useState(DEFAULT_CHARACTER_SCALE);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<BoardScene | null>(null);
  const [calibration, setCalibration] = useState<CalibrationState | null>(
    arena ? { enabled: false, controls: arena.projection.controls } : null,
  );
  const [calibrationHover, setCalibrationHover] = useState<{
    hex: HexCoord | null;
    point: Point;
  } | null>(null);
  const [readyScene, setReadyScene] = useState<BoardScene | null>(null);
  const ready = readyScene !== null;
  const [itemFeedback, setItemFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!host.current) return;
    setReadyScene(null);
    setError(null);
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
      const reserves = host.current.closest('.battlefield')?.querySelector('.bench-section');
      if (scene.current)
        scene.current.bottomOverlay =
          reserves && reserves.getBoundingClientRect().height > 0
            ? Math.max(0, rect.bottom - reserves.getBoundingClientRect().top + 4)
            : 0;
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
            setReadyScene(board);
            if (fitted) resize();
          }
        },
        fitted,
        arena,
      );
      board.onCalibrationHover = (hex, point) => setCalibrationHover({ hex, point });
      board.onAssetError = () =>
        setError('No se pudo cargar la imagen de la arena. Recarga para volver a intentarlo');
      scene.current = board;
      game = new Phaser.Game({
        type: Phaser.WEBGL,
        parent: host.current,
        width: WORLD.width,
        height: WORLD.height,
        backgroundColor: arena ? '#0F1125' : '#111e18',
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
  }, [session, fitted, arena]);
  useEffect(() => {
    if (readyScene && scene.current === readyScene && calibration)
      scene.current?.setCalibration(
        calibration.controls,
        development && calibration.enabled,
        calibration.showGrid ?? true,
        calibration.showUnits ?? true,
      );
  }, [readyScene, calibration, development]);
  useEffect(() => {
    if (readyScene && scene.current === readyScene) readyScene.setViewZoom(zoom);
  }, [zoom, readyScene]);
  useEffect(() => {
    if (readyScene && scene.current === readyScene) readyScene.setVisualMultiplier(visualScale);
  }, [readyScene, visualScale]);
  useEffect(() => {
    const element = host.current;
    if (!element || !onZoomChange) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey || !event.deltaY || !(event.target instanceof HTMLCanvasElement)) return;
      event.preventDefault();
      onZoomChange(
        clampCameraZoom(zoom + (event.deltaY < 0 ? CAMERA_ZOOM.step : -CAMERA_ZOOM.step)),
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [zoom, onZoomChange]);
  useEffect(() => {
    const pointer = (event: Event) => {
      const { x, y, id, kind, phase } = (
        event as CustomEvent<{
          x: number;
          y: number;
          id: string;
          kind: 'item' | 'unit';
          phase: 'move' | 'drop' | 'end';
        }>
      ).detail;
      if (phase === 'end') {
        scene.current?.clearItemHighlight();
        scene.current?.endExternalDrag();
        setItemFeedback(null);
        return;
      }
      const rect = host.current?.getBoundingClientRect();
      if (!rect || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;
      if (document.elementFromPoint(x, y)?.closest('[data-bench-slot]')) return;
      if (kind === 'unit') {
        if (phase === 'drop') scene.current?.dropFromBench(id, x, y);
        else scene.current?.externalDragAt(x, y);
      } else {
        const unit = scene.current?.unitAtClient(x, y),
          valid = !!unit && !!itemPreview?.(unit);
        if (phase === 'drop') itemDrop?.(unit ?? '', id);
        else {
          scene.current?.highlightItemAt(x, y, valid);
          itemHover?.(unit);
          setItemFeedback(
            valid
              ? null
              : unit
                ? (itemReason?.(unit) ?? 'Destino no disponible.')
                : 'Apunta al centro de una unidad.',
          );
        }
      }
    };
    document.addEventListener('tft-pointer-drag', pointer);
    return () => document.removeEventListener('tft-pointer-drag', pointer);
  }, [itemDrop, itemHover, itemPreview, itemReason]);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (onZoomChange && ['+', '=', '-', '0'].includes(event.key)) {
      event.preventDefault();
      onZoomChange(
        event.key === '0'
          ? 1
          : clampCameraZoom(zoom + (event.key === '-' ? -CAMERA_ZOOM.step : CAMERA_ZOOM.step)),
      );
      return;
    }
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
        if (event.dataTransfer.types.includes('application/x-tft-item')) {
          event.preventDefault();
          const unit = scene.current?.unitAtClient(event.clientX, event.clientY);
          const valid = !!unit && !!itemPreview?.(unit);
          scene.current?.highlightItemAt(event.clientX, event.clientY, valid);
          itemHover?.(unit);
          setItemFeedback(
            valid
              ? null
              : unit
                ? (itemReason?.(unit) ?? 'Destino no disponible.')
                : 'Apunta al centro de una unidad.',
          );
          return;
        }
        if (session.editable) {
          event.preventDefault();
          scene.current?.externalDragAt(event.clientX, event.clientY);
        }
      }}
      onDragLeave={(e) => {
        delete e.currentTarget.dataset.itemTarget;
        scene.current?.clearItemHighlight();
        itemHover?.(undefined);
        setItemFeedback(null);
        scene.current?.endExternalDrag();
      }}
      onDrop={(event) => {
        event.preventDefault();
        delete event.currentTarget.dataset.itemTarget;
        scene.current?.clearItemHighlight();
        itemHover?.(undefined);
        setItemFeedback(null);
        const item = event.dataTransfer.getData('application/x-tft-item');
        if (item) {
          const unit = scene.current?.unitAtClient(event.clientX, event.clientY);
          itemDrop?.(unit ?? '', item);
          return;
        }
        const id = event.dataTransfer.getData('application/x-tft-unit');
        if (id && session.editable) scene.current?.dropFromBench(id, event.clientX, event.clientY);
      }}
    >
      {itemFeedback && (
        <p className="canvas-item-feedback" role="status">
          {itemFeedback}
        </p>
      )}
      {arena && development && (
        <label className="visual-scale-control">
          Escala visual
          <select
            aria-label="Escala visual de personajes"
            value={visualScale}
            onChange={(e) => setVisualScale(Number(e.target.value))}
          >
            {CHARACTER_SCALE_CANDIDATES.map((n) => (
              <option key={n} value={n}>
                {n === 1 ? 'Original' : `+${Math.round((n - 1) * 100)} %`}
              </option>
            ))}
          </select>
        </label>
      )}
      {arena && development && calibration && (
        <ArenaCalibration
          arena={arena}
          state={calibration}
          onChange={setCalibration}
          hover={calibrationHover}
        />
      )}
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
