import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  ROSTER_SOURCE,
  CHARACTER_REGISTRY,
  ROSTER_PLAYABLE,
  ROSTER_TRAITS,
  ROSTER_COMBAT_PROFILES,
  FLORIN_COMBAT_PROFILES,
  FLORIN_ROSTER,
  matchCatalog,
  traitsFor,
  ROSTER_THRESHOLDS,
  ROSTER_EFFECT_MIGRATIONS,
} from './index';
import {
  CharacterDraftSchema,
  UnitDefinitionSchema,
  CombatProfileSchema,
  TraitDefinitionSchema,
} from '@tft/shared';

describe('P10A exact Excel source and typed roster', () => {
  it('re-extracts every sheet/cell independently from the unchanged workbook with the standard library', () => {
    const bytes = readFileSync('TFPeru/Copia de TFPeru.xlsx');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      '101728c60d45312cd98776087ba17f3636e798ab2e0265ed0f65b26ece6791eb',
    );
    expect(() =>
      execFileSync('python3', ['scripts/roster/import_excel.py', '--check'], { stdio: 'pipe' }),
    ).not.toThrow();
    expect(ROSTER_SOURCE.source.sheets.map((s) => s.name)).toEqual(['Hoja1']);
    expect(ROSTER_SOURCE.issues).toEqual([]);
  });
  it('contains exactly 34 identities, 16 collectives, 4 unique attributes and all 544 assignments', () => {
    expect(CHARACTER_REGISTRY).toHaveLength(34);
    expect(new Set(CHARACTER_REGISTRY.map((c) => c.id)).size).toBe(34);
    expect(ROSTER_SOURCE.collectives).toHaveLength(16);
    expect(ROSTER_SOURCE.uniques.map((u) => [u.id, u.ownerId])).toEqual([
      ['jew', 'peibol'],
      ['el-depredador', 'vargas'],
      ['mano_de_obra', 'florin'],
      ['todo-al-rojo', 'danigm'],
    ]);
    expect(ROSTER_SOURCE.matrix.flatMap((r) => r.cells)).toHaveLength(544);
    expect(ROSTER_SOURCE.collectives.map((t) => t.members.length)).toEqual([
      13, 9, 3, 13, 10, 12, 6, 9, 9, 9, 11, 7, 9, 0, 7, 2,
    ]);
    for (const row of ROSTER_SOURCE.matrix)
      for (const cell of row.cells) {
        expect(['Si', 'No']).toContain(cell.raw);
        expect(cell.member).toBe(cell.raw === 'Si');
        expect(
          CHARACTER_REGISTRY.find((c) => c.id === cell.characterId)!.synergies.includes(
            row.traitId,
          ),
        ).toBe(cell.member);
        expect(
          ROSTER_SOURCE.collectives
            .find((t) => t.id === row.traitId)!
            .members.includes(cell.characterId),
        ).toBe(cell.member);
      }
  });
  it('uses stable Erik/Jaramillo equivalence without merging Alfredo with Alfredo Pocho', () => {
    expect(CHARACTER_REGISTRY.find((c) => c.sourceName === 'Erik')).toMatchObject({
      id: 'jaramillo',
      name: 'JARAMILLO',
    });
    expect(CHARACTER_REGISTRY.some((c) => c.id === 'erik')).toBe(false);
    expect(CHARACTER_REGISTRY.find((c) => c.id === 'alfredo')!.sourceName).toBe('Alfredo');
    expect(CHARACTER_REGISTRY.find((c) => c.id === 'alfredo-pocho')!.sourceName).toBe(
      'Alfredo Pocho',
    );
  });
  it.each([
    ['dolea', ['gym', 'ruman_trinity', 'upm', 'hortaleza', 'fantasy']],
    ['vargas', ['upm', 'pardillo', 'fantasy', 'pancho', 'valo', 'el-depredador']],
    ['florin', ['gym', 'ruman_trinity', 'perdidos_por_el_mundo', 'mano_de_obra']],
    ['jaramillo', ['fumon', 'upm', 'hortaleza', 'perdidos_por_el_mundo', 'pancho', 'valo', 'psoe']],
  ])('%s has exact affiliations and byte-identical existing stats and abilities', (id, ids) => {
    expect(ROSTER_PLAYABLE.find((d) => d.id === id)!.synergies).toEqual(ids);
    const { traits: _old, ...old } = FLORIN_COMBAT_PROFILES[id as string]!;
    const { traits: _new, ...current } = ROSTER_COMBAT_PROFILES[id as string]!;
    expect(_old).not.toEqual(_new);
    expect(current).toEqual(old);
    expect(ROSTER_PLAYABLE.find((d) => d.id === id)).toEqual({
      ...FLORIN_ROSTER.find((d) => d.id === id),
      synergies: ids,
    });
  });
  it('registers 30 strictly null drafts, rejects them as units, and never includes them in any modern shop/pool catalog', () => {
    const drafts = CHARACTER_REGISTRY.filter((c) => c.status === 'draft');
    expect(drafts).toHaveLength(30);
    for (const draft of drafts) {
      expect(CharacterDraftSchema.parse(draft)).toEqual(draft);
      for (const key of [
        'cost',
        'role',
        'range',
        'stats',
        'activeAbilityId',
        'passiveAbilityId',
        'spriteId',
        'splashArt',
      ] as const)
        expect(draft[key]).toBeNull();
      expect(UnitDefinitionSchema.safeParse(draft).success).toBe(false);
      expect(ROSTER_PLAYABLE.some((d) => d.id === draft.id)).toBe(false);
    }
    expect(matchCatalog({ catalog: 'f0p10a-1' }).map((d) => d.id)).toEqual([
      'dolea',
      'vargas',
      'florin',
      'jaramillo',
    ]);
    expect(CHARACTER_REGISTRY.find((c) => c.id === 'peibol')!.synergies).toHaveLength(8);
    for (const id of ['agus', 'ruben'])
      expect(CHARACTER_REGISTRY.find((c) => c.id === id)!.synergies).toHaveLength(7);
  });
  it('does not impose an affinity cap in serialization and still rejects duplicates', () => {
    const ids = Array.from({ length: 64 }, (_, i) => `trait-${i}`);
    expect(
      CombatProfileSchema.parse({ ...ROSTER_COMBAT_PROFILES.dolea, traits: ids }).traits,
    ).toEqual(ids);
    expect(
      CombatProfileSchema.safeParse({ ...ROSTER_COMBAT_PROFILES.dolea, traits: ['same', 'same'] })
        .success,
    ).toBe(false);
    expect(UnitDefinitionSchema.parse({ ...ROSTER_PLAYABLE[0], synergies: ids }).synergies).toEqual(
      ids,
    );
  });
  it('removes obsolete Llama only in the new catalog and retains historical data', () => {
    expect(ROSTER_TRAITS.some((t) => t.id === 'llama-de-padel')).toBe(false);
    expect(ROSTER_PLAYABLE.some((d) => d.synergies.includes('llama-de-padel'))).toBe(false);
    expect(traitsFor('florin-1').some((t) => t.id === 'llama-de-padel')).toBe(true);
    expect(
      matchCatalog({ catalog: 'florin-1' }).find((d) => d.id === 'dolea')!.synergies,
    ).toContain('llama-de-padel');
  });
  it('defines all proposed thresholds, reserves unreachable tiers and leaves pending rewards empty', () => {
    expect(ROSTER_TRAITS).toHaveLength(20);
    for (const trait of ROSTER_TRAITS) {
      expect(trait.thresholds.map((t) => t.count)).toEqual(
        trait.planning!.kind === 'unique' ? [1] : ROSTER_THRESHOLDS[trait.id],
      );
      for (const tier of trait.thresholds) {
        if (tier.count > 7 || tier.count > trait.planning!.members.length)
          expect(tier.availability).toBe('reserved');
        if (tier.effectState === 'pending_effects')
          expect([tier.bonuses, tier.effects]).toEqual([[], []]);
      }
      if (trait.planning!.effectState === 'pending_effects') expect(trait.progress).toBeUndefined();
    }
    const mus = ROSTER_TRAITS.find((t) => t.id === 'mus')!;
    expect(mus.planning).toMatchObject({ members: [], effectState: 'pending_effects' });
    expect(mus.thresholds.map((t) => t.count)).toEqual([2, 4]);
    expect(() =>
      TraitDefinitionSchema.parse({
        ...mus,
        thresholds: [
          { ...mus.thresholds[0], bonuses: [{ stat: 'attack', mode: 'flat', amount: 1 }] },
        ],
      }),
    ).toThrow();
  });
  it('migrates by explicit old count, preserving numbers and mechanics', () => {
    const legacy = traitsFor('florin-1');
    for (const [id, mapping] of Object.entries(ROSTER_EFFECT_MIGRATIONS)) {
      const current = ROSTER_TRAITS.find((t) => t.id === id)!,
        old = legacy.find((t) => t.id === id)!;
      for (const [to, from] of Object.entries(mapping)) {
        const reward = old.thresholds.find((t) => t.count === from)!,
          tier = current.thresholds.find((t) => t.count === Number(to))!;
        expect([tier.bonuses, tier.effects, tier.description]).toEqual([
          reward.bonuses,
          reward.effects,
          reward.description,
        ]);
        if (Number(to) !== from) expect(tier.migratedFrom).toBe(from);
      }
    }
    expect(
      ROSTER_TRAITS.find((t) => t.id === 'fumon')!.progress!.rules.map((r) => [
        r.memberThreshold,
        r.maximumMembers,
      ]),
    ).toEqual([
      [2, 3],
      [4, undefined],
    ]);
  });
});
