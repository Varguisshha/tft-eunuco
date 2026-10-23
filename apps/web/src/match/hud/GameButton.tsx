import { useState } from 'react';
import { GameFrame } from './GameFrame';
import { GameIcon, type GameIconName } from './GameIcon';
export type HudCue = 'hover' | 'press' | 'success';
export function GameButton({
  label,
  icon,
  cost,
  disabled,
  active,
  onAction,
  onCue,
  tone = 'jade',
  title,
}: {
  label: string;
  icon: GameIconName;
  cost?: number;
  disabled: boolean;
  active?: boolean;
  onAction: () => boolean;
  onCue?: (cue: HudCue) => void;
  tone?: 'jade' | 'gold';
  title?: string;
}) {
  const [receipt, setReceipt] = useState(0);
  return (
    <button
      type="button"
      className={`game-button tone-${tone}`}
      disabled={disabled}
      aria-pressed={active}
      aria-label={`${label}${cost === undefined ? '' : ` · ${cost} oro`}`}
      title={title}
      onPointerEnter={() => {
        if (!disabled) onCue?.('hover');
      }}
      onPointerDown={() => {
        if (!disabled) onCue?.('press');
      }}
      onClick={() => {
        if (onAction()) {
          setReceipt((n) => n + 1);
          onCue?.('success');
        }
      }}
    >
      <GameFrame />
      <GameIcon name={icon} />
      <span className="game-button-label">{label}</span>
      {cost !== undefined && (
        <span className="game-button-cost">
          <GameIcon name="gold" />
          {cost}
        </span>
      )}
      {receipt > 0 && <span key={receipt} className="action-receipt" aria-hidden="true" />}
    </button>
  );
}
