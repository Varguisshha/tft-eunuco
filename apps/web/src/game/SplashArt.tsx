import { useState } from 'react';
import type { UnitDefinition } from '@tft/shared';
import { PixelUnit } from './PixelUnit';
import { splashArtFor } from './splashArtCatalog';
export function SplashArt({ character }: { character: UnitDefinition }) {
  const art = splashArtFor(character.id);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!art || failedUrl === art.url)
    return <PixelUnit role={character.role} spriteId={character.spriteId} />;
  return (
    <img
      className="splash-art"
      src={art.url}
      alt=""
      aria-hidden="true"
      decoding="async"
      data-splash-art-key={art.splashArtKey}
      style={{
        objectFit: art.crop,
        objectPosition: `${art.focal.x}% ${art.focal.y}%`,
        transform: `scale(${art.scale})`,
      }}
      onError={() => setFailedUrl(art.url)}
    />
  );
}
