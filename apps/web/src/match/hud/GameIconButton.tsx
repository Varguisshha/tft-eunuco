import { GameFrame } from './GameFrame';
import { GameIcon, type GameIconName } from './GameIcon';
export function GameIconButton({
  label,
  icon,
  onAction,
  disabled = false,
}: {
  label: string;
  icon: GameIconName;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="game-icon-button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onAction}
    >
      <GameFrame />
      <GameIcon name={icon} />
    </button>
  );
}
