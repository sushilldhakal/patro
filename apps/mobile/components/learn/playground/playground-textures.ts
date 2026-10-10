/**
 * The four maps the playground needs, loaded the way every other 3D screen in
 * this app loads its own.
 *
 * On native `@react-three/fiber/native` patches `THREE.TextureLoader` to accept
 * a bundler module ref straight through; on web there is no such patch and the
 * DOM image loader wants a resolved URL, so the module goes through expo-asset
 * first. Same split as `learn-textures.ts` and `sky-textures.ts` — this one
 * exists rather than reusing `useLearnTextures` because the playground also
 * needs the star background those diagrams draw with points instead.
 */

import { Platform } from "react-native";
import { Asset } from "expo-asset";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo } from "react";

const MODULES = {
  earth: require("@/assets/graha/earth-orig.jpg"),
  sun: require("@/assets/sky3d/sun.jpg"),
  moon: require("@/assets/sky3d/moon.jpg"),
  background: require("@/assets/sky3d/background.jpg"),
  /**
   * The other worlds the planet-preset chips can put in Earth's place.
   *
   * Bundler modules have to be `require`d statically — there is no runtime
   * `TextureLoader().load(url)` on native the way the web swaps these in
   * lazily — so every candidate body is loaded up front here instead, and
   * the scene just points its material at whichever one is picked.
   */
  mars: require("@/assets/sky3d/mars.jpg"),
  mercury: require("@/assets/sky3d/mercury.jpg"),
  jupiter: require("@/assets/sky3d/jupiter.jpg"),
  venus: require("@/assets/sky3d/venus.jpg"),
  saturn: require("@/assets/sky3d/saturn.jpg"),
} as const;

export type PlaygroundTextureKey = keyof typeof MODULES;

/** Stable key order — `useLoader` needs the same array shape on every render. */
export const PLAYGROUND_TEXTURE_KEYS = Object.keys(MODULES) as PlaygroundTextureKey[];

const SOURCES: unknown[] = PLAYGROUND_TEXTURE_KEYS.map((key) =>
  Platform.OS === "web" ? Asset.fromModule(MODULES[key]).uri : MODULES[key],
);

export function usePlaygroundTextures(): Record<PlaygroundTextureKey, THREE.Texture> {
  const loaded = useLoader(THREE.TextureLoader, SOURCES as string[]);
  return useMemo(() => {
    const map = {} as Record<PlaygroundTextureKey, THREE.Texture>;
    PLAYGROUND_TEXTURE_KEYS.forEach((key, i) => {
      const tex = loaded[i];
      if (!tex) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.premultiplyAlpha = false;
      map[key] = tex;
    });
    return map;
  }, [loaded]);
}
