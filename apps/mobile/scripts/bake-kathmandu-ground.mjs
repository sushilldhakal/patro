/**
 * Bakes the काठमाडौँ little-planet ground panorama's alpha mask.
 *
 * The web app punches the sky and the corners out of `kathmandu.jpeg` at
 * runtime with a 2D canvas (`prepareKathmanduGround` in `sky3d/terrain.ts`).
 * React Native has no 2D canvas and no `getImageData`, so the identical
 * computation runs here instead and ships as a PNG that already carries the
 * alpha — same pixels, same `skyLikeness` thresholds, same smoothstep ramps,
 * just evaluated once at build time rather than once per mount.
 *
 * Source of truth for the maths: `dhakal-patro/src/lib/sky3d/terrain.ts`.
 * Keep the two in step — if the thresholds move there, re-run this.
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, "../../dhakal-patro/src/assets/kathmandu.jpeg");
const OUT = path.resolve(here, "../assets/sky3d/kathmandu-ground.png");

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Verbatim from `terrain.ts` — how sky-like a pixel is, 0–1. */
function skyLikeness(r, g, b) {
  if (g > b + 18 && g > r + 8) return 0;
  if (b < 145) return 0;
  const pale = Math.min(r, g, b) / 255;
  const blueLead = (b - r) / 255;
  if (pale > 0.52 && blueLead > 0.015 && b >= g - 8) return Math.min(1, 0.35 + pale * 0.9);
  if (pale > 0.72 && Math.abs(r - g) < 28 && b >= r - 4) return 0.9;
  return 0;
}

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const cx = (w - 1) / 2;
const cy = (h - 1) / 2;
const rad = Math.min(cx, cy);

for (let y = 0; y < h; y += 1) {
  for (let x = 0; x < w; x += 1) {
    const i = (y * w + x) * 4;
    const rr = Math.hypot((x - cx) / rad, (y - cy) / rad);
    if (rr > 1) {
      data[i + 3] = 0;
      continue;
    }
    const ring = smoothstep(0.66, 0.88, rr);
    const sky = skyLikeness(data[i], data[i + 1], data[i + 2]) * smoothstep(0.5, 0.72, rr);
    data[i + 3] = Math.round(255 * (1 - Math.max(ring, sky)));
  }
}

await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(OUT);
console.log(`baked ${OUT} (${w}×${h})`);
