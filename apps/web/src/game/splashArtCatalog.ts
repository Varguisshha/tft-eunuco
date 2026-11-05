/** Client-only presentation. Combat, catalogs and fingerprints never import this file. */
export interface SplashArt {
  splashArtKey: string;
  url: string;
  focal: { x: number; y: number };
  framing: 'portrait';
  scale: number;
  crop: 'cover';
  variant: 'original';
  fallback: 'character-portrait';
  provenance: { source: string; note: string };
}
const art = (
  id: string,
  source: string,
  x: number,
  y: number,
  note = 'Pack TFPeru 2 facilitado por el propietario; derivado local, sin recursos descargados.',
): SplashArt => ({
  splashArtKey: `${id}:splash:1`,
  url: `/assets/splash/${id === 'peibol' ? 'p13t/' : ''}${id}.webp`,
  focal: { x, y },
  framing: 'portrait',
  scale: 1,
  crop: 'cover',
  variant: 'original',
  fallback: 'character-portrait',
  provenance: { source, note },
});
export const SPLASH_ARTS: Readonly<Record<string, SplashArt>> = {
  edu: art(
    'edu',
    'Sprites/edu/splash-original.png',
    40,
    32,
    'Splash facilitado por el propietario: Edu con Sanderson y gatos.',
  ),
  sanchez: art(
    'sanchez',
    'Sprites/sanchez/splash-original.png',
    45,
    30,
    'Splash facilitado por el propietario: Sánchez con batería en el banco de sangre.',
  ),
  dolea: art('dolea', 'TFPeru 2/Dolea/Splash_art_Dolea.png', 43, 37),
  vargas: art('vargas', 'TFPeru 2/Vargas/Splash_art_Vargas.png', 47, 38),
  jaramillo: art(
    'jaramillo',
    'TFPeru 2/Erik/Splash_art_Erik.png',
    51,
    34,
    'Erik corresponde a JARAMILLO; confirmado por el propietario el 26/10/2026.',
  ),
  florin: art('florin', 'TFPeru 2/Florin/Splash_art_Florin.png', 39, 38),
  peibol: art('peibol', 'TFPeru 2/Peibol/Splash_art_Peibol.png', 48, 36),
};
export const splashArtFor = (characterId: string) => SPLASH_ARTS[characterId];
