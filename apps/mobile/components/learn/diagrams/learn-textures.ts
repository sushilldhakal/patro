/**
 * The three maps the learn diagrams need, loaded the same way the 3D sky loads
 * its own: on native `@react-three/fiber/native` patches `THREE.TextureLoader`
 * to take a bundler module ref, on web it wants a resolved URL.
 */

import { Platform } from "react-native";
import { Asset } from "expo-asset";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo } from "react";

const MODULES = {
  sun: require("@/assets/sky3d/sun.jpg"),
  earth: require("@/assets/sky3d/earth.jpg"),
  moon: require("@/assets/sky3d/moon.jpg"),
} as const;

export type LearnTextureKey = keyof typeof MODULES;

export const LEARN_TEXTURE_KEYS = Object.keys(MODULES) as LearnTextureKey[];

export const LEARN_TEXTURE_SOURCES: unknown[] = LEARN_TEXTURE_KEYS.map((key) =>
  Platform.OS === "web" ? Asset.fromModule(MODULES[key]).uri : MODULES[key],
);

export function useLearnTextures(): Record<LearnTextureKey, THREE.Texture> {
  const loaded = useLoader(THREE.TextureLoader, LEARN_TEXTURE_SOURCES as string[]);
  return useMemo(() => {
    const map = {} as Record<LearnTextureKey, THREE.Texture>;
    LEARN_TEXTURE_KEYS.forEach((key, i) => {
      const tex = loaded[i];
      if (!tex) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      map[key] = tex;
    });
    return map;
  }, [loaded]);
}
