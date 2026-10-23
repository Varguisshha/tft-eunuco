import { validateArena, type ArenaDefinition } from './arena';
export const MAR_DE_CRISTAL: ArenaDefinition = {
  contractVersion: 1,
  id: 'mar-de-cristal',
  name: 'Mar de Cristal',
  image: {
    url: '/assets/arenas/mar-de-cristal.webp',
    key: 'arena-mar-de-cristal-v1',
    width: 1672,
    height: 941,
    source: 'Plaza urbana isométrica junto al metro.png',
    sha256: '710815591780ff893603bca90f7bbf544d233585ba373ddb357a19097511761a',
  },
  // Inner edge of the asphalt, excluding curbs, trees, crossings and street furniture.
  playableArea: [
    { x: 715, y: 280 },
    { x: 1380, y: 505 },
    { x: 880, y: 850 },
    { x: 235, y: 492 },
  ],
  projection: {
    kind: 'homography',
    controls: [
      { x: 721, y: 306 },
      { x: 1330, y: 509 },
      { x: 880, y: 810 },
      { x: 290, y: 501 },
    ],
  },
  camera: {
    framing: 'contain',
    focus: { x: 836, y: 420 },
    // Keep the whole Carrefour sign visible along with the expanded playing field.
    landmarks: [
      { x: 1205, y: 10 },
      { x: 1387, y: 85 },
    ],
    topMargin: 8,
    bottomMargin: 12,
    leftHud: 172,
    rightMargin: 16,
    headroom: 90,
    zoomMin: 0.85,
    zoomMax: 1.15,
  },
  grid: { mode: 'interaction', north: 0xe2b47b, south: 0xa9dfc4, invalid: 0xf3987d },
  characters: { scale: 1.12, farScale: 0.94, nearScale: 1.06, farY: 335, nearY: 780 },
};
validateArena(MAR_DE_CRISTAL);
