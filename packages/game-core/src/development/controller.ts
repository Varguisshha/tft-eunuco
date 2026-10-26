import { returnUnitItems } from '../items/inventory';
import {
  DevelopmentRequestSchema,
  DevelopmentAuditSchema,
  type DevelopmentAudit,
  type DevelopmentCommand,
} from '@tft/shared/development';
import { STANDARD_ITEMS_ECONOMY_CONFIG, matchCatalog } from '@tft/game-data';
import { type AutomaticSave, type MatchState, type UnitLocation } from '@tft/shared';
import { createMatch, combine, addXp } from '../match/engine';
import { validateMatchState } from '../match/invariants';
import { copiesOf, deployedCount, levelRule, sameLocation } from '../match/selectors';
import { LocalMatchCoordinator } from '../match/coordinator';
import { type TimeSource } from '../match/clock';
import { isInBounds, offsetToAxial } from '../hex';
export interface DevelopmentSnapshot {
  save: AutomaticSave;
  checkpoint: AutomaticSave | null;
  audit: DevelopmentAudit[];
}
/** Local capability. No public match command or UI mutation path is added. */
export class DevelopmentController {
  private current: LocalMatchCoordinator;
  private checkpoint: AutomaticSave | null = null;
  private records: DevelopmentAudit[] = [];
  private unsubscribe: (() => void) | undefined;
  private changed: () => void = () => {};
  get coordinator() {
    return this.current;
  }
  get audit(): readonly DevelopmentAudit[] {
    return this.records;
  }
  get revision() {
    return this.records.length;
  }
  constructor(
    private readonly time: TimeSource,
    seed = 42,
    id = `dev-${crypto.randomUUID()}`,
  ) {
    if (!id.startsWith('dev-')) throw new Error('DEV identity required');
    const match = createMatch(seed, STANDARD_ITEMS_ECONOMY_CONFIG);
    match.development = { version: 1, tainted: true, healthAdjustments: [] };
    this.current = new LocalMatchCoordinator(match, { matchId: id, time, development: true });
    this.watch();
  }
  onChange(callback: () => void) {
    this.changed = callback;
    return () => {
      this.changed = () => {};
    };
  }
  dispose() {
    this.unsubscribe?.();
  }
  private watch() {
    this.unsubscribe?.();
    this.unsubscribe = this.current.subscribe(() => {
      this.capture();
      this.changed();
    });
    this.capture();
  }
  private capture() {
    if (this.current.getClock().currentPhase === 'preparation')
      this.checkpoint = structuredClone(this.current.exportSave());
  }
  exportSnapshot(): DevelopmentSnapshot {
    return {
      save: this.current.exportSave(),
      checkpoint: this.checkpoint,
      audit: [...this.records],
    };
  }
  static restore(snapshot: DevelopmentSnapshot, time: TimeSource) {
    const c = LocalMatchCoordinator.restore(snapshot.save, time);
    if (!c.development || !c.getMatch().development || !c.getClock().matchId.startsWith('dev-'))
      throw new Error('Not an isolated DEV save');
    const audit = snapshot.audit.map((a) => DevelopmentAuditSchema.parse(a));
    if (
      audit.length > 10000 ||
      new Set(audit.map((a) => a.id)).size !== audit.length ||
      audit.some((a, i) => a.revision !== i + 1)
    )
      throw new Error('Invalid DEV audit');
    if (snapshot.checkpoint) {
      const point = LocalMatchCoordinator.restore(snapshot.checkpoint, time);
      if (
        !point.development ||
        !point.getMatch().development ||
        point.getClock().matchId !== c.getClock().matchId ||
        point.getClock().currentPhase !== 'preparation'
      )
        throw new Error('Invalid DEV checkpoint');
    }
    const instance = new DevelopmentController(time, c.getMatch().seed, c.getClock().matchId);
    instance.unsubscribe?.();
    instance.current = c;
    instance.records = audit;
    instance.checkpoint = snapshot.checkpoint;
    instance.watch();
    return instance;
  }
  execute(value: unknown): DevelopmentAudit {
    const parsed = DevelopmentRequestSchema.safeParse(value);
    const envelope = DevelopmentRequestSchema.omit({ command: true })
      .passthrough()
      .safeParse(value);
    const fingerprint = JSON.stringify(value);
    const request = parsed.success ? parsed.data : null;
    const id =
      request?.id ?? (envelope.success ? envelope.data.id : `invalid-${this.revision + 1}`);
    const old = this.records.find((a) => a.id === id);
    if (old)
      return old.fingerprint === fingerprint
        ? old
        : { ...old, ok: false, message: 'Identificador reutilizado con otro comando.' };
    const result: DevelopmentAudit = {
      id,
      origin: request?.origin ?? (envelope.success ? envelope.data.origin : 'panel'),
      fingerprint: fingerprint?.slice(0, 4000) ?? 'undefined',
      ok: false,
      message: 'Entrada DEV inválida.',
      revision: this.revision + 1,
    };
    if (this.revision >= 10000)
      return { ...result, message: 'Límite de auditoría. Crea otra partida DEV.' };
    try {
      if (!request) throw new Error('Entrada DEV inválida. Revisa sus límites.');
      if (request.expectedRevision !== this.revision)
        throw new Error('Acción obsoleta. Vuelve a intentarlo.');
      if (!this.current.development || !this.current.getMatch().development)
        throw new Error('Se requiere una partida DEV aislada.');
      const save = structuredClone(this.current.exportSave());
      let candidate = LocalMatchCoordinator.restore(save, this.time);
      const command = request.command;
      if (
        ['gold', 'level', 'xp', 'health', 'spawn', 'remove', 'formation'].includes(command.type)
      ) {
        if (!['not_started', 'preparation'].includes(candidate.getClock().currentPhase))
          throw new Error(
            'Edita durante preparación. Reinicia la ronda para cambiar la formación.',
          );
        this.mutate(save.match, command);
        validateMatchState(save.match);
        candidate = LocalMatchCoordinator.restore(save, this.time);
      } else if (command.type === 'pause') {
        const clock = candidate.getClock();
        if (!['running', 'paused'].includes(clock.clockState))
          throw new Error('Inicia la partida para controlar el reloj.');
        if ((clock.clockState === 'paused') !== command.paused) candidate.debugPause();
      } else if (command.type === 'durations') {
        save.preparationMs = command.preparation;
        save.resolutionMs = command.resolution;
        const phase = save.clock.currentPhase;
        if (phase === 'preparation' || phase === 'resolution') {
          save.clock.phaseDuration =
            phase === 'preparation' ? command.preparation : command.resolution;
          save.clock.remainingMs = Math.min(save.clock.remainingMs, save.clock.phaseDuration);
        }
        candidate = LocalMatchCoordinator.restore(save, this.time);
      } else if (command.type === 'advance') {
        if (candidate.getClock().currentPhase === 'finished')
          throw new Error('La partida ha terminado. Reinicia DEV.');
        candidate.debugAdvance();
      } else if (command.type === 'repeat') {
        if (!this.checkpoint)
          throw new Error('Inicia una preparación para crear un punto de retorno.');
        const point = structuredClone(this.checkpoint);
        point.clock.remainingMs = point.preparationMs;
        point.clock.clockState = 'paused';
        candidate = LocalMatchCoordinator.restore(point, this.time);
      } else if (command.type === 'reset') {
        const fresh = new DevelopmentController(this.time, save.match.seed);
        candidate = fresh.coordinator;
        fresh.dispose();
        this.checkpoint = null;
      }
      this.current = candidate;
      this.watch();
      result.ok = true;
      result.message = this.describe(command);
    } catch (error) {
      result.message = error instanceof Error ? error.message.slice(0, 300) : 'Acción rechazada.';
    }
    this.records.push(result);
    this.changed();
    return result;
  }
  private describe(command: DevelopmentCommand): string {
    const match = this.current.getMatch();
    switch (command.type) {
      case 'gold':
        return `Oro ${command.mode === 'add' ? `+${command.amount}; saldo` : 'establecido:'} ${match.gold}.`;
      case 'level':
        return `Nivel establecido: ${match.level}.`;
      case 'xp':
        return `XP ${command.mode === 'add' ? `+${command.amount}` : `establecida: ${command.amount}`}; nivel ${match.level}.`;
      case 'health':
        return `Vida de ${command.side === 'south' ? 'Vargas' : 'Florin'}: ${command.value}.`;
      case 'spawn':
        return `Generado ${command.definitionId.toUpperCase()} ${command.stars}★; copias reservadas.`;
      case 'remove':
        return 'Unidad retirada; copias devueltas al pool.';
      case 'formation':
        return `Formación aplicada: ${command.preset}.`;
      case 'pause':
        return command.paused ? 'Reloj pausado.' : 'Reloj reanudado.';
      case 'advance':
        return `Transición aplicada; ronda ${match.round}.`;
      case 'durations':
        return `Duraciones: preparación ${command.preparation / 1000}s, resolución ${command.resolution / 1000}s.`;
      case 'repeat':
        return 'Ronda recuperada desde preparación; reloj pausado.';
      case 'reset':
        return 'Partida DEV reiniciada con la misma semilla.';
    }
  }
  private mutate(state: MatchState, command: DevelopmentCommand) {
    const freeBench = () =>
      Array.from({ length: 9 }, (_, slot) => slot).find(
        (slot) => !state.units.some((u) => u.location.kind === 'bench' && u.location.slot === slot),
      );
    const level = (value: number) => {
      state.level = value;
      state.xp = 0;
      state.totalXp = state.config.levels
        .filter((l) => l.level < value)
        .reduce((sum, l) => sum + l.xpToNext, 0);
      for (const unit of [...state.units].reverse())
        if (deployedCount(state) > value && unit.location.kind === 'board') {
          const slot = freeBench();
          if (slot === undefined)
            throw new Error('No cabe la retirada al bajar de nivel. Libera el banquillo.');
          unit.location = { kind: 'bench', slot };
        }
    };
    const spawn = (definitionId: string, stars: 1 | 2 | 3, to?: UnitLocation) => {
      if (!matchCatalog(state.config).some((d) => d.id === definitionId))
        throw new Error('Personaje fuera del catálogo.');
      const copies = state.config.starCopies[stars - 1]!;
      if ((state.pool[definitionId] ?? 0) < copies)
        throw new Error(
          'No quedan suficientes copias en el pool. Retira unidades o renueva ofertas.',
        );
      let location = to;
      if (!location) {
        const slot = freeBench();
        if (slot === undefined) throw new Error('Banquillo lleno.');
        location = { kind: 'bench', slot };
      }
      if (state.units.some((u) => sameLocation(u.location, location)))
        throw new Error('La posición está ocupada.');
      if (
        location.kind === 'board' &&
        (!isInBounds(location.hex) || location.hex.r < 4 || deployedCount(state) >= state.level)
      )
        throw new Error('Celda o capacidad de tablero inválida.');
      state.pool[definitionId]! -= copies;
      state.units.push({ id: `dev-unit-${state.nextEntity++}`, definitionId, stars, location });
      state.lastUpgrades = [];
      combine(state);
    };
    if (command.type === 'gold') {
      if ((command.mode === 'add' || command.mode === 'set') && command.amount === undefined)
        throw new Error('Introduce una cantidad de oro.');
      const gold =
        command.mode === 'max'
          ? state.config.goldCap
          : command.mode === 'initial'
            ? state.config.initialGold
            : command.mode === 'add'
              ? Math.min(state.config.goldCap, state.gold + command.amount!)
              : command.amount!;
      if (gold > state.config.goldCap) throw new Error('Oro por encima del máximo.');
      const delta = gold - state.gold;
      state.gold = gold;
      state.ledger.push({
        seq: state.ledger.length,
        round: state.round,
        reason: 'development',
        requested: delta,
        delta,
        balance: gold,
        reference: 'dev-gold',
      });
    } else if (command.type === 'level') level(command.value);
    else if (command.type === 'xp') {
      if (command.mode === 'add') addXp(state, command.amount);
      else {
        if (command.amount >= (state.level === 7 ? 1 : levelRule(state).xpToNext))
          throw new Error('XP fuera del nivel actual.');
        state.xp = command.amount;
        state.totalXp =
          state.config.levels
            .filter((l) => l.level < state.level)
            .reduce((sum, l) => sum + l.xpToNext, 0) + state.xp;
      }
    } else if (command.type === 'health') {
      state.development!.healthAdjustments.push({
        index: state.healthLedger.length,
        side: command.side,
        before: state.health[command.side],
        after: command.value,
      });
      state.health[command.side] = command.value;
    } else if (command.type === 'spawn') spawn(command.definitionId, command.stars, command.to);
    else if (command.type === 'remove') {
      const unit = state.units.find((u) => u.id === command.unitId);
      if (!unit) throw new Error('Unidad no encontrada.');
      returnUnitItems(state, unit);
      state.pool[unit.definitionId]! += copiesOf(unit, state.config);
      state.units = state.units.filter((u) => u.id !== unit.id);
    } else if (command.type === 'formation') {
      for (const u of state.units) {
        returnUnitItems(state, u);
        state.pool[u.definitionId]! += copiesOf(u, state.config);
      }
      state.units = [];
      state.lastUpgrades = [];
      const ids =
        command.preset === 'mixed'
          ? ['vargas', 'dolea', 'test-k01', 'test-r03']
          : command.preset === 'empty'
            ? []
            : [command.preset];
      level(Math.max(2, ids.length));
      ids.forEach((id, i) => spawn(id, 1, { kind: 'board', hex: offsetToAxial(2 + i, 4) }));
    }
  }
}
export { applyDevelopmentItems } from './items';
