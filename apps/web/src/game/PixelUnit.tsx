import type { UnitDefinition } from '@tft/shared';
import { resolveAnimation, type VisualStars } from '@tft/sprite-contract';
import { characterManifest } from './characterAssets';
import { pixelRects, provisionalInitials } from './pixelArt';
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
      {pixelRects(role, spriteId).map(([x, y, width, height, fill], i) => (
        <rect key={i} {...{ x, y, width, height, fill }} />
      ))}
      {spriteId?.startsWith('provisional-') && (
        <text x={17} y={27} textAnchor="middle" fill="#0f1125" fontSize={8} fontWeight={900}>
          {provisionalInitials(spriteId)}
        </text>
      )}
    </svg>
  );
}
