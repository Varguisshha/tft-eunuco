import {
  CombatProfileSchema,
  UnitDefinitionSchema,
  type UnitDefinition,
  type CombatProfile,
  type ChampionAbility,
  type PassiveRule,
  type CombatEffect,
} from '@tft/shared';
import { P11_ROSTER, P11_COMBAT_PROFILES } from '../p11-roster';
import { characterPresentation, type CharacterPresentation } from '../character-presentation';
import { traitsFor } from '../abilities';

export type DeepReadonly<T> = T extends readonly (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
export type ChampionCapability =
  | 'stack_rules'
  | 'projectile_delivery'
  | 'attack_cycle'
  | 'competitive_round_progress'
  | 'off_board_recovery';
export type ChampionReadiness =
  | { readonly kind: 'provisional' }
  | { readonly kind: 'implemented'; readonly validation: 'pending' }
  | {
      readonly kind: 'validated';
      readonly baseline: string;
      readonly evidence: readonly string[];
    };
export interface ChampionAuthoringDefinition {
  readonly authoringVersion: 1;
  readonly identity: DeepReadonly<UnitDefinition>;
  readonly baseProfile: DeepReadonly<CombatProfile>;
  readonly presentation: DeepReadonly<CharacterPresentation>;
  readonly ability: DeepReadonly<ChampionAbility> | null;
  readonly passive: DeepReadonly<NonNullable<ChampionAbility['passive']>> | null;
  readonly passiveRules: readonly DeepReadonly<PassiveRule>[];
  readonly activeEffects: readonly DeepReadonly<CombatEffect>[];
  readonly assets: { readonly spriteId: string; readonly splashArtKey: string | null };
  readonly capabilities: readonly ChampionCapability[];
  readonly readiness: ChampionReadiness;
}
// Explicit component association: the passive ID is not the mixed package ID.
const passiveComponents: Readonly<Record<string, string>> = { florin: 'suela-reforzada' };

/** Validate existing contracts and cross-references without changing or serializing them. */
export function validateChampionBindings(identity: UnitDefinition, profile: CombatProfile): void {
  UnitDefinitionSchema.parse(identity);
  CombatProfileSchema.parse(profile);
  if (JSON.stringify(identity.synergies) !== JSON.stringify(profile.traits))
    throw Error(`Champion affinity mismatch: ${identity.id}`);
  if (identity.provisional) {
    if (
      identity.activeAbilityId ||
      identity.passiveAbilityId ||
      profile.championAbility ||
      profile.ability ||
      profile.passive
    )
      throw Error(`Provisional champion has an ability: ${identity.id}`);
    return;
  }
  const ability = profile.championAbility;
  if (!ability) throw Error(`Missing implemented ability: ${identity.id}`);
  if (
    identity.activeAbilityId !== (ability.active ? ability.id : null) ||
    identity.passiveAbilityId !==
      (ability.passive ? (passiveComponents[identity.id] ?? ability.id) : null)
  )
    throw Error(`Champion component reference mismatch: ${identity.id}`);
  if (identity.spriteId !== identity.id)
    throw Error(`Implemented champion sprite reference mismatch: ${identity.id}`);
}

/** Derived current-catalog view. No independent profile/catalog or executable handler registry. */
export function championAuthoringDefinition(id: string): ChampionAuthoringDefinition {
  const identity = P11_ROSTER.find((u) => u.id === id);
  const baseProfile = P11_COMBAT_PROFILES[id];
  if (!identity || !baseProfile) throw Error(`Unknown current champion: ${id}`);
  validateChampionBindings(identity, baseProfile);
  const ability = baseProfile.championAbility ?? null;
  const capabilities: ChampionCapability[] = [];
  if (baseProfile.mechanics?.stacks.length) capabilities.push('stack_rules');
  if (ability?.active?.delivery === 'projectile') capabilities.push('projectile_delivery');
  if (ability?.passive?.attackCycle) capabilities.push('attack_cycle');
  if (ability?.passive?.matchProgress) capabilities.push('competitive_round_progress');
  if (
    traitsFor('f0p11h-1').some(
      (t) =>
        identity.synergies.includes(t.id) &&
        t.progress?.rules.some((r) => r.effects.some((e) => e.kind === 'recovery')),
    )
  )
    capabilities.push('off_board_recovery');
  return {
    authoringVersion: 1,
    identity,
    baseProfile,
    presentation: characterPresentation(id),
    ability,
    passive: ability?.passive ?? null,
    passiveRules: ability?.passive?.rules ?? [],
    activeEffects: ability?.active?.effects ?? [],
    assets: {
      spriteId: identity.spriteId,
      splashArtKey: identity.provisional ? null : `${id}:splash:1`,
    },
    capabilities,
    readiness: identity.provisional
      ? { kind: 'provisional' }
      : { kind: 'implemented', validation: 'pending' },
  };
}
export const championAuthoringCatalog = (): readonly ChampionAuthoringDefinition[] =>
  P11_ROSTER.map((u) => championAuthoringDefinition(u.id));

/** Review metadata only; never promoted implicitly or stored in CombatProfile/OwnedUnit. */
export function withChampionValidation(
  definition: ChampionAuthoringDefinition,
  baseline: string,
  evidence: readonly string[],
): ChampionAuthoringDefinition {
  if (
    definition.readiness.kind === 'provisional' ||
    !/^[a-f0-9]{40}$/.test(baseline) ||
    !evidence.length ||
    evidence.some((s) => !s.trim())
  )
    throw Error('Implemented champion and explicit equivalence evidence required');
  return { ...definition, readiness: { kind: 'validated', baseline, evidence: [...evidence] } };
}
