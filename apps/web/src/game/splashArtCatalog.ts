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
  note = 'Original de TFPeru',
): SplashArt => ({
  splashArtKey: `${id}:splash:1`,
  url: `/assets/splash/${id}.webp`,
  focal: { x, y },
  framing: 'portrait',
  scale: 1,
  crop: 'cover',
  variant: 'original',
  fallback: 'character-portrait',
  provenance: { source, note },
});
export const SPLASH_ARTS: Readonly<Record<string, SplashArt>> = {
  dolea: art('dolea', 'TFPeru/Dolea/Splash_art_Dolea.png', 43, 37),
  vargas: art('vargas', 'TFPeru/Vargas/Splash_art_Vargas.png', 47, 38),
  jaramillo: art(
    'jaramillo',
    'TFPeru/Erik/Splash_art_Erik.png',
    51,
    34,
    'Erik corresponde a JARAMILLO; confirmado por el propietario el 26/10/2026.',
  ),
  florin: art('florin', 'TFPeru/Florin/Splash_art_Florin.png', 39, 38),
};
export const splashArtFor = (characterId: string) => SPLASH_ARTS[characterId];
