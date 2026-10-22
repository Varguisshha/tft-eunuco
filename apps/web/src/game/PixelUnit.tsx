import type { UnitDefinition } from '@tft/shared';
import { pixelRects } from './pixelArt';
export function PixelUnit({
  role,
  large = false,
}: {
  role: UnitDefinition['role'];
  large?: boolean;
}) {
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
