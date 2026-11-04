import { EconomyConfigSchema, TraitDefinitionSchema, type TraitDefinition } from '@tft/shared';
import { P13_ECONOMY_CONFIG } from './p13';
import { P13S_TRAITS } from './p13s';
/** Post-match revision. Historic P13/S/T definitions remain byte-for-byte unchanged. */
export const P13U_ECONOMY_CONFIG = EconomyConfigSchema.parse({
  ...P13_ECONOMY_CONFIG,
  synergyPolicy: 'f0p13u-1',
});
export const PROVISIONAL_SYNERGIES = ['upm', 'perdidos_por_el_mundo', 'mus', 'lenceria'] as const;
export const CARRASCO_PROVISIONAL = {
  hp: [700, 1100, 1600, 2200],
  attack: [55, 85, 120, 160],
  defense: [30, 40, 50, 60],
  spell: [140, 220, 320, 450],
  moveTicks: 4,
  attackWindupTicks: 3,
  mana: 60,
  range: 1,
  attackSpeedMilli: 700,
} as const;
export const MUS_PROVISIONAL_MEMBERS = ['vargas', 'peibol', 'alfredo-pocho', 'danigm'];
const rules: Record<string, [number, string][]> = {
  fumon: [
    [2, '−10 % vida máxima; +20 % AD.'],
    [4, '−18 % vida máxima; +40 % AD.'],
    [6, '−25 % vida máxima; +60 % AD.'],
  ],
  gym: [
    [2, '+10 % vida máxima.'],
    [4, '+20 % vida máxima y +10 armadura.'],
    [6, '+30 % vida máxima y +20 armadura.'],
  ],
  ruman_trinity: [
    [2, '+15 % daño.'],
    [3, '+30 % daño. El 10 % del daño recibido se reparte entre los demás Ruman Trinity vivos.'],
  ],
  pardillo: [
    [2, 'Cada básico recibido: 10 % de probabilidad de reducir el daño un 50 %.'],
    [4, 'Cada básico recibido: 20 % de probabilidad de reducir el daño un 50 %.'],
    [
      6,
      'Cada básico recibido: 30 % de probabilidad de reducir el daño un 50 % y curarse un 5 % de vida máxima si sobrevive.',
    ],
  ],
  rata: [
    [2, 'Cada eliminación propia: 20 % de probabilidad de generar 1 oro.'],
    [4, 'Cada eliminación propia: 40 % de probabilidad de generar 1 oro.'],
    [6, 'Cada eliminación propia: 50 % de probabilidad de generar 2 oro.'],
  ],
  perdidos_por_el_mundo: [
    [2, 'Una bonificación aleatoria: +15 % daño o −15 % daño recibido.'],
    [3, 'Ambas bonificaciones.'],
    [
      5,
      'Ambas y +15 % vida máxima, además de +10 % velocidad de ataque. Tercera bonificación provisional.',
    ],
  ],
  pancho: [2, 3, 4, 5].map((n, i) => [
    n,
    `Cada Pancho protege al aliado vivo más cercano y recibe un ${10 + i * 5} % de su daño, como daño verdadero después de la mitigación original. No supera la vida restante del protector.`,
  ]),
  valo: [2, 4, 6].map((n, i) => [
    n,
    `+${10 + i * 10} puntos de crítico; +${20 + i * 20} puntos de daño crítico. Un crítico básico tiene ${10 + i * 10} % de probabilidad de Headshot: ×1,5 daño de ese crítico.`,
  ]),
  blackhaus: [
    [2, 'Invisibles y no seleccionables durante 2 s.'],
    [4, 'Invisibles 3 s. Primer básico que impacta: +50 % daño.'],
    [6, 'Invisibles 4 s. Primer básico que impacta: +100 % daño.'],
  ],
  psoe: [2, 4, 6].map((n, i) => [
    n,
    `${i + 1} medidas aleatorias distintas para todo el equipo: +1 oro por eliminación, +15 % velocidad de ataque 5 s, curación inicial del 10 % de vida, +15 % AP, +15 % AD, o +10 armadura y resistencia mágica.`,
  ]),
  mus: [
    [
      2,
      'Provisional: +10 AD y AP. Cada cuarto básico que impacta concede un escudo del 8 % de vida máxima durante 4 s.',
    ],
    [
      4,
      'Provisional: +20 AD y AP. Cada cuarto básico que impacta concede un escudo del 12 % de vida máxima durante 4 s.',
    ],
  ],
  lenceria: [
    [2, 'Provisional: todo el equipo empieza con un escudo del 8 % de vida máxima durante 4 s.'],
  ],
  upm: [2, 4, 6, 8].map((n, i) => [
    n,
    `Al perder ${[50, 40, 30, 25][i]} % de vida conjunta, invoca una vez a CARRASCO ${i + 1}. Perfil provisional: ${CARRASCO_PROVISIONAL.hp[i]} vida, ${CARRASCO_PROVISIONAL.attack[i]} AD, ${CARRASCO_PROVISIONAL.defense[i]} defensas; golpe mágico de ${CARRASCO_PROVISIONAL.spell[i]} en radio 1 cada 60 maná. Escala con la media de estrellas UPM.`,
  ]),
};
export const P13U_TRAITS: readonly TraitDefinition[] = P13S_TRAITS.map((original) => {
  const t = structuredClone(original),
    replacements = rules[t.id];
  if (!replacements) return t;
  delete t.progress;
  t.stacking = 'highest';
  if (t.id === 'psoe' || t.id === 'lenceria') t.recipients = 'team';
  t.thresholds = replacements.map(([count, description]) => ({
    count,
    description,
    effectState: 'implemented',
    availability: count > 7 ? 'reserved' : 'available',
    ...(count > 7 ? { reservation: 'Capacidad máxima de equipo 7.' } : {}),
    bonuses: [],
    effects: [],
  }));
  for (const [i, tier] of t.thresholds.entries()) {
    const bonus = (
      stat:
        | 'maxHp'
        | 'attack'
        | 'armor'
        | 'abilityPower'
        | 'critChanceMilli'
        | 'critMultiplierMilli',
      amount: number,
      mode: 'flat' | 'percent_milli' = 'flat',
    ) => ({ stat, amount, mode });
    if (t.id === 'fumon') tier.bonuses = [bonus('attack', [200, 400, 600][i]!, 'percent_milli')];
    if (t.id === 'gym')
      tier.bonuses = [
        bonus('maxHp', (i + 1) * 100, 'percent_milli'),
        ...(i ? [bonus('armor', i * 10)] : []),
      ];
    if (t.id === 'valo')
      tier.bonuses = [
        bonus('critChanceMilli', (i + 1) * 100),
        bonus('critMultiplierMilli', (i + 1) * 200),
      ];
    if (t.id === 'mus')
      tier.bonuses = [bonus('attack', (i + 1) * 10), bonus('abilityPower', (i + 1) * 10)];
  }
  t.planning!.effectState = 'implemented';
  if (t.id === 'lenceria')
    t.description =
      'Provisional: una cobertura protectora para todo el equipo al empezar el combate.';
  if (t.id === 'mus') {
    t.planning!.members = [...MUS_PROVISIONAL_MEMBERS];
    t.description += ' Integrantes provisionales: VARGAS, PEIBOL, ALFREDO POCHO y DANIGM.';
  }
  // Runtime owns these hooks. Do not retain legacy smoke, armor shred or emergency heals.
  return TraitDefinitionSchema.parse(t);
});
