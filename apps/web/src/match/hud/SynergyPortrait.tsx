import { useState } from 'react';
import { splashArtFor } from '../../game/splashArtCatalog';
/** Face crops of existing original splashes only. Missing art never becomes a fake portrait. */
const faces: Readonly<Record<string, { aspect: number; x: number }>> = {
  dolea: { aspect: 2, x: 46.25 },
  vargas: { aspect: 2, x: 42.5 },
  jaramillo: { aspect: 2, x: 43 },
  florin: { aspect: 1280 / 720, x: 26.9 },
};
export function SynergyPortrait({ id, name }: { id: string; name: string }) {
  const art = splashArtFor(id),
    crop = faces[id];
  const [failed, setFailed] = useState(false);
  return (
    <span className="trait-portrait">
      {art && crop && !failed ? (
        <img
          src={art.url}
          alt={`Retrato de ${name}`}
          loading="lazy"
          decoding="async"
          data-character-portrait={id}
          style={{
            width: `${crop.aspect * 300}%`,
            height: '300%',
            left: `${(-(crop.aspect * 300 - 100) * crop.x) / 100}%`,
            top: 0,
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="trait-portrait-missing">Sin retrato</span>
      )}
    </span>
  );
}
