/**
 * The ground the क्षितिज view stands on — a 360° valley of hills, generated
 * rather than drawn.
 *
 * The horizon view puts the reader at the centre of a dome with the camera at
 * the origin, so "the ground" is whatever fills every direction below the
 * skyline at once. A flat disc does that, but it says only *down*: no skyline,
 * so the compass points sit on a drawn circle and nothing tells you that the
 * Sun is about to clear a ridge rather than the mathematical horizon.
 *
 * This builds a radial mesh instead — a ring of overlapping hills all the way
 * round, the same idea as standing in a valley and turning on the spot. Relief
 * is real 3D (hills rise and fall with distance, and can occlude each other)
 * because the mesh is drawn opaque with depth, so a later triangle is allowed
 * to hide an earlier one.
 *
 * ## Why it is seeded
 *
 * The app prerenders its pages, and this geometry has to be identical between
 * the server pass and hydration — an unseeded `Math.random()` skyline would
 * also reshuffle itself on every remount, which fullscreen does. Seeding it
 * from the observer's own coordinates goes one better: काठमाडौँ gets one ring of
 * hills and keeps it, and moving the observer moves you to a different place
 * rather than to the same place with new scenery.
 */

import * as THREE from "three";
import { smoothstep, skyLikeness } from "@vedic-patro/domain/sky3d/terrain";
export { type HorizonTerrainOptions, type HorizonTerrain, buildHorizonTerrain, terrainSeed, buildHorizonLandscapeTexture, KATHMANDU_THETA_MAX, applyNadirStereographicUVs } from "@vedic-patro/domain/sky3d/terrain";

/**
 * Configure the pre-baked little-planet ground texture.
 *
 * The web app punches the sky and the corners out of `kathmandu.jpeg` here at
 * runtime with a 2D canvas. React Native has neither a 2D canvas nor
 * `getImageData`, so that exact computation — the same `skyLikeness`
 * thresholds and the same smoothstep ramps — runs at build time instead, in
 * `scripts/bake-kathmandu-ground.mjs`, and ships as a PNG that already carries
 * the alpha. What is left for runtime is the texture setup the web version
 * also does, so `alphaTest` on the ground material lets the dome through.
 *
 * If the thresholds in the web copy of this file ever move, re-run that
 * script — it reads them from there by hand, not by import.
 */
export function prepareKathmanduGround(source: THREE.Texture): THREE.Texture {
  const tex = source;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
