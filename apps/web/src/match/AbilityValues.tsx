import { Fragment, useMemo, type ReactNode } from 'react';
import { scaledProfile } from '@tft/game-core';
import type { CombatEffect, CombatProfile, EconomyConfig } from '@tft/shared';
import { abilityValues, passiveValueEffects } from './abilityPowerValues';
import './abilityValues.css';
const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const at = (n: number | readonly number[], star: number): number =>
  typeof n === 'number' ? n : n[star]!;
type Stat = 'ad' | 'ap' | 'hp' | 'fixed';
function ScalingIcon({ stat }: { stat: Stat }) {
  const paths = {
    ad: 'm4 20 5-8L19 3l2 2-9 10Zm3-9 6 6',
    ap: 'm12 2 7 8-7 6-7-6Zm0 14v6m-4 0h8',
    hp: 'M12 21 3 12C-2 4 7 0 12 7 17 0 26 4 21 12Z',
    fixed: 'm12 3 9 9-9 9-9-9Z',
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ability-scaling-icon">
      <path d={paths[stat]} fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function statsFor(effect: CombatEffect): Stat[] {
  if ('powerScaling' in effect && effect.powerScaling)
    return [
      ...((
        typeof effect.powerScaling.adRatioMilli === 'number'
          ? effect.powerScaling.adRatioMilli
          : effect.powerScaling.adRatioMilli.some(Boolean)
      )
        ? ['ad' as const]
        : []),
      ...((
        typeof effect.powerScaling.apRatioMilli === 'number'
          ? effect.powerScaling.apRatioMilli
          : effect.powerScaling.apRatioMilli.some(Boolean)
      )
        ? ['ap' as const]
        : []),
    ];
  return [
    'scaling' in effect && effect.scaling
      ? effect.scaling.stat === 'maxHp'
        ? 'hp'
        : 'ad'
      : 'fixed',
  ];
}
function InlineValue({ profile, effect }: { profile: CombatProfile; effect: CombatEffect }) {
  const row = abilityValues(profile, [effect])[0];
  if (!row) return null;
  return (
    <span
      role="img"
      className="ability-inline-value"
      data-kind={effect.kind === 'damage' ? effect.damageType : effect.kind}
      aria-label={`${row.value === null ? '' : fmt(row.value) + ' · '}${row.label} (${row.formula})`}
    >
      <strong>{row.value === null ? row.formula : fmt(row.value)}</strong>
      {statsFor(effect).map((stat) => (
        <ScalingIcon key={stat} stat={stat} />
      ))}
    </span>
  );
}
function replaceText(text: string, replacements: [RegExp, ReactNode][]) {
  let parts: ReactNode[] = [text];
  for (const [pattern, node] of replacements)
    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return [part];
      const match = pattern.exec(part);
      if (!match) return [part];
      return [part.slice(0, match.index), node, part.slice(match.index + match[0].length)];
    });
  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>);
}
function effectsFor(profile: CombatProfile, passive: boolean) {
  return passive
    ? passiveValueEffects(profile)
    : (profile.championAbility?.active?.effects ?? profile.ability?.effects ?? []);
}
function AbilityProse({
  profile,
  passive,
  description,
  effects,
}: {
  profile: CombatProfile;
  passive: boolean;
  description: string;
  effects: CombatEffect[];
}) {
  const star = (profile.starLevel ?? 1) - 1,
    id = profile.championAbility?.id;
  const numeric = effects.filter(
    (e) => e.kind === 'damage' || e.kind === 'heal' || e.kind === 'shield',
  );
  const token = (index: number) => <InlineValue profile={profile} effect={numeric[index]!} />;
  const replacements: [RegExp, ReactNode][] = [];
  if (passive) {
    if (id === 'volumen-sucio')
      replacements.push([/equivalente al 12 % de su vida máxima/, <>de {token(0)}</>]);
    if (id === 'copita-perhaps') replacements.push([/5 % de vida máxima/, <>{token(0)} de vida</>]);
    if (id === 'pisoton-carmesi') {
      const cycle = profile.championAbility!.passive!.attackCycle!;
      replacements.push(
        [/5 \/ 4 \/ 3/, String(cycle.afterAttacks[star])],
        [/50 \/ 60 \/ 75 % de AD/, <>{token(0)} de daño al básico</>],
      );
    }
    if (id === 'cortina-de-humo')
      replacements.push([
        /\+3 % AD/,
        <span role="img" className="ability-inline-value" aria-label="3 por ciento de AD base">
          +3 %<ScalingIcon stat="ad" />
        </span>,
      ]);
  } else {
    if (id === 'copita-perhaps') {
      description = description.replace(/^Maná 0\/70\. /, '');
      replacements.push([/280 \/ 420 \/ 700 % AD \(1★ \/ 2★ \/ 3★\)/, token(0)]);
      const hit = numeric[0];
      if (hit?.kind === 'damage' && hit.healFromDamageMilli !== undefined)
        description = description.replace(
          '15 / 20 / 30 %',
          fmt(at(hit.healFromDamageMilli, star) / 10) + ' %',
        );
      const speed = effects.find((e) => e.kind === 'modifier');
      if (speed?.kind === 'modifier')
        description = description
          .replace('25 / 35 / 50 %', fmt((speed.amountByStars?.[star] ?? speed.amount) / 10) + ' %')
          .replace(
            '3 / 4 / 5 s',
            fmt((speed.durationByStars?.[star] ?? speed.duration ?? 0) / 10) + ' s',
          );
    }
    if (id === 'cortina-de-humo') {
      replacements.push([/160 \/ 240 \/ 400 % AD/, token(0)]);
      const reduction = effects.find((e) => e.kind === 'armor_reduction');
      if (reduction?.kind === 'armor_reduction')
        description = description.replace(
          '15 / 20 / 30 %',
          fmt((reduction.amountByStars?.[star] ?? reduction.amount) / 10) + ' %',
        );
    }
    if (id === 'volumen-sucio') {
      description = description.replace(/^Con 70 de maná, /, '');
      description = description.charAt(0).toUpperCase() + description.slice(1);
      replacements.push([
        /100 \/ 180 \/ 324 de daño físico \(1★ \/ 2★ \/ 3★\)/,
        <>{token(0)} de daño físico</>,
      ]);
    }
    if (id === 'pisoton-carmesi') {
      replacements.push([/180 \/ 260 \/ 400 % AD/, <>{token(0)} de daño físico</>]);
      const secondary = numeric[1];
      if (secondary?.kind === 'damage')
        replacements.push([
          /Los secundarios en radio 1 \/ 2 \/ 3 reciben 50 \/ 60 \/ 75 % del daño principal\./,
          <>
            Los secundarios en radio {secondary.radiusByStars?.[star] ?? secondary.radius} reciben{' '}
            {token(1)} de daño físico.
          </>,
        ]);
      const stun = effects.find((e) => e.kind === 'stun');
      if (stun?.kind === 'stun')
        description = description.replace(
          '1 / 1,5 / 2 s',
          fmt((stun.durationByStars?.[star] ?? stun.duration) / 10) + ' s',
        );
    }
  }
  return <p className="ability-prose">{replaceText(description, replacements)}</p>;
}
export function AbilityValues({
  profile,
  passive = false,
  description,
  definitionId,
  config,
}: {
  profile: CombatProfile;
  passive?: boolean;
  description?: string;
  definitionId?: string;
  config?: EconomyConfig;
}) {
  const originals = useMemo(
    () =>
      config && definitionId
        ? ([1, 2, 3] as const).map((star) => scaledProfile(definitionId, star, config))
        : null,
    [definitionId, config],
  );
  const effects = effectsFor(profile, passive),
    numeric = effects.filter(
      (e) => e.kind === 'damage' || e.kind === 'heal' || e.kind === 'shield',
    );
  const authored =
    description ??
    (passive
      ? profile.championAbility?.passive?.description
      : profile.championAbility?.active?.description) ??
    '';
  const star = (profile.starLevel ?? 1) - 1;
  return (
    <div
      className="ability-values"
      aria-label={
        passive ? 'Descripción y escalado de la pasiva' : 'Descripción y escalado de la habilidad'
      }
    >
      <AbilityProse profile={profile} passive={passive} description={authored} effects={effects} />
      {(numeric.length > 0 || (passive && profile.championAbility?.passive?.matchProgress)) && (
        <div className="ability-breakdown" aria-label="Escalado por estrellas">
          <p className="ability-breakdown-heading">Escalado · 1 / 2 / 3 estrellas</p>
          <dl>
            {numeric.map((effect, i) => {
              const row = abilityValues(profile, [effect])[0]!;
              const formulas = ([0, 1, 2] as const).map((level) => {
                const original = originals?.[level];
                const reference = original
                  ? (effectsFor(original, passive).filter(
                      (e) => e.kind === 'damage' || e.kind === 'heal' || e.kind === 'shield',
                    )[i] ?? effect)
                  : effect;
                return abilityValues({ ...profile, starLevel: (level + 1) as 1 | 2 | 3 }, [
                  reference,
                ])[0]!.formula;
              });
              return (
                <div className="ability-breakdown-row" key={i}>
                  <dt>
                    {passive && profile.championAbility?.passive?.attackCycle
                      ? 'Daño adicional'
                      : row.label}
                  </dt>
                  <dd>
                    {formulas.every((f) => f === formulas[0]) ? (
                      <span>{formulas[0]}</span>
                    ) : (
                      formulas.map((formula, level) => (
                        <Fragment key={level}>
                          {level > 0 && <span aria-hidden="true"> / </span>}
                          <span
                            className={level === star ? 'is-current-star' : ''}
                            aria-label={`${level + 1} estrellas: ${formula}${level === star ? ', nivel actual' : ''}`}
                          >
                            {formula}
                          </span>
                        </Fragment>
                      ))
                    )}
                    {statsFor(effect).map((stat) => (
                      <ScalingIcon key={stat} stat={stat} />
                    ))}
                  </dd>
                </div>
              );
            })}
            {passive && profile.championAbility?.passive?.matchProgress && (
              <div className="ability-breakdown-row">
                <dt>AD base por Kilómetro</dt>
                <dd>
                  {fmt(profile.championAbility.passive.matchProgress.adPercentMilli / 10)} %
                  <ScalingIcon stat="ad" />
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
      {!passive && numeric.some((e) => e.kind === 'damage') && (
        <small className="ability-amount-note">
          Valores con estadísticas actuales, antes de resistencias, críticos y otros
          multiplicadores.
        </small>
      )}
    </div>
  );
}
