export type GameIconName =
  | 'gold'
  | 'xp'
  | 'refresh'
  | 'lock'
  | 'unlock'
  | 'alloy'
  | 'pulse'
  | 'neutral'
  | 'check';
/** Original 24-unit glyphs; one pixel-stepped grammar for economic and trait symbols. */
export function GameIcon({ name }: { name: GameIconName }) {
  const paths: Record<GameIconName, string> = {
    gold: 'M7 3h10v3h3v12h-3v3H7v-3H4V6h3z M9 7h6v10H9z M12 7v10',
    xp: 'M4 13v-5l8-6 8 6v5l-8-6z M4 22v-5l8-6 8 6v5l-8-6z',
    refresh: 'M19 9V5h-4 M19 5l-3-2H8L3 8v8l5 5h8l4-4 M2 10h5 M20 14h-5',
    lock: 'M7 10V5l3-3h4l3 3v5 M5 10h14v11H5z M12 14v4',
    unlock: 'M7 10V5l3-3h4l3 3 M5 10h14v11H5z M12 14v4',
    alloy: 'M7 3h10l4 7-9 11-9-11z M3 10h18 M7 3l5 7 5-7 M12 10v11',
    pulse: 'M2 12h5l3-8 4 16 3-8h5',
    neutral: 'M4 7h4V3h8v4h4v10h-4v4H8v-4H4z M9 9h6v6H9z',
    check: 'M4 12l5 5L20 6',
  };
  return (
    <svg
      className={`game-icon icon-${name}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
