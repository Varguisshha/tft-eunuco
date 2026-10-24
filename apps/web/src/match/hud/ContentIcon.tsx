/** Presentation-only registry: contracts contain stable IDs, never asset paths. */
export const CONTENT_ICONS: Readonly<Record<string, string>> = {
  upm: '/assets/icons/upm.svg',
  'el-depredador': '/assets/icons/el-depredador.svg',
  'copita-perhaps': '/assets/icons/copita-perhaps.svg',
  hortaleza: '/assets/icons/hortaleza.svg',
  'llama-de-padel': '/assets/icons/llama-de-padel.svg',
  'volumen-sucio': '/assets/icons/volumen-sucio.svg',
};
// Approved Festival Pop glyphs; stable content IDs and original fallback assets stay intact.
const FESTIVAL_GLYPHS: Readonly<Record<string, string>> = {
  upm: 'M3 12L16 3L29 12Z M6 14V25 M12 14V25 M20 14V25 M26 14V25 M2 29H30',
  'el-depredador': 'M3 5L10 8L16 3L22 8L29 5L26 23L16 30L6 23Z M8 14L13 17 M24 14L19 17 M12 24H20',
  hortaleza: 'M4 29V13H10V5H20V13H28V29Z M13 29V20H19V29 M14 10H16',
  'llama-de-padel':
    'M17 3C30 3 30 20 18 23L13 29L8 24L14 18C5 10 8 3 17 3Z M16 7H20 M13 11H22 M16 15H20',
  'copita-perhaps': 'M12 2H20V8L24 13V29H8V13L12 8Z M10 17H22 M14 5H18',
  'volumen-sucio': 'M12 2H20V8L24 13V29H8V13L12 8Z M10 17H22 M14 5H18',
  'test-alloy': 'M5 4H27V17L16 29L5 17Z',
  'test-pulse': 'M16 2L27 18L23 28H9L5 18Z M16 8V21',
};
export function ContentIcon({ id, active = false }: { id: string; active?: boolean }) {
  const drawing = FESTIVAL_GLYPHS[id];
  if (drawing)
    return (
      <svg
        className={`content-icon ${active ? 'is-active' : ''}`}
        data-original-icon={CONTENT_ICONS[id]}
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinejoin="bevel"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d={drawing} />
      </svg>
    );
  return (
    <img
      className={`content-icon ${active ? 'is-active' : ''}`}
      src={CONTENT_ICONS[id] ?? '/assets/icons/trait-unknown.svg'}
      alt=""
      aria-hidden="true"
      width={32}
      height={32}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = '/assets/icons/trait-unknown.svg';
      }}
    />
  );
}
