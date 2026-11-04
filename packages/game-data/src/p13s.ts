import {
  TraitDefinitionSchema,
  SYNERGY_RULES,
  EconomyConfigSchema,
  type TraitDefinition,
  type PredictionKind,
} from '@tft/shared';
import { P11_TRAITS } from './p11-traits';
import { P12F_ECONOMY_CONFIG } from './economy';
export const P13S_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...P12F_ECONOMY_CONFIG,
  synergyPolicy: SYNERGY_RULES,
});
export const P13S_LORE: Readonly<Record<string, string>> = {
  fumon:
    'Un cigarro antes de pelear nunca ha matado a nadie. Bueno, a ellos les quita bastante vida, pero también les hace pegar mucho más fuerte.',
  gym: 'Nunca se saltan el día de pecho. Cuanto más entrenan juntos, más aguantan los golpes.',
  ruman_trinity:
    'Tres rumanos, un mismo destino. Cuando están juntos, hasta los golpes se los reparten.',
  upm: 'Después de incontables convocatorias y trabajos en grupo, han creado a CARRASCO. Cuanto mejores sean sus estudiantes, más bestia será su proyecto final.',
  pardillo: 'No saben muy bien qué está pasando, pero tienen una suerte que ya quisieran muchos.',
  hortaleza:
    'En el barrio todos conocen a alguien. Cada vecino aporta su especialidad y juntos hacen que el equipo funcione.',
  rata: 'Mientras los demás pelean por la victoria, ellos están pendientes de quién deja unas monedas por el camino.',
  fantasy:
    'Expertos en fútbol, apuestas y excusas. Si de verdad entienden tanto del juego, que lo demuestren antes del combate.',
  perdidos_por_el_mundo:
    'No saben dónde están, de dónde vienen ni cuál era el plan. Curiosamente, a veces eso les funciona.',
  pancho: 'Un Pancho nunca deja tirado a un amigo. Aunque tenga que recibir la hostia por él.',
  valo: 'Para ellos, cualquier problema se resuelve apuntando a la cabeza. Y si no funciona, vuelven a disparar.',
  blackhaus:
    'Nadie sabe cuándo llegaron ni de dónde salen. Solo que cuando aparecen, alguien acaba en el suelo.',
  shisheros:
    'Mientras los demás luchan, ellos preparan la shisha. Lo malo es que, cuando terminan, vienen con ganas de pelea.',
  mus: 'Cuatro cartas, muchas señas y demasiada confianza. Todavía están decidiendo quién lleva la grande.',
  psoe: 'Prometen medidas para todos. Algunas funcionan, otras dependen de lo que salga en el próximo consejo de ministros.',
};
export type NeighborhoodContribution = {
  stat:
    | 'attack'
    | 'abilityPower'
    | 'armor'
    | 'maxHp'
    | 'attackSpeedMilli'
    | 'critChanceMilli'
    | 'magicResist'
    | 'moveSpeedMilli'
    | 'supportPowerMilli';
  mode: 'flat' | 'percent_milli';
  amount: number;
  label: string;
  rationale: string;
};
/** Assignments are team synergy contributions, never personal skills. Provisional identities retain provisional roles. */
export const HORTALEZA_CONTRIBUTIONS: Readonly<Record<string, NeighborhoodContribution>> = {
  jaramillo: {
    stat: 'attack',
    mode: 'percent_milli',
    amount: 50,
    label: '+5 % AD',
    rationale: 'Tirador de apoyo; asignación aprobada.',
  },
  cosmin: {
    stat: 'abilityPower',
    mode: 'percent_milli',
    amount: 50,
    label: '+5 % AP',
    rationale: 'Asignación aprobada; no define habilidad personal.',
  },
  dolea: {
    stat: 'armor',
    mode: 'flat',
    amount: 8,
    label: '+8 armadura',
    rationale: 'Tanque protector.',
  },
  emanuel: {
    stat: 'maxHp',
    mode: 'flat',
    amount: 100,
    label: '+100 vida',
    rationale: 'Gym y Pancho; resistencia colectiva.',
  },
  henller: {
    stat: 'attackSpeedMilli',
    mode: 'percent_milli',
    amount: 50,
    label: '+5 % velocidad de ataque',
    rationale: 'Valo; cadencia.',
  },
  alvaro: {
    stat: 'critChanceMilli',
    mode: 'flat',
    amount: 50,
    label: '+5 puntos de crítico',
    rationale: 'Valo; precisión.',
  },
  manuel: {
    stat: 'magicResist',
    mode: 'flat',
    amount: 8,
    label: '+8 resistencia mágica',
    rationale: 'Pancho; protección.',
  },
  'alfredo-pocho': {
    stat: 'supportPowerMilli',
    mode: 'flat',
    amount: 50,
    label: '+5 % curación y escudos',
    rationale: 'Apoyo colectivo de UPM.',
  },
  alex: {
    stat: 'attack',
    mode: 'flat',
    amount: 5,
    label: '+5 AD plano',
    rationale: 'Extensión tipada de aportaciones para roster de 12.',
  },
  danigm: {
    stat: 'abilityPower',
    mode: 'flat',
    amount: 5,
    label: '+5 AP plano',
    rationale: 'Extensión tipada; no añade habilidad.',
  },
  titi: {
    stat: 'maxHp',
    mode: 'percent_milli',
    amount: 50,
    label: '+5 % vida',
    rationale: 'Gym y Pancho; extensión de resistencia.',
  },
  alfredo: {
    stat: 'moveSpeedMilli',
    mode: 'percent_milli',
    amount: 50,
    label: '+5 % velocidad de movimiento',
    rationale: 'Vecino móvil; extensión sin habilidad personal.',
  },
};
export const CARRASCO_POLICY = {
  version: SYNERGY_RULES,
  counts: [2, 4, 6, 8],
  lostHpMilli: [500, 400, 300, 250],
  scaling: { maxHp: 120, attack: 80, armor: 50, magicResist: 50 },
  competitiveEnabled: false,
  blocked: 'missing-carrasco-base-profile',
} as const;
export const SHISHEROS_POLICY = {
  counts: [2, 4, 6],
  channelTicks: [60, 40, 30],
  reductionMilli: 300,
  powerMilli: [150, 250, 400],
  speedMilli: [0, 100, 200],
} as const;
export const P13S_JEW_POLICY = { ratesMilli: [100, 150, 200], caps: [2, 4, 8] } as const;
export const ROULETTE_POLICY = {
  jackpot: [5, 5, 10],
  success: [45, 45, 50],
  gold: [
    [1, 3],
    [4, 8],
    [9, 15],
  ],
  health: [
    [1, 7],
    [8, 14],
    [15, 25],
  ],
  positives: ['gold', 'health', 'component', 'champion', 'upgrade'],
  negatives: ['gold', 'health', 'component', 'champion', 'downgrade'],
  lossConflict:
    'La tabla de 3★ aumenta las pérdidas; contradice el texto anterior de pérdidas reducidas. Se aplica la tabla.',
} as const;
export const PREDICTIONS: Readonly<
  Record<PredictionKind, { name: string; prize: number; unit: boolean; description: string }>
