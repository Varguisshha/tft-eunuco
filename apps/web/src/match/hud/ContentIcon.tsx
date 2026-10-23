/** Presentation-only registry: contracts contain stable IDs, never asset paths. */
export const CONTENT_ICONS: Readonly<Record<string, string>> = {
  upm: '/assets/icons/upm.svg',
  'el-depredador': '/assets/icons/el-depredador.svg',
  'copita-perhaps': '/assets/icons/copita-perhaps.svg',
  hortaleza: '/assets/icons/hortaleza.svg',
  'llama-de-padel': '/assets/icons/llama-de-padel.svg',
  'volumen-sucio': '/assets/icons/volumen-sucio.svg',
};
export function ContentIcon({ id, active = false }: { id: string; active?: boolean }) {
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
