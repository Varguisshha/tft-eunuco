/** Presentation-only registry: contracts contain stable IDs, never asset paths. */
export const CONTENT_ICONS: Readonly<Record<string, string>> = {
  upm: '/assets/icons/upm.svg',
  'el-depredador': '/assets/icons/el-depredador.svg',
  'copita-perhaps': '/assets/icons/copita-perhaps.svg',
  hortaleza: '/assets/icons/hortaleza.svg',
  fumon: '/assets/icons/fumon.svg',
  'llama-de-padel': '/assets/icons/llama-de-padel.svg',
  'volumen-sucio': '/assets/icons/volumen-sucio.svg',
};
// Approved Festival Pop glyphs; stable content IDs and original fallback assets stay intact.
const FESTIVAL_GLYPHS: Readonly<Record<string, string>> = {
  gym: 'M2 12V20 M6 8V24 M10 16H22 M22 8V24 M26 12V20',
  pardillo: 'M5 27L16 4L27 27Z M16 13V20 M16 24V25',
  rata: 'M5 19L10 10L23 13L28 23H10Z M10 10V5L16 8 M23 17H24 M10 24C1 30 0 18 6 18',
  fantasy: 'M16 2L20 11L30 13L23 20L24 30L16 25L7 30L9 20L2 13L12 11Z',
  pancho: 'M3 23L7 13L16 7L25 13L29 23Z M7 23H25 M10 15L16 12L22 15',
  valo: 'M3 5L15 19L29 5L23 26H10Z',
  blackhaus: 'M4 15L16 4L28 15V28H4Z M10 28V17H22V28',
  shisheros: 'M6 27H26 M13 26L15 15H21L23 26 M18 15V5H23 M8 7C2 13 12 14 7 20',
  mus: 'M3 5H21V26H3Z M10 9H29V30H10Z M15 15L20 12L25 18L20 24L15 18Z',
  psoe: 'M6 28V16L12 12V5H22V12L27 16V24L20 28Z M12 17H23 M12 21H23',
  lenceria: 'M7 3L11 13L16 16L21 13L25 3 M4 15L10 12L16 16L22 12L28 15L24 27H8Z',
  jew: 'M16 3L27 23H5Z M5 9H27L16 29Z',
  'todo-al-rojo': 'M16 2L28 16L16 30L4 16Z M16 8V24 M10 16H22',
  ruman_trinity: 'M4 28L9 5L16 15L23 5L28 28Z M9 22H23',
  perdidos_por_el_mundo:
    'M16 2A14 14 0 1 0 16 30A14 14 0 1 0 16 2 M2 16H30 M16 2C6 12 6 20 16 30C26 20 26 12 16 2',
  mano_de_obra: 'M4 28L16 14 M11 6L17 2L30 15L26 20Z M3 25L7 29',
  'pisoton-carmesi': 'M8 3H19V16L28 20V28H4V20L8 16Z M5 23H27',
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
