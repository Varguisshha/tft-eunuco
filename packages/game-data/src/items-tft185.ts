import presentation from './tft185-presentation.json';
import {
  TFT185_ITEM_VERSION,
  type ItemBonus,
  type ItemDefinition,
  type PlannedItemEffect,
  type PlannedItemOperation,
} from '@tft/shared';
import reference from './reference/tft-18.5-items.json';
import { EXECUTABLE_ITEM_CATALOG } from './items-executable';
import { validateItemCatalog } from './items';
export const TFT185_REFERENCE = reference;
/** Names and authored explanations are data, independent from replaceable original icons. */
export const TFT185_PRESENTATION = presentation;
export const TFT185_PENDING: Readonly<Record<string, string>> = {
  TFT_Item_SteraksGage: 'Curva de desaparición del escudo sin especificación verificable.',
  TFT_Item_ThiefsGloves:
    'Distribución y restricciones del sorteo oficial no documentadas; no se usa un sorteo aproximado.',
  TFT_Item_PowerGauntlet:
    'Amplificación base y renovación de acumulaciones requieren contraste del motor nuevo.',
  TFT_Item_HextechGunblade:
    'Parámetros públicos contradictorios de omnivampirismo (15 frente a 18).',
  TFT_Item_RapidFireCannon:
    'Parámetros públicos contradictorios de amplificación base (3 frente a 6).',
  TFT_Item_MadredsBloodrazor:
    'Amplificación base y parámetros heredados opacos pendientes de contraste del motor nuevo.',
};
const definitions: ItemDefinition[] = reference.records.map((record) => {
  const old = EXECUTABLE_ITEM_CATALOG.definitions.find(
    (d) => d.content?.sourceRecordId === record.recordId,
  )!;
  const used = new Set<string>();
  const p = (key: string, scale = 1) => {
    const n = (record.parameters as Record<string, number | null>)[key];
    if (typeof n !== 'number') throw Error(`Missing TFT185 parameter ${record.recordId}:${key}`);
    used.add(key);
    return Math.round(n * scale);
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
  bonus('ManaRegen', 'manaRegenMilli', 'flat', 1000);
  bonus('CritChance', 'critChanceMilli', 'flat', 10);
  bonus('PercentMaxHP', 'maxHp', 'percent_milli', 1000);
  bonus('BonusPercentHP', 'maxHp', 'percent_milli', 1000);
  const effects: PlannedItemEffect[] = [];
  const add = (
    operation: PlannedItemOperation,
    trigger: PlannedItemEffect['trigger'] = 'combat_start',
    options: Partial<PlannedItemEffect> = {},
  ) =>
    effects.push({
      id: `effect-${effects.length + 1}`,
      implementation: 'executable-v1',
      trigger,
      target: 'self',
      operation,
      durationTicks: null,
      stacking: 'independent',
      capability: 'direct',
      note: TFT185_PENDING[record.recordId] ?? '',
      ...options,
    });
  const amp = (key: string, scale = 1000) => add({ kind: 'damage_amp', ratioMilli: p(key, scale) });
  const shield = (key: string, threshold?: string) =>
    add(
      {
        kind: 'shield',
        maxHpRatioMilli: p(key, 10),
        oncePerCombat: true,
        ...(threshold ? { healthThresholdMilli: p(threshold, 10) } : {}),
      },
      threshold ? 'health_threshold' : 'combat_start',
      { durationTicks: p('ShieldDuration', 10), stacking: 'unique' },
    );
  const shred = (
    stat: 'armor' | 'magicResist',
    key: string,
    trigger: PlannedItemEffect['trigger'],
    duration?: string,
    radius?: string,
  ) =>
    add(
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
  const burn = (duration: string, wound: string, periodic = false) =>
    add(
      {
        kind: 'burn_wound',
        burnPerSecondMilli: p('BurnPercent', 10),
        woundMilli: p(wound, 10),
        tickIntervalTicks: 10,
        damageType: 'true',
        ...(periodic ? { radius: p('HexRange'), selection: 'random-unburned-first' as const } : {}),
      },
      periodic ? 'periodic' : 'attack_or_ability_damage',
      {
        target: periodic ? 'nearby_enemy' : 'damaged_enemy',
        durationTicks: p(duration, 10),
        stacking: 'nonstacking_debuff',
        ...(periodic ? { intervalTicks: p('ICD', 10), cooldownTicks: p('ICD', 10) } : {}),
      },
    );
  const stack = (
    stat: 'attack' | 'attackSpeedMilli',
    key: string,
    scale: number,
    trigger: PlannedItemEffect['trigger'],
    cap: number,
    extra: Partial<Extract<PlannedItemOperation, { kind: 'stat_stacks' }>> = {},
  ) =>
    add(
      {
        kind: 'stat_stacks',
        stat,
        mode: 'percent_milli',
        perStack: p(key, scale),
        stackCap: cap,
        capAmpMilli: 0,
        capAttackSpeedMilli: 0,
        capCcImmunity: false,
        ...extra,
      },
      trigger,
      trigger === 'periodic' ? { intervalTicks: 10 } : {},
    );
  const name = record.recordId.replace('TFT_Item_', '');
  switch (name) {
    case 'RabadonsDeathcap':
    case 'Deathblade':
    case 'RapidFireCannon':
      amp('BonusDamage');
      if (name === 'RapidFireCannon') burn('Duration', 'HealingReductionPct');
      break;
    case 'InfinityEdge':
    case 'JeweledGauntlet':
      add({ kind: 'precision', duplicateAmpMilli: 100 });
      break;
    case 'FrozenHeart':
      add({ kind: 'mana_income', amount: p('CombatStartMana') });
      shield('ShieldHealthPercent', 'HealthThreshold');
      add({ kind: 'mana_income', amount: p('TriggerMana') }, 'health_threshold', {
        condition: { healthAtOrBelowMilli: p('HealthThreshold', 10), oncePerCombat: true },
      });
      break;
    case 'Redemption':
      add({
        kind: 'damage_reduction',
        ratioMilli: p('VerifiedDurability', 1000),
        damageClass: 'all',
      });
      add(
        {
          kind: 'heal',
          basis: 'missing_hp',
          ratioMilli: p('MissingHealthHeal', 1000),
          cap: p('MaxHeal'),
        },
        'periodic',
        { intervalTicks: p('HealTickRate', 10) },
      );
      break;
    case 'ThiefsGloves':
      add(
        {
          kind: 'random_items',
          count: 2,
          slotCost: 3,
          pool: 'available-completed-excluding-random',
        },
        'round_start',
      );
      break;
    case 'GuinsoosRageblade':
      stack('attackSpeedMilli', 'AttackSpeedPerStack', 10, 'periodic', 10000);
      break;
    case 'IonicSpark':
      shred('magicResist', 'MRShred', 'aura', undefined, 'HexRange');
      add(
        {
          kind: 'cast_punishment',
          manaBasis: 'spent',
          targetMaxManaRatioMilli: p('ManaRatio', 10),
          radius: p('HexRange'),
          damageType: 'magic',
        },
        'enemy_cast',
        { target: 'casting_enemy' },
      );
      break;
    case 'SteraksGage':
      add(
        { kind: 'decaying_shield', maxHpRatioMilli: p('PercentHealthShield', 1000) },
        'health_threshold',
        {
          durationTicks: p('ShieldDuration', 10),
          condition: { healthAtOrBelowMilli: p('HealthThreshold', 10), oncePerCombat: true },
        },
      );
      break;
    case 'DragonsClaw':
      add(
        { kind: 'heal', basis: 'max_hp', ratioMilli: p('PercentHealthDamage', 10), cap: null },
        'periodic',
        { intervalTicks: p('HealthRegenInterval', 10) },
      );
      break;
    case 'PowerGauntlet':
      add(
        {
          kind: 'critical_amp_stacks',
          perStackMilli: p('BuffDamageAmp', 1000),
          stackCap: p('MaxStacks'),
        },
        'critical_damage',
        { durationTicks: p('Duration', 10) },
      );
      break;
    case 'GargoyleStoneplate':
      add(
        {
          kind: 'targeting_resists',
          armorPerEnemy: p('ArmorPerEnemy'),
          magicResistPerEnemy: p('MRPerEnemy'),
        },
        'targeting_change',
      );
      break;
    case 'BrambleVest':
      add({
        kind: 'damage_reduction',
        ratioMilli: p('AutoDamageReduction', 1000),
        damageClass: 'attacks',
      });
      add(
        { kind: 'retaliation', damage: p('1StarAoEDamage'), damageType: 'magic', radius: 1 },
        'received_attack',
        { target: 'enemies_in_radius', cooldownTicks: p('ICD', 10) },
      );
      break;
    case 'MadredsBloodrazor':
      add(
        { kind: 'damage_amp', ratioMilli: p('DamageAmp', 1000), targetRole: 'tank' },
        'damage_dealt',
      );
      break;
    case 'RedBuff':
      burn('BurnDuration', 'GrievousWoundsPercent', true);
      break;
    case 'UnstableConcoction':
      add({
        kind: 'conditional_power_vamp',
        healthThresholdMilli: p('HealthThreshold', 1000),
        adMilli: p('AD_NotStatBar', 1000),
        ap: p('AP_NotStatBar'),
        omnivampMilli: p('StatOmnivamp_NotStatBar', 1000),
      });
      break;
    case 'GuardianAngel':
      add(
        {
          kind: 'untargetable_cleanse',
          healthThresholdMilli: p('HealthThreshold', 10),
          untargetableTicks: p('StealthDuration', 10),
          oncePerCombat: true,
          missingHpHealMilli: p('MissingHealthRestore', 1000),
        },
        'health_threshold',
      );
      break;
    case 'TitansResolve':
      stack('attack', 'StackingAD', 1000, 'attack_or_damage_taken', p('StackCap'), {
        capAmpMilli: p('StackedAmp', 1000),
        capCcImmunity: true,
      });
      add(
        {
          kind: 'stat_stacks',
          stat: 'abilityPower',
          mode: 'flat',
          perStack: p('StackingSP'),
          stackCap: p('StackCap'),
          capAmpMilli: 0,
          capAttackSpeedMilli: 0,
          capCcImmunity: false,
        },
        'attack_or_damage_taken',
      );
      break;
    case 'RunaansHurricane':
      stack('attack', 'ADOnAttack', 1000, 'attack_release', p('MaxStacks'), {
        capAttackSpeedMilli: p('ASCapstone', 1000),
      });
      break;
    case 'Bloodthirster':
      add(
        { kind: 'omnivamp', ratioMilli: p('StatOmnivamp', 1000), alsoHealLowestHpAlly: false },
        'damage_dealt',
      );
      shield('ShieldHealthPercent', 'HealthThreshold');
      break;
    case 'ArchangelsStaff':
      add({ kind: 'ability_power', amount: p('APPerInterval') }, 'periodic', {
        intervalTicks: p('IntervalSeconds', 10),
        stacking: 'add',
      });
      break;
    case 'SpearOfShojin':
      add({ kind: 'attack_mana', amount: p('FlatManaRestore') }, 'attack_release');
      break;
    case 'SpectralGauntlet':
      shred('armor', 'ARReductionAmount', 'aura', undefined, 'HexRange');
      add(
        { kind: 'resists', armor: p('BonusResists'), magicResist: p('BonusResists') },
        'combat_start',
        { durationTicks: p('BonusResistDuration', 10) },
      );
      break;
    case 'Leviathan':
      add(
        {
          kind: 'attack_mana_critical',
          amount: p('BaseManaOnHit'),
          criticalAmount: p('ManaOnCrit'),
        },
        'attack_release',
      );
      break;
    case 'Morellonomicon':
      burn('BurnDuration', 'GrievousWoundsPercent');
      break;
    case 'Crownguard':
      shield('ShieldSize');
      add({ kind: 'ability_power', amount: p('ShieldBonusAP') }, 'shield_expire', {
        condition: { oncePerCombat: true },
      });
      break;
    case 'AdaptiveHelm':
      add({ kind: 'mana_multiplier', ratioMilli: p('ManaPercIncrease', 1000) });
      add({
        kind: 'role_bonuses',
        frontlineArmor: p('FrontlineResists'),
        frontlineMagicResist: p('FrontlineResists'),
        otherAdMilli: p('BacklineADAP', 10),
        otherAp: p('BacklineADAP'),
      });
      break;
    case 'BlueBuff':
      add({ kind: 'power_multiplier', ratioMilli: p('ModifiedADAP', 1000) });
      break;
    case 'LastWhisper':
      shred('armor', 'ArmorReductionPercent', 'attack_or_ability_damage', 'ArmorBreakDuration');
      break;
    case 'NightHarvester':
      add({
        kind: 'damage_reduction',
        ratioMilli: p('BaseDurability', 1000),
        damageClass: 'all',
        healthAboveMilli: p('ThresholdForEmpower', 1000),
        aboveThresholdRatioMilli: p('EmpoweredDurability', 1000),
      });
      break;
    case 'Quicksilver':
      add({ kind: 'crowd_control_immunity' }, 'combat_start', {
        durationTicks: p('SpellShieldDuration', 10),
      });
      stack('attackSpeedMilli', 'ProcAttackSpeed', 1000, 'periodic', 10000);
      break;
    case 'StatikkShiv':
      shred('magicResist', 'MRShred', 'attack_or_ability_damage', 'MRShredDuration');
      break;
    case 'HextechGunblade':
      add(
        { kind: 'omnivamp', ratioMilli: p('StatOmnivamp', 1000), alsoHealLowestHpAlly: false },
        'damage_dealt',
      );
      add({ kind: 'ally_heal', ratioMilli: p('AllyHealing', 1000) }, 'damage_dealt');
      break;
    case 'WarmogsArmor':
    case 'BFSword':
    case 'RecurveBow':
    case 'NeedlesslyLargeRod':
    case 'TearOfTheGoddess':
    case 'ChainVest':
    case 'NegatronCloak':
    case 'GiantsBelt':
    case 'SparringGloves':
      break;
    default:
      throw Error(`Unmapped TFT185 item ${name}`);
  }
  return {
    ...old,
    bonuses,
    availability: TFT185_PENDING[record.recordId] ? 'planned' : 'available',
    content: {
      ...old.content!,
      visibleName: presentation[record.recordId as keyof typeof presentation].name,
      ...(presentation[record.recordId as keyof typeof presentation].description
        ? {
            visibleDescription: String(
              presentation[record.recordId as keyof typeof presentation].description,
            ),
          }
        : {}),
      accessibleLabel: record.nameEs,
      competitive: !TFT185_PENDING[record.recordId],
      combat: TFT185_PENDING[record.recordId] ? 'pending' : 'compatible',
      usedParameters: [...used].sort(),
      uninterpretedParameters: Object.keys(record.parameters)
        .filter((k) => !used.has(k))
        .sort(),
    },
    ...(old.kind === 'completed' ? { effects, stacking: record.unique ? 'unique' : 'stack' } : {}),
  } as ItemDefinition;
});
export const TFT185_ITEM_CATALOG = validateItemCatalog({
  ...EXECUTABLE_ITEM_CATALOG,
  version: TFT185_ITEM_VERSION,
  definitions,
});

export const TFT185_EXECUTION_POLICY = {
  version: 'f0p11b-18.5-1',
  tickMs: 100,
  originalRoles: { dolea: 'tank', vargas: 'assassin', jaramillo: 'caster', florin: 'fighter' },
  provisionalRoles: {
    vanguard: 'tank',
    striker: 'fighter',
    ranger: 'marksman',
    support: 'caster',
    assassin: 'assassin',
  },
  manaRegen: 'integer-carry-per-tick',
  healthPercent: 'sum-percent-on-base-plus-flat',
  burnSelection: 'uniform-unburned-first-domain-separated-rng',
  personalNoCrit: 'preserved-and-disclosed',
  castManaBasis: 'actual-root-cost-zero-for-free-additional',
  pendingSources: Object.keys(TFT185_PENDING).sort(),
} as const;
