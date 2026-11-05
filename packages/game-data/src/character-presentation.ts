/** Descriptive specialization, deliberately separate from simulator role/item targeting and balance. */
export type CharacterCombatRole = 'tank' | 'fighter' | 'assassin' | 'marksman' | 'mage' | 'support';
export type CharacterPrimaryDamage = 'physical' | 'magic' | 'mixed' | 'true';
export type CharacterPresentation = {
  combatRole: CharacterCombatRole | null;
  primaryDamageType: CharacterPrimaryDamage | null;
  roleLabel: string;
  compactRoleLabel: string;
  damageLabel: string;
  compactDamageLabel: string;
  damageTypes: readonly ('physical' | 'magic' | 'true')[];
  specialization: 'support' | 'duelist' | null;
  note: string;
};
const pending: CharacterPresentation = {
  combatRole: null,
  primaryDamageType: null,
  roleLabel: 'Especialización pendiente',
  compactRoleLabel: 'Pendiente',
  damageLabel: 'Sin definir',
  compactDamageLabel: 'Sin definir',
  damageTypes: [],
  specialization: null,
  note: 'Rol y especialización de daño pendientes de diseño. Sus parámetros provisionales de simulación no definen una especialización definitiva.',
};
const physical = {
  primaryDamageType: 'physical' as const,
  damageTypes: ['physical'] as const,
  damageLabel: 'Físico',
  compactDamageLabel: 'Físico',
};
export const CHARACTER_PRESENTATION: Readonly<Record<string, CharacterPresentation>> = {
  dolea: {
    ...physical,
    combatRole: 'tank',
    roleLabel: 'Tanque',
    compactRoleLabel: 'Tanque',
    specialization: null,
    note: 'Volumen eterno concede escudo y Press de banca refuerza la armadura; su daño de habilidad es físico.',
  },
  vargas: {
    ...physical,
    combatRole: 'assassin',
    roleLabel: 'Asesino',
    compactRoleLabel: 'Asesino',
    specialization: null,
    note: 'Blackhaus RPP escala con AD y causa daño físico. El Depredador permite saltos tras eliminaciones.',
  },
  jaramillo: {
    ...physical,
    combatRole: 'marksman',
    roleLabel: 'Tirador de apoyo',
    compactRoleLabel: 'Tirador',
    specialization: 'support',
    note: 'Cortina de Humo escala con AD y causa daño físico; el humo reduce armadura. El apoyo describe su debilitamiento, no daño mágico.',
  },
  florin: {
    combatRole: 'fighter',
    primaryDamageType: 'mixed',
    roleLabel: 'Luchador duelista',
    compactRoleLabel: 'Duelista',
    damageTypes: ['physical', 'true'],
    damageLabel: 'Físico y verdadero',
    compactDamageLabel: 'Fís. + verd.',
    specialization: 'duelist',
    note: 'Pisotón Carmesí y sus básicos iniciales son físicos. Sus básicos pasan a daño verdadero tras la segunda vuelta de Mano de Obra; requiere ese atributo activo.',
  },
};
export function characterPresentation(
  id: string,
  policy?: string,
  eduPolicy?: string,
  sanchezPolicy?: string,
): CharacterPresentation {
  if (id === 'sanchez' && sanchezPolicy === 'sanchez-ap-1')
    return {
      combatRole: 'mage',
      primaryDamageType: 'magic',
      roleLabel: 'Atacante AP a distancia',
      compactRoleLabel: 'Mago AP',
      damageLabel: 'Mágico',
      compactDamageLabel: 'Mágico',
      damageTypes: ['magic'],
      specialization: null,
      note: 'Alcance 4. Redoble del Silencio escala con AP y aturde. Ausencia de Sangre acumula AP cada 4 básicos que impactan, hasta 5 veces. Sus básicos son físicos.',
    };
  if (id === 'edu' && eduPolicy === 'edu-support-1')
    return {
      ...physical,
      combatRole: 'support',
      roleLabel: 'Soporte a distancia',
      compactRoleLabel: 'Soporte',
      specialization: 'support',
      note: 'Básicos físicos de alcance 4. ¡Qué guapo soy! acelera a todo el equipo durante los primeros 6 s. Tienes que leer a Sanderson cura y protege al aliado con menos vida desde cualquier distancia, con escudo y velocidad de ataque durante 4 s.',
    };
  if (policy === 'f0p13t-1' && id === 'peibol')
    return {
      ...physical,
      combatRole: 'marksman',
      roleLabel: 'Tirador AD',
      compactRoleLabel: 'Tirador',
      specialization: null,
      note: 'PLATITA LOW ELO aumenta velocidad de ataque y AD; HEADSHOT escala 220 / 330 / 500 % AD y causa daño físico. Alcance 3 en la política P13T.',
    };

  return CHARACTER_PRESENTATION[id] ?? pending;
}
