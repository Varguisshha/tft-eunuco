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
export function characterPresentation(id: string): CharacterPresentation {
  return CHARACTER_PRESENTATION[id] ?? pending;
}
