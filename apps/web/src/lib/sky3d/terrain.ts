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

/**
 * Bit-mixing PRNG (mulberry32). Small, fast, and — the only thing that matters
 * here — the same sequence for the same seed in every JS engine.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hermite smoothstep, clamped. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * A smooth random function of angle that closes exactly on itself after one
 * turn — `waves` control values round the circle, smoothstepped between.
 *
 * Interpolated with smoothstep rather than a spline on purpose: a Catmull-Rom
 * through random controls overshoots its endpoints. Smoothstep never leaves
 * the interval between the two controls it sits on, so the result stays in
 * [0, 1) for free.
 *
 * @param turn Position round the circle, in turns. Any real number; wrapped.
 */
function periodicNoise(waves: number, rand: () => number): (turn: number) => number {
  const control = Array.from({ length: waves }, () => rand());
  return (turn: number) => {
    const x = (((turn % 1) + 1) % 1) * waves;
    const i = Math.floor(x);
    const f = x - i;
    const a = control[i % waves];
    const b = control[(i + 1) % waves];
    return a + (b - a) * f * f * (3 - 2 * f);
  };
}

/**
 * Sum of {@link periodicNoise} octaves, stretched to use the whole of [0, 1]
 * and then gamma-shaped so it spends more of its time low: broad valleys with
 * distinct ridges, rather than the even swell a plain noise sum gives.
 */
function ridgeProfile(
  rand: () => number,
  octaves: readonly { waves: number; amp: number }[],
  sharpness: number,
): (turn: number) => number {
  const layers = octaves.map(({ waves, amp }) => ({ noise: periodicNoise(waves, rand), amp }));
  const total = layers.reduce((sum, l) => sum + l.amp, 0);
  const raw = (turn: number) => {
    let v = 0;
    for (const { noise, amp } of layers) v += noise(turn) * amp;
    return v / total;
  };

  const steps = Math.max(512, 8 * Math.max(...octaves.map((o) => o.waves)));
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < steps; i += 1) {
    const v = raw(i / steps);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1;

  return (turn: number) => {
    const v = (raw(turn) - lo) / span;
    return Math.pow(Math.min(1, Math.max(0, v)), sharpness);
  };
}

/**
 * Shortest distance along the circle, in turns, in [0, 0.5].
 */
function turnDelta(a: number, b: number): number {
  const d = Math.abs((((a - b) % 1) + 1) % 1);
  return Math.min(d, 1 - d);
}

const RING_OCTAVES = [
  { waves: 5, amp: 1 },
  { waves: 11, amp: 0.52 },
  { waves: 23, amp: 0.26 },
  { waves: 47, amp: 0.13 },
] as const;

/**
 * How sharply the floor lets go of `baseY` and comes up to eye level at the
 * rim. A finite disc leaves a hairline of sky between its edge and the
 * mathematical horizon; bringing the last ring to y = 0 closes that seam.
 */
const FLOOR_LIFT_POWER = 5;

/**
 * Radius spacing bias. Below 1 pushes rings outward, which is where they are
 * needed: standing a fraction of a unit above the floor, everything past a
 * few units of radius is squeezed into the last degrees under the horizon,
 * and that sliver is the entire skyline.
 */
const RADIAL_BIAS = 0.72;

type Hill = {
  turn: number;
  t: number;
  h: number;
  sigT: number;
  sigTurn: number;
};

function placeHills(rand: () => number, count: number, t0: number, t1: number, h0: number, h1: number): Hill[] {
  const hills: Hill[] = [];
  for (let i = 0; i < count; i += 1) {
    /* Evenly around the circle, then jittered, so no quarter is left empty. */
    const turn = (((i + 0.22 * (rand() * 2 - 1)) / count) % 1 + 1) % 1;
    const t = t0 + (t1 - t0) * Math.pow(rand(), 0.65);
    hills.push({
      turn,
      t,
      h: h0 + (h1 - h0) * rand(),
      sigT: 0.07 + 0.11 * rand(),
      sigTurn: 0.035 + 0.055 * rand(),
    });
  }
  return hills;
}

function hillLift(hills: readonly Hill[], turn: number, t: number): number {
  let sum = 0;
  for (let i = 0; i < hills.length; i += 1) {
    const hill = hills[i];
    const dTurn = turnDelta(turn, hill.turn) / hill.sigTurn;
    const dT = (t - hill.t) / hill.sigT;
    sum += hill.h * Math.exp(-0.5 * (dTurn * dTurn + dT * dT));
  }
  return sum;
}

