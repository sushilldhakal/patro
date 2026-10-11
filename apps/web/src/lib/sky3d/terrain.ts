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
 * Copy the little-planet JPEG onto a canvas and punch out the sky / corners so
 * `alphaTest` on the ground material lets the dome through.
 */
export function prepareKathmanduGround(source: THREE.Texture): THREE.CanvasTexture {
  const img = source.image as { width: number; height: number } | undefined;
  const canvas = document.createElement("canvas");
  const srcW = img?.width || 1024;
  const srcH = img?.height || 1024;
  canvas.width = srcW;
  canvas.height = srcH;
  const ctx = canvas.getContext("2d")!;
  if (img) ctx.drawImage(img as CanvasImageSource, 0, 0);
  const pix = ctx.getImageData(0, 0, srcW, srcH);
  const d = pix.data;
  const cx = (srcW - 1) / 2;
  const cy = (srcH - 1) / 2;
  const rad = Math.min(cx, cy);
  for (let y = 0; y < srcH; y += 1) {
    for (let x = 0; x < srcW; x += 1) {
      const i = (y * srcW + x) * 4;
      const dx = (x - cx) / rad;
      const dy = (y - cy) / rad;
      const rr = Math.hypot(dx, dy);
      if (rr > 1) {
        d[i + 3] = 0;
        continue;
      }
      const ring = smoothstep(0.66, 0.88, rr);
      const sky = skyLikeness(d[i], d[i + 1], d[i + 2]) * smoothstep(0.5, 0.72, rr);
      d[i + 3] = Math.round(255 * (1 - Math.max(ring, sky)));
    }
  }
  ctx.putImageData(pix, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
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
