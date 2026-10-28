import { EXECUTABLE_ITEM_VERSION, type PlannedItemEffect } from '@tft/shared';
import { STANDARD_ITEM_CATALOG } from './items-standard';
import { validateItemCatalog } from './items';
/** EUNUCO decisions; changing these requires a new execution catalog version. */
export const ITEM_EXECUTION_POLICY = Object.freeze({
  minimumActiveMana: 10,
  randomPowerWeight: 50,
  randomWeightTotal: 100,
  includeFinalInterval: false,
  shieldBreakGrantsAp: true,
  maximumDerivedPerTick: 512,
} as const);
/** Explicit validation manifest: future reference additions remain blocked. */
export const VALIDATED_ITEM_SOURCES: readonly string[] = [
  'TFT_Item_RabadonsDeathcap',
  'TFT_Item_InfinityEdge',
  'TFT_Item_FrozenHeart',
  'TFT_Item_Redemption',
  'TFT_Item_ThiefsGloves',
  'TFT_Item_GuinsoosRageblade',
  'TFT_Item_IonicSpark',
  'TFT_Item_SteraksGage',
  'TFT_Item_DragonsClaw',
  'TFT_Item_PowerGauntlet',
  'TFT_Item_GargoyleStoneplate',
  'TFT_Item_BrambleVest',
  'TFT_Item_MadredsBloodrazor',
  'TFT_Item_RedBuff',
  'TFT_Item_UnstableConcoction',
  'TFT_Item_GuardianAngel',
  'TFT_Item_TitansResolve',
  'TFT_Item_RunaansHurricane',
  'TFT_Item_Bloodthirster',
  'TFT_Item_ArchangelsStaff',
  'TFT_Item_SpearOfShojin',
  'TFT_Item_SpectralGauntlet',
  'TFT_Item_Leviathan',
  'TFT_Item_Morellonomicon',
  'TFT_Item_RapidFireCannon',
  'TFT_Item_Crownguard',
  'TFT_Item_AdaptiveHelm',
  'TFT_Item_BlueBuff',
  'TFT_Item_LastWhisper',
  'TFT_Item_JeweledGauntlet',
  'TFT_Item_NightHarvester',
  'TFT_Item_Quicksilver',
  'TFT_Item_Deathblade',
  'TFT_Item_WarmogsArmor',
  'TFT_Item_StatikkShiv',
  'TFT_Item_HextechGunblade',
];
export const EXECUTABLE_ITEM_CATALOG = validateItemCatalog({
  ...STANDARD_ITEM_CATALOG,
  version: EXECUTABLE_ITEM_VERSION,
  definitions: STANDARD_ITEM_CATALOG.definitions.map((d) => ({
    ...d,
    availability:
      d.kind === 'component' || VALIDATED_ITEM_SOURCES.includes(d.content!.sourceRecordId)
        ? 'available'
        : 'planned',
    content: {
      ...d.content!,
      competitive:
        d.kind === 'component' || VALIDATED_ITEM_SOURCES.includes(d.content!.sourceRecordId),
      laboratory: true,
      combat: 'compatible',
    },
    ...(d.kind === 'completed'
      ? {
          effects: d.effects.map((e) => {
            if (e.implementation === 'reserved')
              throw Error('Legacy operation has no P8C executor');
            return {
              ...e,
              operation: {
                ...e.operation,
                ...('pool' in e.operation ? { pool: 'available-completed-excluding-random' } : {}),
                ...('weights' in e.operation ? { weights: 'eunuco-even' } : {}),
                ...('minimumMana' in e.operation
                  ? { minimumMana: ITEM_EXECUTION_POLICY.minimumActiveMana }
                  : {}),
                ...('sourceProcs' in e.operation
                  ? { sourceProcs: 'physical-shred-and-omnivamp' }
                  : {}),
              },
              capability: 'direct',
              implementation: 'executable-v1',
              note: 'Ejecutado con las decisiones versionadas EUNUCO P8C.',
            } as PlannedItemEffect;
          }),
        }
      : {}),
  })),
});
