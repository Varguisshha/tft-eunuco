import { validateArena, type ArenaDefinition } from './arena';
export const CAFETERIA_UPM: ArenaDefinition = {
  contractVersion: 1,
  id: 'cafeteria-upm-etsisi',
  name: 'Cafetería UPM — ETSISI',
  image: {
    url: '/assets/arenas/cafeteria-upm-etsisi.webp',
    key: 'arena-cafeteria-upm-etsisi-v1',
    width: 1672,
    height: 941,
    source: 'Plaza soleada de la cafetería UPM.png',
    sha256: '30a63b9af50d5032468050ff2294295a0e193bcd080af18f3073392694ced967',
  },
  // Inner asphalt envelope. Controls leave clearance for every hex corner.
  playableArea: [
    { x: 826, y: 352 },
    { x: 1500, y: 510 },
    { x: 900, y: 865 },
    { x: 194, y: 510 },
  ],
  projection: {
    kind: 'homography',
    controls: [
      { x: 826, y: 385 },
      { x: 1425, y: 513 },
      { x: 900, y: 822 },
      { x: 270, y: 513 },
    ],
  },
  camera: {
    framing: 'contain',
    focus: { x: 836, y: 470 },
    topMargin: 8,
    bottomMargin: 12,
    leftHud: 172,
    rightMargin: 16,
    headroom: 90,
    zoomMin: 0.85,
    zoomMax: 1.15,
  },
  grid: { mode: 'interaction', north: 0xe2b47b, south: 0xa9dfc4, invalid: 0xf3987d },
  characters: { scale: 1.12, farScale: 0.94, nearScale: 1.06, farY: 400, nearY: 810 },
};
validateArena(CAFETERIA_UPM);
