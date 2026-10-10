/**
 * Texture sources for the 3D sky.
 *
 * On native, `@react-three/fiber/native` patches `THREE.TextureLoader` to accept
 * a bundler module ref directly, so the `require` is handed straight through.
 * On web there is no such patch and a plain URL is what the DOM image loader
 * wants, so the module is resolved through expo-asset first.
 */

import { Platform } from "react-native";
import { Asset } from "expo-asset";

const MODULES = {
  sun: require("@/assets/sky3d/sun.jpg"),
  moon: require("@/assets/sky3d/moon.jpg"),
  mercury: require("@/assets/sky3d/mercury.jpg"),
  venus: require("@/assets/sky3d/venus.jpg"),
  earth: require("@/assets/sky3d/earth.jpg"),
  earthclouds: require("@/assets/sky3d/earthclouds.jpg"),
  mars: require("@/assets/sky3d/mars.jpg"),
  jupiter: require("@/assets/sky3d/jupiter.jpg"),
  saturn: require("@/assets/sky3d/saturn.jpg"),
  saturnring: require("@/assets/sky3d/saturnring.jpg"),
  milkyway: require("@/assets/sky3d/milkyway.jpg"),
} as const;

export type SkyTextureKey = keyof typeof MODULES;

/** Stable key order — `useLoader` needs the same array shape on every render. */
export const SKY_TEXTURE_KEYS = Object.keys(MODULES) as SkyTextureKey[];

/** What to hand `THREE.TextureLoader` for each texture, per platform. */
export const SKY_TEXTURE_SOURCES: unknown[] = SKY_TEXTURE_KEYS.map((key) =>
  Platform.OS === "web" ? Asset.fromModule(MODULES[key]).uri : MODULES[key],
);

/**
 * The three plates the scene loads on their own rather than through
 * {@link SKY_TEXTURE_SOURCES} — the web app imports these as bare URLs, which
 * a bundler gives it for free and Metro does not. Same platform split as
 * above: a module ref on native, an `expo-asset` URI on web.
 *
 * `kathmandu-ground.png` is the pre-alpha'd build of the web app's
 * `kathmandu.jpeg` — see `scripts/bake-kathmandu-ground.mjs`.
 */
function source(mod: number): unknown {
  return Platform.OS === "web" ? Asset.fromModule(mod).uri : mod;
}

export const EARTH_TOON_SOURCE = source(require("@/assets/graha/earth-orig.jpg"));
export const MILKY_WAY_SOURCE = source(require("@/assets/sky3d/milkyway.jpg"));
export const KATHMANDU_GROUND_SOURCE = source(require("@/assets/sky3d/kathmandu-ground.png"));
