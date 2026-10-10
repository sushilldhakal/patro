/**
 * Texture sources for the 3D sky.
 *
 * The native app resolves these through the Expo bundler; on the web they are
 * plain static files under `public/sky3d`, so `THREE.TextureLoader` gets the
 * URL its DOM image loader already wants and no resolution step is needed.
 */

const KEYS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "earth",
  "earthclouds",
  "mars",
  "jupiter",
  "saturn",
  "saturnring",
] as const;

export type SkyTextureKey = (typeof KEYS)[number];

/** Stable key order — `useLoader` needs the same array shape on every render. */
export const SKY_TEXTURE_KEYS: SkyTextureKey[] = [...KEYS];

/** What to hand `THREE.TextureLoader` for each texture. */
export const SKY_TEXTURE_SOURCES: string[] = SKY_TEXTURE_KEYS.map(
  (key) => `${import.meta.env.BASE_URL}sky3d/${key}.jpg`,
);
