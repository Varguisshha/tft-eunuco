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
        d="M9 1H191V5H195V9H199V151H195V155H191V159H9V155H5V151H1V9H5V5H9Z"
      />
      <path className="frame-inset" d="M12 6H188V11H194V149H188V154H12V149H6V11H12Z" />
      <path className="frame-light" d="M15 3H185 M3 16V45 M197 115V144 M15 157H185" />
      {card && (
        <path
          className="frame-corners"
          d="M2 24H8V8H24 M176 8H192V24 M8 136V152H24 M176 152H192V136"
        />
      )}
    </svg>
  );
}