> = {
  survival: {
    name: 'Supervivencia ajustada',
    prize: 4,
    unit: false,
    description: 'Ganar con exactamente una o dos unidades supervivientes.',
  },
  comeback: {
    name: 'La remontada',
    prize: 5,
    unit: false,
    description: 'Ganar tras perder al menos la mitad de las unidades iniciales.',
  },
  underdog: {
    name: 'Victoria contra pronóstico',
    prize: 5,
    unit: false,
    description:
      'Ganar con menor fuerza inicial: suma de vida efectiva inicial + 10 × AD + 10 × AP + 5 × defensas no negativas.',
  },
  untouchable: {
    name: 'El intocable',
    prize: 3,
    unit: true,
    description: 'La unidad elegida sobrevive sin bajar del 50 % de su vida máxima.',
  },
  'double-kill': {
    name: 'Doble eliminación',
    prize: 4,
    unit: false,
    description: 'Dos enemigos iniciales mueren en una ventana inclusiva de 10 ticks.',
  },
  overtime: {
    name: 'Último segundo',
    prize: 6,
    unit: false,
    description: 'Ganar un combate que alcanza overtime.',
  },
  wall: {
    name: 'El muro',
    prize: 3,
    unit: true,
    description:
      'La unidad recibe o absorbe al menos 30 % del daño efectivo enemigo recibido por el equipo (vida + escudos).',
  },
  'individual-comeback': {
    name: 'Remontada individual',
    prize: 4,
    unit: true,
    description: 'La unidad baja del 25 %, sobrevive y recibe atribución de una eliminación.',
  },
};
const threshold = (count: number, description: string, pending = false) => ({
  count,
  description,
  effectState: pending ? 'pending_effects' : 'implemented',
  availability: count > 7 ? 'reserved' : 'available',
  ...(count > 7 ? { reservation: 'Reservado: capacidad máxima de equipo 7.' } : {}),
  bonuses: [],
  effects: [],
});
export const P13S_TRAITS: readonly TraitDefinition[] = P11_TRAITS.map((original) => {
  const t = structuredClone(original);
  t.description = P13S_LORE[t.id] ?? t.description;
  if (t.id === 'upm') {
    t.description +=
      ' Media de estrellas congelada al inicio: por cada estrella media sobre 1★, +12 % vida máxima, +8 % daño y +5 % armadura y resistencia mágica sobre la base del nivel.';
    delete t.progress;
    t.stacking = 'highest';
    t.thresholds = CARRASCO_POLICY.counts.map((n, i) =>
      threshold(
        n,
        `${CARRASCO_POLICY.lostHpMilli[i]! / 10} % de vida conjunta perdida: CARRASCO ${i + 1}. Pendiente de estadísticas base; invocación competitiva bloqueada.`,
        true,
      ),
    ) as TraitDefinition['thresholds'];
  }
  if (t.id === 'hortaleza') {
    t.recipients = 'team';
    t.stacking = 'highest';
    t.thresholds = [2, 3, 4, 5, 6].map((n, i) =>
      threshold(
        n,
        `Aportaciones de vecinos distintos ×${((1000 + i * 200) / 1000).toFixed(1).replace('.', ',')}.`,
      ),
    ) as TraitDefinition['thresholds'];
  }
  if (t.id === 'shisheros') {
    t.thresholds = SHISHEROS_POLICY.counts.map((n, i) =>
      threshold(
        n,
        `Canaliza ${SHISHEROS_POLICY.channelTicks[i]! / 10} s: −30 % daño recibido, sin ataques ni habilidades. Después +${SHISHEROS_POLICY.powerMilli[i]! / 10} % AD/AP y +${SHISHEROS_POLICY.speedMilli[i]! / 10} % velocidad hasta finalizar.`,
      ),
    ) as TraitDefinition['thresholds'];
  }
  if (t.id === 'fantasy') {
    t.thresholds = [2, 4, 6].map((n, i) =>
      threshold(
        n,
        `${i + 1} predicciones; 1 oro cada una. Tres ofertas aleatorias antes del rival. Premios brutos de 3–6 oro.`,
      ),
    ) as TraitDefinition['thresholds'];
  }
  if (t.id === 'jew') {
    t.description =
      'Hay quien ahorra para el futuro. Peibol prefiere que el futuro le pague intereses.';
    t.thresholds = [
      threshold(
        1,
        'Peibol desplegado: 10/15/20 % del oro previo a recompensas, máximo 2/4/8 oro por ronda según estrellas. Adicional al interés normal.',
      ),
    ] as TraitDefinition['thresholds'];
  }
  if (t.id === 'todo-al-rojo') {
    t.description =
      'DaniGM ha decidido apostarlo todo. Nadie sabe qué puede salir mal, y eso es precisamente lo preocupante.';
    t.thresholds = [
      threshold(
        1,
        'Inicio de ronda: jackpot 5/5/10 %, éxito 45/45/50 %, fallo 50/50/40 % según 1★/2★/3★. Oro ganado o perdido: 1–3 / 4–8 / 9–15. Vida ganada o perdida: 1–7 / 8–14 / 15–25; perder vida no mata. Éxito o fallo puede afectar oro, vida, componente, personaje o coste de toda la formación. Jackpot: dos resultados positivos independientes, incluso repetidos. Si falta destino o copias para transformar, esa unidad no cambia. La tabla de pérdidas crece a 3★: contradice el texto anterior de pérdidas reducidas.',
      ),
    ] as TraitDefinition['thresholds'];
  }
  if (['upm', 'hortaleza', 'shisheros', 'fantasy', 'jew', 'todo-al-rojo'].includes(t.id))
    t.planning!.effectState = t.id === 'upm' ? 'pending_effects' : 'implemented';
  return TraitDefinitionSchema.parse(t);
});
