/** Festival Pop C geometry. Panel-specific view boxes preserve the approved corner proportions. */
export function GameFrame({
  card = false,
  width = card ? 258 : 230,
  height = card ? 231 : 70,
  compact = false,
}: {
  card?: boolean;
  compact?: boolean;
  width?: number;
  height?: number;
}) {
  if (compact)
    return (
      <svg className="game-frame" viewBox="0 0 65 61" preserveAspectRatio="none" aria-hidden="true">
        <path className="frame-outer" d="M0 9L9 0H56L65 9V52L56 61H9L0 52Z" />
        <path className="frame-trim" d="M4 11L11 4H54L61 11V50L54 57H11L4 50Z" />
        <path className="frame-inset" d="M8 13L13 8H52L57 13V48L52 53H13L8 48Z" />
        <path className="frame-light" d="M14 11H49M11 15V43" />
      </svg>
    );
  const w = width,
    h = height;
  return (
    <svg
      className={`game-frame ${card ? 'card-frame' : ''}`}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        className="frame-outer"
        d={`M0 27L27 0H${w - 35}L${w - 12} 17H${w}V${h - 27}L${w - 27} ${h}H35L12 ${h - 17}H0Z`}
      />
      <path
        className="frame-trim"
        d={`M7 30L30 7H${w - 37}L${w - 15} 23H${w - 7}V${h - 30}L${w - 30} ${h - 7}H37L15 ${h - 23}H7Z`}
      />
      <path
        className="frame-inset"
        d={`M14 33L33 14H${w - 40}L${w - 19} 30H${w - 14}V${h - 33}L${w - 33} ${h - 14}H40L19 ${h - 30}H14Z`}
      />
      <path className="frame-light" d={`M33 21H${w - 48}M21 38V${h - 41}`} />
      <path className="frame-joints" d={`M${w - 42} ${h - 21}H${w - 28}V${h - 35}M28 21V35H14`} />
    </svg>
  );
}
