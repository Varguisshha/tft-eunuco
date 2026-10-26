import type { ItemDefinition, PlannedItemEffect, PlannedItemOperation } from '@tft/shared';
import { itemBonusDescription } from './items';
const pct = (n: number) => `${n / 10} %`;
/** Original Spanish presentation, generated from the same typed design data as the catalog. */
export function itemOperationDescription(o: PlannedItemOperation): string {
  switch (o.kind) {
    case 'damage_amp':
      return `+${pct(o.ratioMilli)} de daño${o.targetMaxHpAbove ? ` contra objetivos con más de ${o.targetMaxHpAbove} de vida máxima` : ''}`;
    case 'ability_critical':
      return `Las habilidades pueden hacer crítico; si ya podían, +${pct(o.alreadyCriticalBonusMilli)} de multiplicador crítico`;
    case 'shield':
      return `Escudo de ${pct(o.maxHpRatioMilli)} de vida máxima${o.healthThresholdMilli ? ` al alcanzar ${pct(o.healthThresholdMilli)} de vida` : ''}; una vez por combate`;
    case 'resists':
      return `+${o.armor} de armadura y +${o.magicResist} de resistencia mágica`;
    case 'heal':
      return `Cura ${pct(o.ratioMilli)} de vida ${o.basis === 'max_hp' ? 'máxima' : 'perdida'}${o.cap ? `, máximo ${o.cap}` : ''}${o.radius !== undefined ? `, en radio de ${o.radius} hexágono(s)` : ''}`;
    case 'damage_reduction':
      return `Reduce ${pct(o.ratioMilli)} el daño de ${o.damageClass === 'attacks' ? 'ataques' : 'todas las fuentes'}${o.healthAboveMilli !== undefined ? `; pasa a ${pct(o.aboveThresholdRatioMilli!)} por encima de ${pct(o.healthAboveMilli)} de vida` : ''}`;
    case 'random_items':
      return `Equipa ${o.count} objetos aleatorios; ocupa ${o.slotCost} ranuras. Pool pendiente de especificación`;
    case 'attack_speed_stacks':
      return `+${pct(o.perStackMilli)} de velocidad de ataque por acumulación; ${o.stackCap === null ? 'sin límite publicado' : `máximo ${o.stackCap}`}`;
    case 'resistance_reduction':
      return `Reduce ${pct(o.ratioMilli)} la ${o.stat === 'armor' ? 'armadura' : 'resistencia mágica'}${o.radius !== undefined ? ` en radio de ${o.radius} hexágonos` : ''}; no acumula el debilitamiento`;
    case 'cast_punishment':
      return `Daño mágico de ${pct(o.targetMaxManaRatioMilli)} del maná máximo del enemigo que lanza, en radio de ${o.radius} hexágonos`;
    case 'health_ad_surge':
      return `Al ${pct(o.healthThresholdMilli)} de vida: +${pct(o.maxHpRatioMilli)} de vida máxima y +${pct(o.adRatioMilli)} de AD, una vez por combate`;
    case 'targeting_resists':
      return `+${o.armorPerEnemy} de armadura y +${o.magicResistPerEnemy} de resistencia mágica por enemigo que elija al portador como objetivo`;
    case 'retaliation':
      return `${o.damage} de daño mágico a enemigos adyacentes al recibir un ataque`;
    case 'burn_wound':
      return `Quema ${pct(o.burnPerSecondMilli)} de la vida máxima del objetivo por segundo como daño verdadero y reduce ${pct(o.woundMilli)} su curación${o.radius !== undefined ? `; objetivo a ${o.radius} hexágonos` : ''}`;
    case 'omnivamp':
      return `Cura al portador ${pct(o.ratioMilli)} del daño causado${o.alsoHealLowestHpAlly ? ' y también al aliado con menor porcentaje de vida' : ''}`;
    case 'round_random_bonus':
      return `Sortea un extra de ${pct(o.adMilli)} AD y ${o.ap} AP, o ${pct(o.omnivampMilli)} omnivampirismo; probabilidades pendientes`;
    case 'untargetable_cleanse':
      return `Al ${pct(o.healthThresholdMilli)} de vida, limpia efectos negativos y no puede ser objetivo durante ${o.untargetableTicks / 10} s, una vez por combate`;
    case 'attack_speed':
      return `+${pct(o.ratioMilli)} de velocidad de ataque`;
    case 'dual_power_stacks':
      return `+${pct(o.adPerStackMilli)} de AD y +${o.apPerStack} AP por acumulación, máximo ${o.stackCap}; al máximo +${o.armorAtCap} armadura y +${o.magicResistAtCap} resistencia mágica`;
    case 'secondary_bolt':
      return `Un proyectil a ${o.additionalTargets} enemigo(s) cercano(s) causa ${pct(o.adRatioMilli)} del AD como daño físico; procs pendientes de validación`;
    case 'ability_power':
      return `+${o.amount} AP`;
    case 'attack_mana':
      return `+${o.amount} maná por ataque`;
    case 'positional_bonuses':
      return `Al inicio, primeras ${o.frontRows} filas: +${o.frontArmor} armadura, +${o.frontMagicResist} resistencia mágica y +${o.frontManaPerAttackReceived} maná por ataque recibido; filas traseras: +${o.backAp} AP y +${o.backMana} maná cada ${o.backIntervalTicks / 10} s`;
    case 'max_mana_reduction':
      return `Reduce ${o.amount} el maná máximo; mínimo pendiente de especificación`;
    case 'crowd_control_immunity':
      return 'Inmunidad al control de masas';
    case 'chain_magic':
      return `Cada ${o.everyAttacks} ataques: ${o.damage} de daño mágico a ${o.targets} enemigos y ${pct(o.shredMilli)} de reducción de resistencia mágica`;
  }
}
const triggers: Record<PlannedItemEffect['trigger'], string> = {
  combat_start: 'Inicio de combate',
  attack_release: 'Al atacar',
  attack_hit: 'Al impactar un ataque',
  received_attack: 'Al recibir un ataque',
  aura: 'Aura durante el combate',
  damage_taken: 'Al recibir daño',
  damage_dealt: 'Al causar daño',
  physical_damage: 'Al causar daño físico',
  shield_damage: 'Al dañar un escudo',
  enemy_cast: 'Al lanzar un enemigo',
  ability_cast: 'Al lanzar habilidad',
  periodic: 'Periódico',
  health_threshold: 'Umbral de vida',
  shield_expire: 'Al expirar el escudo',
  targeting_change: 'Cambio de objetivos',
  round_start: 'Inicio de ronda',
  attack_or_damage_taken: 'Al atacar o recibir daño',
  attack_or_ability_damage: 'Daño de ataque o habilidad',
  takedown: 'Participación en eliminación',
};
export function plannedItemEffectDescription(e: PlannedItemEffect) {
  return `${triggers[e.trigger]}: ${itemOperationDescription(e.operation)}.${e.durationTicks === null ? '' : ` Duración: ${e.durationTicks / 10} s.`}${e.intervalTicks ? ` Intervalo: ${e.intervalTicks / 10} s.` : ''}${e.cooldownTicks ? ` Enfriamiento: ${e.cooldownTicks / 10} s.` : ''} ${e.note}`;
}
export function itemDescription(d: ItemDefinition) {
  if (!d.content) return itemBonusDescription(d.bonuses);
  const stats = d.bonuses.length
    ? itemBonusDescription(d.bonuses)
    : 'Sin bonificaciones estadísticas directas.';
  const mechanics =
    d.kind === 'completed'
      ? d.effects
          .filter((e): e is PlannedItemEffect => e.implementation === 'reserved-design-v2')
          .map(plannedItemEffectDescription)
          .join(' ')
      : '';
  return `${stats}${mechanics ? `. ${mechanics}` : ''}${d.availability !== 'available' ? ' No disponible: definición de diseño para P8C.' : ''}`;
}
