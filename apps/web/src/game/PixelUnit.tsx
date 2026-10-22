import type { UnitDefinition } from '@tft/shared';
import { resolveAnimation, type VisualStars } from '@tft/sprite-contract';
import { characterManifest } from './characterAssets';
import { pixelRects } from './pixelArt';
export function PixelUnit({
  role,
  spriteId,
  stars = 1,
  large = false,
}: {
  role: UnitDefinition['role'];
  spriteId?: string;
  stars?: VisualStars;
  large?: boolean;
}) {
  const asset = resolveAnimation(characterManifest(spriteId ?? ''), stars, 'idle').asset;
  if (asset)
    return (
      <img
        className={large ? 'pixel-unit large' : 'pixel-unit'}
        src={asset.url.replace('.png', '-portrait.png')}
        alt=""
        aria-hidden="true"
        style={{ objectFit: 'contain', imageRendering: 'pixelated' }}
      />
    );
  return (
    <svg
      className={large ? 'pixel-unit large' : 'pixel-unit'}
      viewBox="0 0 32 40"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {pixelRects(role).map(([x, y, width, height, fill], i) => (
        <rect key={i} {...{ x, y, width, height, fill }} />
      ))}
    </svg>
  );
}
