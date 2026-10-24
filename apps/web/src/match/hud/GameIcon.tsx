export type GameIconName =
  | 'heart'
  | 'close'
  | 'minus'
  | 'plus'
  | 'play'
  | 'journal'
  | 'gold'
  | 'xp'
  | 'refresh'
  | 'lock'
  | 'unlock'
  | 'alloy'
  | 'pulse'
  | 'neutral'
  | 'check'
  | 'shield'
  | 'stats'
  | 'star';
/** Original 32-unit Festival Pop glyphs; economic paths are identical to the approved C renderer. */
export function GameIcon({ name }: { name: GameIconName }) {
  const paths: Record<GameIconName, string> = {
    heart: 'M16 28L4 17C-3 7 9 0 16 9C23 0 35 7 28 17Z',
    close: 'M7 7L25 25 M25 7L7 25',
    minus: 'M5 16H27',
    plus: 'M16 5V27 M5 16H27',
    play: 'M9 4L27 16L9 28Z',
    journal: 'M4 5H13L16 8L19 5H28V27H19L16 30L13 27H4Z M16 8V29',
    gold: 'M10 2H22L30 10V22L22 30H10L2 22V10Z M16 6L24 16L16 26L8 16Z M12 2V6H20V2',
    xp: 'M3 22L16 9L29 22 M3 30L16 17L29 30 M12 3H20',
    refresh: 'M28 16A12 12 0 1 0 24 26 M23 2L30 9L23 16 M30 9H18',
    lock: 'M9 14V8L14 3H19L24 8V14 M3 14H29V25L24 30H8L3 25Z M16 20V25',
    unlock: 'M9 14V8L14 3H19L24 8 M3 14H29V25L24 30H8L3 25Z M16 20V25',
    alloy: 'M5 4H27V17L16 29L5 17Z',
    pulse: 'M16 2L27 18L23 28H9L5 18Z M16 8V21',
    neutral: 'M6 6H26V26H6Z M12 12H20V20H12Z',
    check: 'M5 17L12 24L28 7',
    shield: 'M5 4H27V17L16 29L5 17Z',
    stats: 'M4 28V20H9V28 M14 28V12H19V28 M24 28V4H29V28',
    star: 'M16 2L20 10L30 12L23 19L24 30L16 25L8 30L9 19L2 12L12 10Z',
  };
  return (
    <svg
      className={`game-icon icon-${name}`}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinejoin="bevel"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