export type HorizonTerrainOptions = {
  /** Outer radius. Put it at or a little past the dome the sky is drawn on. */
  radius: number;
  /**
   * Height of the valley floor directly underfoot, scene units. Negative — the
   * observer's eye is at y = 0, so this is how far down the ground starts.
   */
  baseY: number;
  /**
   * How far the tallest ridge stands above {@link baseY}, scene units. What
   * matters visually is `atan(relief / radius)`: the degrees of sky the skyline
   * takes up. Generous enough to read, small enough that the ground is not
   * eating the constellations.
   */
  relief: number;
  /**
   * Steps round the circle. This sets how smooth the silhouette is and is worth
   * far more than {@link rings} — a coarse ring count is invisible, a coarse
   * sector count turns every ridge into a staircase.
   */
  sectors?: number;
  /** Steps out from the observer. Carries the slope of each hill. */
  rings?: number;
  seed?: number;
};

export type HorizonTerrain = {
  geometry: THREE.BufferGeometry;
  /** How high the tallest point on the skyline stands, degrees above the horizon. */
  skylineDeg: number;
};

/**
 * Build the ground for one place.
 *
 * The returned geometry carries `position` and a three-component `color`
 * (`vertexColors`). Colour is a neutral shading ramp meant to be *multiplied*
 * by whatever land colour the caller sets on the material, so the same
 * geometry can be tinted from night slate to daylit earth without being
 * rebuilt. Lighting (normals) does the rest of the modelling.
 *
 * Scene frame matches `horizon.ts`: +Y is the zenith, +X east, −Z north, so
 * azimuth 0 points at the north compass mark and the hills stay put against it.
 *
 * The caller owns the geometry and must dispose it.
 */
