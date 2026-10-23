import { mechanicsReadout } from '../game/mechanicsReadout';
import { baseStatsView, combatStatsView, formationProfiles, shieldTotal } from '@tft/game-core';
import {
  applyMatchAction,
  commandFor,
  createMatch,
  isInBounds,
  offsetToAxial,
  opponentUnits,
  replayMatch,
  runCombat,
  sameHex,
  scaledProfile,
  validateMatchState,
  type MatchError,
  type LocalMatchCoordinator,
} from '@tft/game-core';
import {
  TICK_MS,
  type MatchState,
  type MatchCommand,
  type OwnedUnit,
  type HexCoord,
} from '@tft/shared';
import type { SessionSnapshot } from '../game/session';
import type { BoardPort } from '../game/boardPort';
import { CombatPlayback } from '../game/combatPlayback';
import { passiveReadout } from '../game/combatFeedback';
export const MATCH_ERRORS: Record<MatchError, string> = {
  'invalid-action': 'Acción inválida.',
  'invalid-state': 'El estado de partida no supera la validación.',
  'stale-action': 'Esta acción ya se procesó o pertenece a un estado anterior.',
  'wrong-phase': 'Espera a la preparación para realizar esa acción.',
  'insufficient-gold': 'No tienes oro suficiente.',
  'missing-offer': 'Esta oferta ya no está disponible.',
  'missing-unit': 'La unidad ya no está disponible.',
  'bench-full': 'Banquillo lleno. Vende, despliega o completa una mejora.',
  'invalid-location': 'Elige una casilla libre de tu mitad jade.',
  'deployment-limit': 'Has alcanzado el límite de unidades de tu nivel.',
  'max-level': 'Ya estás en el nivel máximo.',
  'empty-board': 'Despliega al menos una unidad antes de combatir.',
  'wrong-round': 'La acción no corresponde a esta ronda.',
  'same-location': 'La unidad ya está en esa posición.',
};
export class LocalSession implements BoardPort {
  private match: MatchState;
  private view!: SessionSnapshot;
  private listeners = new Set<() => void>();
  private playback: CombatPlayback | null = null;
  private paused = false;
  private speed: 1 | 2 = 1;
  private selectedId: string | null = null;
  private cursor = offsetToAxial(2, 4);
  private hovered: HexCoord | null = null;
  private message = 'Compra una unidad y colócala en tu mitad jade.';
  private invalid = false;
  private save: ((state: MatchState) => void) | undefined;
  dropOutside: ((unitId: string, x: number, y: number) => boolean) | undefined;
  constructor(
    state: MatchState = createMatch(),
    save?: (state: MatchState) => void,
    readonly coordinator?: LocalMatchCoordinator,
  ) {
    this.match = validateMatchState(state);
    this.save = save;
    if (coordinator) {
      this.syncCoordinator();
      if (coordinator.development)
        this.message = 'Prueba DEV aislada. Edita la formación o inicia el combate.';
      else if (coordinator.recoveredFromSave)
        this.message =
          'Partida recuperada con el tiempo guardado, sin recompensas durante la ausencia.';
      coordinator.subscribe(() => this.syncCoordinator());
    } else if (state.phase === 'combat' || state.phase === 'resolution') {
      this.playback = new CombatPlayback(runCombat(state.combat!.input));
      if (state.phase === 'resolution') {
        this.playback.advance(this.playback.replay.result.tick * TICK_MS + 600);
        this.message = 'Resultado recuperado. Las recompensas ya están incluidas en tu oro.';
      } else this.message = 'Combate recuperado. Reproducción desde el inicio, sin nuevos cobros.';
    }
    this.publish();
  }
  get editable() {
    return this.coordinator
      ? this.coordinator.getClock().currentPhase === 'preparation' &&
          this.coordinator.getClock().clockState === 'running' &&
          this.coordinator.getClock().remainingMs > 0
      : this.match.phase === 'preparation';
  }
  private syncCoordinator(): void {
    const c = this.coordinator!;
    const previous = this.match;
    this.match = c.getMatch();
    const trace = c.getReplay();
    if (trace && this.playback?.replay !== trace) this.playback = new CombatPlayback(trace);
    if (!trace) this.playback = null;
    this.playback?.seek(c.getPlaybackMs());
    this.paused = c.getClock().clockState === 'paused';
    if (previous.phase !== this.match.phase)
      this.message =
        this.match.phase === 'combat'
          ? 'Combate automático en curso.'
          : this.match.phase === 'resolution'
            ? 'Ronda liquidada. Recompensas recibidas una vez.'
            : 'Nueva preparación. Organiza tu formación.';
    if (c.getClock().currentPhase === 'finished')
      this.message = 'Vargas ha sido eliminado. Partida finalizada.';
    this.publish();
  }
  getMatch = () => this.match;
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  combatFrame = () => this.playback?.frame() ?? null;
  starsFor = (id: string) =>
    this.match.units.find((u) => u.id === id)?.stars ??
    (id.startsWith('rival-')
      ? [...this.match.config.opponents].reverse().find((t) => t.fromRound <= this.match.round)!
          .stars
      : 1);
  selected = (): OwnedUnit | undefined => this.match.units.find((u) => u.id === this.selectedId);
  /** Read-only view model: inspection never dispatches a gameplay command. */
  inspection() {
    const owned = this.selected();
    const rival = opponentUnits(this.match).find((u) => u.id === this.selectedId);
    const unit = owned ?? rival;
    if (!unit) return null;
    const frame = this.combatFrame();
    const live = frame?.state.units.find((u) => u.id === unit.id);
    const stars = this.starsFor(unit.id);
    const baseProfile =
      live?.profile ??
      formationProfiles(this.match).find((u) => u.id === unit.id)?.profile ??
      scaledProfile(unit.definitionId, stars, this.match.config);
    const profile = live
      ? {
          ...baseProfile,
          stats: {
            ...baseProfile.stats,
            ...combatStatsView(live, frame?.tick ?? 0, this.playback?.replay.input.overtime),
          },
        }
      : { ...baseProfile, stats: baseStatsView(baseProfile) };
    return {
      id: unit.id,
      definitionId: unit.definitionId,
      stars,
      owned,
      profile,
      shield: live ? shieldTotal(live) : 0,
      passive: passiveReadout(
        baseProfile,
        live,
        frame?.tick ?? 0,
        !owned || owned.location.kind === 'board',
      ),
      statuses: live?.statuses ?? [],
      mechanics: mechanicsReadout(live, frame?.state),
      hp: live?.hp ?? profile.stats.maxHp,
      mana: live?.mana ?? profile.stats.startingMana,
      side: owned ? ('south' as const) : ('north' as const),
    };
  }
  /** Pointer clicks deselect empty ground; keyboard activation still places units. */
  pointerActivate(hex: HexCoord): void {
    const units = this.combatFrame()?.state.units ?? this.getSnapshot().board.units;
    const unit = units.find((u) => sameHex(u.position, hex));
    if (unit) this.select(unit.id);
    else this.cancel();
  }
  private publish(): void {
    const board = {
      units: [
        ...this.match.units.flatMap((u) =>
          u.location.kind === 'board'
            ? [
                {
                  id: u.id,
                  definitionId: u.definitionId,
                  owner: 'south' as const,
                  position: u.location.hex,
                },
              ]
            : [],
        ),
        ...opponentUnits(this.match).map(({ id, definitionId, owner, position }) => ({
          id,
          definitionId,
          owner,
          position,
        })),
      ],
    };
    const frame = this.playback?.frame();
    this.view = {
      board,
      side: 'south',
      selectedId: this.selectedId,
      paletteId: null,
      hover: this.hovered,
      cursor: this.cursor,
      message: this.message,
      invalid: this.invalid,
      revision: (this.view?.revision ?? 0) + 1,
      combat: {
        mode: this.editable
          ? 'preparation'
          : this.match.phase === 'resolution'
            ? 'finished'
            : this.paused
              ? 'paused'
              : 'playing',
        seed: this.match.combat?.input.seed ?? this.match.seed,
        tick: frame?.tick ?? 0,
        speed: this.speed,
        result: this.match.combat?.result ?? null,
      },
    };
    this.listeners.forEach((l) => l());
  }
  dispatch(command: MatchCommand): boolean {
    const before = this.match;
    const c = this.coordinator;
    const accepted = c?.submit({
      matchId: c.getClock().matchId,
      phaseId: c.getClock().phaseId,
      expectedRevision: before.revision,
      command,
    });
    const result = c
      ? accepted
        ? { ok: true as const, state: c.getMatch() }
        : { ok: false as const, error: c.lastRejection ?? ('wrong-phase' as const) }
      : applyMatchAction(this.match, commandFor(this.match, command));
    if (!result.ok) {
      this.message = MATCH_ERRORS[result.error];
      this.invalid = true;
      this.publish();
      return false;
    }
    const oldUnits = new Set(before.units.map((u) => u.id));
    this.match = result.state;
    this.invalid = false;
    if (command.type === 'buy_unit')
      this.selectedId =
        this.match.lastUpgrades.at(-1)?.id ??
        this.match.units.find((u) => !oldUnits.has(u.id))?.id ??
        this.selectedId;
    if (this.selectedId && !this.match.units.some((u) => u.id === this.selectedId))
      this.selectedId = null;
    if (!c && command.type === 'start_combat') {
      this.playback = new CombatPlayback(runCombat(this.match.combat!.input));
      this.playback.setSpeed(this.speed);
      this.paused = false;
    }
    if (command.type === 'next_round') {
      this.playback = null;
      this.paused = false;
    }
    this.message =
      this.match.lastUpgrades.length && command.type === 'buy_unit'
        ? '¡Mejora completada! Las copias se han combinado.'
        : command.type === 'start_combat'
          ? 'Combate en curso.'
          : command.type === 'resolve_round'
            ? 'Ronda resuelta. Recompensas recibidas.'
            : command.type === 'next_round'
              ? 'Nueva ronda preparada.'
              : command.type === 'buy_unit'
                ? 'Unidad comprada. Selecciona su destino.'
                : command.type === 'move_unit' || command.type === 'swap_units'
                  ? 'Formación actualizada.'
                  : command.type === 'sell_unit'
                    ? 'Unidad vendida. Copias devueltas al pool.'
                    : command.type === 'buy_xp'
                      ? 'Experiencia comprada.'
                      : command.type === 'reroll_shop'
                        ? 'Tienda renovada.'
                        : this.match.shopLocked
                          ? 'Tienda bloqueada para la próxima ronda.'
                          : 'Tienda desbloqueada.';
    try {
      this.save?.(this.match);
    } catch {
      this.message += ' No se pudo guardar en este navegador; la partida continúa en memoria.';
    }
    this.publish();
    return true;
  }
  advanceCombat(delta: number): void {
    if (this.coordinator) return; // Application host owns automatic time, never Phaser.
    if (!this.playback || this.match.phase !== 'combat' || this.paused) return;
    const old = this.playback.frame().tick;
    this.playback.advance(delta);
    if (this.playback.finished) this.dispatch({ type: 'resolve_round', round: this.match.round });
    else if (old !== this.playback.frame().tick) this.publish();
  }
  pauseCombat(): void {
    if (this.coordinator) return;
    if (this.match.phase !== 'combat') return;
    this.paused = !this.paused;
    this.playback?.setPaused(this.paused);
    this.publish();
  }
  setSpeed(speed: 1 | 2): void {
    if (this.coordinator) return;
    this.speed = speed;
    this.playback?.setSpeed(speed);
    this.publish();
  }
  select(id: string): void {
    this.selectedId = id;
    const unit = this.selected();
    if (unit?.location.kind === 'board') this.cursor = unit.location.hex;
    this.message = this.editable
      ? 'Selecciona destino, arrastra o vende la unidad.'
      : 'Inspeccionando unidad.';
    this.invalid = false;
    this.publish();
  }
  setCursor(hex: HexCoord): void {
    if (isInBounds(hex)) {
      this.cursor = hex;
      this.hovered = hex;
      this.publish();
    }
  }
  hover(hex: HexCoord | null): void {
    if ((!hex && !this.hovered) || (hex && this.hovered && sameHex(hex, this.hovered))) return;
    this.hovered = hex;
    this.publish();
  }
  cancel(): void {
    this.selectedId = null;
    this.publish();
  }
  move(id: string, hex: HexCoord): boolean {
    return this.dispatch({ type: 'move_unit', unitId: id, to: { kind: 'board', hex } });
  }
  activate(hex: HexCoord): void {
    const units = this.combatFrame()?.state.units ?? this.getSnapshot().board.units;
    const atCursor = units.find((u) => sameHex(u.position, hex));
    if (!this.editable || atCursor?.owner === 'north') {
      if (atCursor) this.select(atCursor.id);
      else this.cancel();
      return;
    }
    if (this.selectedId && this.selected()) this.move(this.selectedId, hex);
    else {
      const found = this.match.units.find(
        (u) => u.location.kind === 'board' && sameHex(u.location.hex, hex),
      );
      if (found) this.select(found.id);
      else this.setCursor(hex);
    }
  }
  bench(slot: number, id = this.selectedId): boolean {
    return id
      ? this.dispatch({ type: 'move_unit', unitId: id, to: { kind: 'bench', slot } })
      : false;
  }
}
export const SAVE_KEY = 'tft-eunuco-local-f0p3.1-1';
/** Replay accepted commands on load: no mount-time rewards; combat restarts its visual replay. */
export function restoreMatch(json: string): MatchState {
  const saved = validateMatchState(JSON.parse(json));
  const replayed = replayMatch(saved.seed, saved.history, saved.config);
  if (JSON.stringify(replayed) !== JSON.stringify(saved))
    throw new Error('Saved state does not match its history');
  return replayed;
}
