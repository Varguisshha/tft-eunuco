import {
  STANDARD_ITEM_VERSION,
  STANDARD_LAB_VERSION,
  type ItemBonus,
  type ItemDefinition,
  type PlannedItemEffect,
  type PlannedItemOperation,
} from '@tft/shared';
import reference from './reference/tft-14.1-items.json';
import {
  ITEM_CATALOG,
  componentId,
  recipeKey,
  validateItemCatalog,
  itemBonusDescription,
} from './items';
export const ITEM_BALANCE_REFERENCE = reference;
const categories = [
  'ad',
  'attack_speed',
  'ap',
  'mana',
  'armor',
  'magic_resist',
  'health',
  'critical',
] as const;
const sourceComponents = [
  'BFSword',
  'RecurveBow',
  'NeedlesslyLargeRod',
  'TearOfTheGoddess',
  'ChainVest',
  'NegatronCloak',
  'GiantsBelt',
  'SparringGloves',
];
const sourceComponent = (id: string) => {
  const index = sourceComponents.indexOf(id.replace('TFT_Item_', ''));
  if (index < 0) throw Error('Unknown reference component');
  return componentId(categories[index]!);
};
const definitions: ItemDefinition[] = reference.records.map((record) => {
  const used = new Set<string>();
  const p = (key: string, scale = 1) => {
    const value = (record.parameters as Record<string, number | null>)[key];
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw Error(`Missing source parameter ${record.recordId}:${key}`);
    used.add(key);
    return Math.round(value * scale);
  };
  const bonuses: ItemBonus[] = [];
  const bonus = (
    key: string,
    stat: ItemBonus['stat'],
    mode: ItemBonus['mode'] = 'flat',
    scale = 1,
  ) => {
    if (key in record.parameters) bonuses.push({ stat, mode, amount: p(key, scale) });
  };
  bonus('AD', 'attack', 'percent_milli', 1000);
  bonus('AS', 'attackSpeedMilli', 'percent_milli', 10);
  bonus('AP', 'abilityPower');
  bonus('Armor', 'armor');
  bonus('MagicResist', 'magicResist');
  bonus('Health', 'maxHp');
  bonus('Mana', 'startingMana');
  bonus('CritChance', 'critChanceMilli', 'flat', 10);
  bonus('PercentMaxHP', 'maxHp', 'percent_milli', 1000);
  bonus('BonusPercentHP', 'maxHp', 'percent_milli', 1000);
  bonus('BaseAD', 'attack', 'percent_milli', 1000);
  bonus('BaseSP', 'abilityPower');
  const effects: PlannedItemEffect[] = [];
  const e = (
    operation: PlannedItemOperation,
    trigger: PlannedItemEffect['trigger'] = 'combat_start',
    options: Partial<Omit<PlannedItemEffect, 'operation' | 'trigger'>> = {},
  ) =>
    effects.push({
      id: `effect-${effects.length + 1}`,
      implementation: 'reserved-design-v2',
      trigger,
      target: 'self',
      operation,
      durationTicks: null,
      stacking: 'independent',
      capability: 'extend_effect',
      note: 'Diseño reservado: no se ejecuta hasta F0-P8C.',
      ...options,
    });
  const amp = (key: string, scale = 10) => e({ kind: 'damage_amp', ratioMilli: p(key, scale) });
  const shield = (ratio: string, threshold?: string) =>
    e(
      {
        kind: 'shield',
        maxHpRatioMilli: p(ratio, 10),
        ...(threshold ? { healthThresholdMilli: p(threshold, 10) } : {}),
        oncePerCombat: true,
      },
      threshold ? 'health_threshold' : 'combat_start',
      { durationTicks: p('ShieldDuration', 10), stacking: 'unique' },
    );
  const shred = (
    stat: 'armor' | 'magicResist',
    key: string,
    trigger: PlannedItemEffect['trigger'],
    radius?: string,
    duration?: string,
  ) =>
    e(
      {
        kind: 'resistance_reduction',
        stat,
        ratioMilli: p(key, 10),
        ...(radius ? { radius: p(radius) } : {}),
      },
      trigger,
      {
        target: radius ? 'enemies_in_radius' : 'damaged_enemy',
        stacking: 'nonstacking_debuff',
        ...(duration ? { durationTicks: p(duration, 10) } : {}),
      },
    );
  const burn = (
    duration: string,
    wound: string,
    trigger: PlannedItemEffect['trigger'],
    radius?: string,
  ) =>
    e(
      {
        kind: 'burn_wound',
        burnPerSecondMilli: p('BurnPercent', 10),
        tickIntervalTicks: 10,
        woundMilli: p(wound, 10),
        damageType: 'true',
        ...(radius ? { radius: p(radius) } : {}),
      },
      trigger,
      {
        target: radius ? 'nearby_enemy' : 'damaged_enemy',
        durationTicks: p(duration, 10),
        ...(radius ? { intervalTicks: p('ICD', 10) } : {}),
        stacking: 'nonstacking_debuff',
        capability: 'new_mechanic',
        ...(radius
          ? {
              cooldownTicks: p('ICD', 10),
              note: 'Seleccionar un enemigo en radio cada 2 s; desempate pendiente de P8C. Quemadura sobre vida máxima del objetivo, sin recursión.',
            }
          : {}),
      },
    );
  const name = record.recordId.replace('TFT_Item_', '');
  switch (name) {
    case 'RabadonsDeathcap':
    case 'Deathblade':
      amp('BonusDamage', 1000);
      break;
    case 'InfinityEdge':
    case 'JeweledGauntlet':
      e(
        { kind: 'ability_critical', alreadyCriticalBonusMilli: p('CritDamageToGive', 1000) },
        'combat_start',
        {
          capability: 'new_mechanic',
          note: 'Permite crítico de habilidad; si ya puede, +10 puntos de multiplicador crítico. No convierte exceso de probabilidad.',
        },
      );
      break;
    case 'FrozenHeart':
      shield('ShieldHealthPercent', 'HealthThreshold');
      e({ kind: 'resists', armor: p('Stats'), magicResist: p('Stats') }, 'health_threshold', {
        condition: {
          healthAtOrBelowMilli: p('HealthThreshold', 10),
          afterEffectId: 'effect-1',
          oncePerCombat: true,
        },
        stacking: 'unique',
        note: 'Misma activación única que el escudo, al 40 % de vida. Resistencias hasta terminar combate.',
      });
      break;
    case 'Redemption':
      e(
        {
          kind: 'heal',
          basis: 'missing_hp',
          ratioMilli: p('MissingHealthHeal', 10),
          cap: p('MaxHeal'),
          radius: p('HexRadius'),
        },
        'periodic',
        { intervalTicks: p('HealTickRate', 10), target: 'allies_in_radius' },
      );
      e(
        { kind: 'damage_reduction', ratioMilli: p('AoEDamageReduction', 10), damageClass: 'all' },
        'periodic',
        {
          intervalTicks: p('HealTickRate', 10),
          durationTicks: 50,
          target: 'allies_in_radius',
          stacking: 'strongest',
          note: 'Mismos aliados a 1 hexágono que la curación. Reducción no acumulable durante 5 s.',
        },
      );
      break;
    case 'ThiefsGloves':
      e(
        { kind: 'random_items', count: 2, slotCost: 3, pool: 'requires-specification' },
        'round_start',
        {
          capability: 'needs_specification',
          stacking: 'unique',
          note: 'Ocupa las tres ranuras. Pool elegible y exclusiones requieren especificación antes de activarlo.',
        },
      );
      break;
    case 'GuinsoosRageblade':
      e(
        {
          kind: 'attack_speed_stacks',
          perStackMilli: p('AttackSpeedPerStack', 10),
          stackCap: null,
        },
        'attack_release',
        {
          stacking: 'add',
          note: 'Sin límite de acumulaciones publicado; permanece el límite global EUNUCO de 5 ataques/s.',
        },
      );
      break;
    case 'IonicSpark':
      shred('magicResist', 'MRShred', 'aura', 'HexRange');
      e(
        {
          kind: 'cast_punishment',
          targetMaxManaRatioMilli: p('ManaRatio', 10),
          radius: p('HexRange'),
          damageType: 'magic',
        },
        'enemy_cast',
        { target: 'casting_enemy', capability: 'new_mechanic' },
      );
      break;
    case 'SteraksGage':
      e(
        {
          kind: 'health_ad_surge',
          healthThresholdMilli: p('HealthThreshold', 10),
          maxHpRatioMilli: p('BonusMaxHealthPerc', 10),
          adRatioMilli: p('BonusADToGive', 10),
          oncePerCombat: true,
        },
        'health_threshold',
        {
          capability: 'needs_specification',
          stacking: 'unique',
          note: 'Vida actual al ampliar vida máxima y orden de umbral requieren decisión. Bonificaciones hasta fin de combate.',
        },
      );
      break;
    case 'DragonsClaw':
      e(
        { kind: 'heal', basis: 'max_hp', ratioMilli: p('PercentHealthDamage', 10), cap: null },
        'periodic',
        { intervalTicks: p('HealthRegenInterval', 10) },
      );
      break;
    case 'PowerGauntlet':
      e({ kind: 'damage_amp', ratioMilli: p('DamageAmpPct', 10) }, 'shield_damage', {
        durationTicks: p('Duration', 10),
        stacking: 'refresh',
      });
      break;
    case 'GargoyleStoneplate':
      e(
        {
          kind: 'targeting_resists',
          armorPerEnemy: p('ArmorPerEnemy'),
          magicResistPerEnemy: p('MRPerEnemy'),
        },
        'targeting_change',
        { capability: 'new_mechanic', stacking: 'add' },
      );
      break;
    case 'BrambleVest':
      e({
        kind: 'damage_reduction',
        ratioMilli: p('AutoDamageReduction', 1000),
        damageClass: 'attacks',
      });
      e(
        { kind: 'retaliation', damage: p('1StarAoEDamage'), damageType: 'magic', radius: 1 },
        'received_attack',
        {
          target: 'enemies_in_radius',
          cooldownTicks: p('ICD', 10),
          note: 'Al recibir un ataque, no al realizarlo. Daño idéntico en las tres estrellas. No genera ataques ni procs recursivos.',
        },
      );
      p('2StarAoEDamage');
      p('3StarAoEDamage');
      break;
    case 'MadredsBloodrazor':
      e(
        {
          kind: 'damage_amp',
          ratioMilli: p('LargeBonusPct', 10),
          targetMaxHpAbove: p('HealthThreshold'),
        },
        'damage_dealt',
        { target: 'current_enemy' },
      );
      break;
    case 'RedBuff':
      burn('BurnDuration', 'GrievousWoundsPercent', 'periodic', 'HexRange');
      break;
    case 'UnstableConcoction':
      e(
        { kind: 'omnivamp', ratioMilli: p('BaseHeal', 10), alsoHealLowestHpAlly: false },
        'damage_dealt',
      );
      e(
        {
          kind: 'round_random_bonus',
          adMilli: p('BonusADPercent', 1000),
          ap: p('BonusSP'),
          omnivampMilli: p('BaseHeal', 10),
          weights: 'requires-specification',
        },
        'round_start',
        {
          capability: 'needs_specification',
          note: 'Dobla AD/AP o bien omnivampirismo. Pesos no publicados; no asumir 50/50.',
        },
      );
      break;
    case 'GuardianAngel':
      e(
        {
          kind: 'untargetable_cleanse',
          healthThresholdMilli: p('HealthThreshold', 10),
          untargetableTicks: p('StealthDuration', 10),
          oncePerCombat: true,
        },
        'health_threshold',
        { capability: 'new_mechanic', stacking: 'unique' },
      );
      e({ kind: 'attack_speed', ratioMilli: p('AttackSpeed', 10) }, 'health_threshold', {
        condition: {
          healthAtOrBelowMilli: p('HealthThreshold', 10),
          afterEffectId: 'effect-1',
          oncePerCombat: true,
        },
        note: 'Después de la misma activación única de intangibilidad; dura hasta fin de combate.',
        stacking: 'unique',
      });
      break;
    case 'TitansResolve':
      e(
        {
          kind: 'dual_power_stacks',
          adPerStackMilli: p('StackingAD', 1000),
          apPerStack: p('StackingSP'),
          stackCap: p('StackCap'),
          armorAtCap: p('BonusResistsAtStackCap'),
          magicResistAtCap: p('BonusResistsAtStackCap'),
        },
        'attack_or_damage_taken',
        { stacking: 'add' },
      );
      break;
    case 'RunaansHurricane':
      e(
        {
          kind: 'secondary_bolt',
          adRatioMilli: p('MultiplierForDamage', 10),
          additionalTargets: p('AdditionalTargets'),
          damageType: 'physical',
          sourceProcs: 'disabled-pending-validation',
        },
        'attack_release',
        {
          target: 'nearby_enemy',
          capability: 'new_mechanic',
          note: 'Críticos y elegibilidad del objetivo secundario pendientes de P8C; nunca replicar pasivas por recursión.',
        },
      );
      break;
    case 'Bloodthirster':
      e(
        { kind: 'omnivamp', ratioMilli: p('LifeSteal', 10), alsoHealLowestHpAlly: false },
        'damage_dealt',
      );
      shield('ShieldHealthPercent', 'HealthThreshold');
      break;
    case 'ArchangelsStaff':
      e({ kind: 'ability_power', amount: p('APPerInterval') }, 'periodic', {
        intervalTicks: p('IntervalSeconds', 10),
        stacking: 'add',
        note: 'Primer incremento tras 5 s de combate; se conserva hasta finalizar.',
      });
      break;
    case 'SpearOfShojin':
      e({ kind: 'attack_mana', amount: p('FlatManaRestore') }, 'attack_release');
      break;
    case 'SpectralGauntlet':
      shred('armor', 'ARReductionAmount', 'aura', 'HexRange');
      e(
        { kind: 'resists', armor: p('BonusResists'), magicResist: p('BonusResists') },
        'combat_start',
        { durationTicks: p('BonusResistDuration', 10) },
      );
      break;
    case 'Leviathan':
      e({ kind: 'attack_speed', ratioMilli: p('AttackSpeedToGive', 10) }, 'ability_cast', {
        durationTicks: p('ASDuration', 10),
        stacking: 'refresh',
      });
      break;
    case 'Morellonomicon':
      burn('BurnDuration', 'GrievousWoundsPercent', 'attack_or_ability_damage');
      p('TicksPerSecond');
      break;
    case 'RapidFireCannon':
      amp('BonusDamage', 1000);
      burn('Duration', 'HealingReductionPct', 'attack_or_ability_damage');
      break;
    case 'Crownguard':
      shield('ShieldSize');
      e({ kind: 'ability_power', amount: p('ShieldBonusAP') }, 'shield_expire', {
        stacking: 'unique',
        capability: 'needs_specification',
        note: 'Distinguir rotura anticipada de expiración natural antes de implementar; AP permanece hasta fin de combate.',
      });
      break;
    case 'AdaptiveHelm':
      e(
        {
          kind: 'positional_bonuses',
          frontRows: 2,
          frontArmor: p('FrontRowBonusResists'),
          frontMagicResist: p('FrontRowBonusResists'),
          frontManaPerAttackReceived: p('FrontLineManaPerHit'),
          backAp: p('BackRowBonusAP'),
          backMana: p('ManaPerTickrate'),
          backIntervalTicks: p('ManaTickrate', 10),
        },
        'combat_start',
        {
          capability: 'needs_specification',
          note: 'Posición al inicio: dos filas delanteras o dos traseras. Fijar traducción a filas lógicas EUNUCO.',
        },
      );
      break;
    case 'BlueBuff':
      e(
        {
          kind: 'max_mana_reduction',
          amount: p('ManaReduction'),
          minimumMana: 'requires-specification',
        },
        'combat_start',
        { capability: 'needs_specification' },
      );
      e({ kind: 'damage_amp', ratioMilli: p('DamageAmp', 1000) }, 'takedown', {
        durationTicks: p('TakedownTimer', 10),
        stacking: 'refresh',
      });
      break;
    case 'LastWhisper':
      shred('armor', 'ArmorReductionPercent', 'physical_damage', undefined, 'ArmorBreakDuration');
      break;
    case 'NightHarvester':
      e({
        kind: 'damage_reduction',
        ratioMilli: p('BaseDamageReduction', 10),
        damageClass: 'all',
        healthAboveMilli: p('ThresholdForEmpower', 1000),
        aboveThresholdRatioMilli: p('EmpowerDamageReduction', 10),
      });
      break;
    case 'Quicksilver':
      e({ kind: 'crowd_control_immunity' }, 'combat_start', {
        durationTicks: p('SpellShieldDuration', 10),
        capability: 'new_mechanic',
      });
      e(
        { kind: 'attack_speed_stacks', perStackMilli: p('ProcAttackSpeed', 1000), stackCap: null },
        'periodic',
        {
          condition: { duringFirstTicks: p('SpellShieldDuration', 10) },
          intervalTicks: p('ProcInterval', 10),
          durationTicks: p('SpellShieldDuration', 10),
          stacking: 'add',
          capability: 'needs_specification',
          note: 'Solo acumula durante los primeros 14 s. Inclusión del instante final y persistencia posterior requieren P8C.',
        },
      );
      break;
    case 'WarmogsArmor':
      break;
    case 'StatikkShiv':
      e(
        {
          kind: 'chain_magic',
          everyAttacks: 3,
          damage: p('Damage'),
          targets: p('1StarBounces'),
          shredMilli: p('MRShred', 10),
        },
        'attack_release',
        {
          target: 'enemies_in_radius',
          durationTicks: p('MRShredDuration', 10),
          stacking: 'nonstacking_debuff',
          capability: 'new_mechanic',
          note: 'Cada tercer ataque: cuatro objetivos, 30 daño mágico y reducción de RM. Orden determinista de selección pendiente.',
        },
      );
      break;
    case 'HextechGunblade':
      e(
        { kind: 'omnivamp', ratioMilli: p('Omnivamp', 10), alsoHealLowestHpAlly: true },
        'damage_dealt',
        { target: 'lowest_hp_ally_and_self' },
      );
      break;
    default:
      if (!sourceComponents.includes(name)) throw Error(`Unmapped reference ${name}`);
  }
  const component = record.components.length === 0;
  const pair = component
    ? null
    : (record.components.map(sourceComponent).sort() as [string, string]);
  const key = component ? sourceComponent(record.recordId) : recipeKey(...pair!);
  const id = component ? key : `item-forge-${key.replace('+', '--')}`;
  const category: NonNullable<ItemDefinition['content']>['functionalCategory'] = component
    ? 'component'
    : name === 'ThiefsGloves'
      ? 'utility'
      : ['Redemption', 'IonicSpark', 'HextechGunblade', 'SpectralGauntlet'].includes(name)
        ? 'support'
        : bonuses.some((b) => b.stat === 'maxHp' || b.stat === 'armor' || b.stat === 'magicResist')
          ? 'defense'
          : bonuses.some((b) => b.stat === 'attack') &&
              bonuses.some((b) => b.stat === 'abilityPower')
            ? 'hybrid'
            : bonuses.some((b) => b.stat === 'abilityPower')
              ? 'magic'
              : 'physical';
  const content = {
    definition: 'complete' as const,
    combat: effects.length ? ('pending' as const) : ('compatible' as const),
    laboratory: component || effects.length === 0,
    competitive: false as const,
    internalName: id,
    accessibleLabel:
      `${component ? 'Componente' : 'Objeto'} ${key}: ${itemBonusDescription(bonuses)}`.slice(
        0,
        160,
      ),
    visibleName: null,
    functionalCategory: category,
    slotCost: name === 'ThiefsGloves' ? (3 as const) : (1 as const),
    sourceRecordId: record.recordId,
    usedParameters: [...used].sort(),
    uninterpretedParameters: Object.keys(record.parameters)
      .filter((k) => !used.has(k))
      .sort(),
  };
  const common = {
    id,
    version: 1 as const,
    icon: `forge-${key.replace('+', '-')}`,
    availability: component ? ('available' as const) : ('planned' as const),
    scope: 'competitive' as const,
    bonuses,
    content,
  };
  if (component)
    return { ...common, kind: 'component', category: categories[sourceComponents.indexOf(name)]! };
  return {
    ...common,
    kind: 'completed',
    recipe: pair!,
    effects,
    restrictions: { minimumStars: 1, excludedDefinitions: [] },
    stacking: record.unique ? 'unique' : 'stack',
    visual: { tone: 'neutral', rarity: 'standard' },
  };
});
export const STANDARD_ITEM_CATALOG = validateItemCatalog({
  version: STANDARD_ITEM_VERSION,
  definitions,
  recipes: definitions
    .filter((d) => d.kind === 'completed')
    .map((d) => ({ id: recipeKey(...d.recipe), components: d.recipe, resultId: d.id })),
  policy: ITEM_CATALOG.policy,
});
/** Explicit local laboratory only; never grant an item with unimplemented effects. */
export const STANDARD_LAB_ITEM_CATALOG = validateItemCatalog({
  ...STANDARD_ITEM_CATALOG,
  version: STANDARD_LAB_VERSION,
  definitions: STANDARD_ITEM_CATALOG.definitions.map((d) => ({
    ...d,
    scope: 'diagnostic',
    availability: d.content!.laboratory ? 'available' : 'planned',
  })),
  policy: { ...STANDARD_ITEM_CATALOG.policy, unequip: 'allowed' },
});