export function buildHorizonTerrain({
  radius,
  baseY,
  relief,
  sectors = 288,
  rings = 72,
  seed = 1,
}: HorizonTerrainOptions): HorizonTerrain {
  const rand = mulberry32(seed);
  const ring = ridgeProfile(rand, RING_OCTAVES, 1.45);
  /* Far range all the way round, then a second, closer set of foothills —
     same trick the eclipses valley uses, so turning on the spot always has a
     ridge in front of you. */
  const range = placeHills(rand, 16, 0.42, 0.9, 0.45, 1);
  const foot = placeHills(rand, 11, 0.18, 0.5, 0.18, 0.45);

  const cols = sectors + 1; // the seam is duplicated so the shading wraps cleanly
  const count = (rings + 1) * cols;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  let skylineDeg = 0;

  for (let ri = 0; ri <= rings; ri += 1) {
    const t = Math.pow(ri / rings, RADIAL_BIAS);
    const r = radius * t;
    /* Keep a bowl underfoot so a nearby hill cannot swallow the camera, then
       let the range carry the skyline. */
    const envelope = smoothstep(0.1, 0.34, t);
    const floorY = baseY * (1 - Math.pow(t, FLOOR_LIFT_POWER));

    for (let sector = 0; sector <= sectors; sector += 1) {
      const turn = sector / sectors;
      const az = turn * Math.PI * 2;
      const ridges = ring(turn);
      const mountains =
        0.38 * ridges * smoothstep(0.36, 0.82, t) +
        0.72 * hillLift(range, turn, t) +
        0.55 * hillLift(foot, turn, t);
      const lift = envelope * mountains;
      const y = floorY + relief * lift;

      const i = ri * cols + sector;
      positions[i * 3] = r * Math.sin(az);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = -r * Math.cos(az);

      /* Ridges a little lighter, valleys a little darker — the lambert term
         models the sun, this is only the dirt's own variation. */
      const c = 0.52 + 0.48 * Math.min(1, lift);
      colors[i * 3] = c;
      colors[i * 3 + 1] = c;
      colors[i * 3 + 2] = c;

      if (r > 0) skylineDeg = Math.max(skylineDeg, (Math.atan2(y, r) * 180) / Math.PI);
    }
  }

  const indices: number[] = [];
  for (let ri = 1; ri <= rings; ri += 1) {
    for (let sector = 0; sector < sectors; sector += 1) {
      const a = (ri - 1) * cols + sector;
      const b = a + 1;
      const c = ri * cols + sector;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return { geometry, skylineDeg };
}

/**
 * A stable seed for one place on Earth.
 *
 * Quantised to a hundredth of a degree — about a kilometre — so the same city
 * always raises the same hills, and so a coordinate that arrives with float
 * noise on it does not count as somewhere new.
 */
export function terrainSeed(lat: number, lon: number): number {
  const a = Math.round(lat * 100);
  const b = Math.round(lon * 100);
  return (Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0;
}

/**
 * Equirectangular landscape for the inner sky sphere — grass and rolling
 * hills below the horizon, nothing above it.
 *
 * Mapped onto a BackSide sphere around the observer, this is the Stellarium
 * trick: a 360° photo-style ground that fills the whole lower hemisphere, not
 * a thin ridge sitting on the mathematical horizon. The skyline is the same
 * seeded ridge as {@link buildHorizonTerrain}, so one place keeps one set of
 * hills. Alpha is 0 above the skyline so the stars pass through, and solid
 * below so they do not.
 *
 * DataTexture rather than canvas: the page prerenders, and `document` is not
 * there on the server pass.
 *
 * UV matches three.js `SphereGeometry`: v = 0 at −Y (nadir), v = 1 at +Y
 * (zenith); u = 0 at −X (west), increasing toward +Z (south). Azimuth 0
 * (north, −Z) therefore sits at u = 0.75.
 */
export function buildHorizonLandscapeTexture(
  seed: number,
  width = 2048,
  height = 1024,
): THREE.DataTexture {
  const rand = mulberry32(seed);
  const far = ridgeProfile(rand, RING_OCTAVES, 1.45);
  const near = ridgeProfile(rand, [
    { waves: 3, amp: 1 },
    { waves: 7, amp: 0.45 },
  ], 1.2);
  const blotch = ridgeProfile(rand, [
    { waves: 9, amp: 1 },
    { waves: 19, amp: 0.5 },
    { waves: 41, amp: 0.25 },
  ], 1);

  const data = new Uint8Array(width * height * 4);
  const maxHill = 11;

  for (let y = 0; y < height; y += 1) {
    /* v = 0 at nadir, 1 at zenith — matches SphereGeometry with flipY false. */
    const v = y / (height - 1);
    const alt = (v - 0.5) * 180;
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const az = ((270 - u * 360) % 360 + 360) % 360;
      const turn = az / 360;
      const skyline = maxHill * (0.22 + 0.78 * far(turn) * (0.55 + 0.45 * near(turn)));
      const i = (y * width + x) * 4;

      if (alt > skyline + 0.8) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
        continue;
      }

      const below = Math.min(1, Math.max(0, (skyline - alt) / 55));
      const field = blotch(turn + v * 0.15);
      const grass = 0.55 + 0.45 * field;
      /* Haze at the skyline, darker grass toward nadir, a little brown earth
         in the low patches — a dry-season valley, not a cartoon. */
      const haze = smoothstep(skyline - 4, skyline + 0.8, alt);
      const r = (42 + 38 * grass + 70 * haze) * (0.55 + 0.45 * (1 - below * 0.5));
      const g = (62 + 48 * grass + 40 * haze) * (0.6 + 0.4 * (1 - below * 0.45));
      const b = (28 + 22 * grass + 55 * haze) * (0.55 + 0.45 * (1 - below * 0.4));
      const edge = 1 - smoothstep(skyline - 0.6, skyline + 0.8, alt);

      data[i] = Math.min(255, r);
      data[i + 1] = Math.min(255, g);
      data[i + 2] = Math.min(255, b);
      data[i + 3] = Math.min(255, 255 * edge);
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * `kathmandu.jpeg` is a *little planet*: stereographic from the nadir, city in
 * the middle, hills in a ring, pale sky around the rim. It is not an
 * equirectangular panorama — slapping it on a sphere as-is stretches Kathmandu
 * into a belt. These helpers put the photo on the inner sky sphere the way
 * Stellarium maps a ground panorama: down is the city, the mathematical
 * horizon is the green hills, the blue sky is cut so the राशि belt shows.
 */

/** Angle from nadir that lands on the outer edge of the disc. ~110° puts the
 *  hills on the skyline and the photo's sky just above it (where alpha is 0). */
export const KATHMANDU_THETA_MAX = (110 * Math.PI) / 180;

/**
 * How sky-like a pixel is, 0–1. Grass stays (G leads); pale blue / white-blue
 * at the rim is the photo's sky and has to go.
 */
function skyLikeness(r: number, g: number, b: number): number {
  if (g > b + 18 && g > r + 8) return 0;
  if (b < 145) return 0;
  const pale = Math.min(r, g, b) / 255;
  const blueLead = (b - r) / 255;
  if (pale > 0.52 && blueLead > 0.015 && b >= g - 8) {
    return Math.min(1, 0.35 + pale * 0.9);
  }
  if (pale > 0.72 && Math.abs(r - g) < 28 && b >= r - 4) return 0.9;
  return 0;
}

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

/**
 * Rewrite a sphere's UVs so each vertex samples {@link prepareKathmanduGround}
 * stereographically from the nadir (−Y). North (−Z) is up in the photo.
 */
export function applyNadirStereographicUVs(
  geometry: THREE.BufferGeometry,
  thetaMax = KATHMANDU_THETA_MAX,
): void {
  const pos = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  const tanHalf = Math.tan(thetaMax * 0.5);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.hypot(x, y, z) || 1;
    const theta = Math.acos(Math.min(1, Math.max(-1, -y / len)));
    const az = Math.atan2(x / len, -z / len);
    const r = Math.tan(theta * 0.5) / tanHalf;
    uv.setXY(i, 0.5 + 0.5 * r * Math.sin(az), 0.5 - 0.5 * r * Math.cos(az));
  }
  uv.needsUpdate = true;
}
