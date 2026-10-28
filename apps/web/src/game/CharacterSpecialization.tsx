import { characterPresentation } from '@tft/game-data';
import { ContextTooltip } from '../match/overlays/ContextTooltip';
import './characterSpecialization.css';
const rolePaths: Record<string, string> = {
  tank: 'M5 3h14v10l-7 8-7-8Z M8 7h8',
  fighter: 'm4 5 6 3-3 4-4-2Zm16 0-6 3 3 4 4-2ZM7 12l10 8M17 12 7 20',
  assassin: 'm5 20 4-8L19 3l2 2-9 10-8 5Zm2-9 6 6',
  marksman: 'M5 3q18 9 0 18L10 12ZM4 12h17m-4-4 4 4-4 4',
  mage: 'm12 2 7 8-7 6-7-6Zm0 14v6m-4 0h8',
  support: 'M4 14v4l8 4 8-6-2-3-6 4-5-4Zm8-11v8M8 7h8',
  pending: 'M5 12h14',
};
const damagePaths: Record<string, string> = {
  physical: 'm4 20 5-8L19 3l2 2-9 10Zm3-9 6 6',
  magic: 'M3 16q4-14 8-4t10-4M4 21q6-10 15-4',
  mixed: 'M3 20 12 5m-8 8 6 4m7-15 5 7-5 7-4-7Z',
  true: 'M12 3a9 9 0 1 0 9 9M12 3v9h9M4 20l16-16',
  pending: 'M5 12h14',
};
function SpecializationIcon({ kind, value }: { kind: 'role' | 'damage'; value: string | null }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d={(kind === 'role' ? rolePaths : damagePaths)[value ?? 'pending']}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
export function CharacterSpecialization({
  id,
  compact = false,
  tooltip = true,
}: {
  id: string;
  compact?: boolean;
  tooltip?: boolean;
}) {
  const p = characterPresentation(id);
  const badge = (
    <span
      role="group"
      tabIndex={tooltip ? 0 : undefined}
      className={`character-specialization ${compact ? 'is-compact' : ''}`}
      data-specialization={p.combatRole ? 'defined' : 'pending'}
      aria-label={`Rol de combate: ${p.roleLabel}. Daño principal: ${p.damageLabel}. ${p.note}`}
    >
      <span className="specialization-role">
        <SpecializationIcon kind="role" value={p.combatRole} />
        <span>{compact ? p.compactRoleLabel : p.roleLabel}</span>
      </span>
      <span className="specialization-damage">
        <SpecializationIcon kind="damage" value={p.primaryDamageType} />
        <span>{compact ? p.compactDamageLabel : p.damageLabel}</span>
      </span>
    </span>
  );
  if (!tooltip) return badge;
  return (
    <ContextTooltip
      label={`Especialización de ${id.toUpperCase()}`}
      content={
        <>
          <h3>Especialización</h3>
          <p>
            <strong>Rol de combate:</strong> {p.roleLabel}
          </p>
          <p>
            <strong>Daño principal:</strong> {p.damageLabel}
          </p>
          <p>{p.note}</p>
        </>
      }
    >
      {badge}
    </ContextTooltip>
  );
}
