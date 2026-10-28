import { it, expect } from 'vitest';
import { characterPresentation, P11_ROSTER, P11_COMBAT_PROFILES, MANO_DE_OBRA } from './index';
it.each([
  ['dolea', 'tank', 'physical'],
  ['vargas', 'assassin', 'physical'],
  ['jaramillo', 'marksman', 'physical'],
  ['florin', 'fighter', 'mixed'],
] as const)('%s labels match authored ability damage and specialization', (id, role, type) => {
  const p = characterPresentation(id),
    profile = P11_COMBAT_PROFILES[id]!;
  expect(p.combatRole).toBe(role);
  expect(p.primaryDamageType).toBe(type);
  const damage = profile.championAbility!.active!.effects.filter((e) => e.kind === 'damage');
  expect(damage.length).toBeGreaterThan(0);
  expect(damage.every((e) => e.kind === 'damage' && e.damageType === 'physical')).toBe(true);
  if (id === 'vargas' || id === 'jaramillo' || id === 'florin')
    expect(damage.every((e) => e.kind === 'damage' && e.powerScaling?.adRatioMilli)).toBe(true);
  if (id === 'florin') {
    expect(
      MANO_DE_OBRA.progress!.rules.flatMap((r) => r.effects).some(
        (e) => e.kind === 'recovery' && e.stage === 2 && e.basicDamageTypeOnReturn === 'true',
      ),
    ).toBe(true);
    expect(p.damageTypes).toEqual(['physical', 'true']);
    expect(p.note).toContain('segunda vuelta');
  }
  if (id === 'jaramillo') expect(p.specialization).toBe('support');
});
it('keeps all30 provisional identities without a fabricated role or primary damage and does not mutate combat profiles', () => {
  const before = JSON.stringify(P11_COMBAT_PROFILES),
    provisional = P11_ROSTER.filter((d) => d.provisional);
  expect(provisional).toHaveLength(30);
  for (const d of provisional)
    expect(characterPresentation(d.id)).toMatchObject({
      combatRole: null,
      primaryDamageType: null,
      damageTypes: [],
      roleLabel: 'Especialización pendiente',
    });
  expect(JSON.stringify(P11_COMBAT_PROFILES)).toBe(before);
});
