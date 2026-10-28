import type { UnitDefinition } from '@tft/shared';
export type PixelRect = readonly [number, number, number, number, string];
export const ROLE_LABELS: Record<UnitDefinition['role'], string> = {
  vanguard: 'Vanguardia',
  striker: 'Duelista',
  ranger: 'Tirador',
  support: 'Mago',
  assassin: 'Asesino',
};
export const ROLE_COLORS: Record<UnitDefinition['role'], string> = {
  vanguard: '#88bca5',
  striker: '#dfae72',
  ranger: '#a6afcf',
  support: '#c0bb85',
  assassin: '#d3a16d',
};
/** Original 32 × 40 sprites, authored as integer rectangles; no external artwork. */
export function provisionalInitials(spriteId: string) {
  return spriteId
    .replace(/^provisional-/, '')
    .split('-')
    .map((s) => s[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
export function provisionalColor(spriteId: string) {
  let hash = 0;
  for (const c of spriteId) hash = (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 58% 64%)`;
}
export function pixelRects(role: UnitDefinition['role'], spriteId = ''): PixelRect[] {
  const color = spriteId.startsWith('provisional-')
    ? provisionalColor(spriteId)
    : ROLE_COLORS[role];
  const dark = '#263d36';
  const light = '#e2e8cf';
  const body: PixelRect[] = [
    [11, 33, 4, 5, dark],
    [18, 33, 4, 5, dark],
    [9, 37, 7, 2, '#111f1b'],
    [18, 37, 7, 2, '#111f1b'],
    [10, 18, 14, 16, dark],
    [11, 19, 12, 11, color],
    [14, 21, 6, 7, light],
    [9, 5, 16, 13, dark],
    [11, 4, 12, 3, color],
    [10, 7, 14, 8, color],
    [12, 10, 11, 5, '#15251f'],
    [14, 11, 2, 2, light],
    [20, 11, 2, 2, light],
    [12, 16, 10, 3, dark],
    [6, 20, 4, 10, color],
    [24, 20, 4, 9, color],
    [12, 30, 11, 3, '#13271f'],
  ];
  if (role === 'vanguard')
    body.push(
      [2, 23, 10, 11, '#365b4c'],
      [3, 21, 8, 12, color],
      [6, 23, 2, 8, light],
      [25, 9, 2, 24, '#93866b'],
      [24, 7, 4, 6, light],
    );
  if (role === 'striker')
    body.push(
      [21, 19, 2, 16, '#645846'],
      [23, 8, 3, 20, light],
      [25, 6, 2, 13, '#f1ce98'],
      [20, 26, 8, 2, color],
      [10, 2, 5, 4, '#e0a062'],
    );
  if (role === 'ranger')
    body.push(
      [8, 4, 15, 3, '#7686ac'],
      [6, 7, 20, 2, '#8497bb'],
      [27, 16, 2, 15, color],
      [25, 14, 2, 3, light],
      [25, 31, 2, 3, light],
      [24, 17, 1, 15, '#eee3c4'],
    );
  if (role === 'support')
    body.push(
      [10, 2, 12, 4, color],
      [13, 0, 6, 3, light],
      [10, 28, 14, 8, color],
      [26, 11, 2, 27, '#827c55'],
      [23, 7, 8, 6, dark],
      [25, 5, 4, 9, '#d8da9b'],
      [24, 8, 6, 3, light],
    );
  return body;
}
