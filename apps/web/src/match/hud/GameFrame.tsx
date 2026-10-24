/** Authored stepped corners and inset rails, stretched only as interface geometry. */
export function GameFrame({ card = false }: { card?: boolean }) {
  return (
    <svg
      className={`game-frame ${card ? 'card-frame' : ''}`}
      viewBox="0 0 200 160"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        className="frame-outer"
        d="M9 1H191L199 9V151L191 159H9L1 151V9Z"
      />
      <path className="frame-inset" d="M13 6H187L194 13V147L187 154H13L6 147V13Z" />
      <path className="frame-light" d="M18 3H182 M3 18V42 M197 118V142 M18 157H182" />
      {card && (
        <path
          className="frame-corners"
          d="M2 24H8V8H24 M176 8H192V24 M8 136V152H24 M176 152H192V136"
        />
      )}
    </svg>
  );
}
