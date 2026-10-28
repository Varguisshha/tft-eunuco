import assets from './itemIconAssets.json';
import referenceAssets from './tftOfficialItemIcons.json';
import { useItemIconSettings, type ItemIconTheme } from './itemIconTheme';
const officialAssets: Partial<typeof referenceAssets> =
  typeof __DEVTOOLS__ !== 'undefined' && __DEVTOOLS__ ? referenceAssets : {};
import { useState } from 'react';
import type { ItemDefinition } from '@tft/shared';
/** Original EUNUCO glyphs remain the final fallback; iconKey overrides never alter game rules. */
export const ITEM_GLYPHS: Record<string, { label: string; path: string; color: string }> = {
  ad: { label: 'Potencia', path: 'M9 22 22 7l3 1-1 4-12 13M7 18l8 8M8 25l-3 3', color: '#ffb755' },
  attack_speed: { label: 'Impulso', path: 'm17 4-9 13h7l-2 11 11-16h-8Z', color: '#c7ef60' },
  ap: { label: 'Ingenio', path: 'm16 4 9 12-9 12-9-12Zm0 0v24M7 16h18', color: '#d0a8ff' },
  mana: {
    label: 'Reserva',
    path: 'M16 4s-9 11-9 16a9 9 0 0 0 18 0c0-5-9-16-9-16ZM12 20l3 4',
    color: '#66c9ed',
  },
  armor: { label: 'Coraza', path: 'm16 4 10 4-2 13-8 7-8-7L6 8Zm0 5v13', color: '#c3cefc' },
  magic_resist: {
    label: 'Amparo',
    path: 'm6 11 10-7 10 7-4 15H10ZM10 11l6 5 6-5M16 16v10',
    color: '#74e1cd',
  },
  health: { label: 'Vitalidad', path: 'M12 5h8v7h7v8h-7v7h-8v-7H5v-8h7Z', color: '#70e0a3' },
  critical: {
    label: 'Precisión',
    path: 'm16 4 4 8 8 4-8 4-4 8-4-8-8-4 8-4ZM16 12v8M12 16h8',
    color: '#f56dc3',
  },
};
export const ITEM_ICON_OVERRIDES: Record<string, string> = {};
export function itemLabel(d: ItemDefinition) {
  if (d.content?.visibleName) return d.content.visibleName;
  return d.kind === 'component'
    ? `Componente · ${ITEM_GLYPHS[d.category]?.label ?? d.category}`
    : `Objeto · ${d.recipe.map((id) => ITEM_GLYPHS[id.replace('component-', '')]?.label ?? id).join(' + ')}`;
}
export function itemIconCandidates(
  d: ItemDefinition | undefined,
  theme: ItemIconTheme,
  simulateMissingOfficial = false,
) {
  if (!d) return [];
  const record = d.content?.sourceRecordId;
  const own = record && assets[record as keyof typeof assets]?.src;
  const official = officialAssets[d.icon as keyof typeof referenceAssets];
  // Exact tuple guards repurposed historical IDs and recipes; never select artwork by name alone.
  const matches =
    official &&
    official.internalId === d.id &&
    official.tftId === record &&
    official.visibleName === d.content?.visibleName &&
    JSON.stringify([...official.recipe].sort()) ===
      JSON.stringify(d.kind === 'completed' ? [...d.recipe].sort() : []);
  return [
    ...(ITEM_ICON_OVERRIDES[d.icon]
      ? [{ src: ITEM_ICON_OVERRIDES[d.icon]!, kind: 'override' }]
      : []),
    ...(typeof __DEVTOOLS__ !== 'undefined' && __DEVTOOLS__ && theme === 'tft-reference' && matches
      ? [
          {
            src: simulateMissingOfficial
              ? `/assets/items/tft-reference/__missing__/${official.tftId}.webp`
              : official.src,
            kind: 'tft-official',
          },
        ]
      : []),
    ...(own ? [{ src: own, kind: 'original' }] : []),
  ];
}
export function ItemIcon({ definition: d }: { definition: ItemDefinition | undefined }) {
  const settings = useItemIconSettings();
  const [failed, setFailed] = useState<string[]>([]);
  const candidate = itemIconCandidates(d, settings.theme, settings.simulateMissingOfficial).find(
    (c) => !failed.includes(c.src),
  );
  if (candidate)
    return (
      <img
        className="item-icon"
        data-icon-art={candidate.kind}
        data-icon-id={d?.content?.sourceRecordId}
        data-icon-key={d?.icon}
        src={candidate.src}
        width={64}
        height={64}
        alt=""
        aria-hidden="true"
        onError={() =>
          setFailed((previous) =>
            previous.includes(candidate.src) ? previous : [...previous, candidate.src],
          )
        }
      />
    );
  const categories =
    d?.kind === 'component'
      ? [d.category]
      : (d?.recipe.map((id) => id.replace('component-', '')) ?? []);
  return (
    <svg className="item-icon" data-icon-art="fallback" viewBox="0 0 40 40" aria-hidden="true">
      <path
        d="M7 2h26l5 5v26l-5 5H7l-5-5V7Z"
        fill="var(--neon-surface-canvas)"
        stroke={d?.kind === 'completed' ? '#f6c454' : '#8ea7f9'}
        strokeWidth="2"
      />
      {categories.map((c, i) => {
        const g = ITEM_GLYPHS[c];
        return g ? (
          <g
            key={i}
            transform={
              categories.length === 1
                ? 'translate(4 4)'
                : `translate(${i ? 18 : 2} ${i ? 17 : 2}) scale(.6)`
            }
          >
            <path
              d={g.path}
              fill="none"
              stroke={g.color}
              strokeWidth="2.8"
              strokeLinejoin="miter"
              strokeLinecap="square"
            />
          </g>
        ) : null;
      })}
      {!d && <path d="M12 12h16v16H12Z" fill="none" stroke="#c3cefc" />}
    </svg>
  );
}
