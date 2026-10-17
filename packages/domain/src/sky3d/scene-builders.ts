/** Shared by apps/web/src/components/sky3d/AakashGocharScene.tsx and apps/mobile/components/sky3d/AakashGocharScene.tsx (moved here from both, unchanged). */
import * as THREE from "three";
import { DEG } from "./geocentric-model";
import { obliquity, altAzToVec3 } from "./horizon";
import { type HorizonPoint, GRID_OPACITY } from "./sky-geometry";
import type { GrahaKey } from "../graha-details";

/** Radius of the horizon dome. Everything on the sky sits on it. */
export const DOME = 100;

/** Breathing room between the glare and the top of the text, degrees. */
export const GLOW_PAD_DEG = 0.02;

/**
 * That angular radius in pixels at the current lens, floored and capped.
 *
 * Converted per frame rather than baked, because the whole point is that the
 * gap is angular: the same glare is 6 px across at 90° and 300 px across at
 * 2°, and only one of those needs the name moved.
 */
export function labelClearPx(
  glowDeg: number,
  fovDeg: number,
  heightPx: number,
  floor: number,
): number {
  const px = ((glowDeg + GLOW_PAD_DEG) / Math.max(fovDeg, 1e-3)) * heightPx;
  return Math.max(floor, Math.min(heightPx * 0.22, px));
}

/**
 * The क्षितिज alt/az cage. Brown, not the green it used to be: this grid is
 * drawn over the काठमाडौँ ground panorama and a warm horizon glow, and a
 * saturated green cage on top of that read as a separate overlay laid across
 * the photograph rather than part of the same scene. Only क्षितिज uses this —
 * the globe has {@link GLOBE_GRID}, अन्तरिक्ष the ecliptic wheel's own colour.
 */
export const GRID = "#b5824a";

/**
 * Wide open, {@link DOME_RADIUS} alone reads as a dusting of dots — the whole
 * 235° dome in one frame gives every body a sliver of the pixels it had at
 * 90°. So the *drawn* radius grows with the field itself: full triple size at
 * the 235° edge, double at 130°, back to the plain table at 90° and tighter —
 * three points, two straight lines between them, flat past either end.
 */
export function horizonBodyScale(fovDeg: number): number {
  if (fovDeg <= 30) return 1;
  if (fovDeg <= 130) return 1 + (fovDeg - 30) / (130 - 30);
  if (fovDeg <= 235) return 2 + (fovDeg - 130) / (235 - 130);
  return 3;
}

/** A 3D anchor projected to canvas pixels, for the text overlay. */
export type ScreenLabel = {
  id: string;
  kind:
    | "rashi"
    | "nakshatra"
    | "month"
    | "graha"
    | "cardinal"
    | "azimuth"
    | "station"
    | "tropic"
    | "polestar"
    | "obliquity"
    | "axis"
    | "asterism"
    | "pada"
    | "vedicstar"
    | "star"
    | "culture"
    | "outerplanet"
    | "nebula";
  /**
   * 1–12 for rashi, 1–27 for nakshatra, 1–4 for a पाद; for a pole star, 1 marks
   * the one the pole is nearest at the moment on screen.
   */
  index?: number;
  key?: GrahaKey;
  text?: string;
  /** वैदिक तारा / नक्षत्र stars: the नेपाली name — {@link text} carries the English one. */
  textNe?: string;
  /** Aimable overlay labels: sidereal ecliptic degrees, for a press on the name. */
  lon?: number;
  lat?: number;
  /**
   * Grid degrees only: which border of the frame the number is pinned to, so
   * the overlay can hang it inside that edge instead of centring it on the
   * line and letting half of it fall off the canvas. `horizon` rides the
   * skyline itself.
   */
  side?: "left" | "right" | "top" | "bottom" | "horizon" | "meridian";
  /** Pole stars only: the Gregorian year the pole passes closest to this one. */
  year?: number;
  /** The obliquity marker: the angle it is calling out, degrees. */
  deg?: number;
  /**
   * How far under the point the name has to sit to clear the object, px.
   *
   * A bright star is not the few-pixel dot the renderer draws: on the survey
   * plates behind it, it is a saturated blob a third of a degree across, and
   * that blob's *angular* size does not change with the lens. A fixed pixel
   * offset that looks generous at 90° therefore lands the name inside the
   * glare at 2°, which is exactly where the names stopped being readable.
   * See {@link labelClearPx}.
   */
  clear?: number;
  /** True when this label is not the live rashi / month / नक्षत्र. */
  dim?: boolean;
  /** Outer planets only: their own tint, since they carry no {@link GrahaKey}
      for `SkyLabels` to look one up by. */
  color?: string;
  /**
   * Horizon view: this label is under the observer's feet — the half of the
   * sphere the ground is standing in the way of. Drawn faded rather than
   * dropped, so a graha can be followed all the way round.
   */
  below?: boolean;
  x: number;
  y: number;
};

/* ── shared primitives ─────────────────────────────────────────────────── */

/**
 * Earth-fixed latitude/longitude → scene vector, axis along +Y.
 *
 * Same handedness as {@link eclipticToVec3}, and the same one three's own
 * sphere UVs use — so the Earth map can be laid on the globe straight and every
 * coastline lands where this function says it should.
 */
export function geoToVec3(lat: number, lon: number, radius: number): [number, number, number] {
  const a = lat * DEG;
  const b = lon * DEG;
  const cosLat = Math.cos(a);
  return [radius * cosLat * Math.cos(b), radius * Math.sin(a), -radius * cosLat * Math.sin(b)];
}

export function circlePoints(radius: number, segments = 128): THREE.Vector3[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return new THREE.Vector3(radius * Math.cos(a), 0, -radius * Math.sin(a));
  });
}

export function makeLine(points: THREE.Vector3[], color: string, opacity: number) {
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

/** Pole-to-pole meridian in the XY plane; rotate about +Y by longitude. */
export function makePrimeMeridian(radius: number) {
  const points = Array.from({ length: 49 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 48) * Math.PI;
    return new THREE.Vector3(radius * 1.003 * Math.cos(a), radius * 1.003 * Math.sin(a), 0);
  });
  return makeLine(points, "#dd2222", 0.95);
}

/**
 * A line whose points are rewritten every frame.
 *
 * Frustum culling is off: it would need a bounding sphere recomputed on every
 * rewrite — a second pass over every vertex — to save nothing, since these
 * lines are the dome and the zodiac and are on screen anyway.
 */
export function makeDynamicLine(count: number, color: string, opacity: number, width = 1) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: width }),
  );
  line.frustumCulled = false;
  return line;
}

/** The same, as disconnected pairs — dividers, ticks, grid cage. */
export function makeDynamicSegments(count: number, color: string, opacity: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  const segments = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
  segments.frustumCulled = false;
  return segments;
}

/**
 * Where the cage hangs: *outside* the shell the grahas sit on.
 *
 * The grahas are opaque meshes, and three.js draws every opaque object before
 * any transparent one — so `renderOrder` cannot put a transparent line behind
 * them, and with the depth test off the cage repainted itself over every disc
 * on the belt no matter what order it was given. The fix is depth, not order:
 * the grahas write the depth buffer, and a cage further out than they are gets
 * rejected where they cover it. Which only works if it really is further out.
 */
export const GRID_R = DOME * 1.04;

/**
 * The cage's shared look.
 *
 * Order and depth do two different jobs here and both are needed. The cage
 * paints *after* the ground (renderOrder 1), or the hillside's half-opaque
 * photo washes a 0.17-alpha line away to nothing and the cage under the
 * horizon disappears. It is kept off the grahas by the depth buffer instead:
 * they are opaque, so they are drawn and their depth written before any
 * transparent line, and a cage hung further out than they are simply fails the
 * test where a disc covers it.
 */
export function dressGrid(object: THREE.LineSegments) {
  object.renderOrder = 2;
  const mat = object.material as THREE.LineBasicMaterial;
  mat.depthTest = true;
  /* Reads the depth buffer but never writes it, so the tiers do not cut holes
     in each other and whatever is behind still comes through the mesh. */
  mat.depthWrite = false;
  return object;
}

export function bakeHorizonGrid(pairs: HorizonPoint[]) {
  const object = dressGrid(makeDynamicSegments(pairs.length, GRID, GRID_OPACITY));
  for (let i = 0; i < pairs.length; i += 1) {
    setPoint(object, i, altAzToVec3(pairs[i].alt, pairs[i].az, GRID_R));
  }
  flushLine(object);
  return object;
}

export function setPoint(line: THREE.Line, i: number, v: [number, number, number]) {
  const attr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
  attr.setXYZ(i, v[0], v[1], v[2]);
}

export function flushLine(line: THREE.Line) {
  const attr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
  attr.needsUpdate = true;
}

/**
 * How much wider than its own radius a star's sprite is drawn, to leave the
 * halo somewhere to fall off. See {@link makeStarPoints}'s shaders.
 */
export const STAR_HALO_SCALE = 3;

/**
 * A cloud of stars whose positions are rewritten with the sky. Point size is in
 * pixels rather than world units — a star has no apparent size, so it must not
 * grow as you zoom in on it.
 */
export function makeStarPoints(count: number, color: string, size: number, opacity: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  const sizes = new Float32Array(count);
  sizes.fill(size);
  geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
  /* A raw GL point is a square. Rather than ship a sprite texture — which the
     native GL bridge would have to decode — the fragment shader throws away
     everything outside the disc and feathers the last of it, which is both
     rounder and softer than a bitmap of this size would be. */
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uSize: { value: size },
      uOpacity: { value: opacity },
      uPixelRatio: { value: 1 },
    },
    vertexShader: `
      attribute float aSize;
      uniform float uSize;
      uniform float uPixelRatio;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        /* Sized for core *and* halo — see the fragment stage. The star's
           own radius is still aSize; the extra is empty room for the
           glow to fall off in, which a sprite exactly one star wide has
           nowhere to put. */
        gl_PointSize = aSize * uPixelRatio * ${STAR_HALO_SCALE.toFixed(1)};
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        vec2 d = gl_PointCoord - vec2(0.5);
        float r2 = dot(d, d);
        if (r2 > 0.25) discard;
        /* Core plus halo, which is what actually makes a point read as a
           *star* rather than as a small dot of paint.

           A single Gaussian across the whole sprite — what this was — is
           still only as wide as the sprite, and at the 1–3px these are
           sized to, "a Gaussian" and "a hard dot" are the same handful of
           pixels. Stellarium gets around this the same way every
           planetarium does: its halo texture is drawn much larger than the
           star's own computed radius, so the bright core stays a point
           while the glow around it has real room to fall off. The vertex
           stage now allows that room ({@link STAR_HALO_SCALE}), and this
           splits the budget: a tight core carrying the star's identity,
           and a wide, faint skirt carrying the glow. */
        float rNorm = sqrt(r2) * 2.0;
        float core = exp(-(rNorm * rNorm) / (0.16 * 0.16));
        float halo = 0.22 * exp(-(rNorm * rNorm) / (0.62 * 0.62));
        float alpha = min(1.0, core + halo);
        gl_FragColor = vec4(uColor, uOpacity * alpha);
      }
    `,
    /* Additive, the same as Stellarium's own point-source pass (GL_ONE,
       GL_ONE — see StelSkyDrawer::preDrawPointSource): two overlapping
       glows brighten into each other instead of one flat colour painting
       over the other, which is what makes a tight pair or a dense field
       read as light rather than as stacked tiles. */
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

/**
 * A dark sky is never actually black — real airglow and light pollution
 * put a faint floor under it that is brightest low over the horizon, the
 * thing every one of Stellarium's atmosphere models (`AtmosphereLightweight.
 * cpp`'s own `bgLum`, the "assumed star background luminance" it adds even
 * before light pollution) budgets for. Theirs is a full scattering
 * simulation solving that properly at every wavelength; this is the lean
 * version of the same idea — one soft additive glow, brightest at the
 * horizon and fading out toward the zenith, so क्षितिज's empty patches of
 * sky read as a dark night rather than a flat cutout.
 */
export function makeHorizonGlow(radius: number, color: string, intensity: number) {
  const geometry = new THREE.SphereGeometry(radius, 48, 32);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
    },
    vertexShader: `
      varying float vAlt;
      void main() {
        /* The sphere is unrotated, so its own local +Y already is altitude,
           the same as everywhere else in this file reads "up" against the
           horizon frame. */
        vAlt = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying float vAlt;
      void main() {
        /* Brightest right at the horizon, gone within half a radian either
           side of it — a glow along the skyline, not a wash over the whole
           dome. */
        float glow = uIntensity * (1.0 - smoothstep(0.0, 0.55, abs(vAlt)));
        gl_FragColor = vec4(uColor, glow);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    side: THREE.BackSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  /* Just after the star sphere (-1) and well before anything else, so it
     reads as part of the sky rather than a layer floating in front of it. */
  mesh.renderOrder = -0.5;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * The Milky Way panorama's own geometry, built straight from real J2000
 * equatorial coordinates rather than THREE's generic sphere UVs — so it
 * samples the texture exactly the way Stellarium's own shader does
 * (`MilkyWay.cpp`: `modelZenithAngle = acos(-z)`, `modelLongitude =
 * atan2(x, y)`, both read off `core->getJ2000ModelViewTransform()` — plain
 * equatorial, not galactic). Every vertex carries its own (RA, Dec) baked
 * into its position, so rotating the whole mesh by
 * {@link equatorialToHorizonMatrix} each frame is the same transform this
 * file already gives every individual fixed star, just done once for the
 * sphere instead of point by point. Before this the sphere was never
 * rotated at all, so its texture's own pole sat glued to the zenith
 * regardless of the date or the hour — the dark disc ringed by the band
 * that never moved.
 */
export function makeMilkyWayGeometry(radius: number, widthSeg = 96, heightSeg = 48) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let iy = 0; iy <= heightSeg; iy += 1) {
    const dec = 90 - (iy / heightSeg) * 180;
    const decRad = dec * DEG;
    for (let ix = 0; ix <= widthSeg; ix += 1) {
      const ra = (ix / widthSeg) * 360;
      const raRad = ra * DEG;
      const x = Math.cos(decRad) * Math.cos(raRad);
      const y = Math.cos(decRad) * Math.sin(raRad);
      const z = Math.sin(decRad);
      positions.push(x * radius, y * radius, z * radius);
      const zenithAngle = Math.acos(-z);
      /* Stellarium's own shader gets this same value from `atan2(x, y)` —
         but atan2 forces its result into (-π, π], which for this sweep
         means a hidden wrap at ra≈270° (RIGHT IN THE MIDDLE of the mesh,
         not at its own 0°/360° seam). Two adjacent columns straddling that
         ra then carry UVs on opposite sides of the wrap — one at u≈0,
         its neighbour at u≈1 — and the GPU has no idea those are the same
         point on the texture; it interpolates the *raw* numbers across the
         quad between them, smearing every column of the texture into that
         one strip. Magnified at a tight zoom, that smear is a flat,
         muddy, wrong-coloured patch covering real screen space — the red
         patch, not a rendering coincidence. Computing the identical
         quantity straight from `ra` avoids the forced wrap entirely: nothing
         needs re-wrapping until the sampler does it via RepeatWrapping,
         where it is actually safe. */
      const longitudeDeg = 90 - ra;
      /* No "+ 0.5" here — real MilkyWay.cpp's own texc.x is
         `modelLongitude / (2π)`, full stop, and a `+ 0.5` shifts the
         sampled column by exactly half the texture's width: 180° of
         celestial longitude, putting whatever is actually behind the
         observer in front of them instead. Not a guess — checked directly
         against `milkyway.png` itself: its own brightest column (summed
         over every row, so it is not sensitive to which declination band
         happens to be widest) measures at u≈0.498, and the real Galactic
         Centre (RA 266.4168°) predicts u≈0.51 through this exact formula
         with no offset — a clean match. The same formula *with* the old
         `+ 0.5` predicts u≈0.01, on the opposite side of the image
         entirely, which is exactly the "bright region is on the wrong
         side of the sky, sometimes below the horizon where Stellarium has
         it above" symptom this was reported as. */
      uvs.push(longitudeDeg / 360, zenithAngle / Math.PI);
    }
  }
  for (let iy = 0; iy < heightSeg; iy += 1) {
    for (let ix = 0; ix < widthSeg; ix += 1) {
      const a = iy * (widthSeg + 1) + ix;
      const b = a + widthSeg + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * Equatorial J2000 → the current alt-az scene frame, as a rotation — the
 * same hour-angle-then-latitude composition {@link equatorialToAltAz} (see
 * `horizon.ts`) already does one point at a time, derived here as a single
 * matrix so the whole Milky Way sphere turns by it at once. Two steps, same
 * as an equatorial mount: spin around the pole by the hour angle (sidereal
 * time, since every vertex already carries its own RA), then tip that pole
 * down to its real altitude for the observer's latitude.
 */
export function equatorialToHorizonMatrix(
  lstDegrees: number,
  latDeg: number,
  precessionDeg = 0,
  epsDateDeg = obliquity(0),
): THREE.Matrix4 {
  const lst = lstDegrees * DEG;
  const lat = latDeg * DEG;
  const sinLst = Math.sin(lst);
  const cosLst = Math.cos(lst);
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const m = new THREE.Matrix4();
  // prettier-ignore
  m.set(
    -sinLst,          cosLst,          0,       0,
    cosLst * cosLat,  sinLst * cosLat, sinLat,  0,
    cosLst * sinLat,  sinLst * sinLat, -cosLat, 0,
    0,                0,               0,       1,
  );
  /**
   * J2000 → equatorial of date, applied *before* the hour angle above.
   *
   * The survey's tiles and the panorama are J2000; every star drawn over them
   * is carried to the date (`s.lon + precessionSinceJ2000(dtDays)`, then
   * `eclipticToAltAz` with the obliquity of date). Feeding a date-based `lst`
   * to un-precessed J2000 coordinates silently treats them as equatorial *of
   * date*, so the whole imagery layer sat a general precession behind the
   * points drawn on it — about 0.36° in 2026. Nothing at a wide field, a third
   * of the frame at the 1° end, which is exactly where a नक्षत्र's stars stop
   * landing on the ones in the photograph.
   *
   * Precession is a rotation in *ecliptic* longitude, so it is composed the
   * way the stars' own path composes it: out of the equator into the ecliptic
   * of J2000, round the ecliptic pole by the accumulated angle, then back out
   * to the equator using the obliquity of date. `Rx(-eps)` is equatorial →
   * ecliptic in this codebase's own convention — read straight off
   * `equatorialToecliptic` in `horizon.ts`.
   */
  if (precessionDeg !== 0) {
    const toEclipticJ2000 = new THREE.Matrix4().makeRotationX(-obliquity(0) * DEG);
    const spin = new THREE.Matrix4().makeRotationZ(precessionDeg * DEG);
    const toEquatorialOfDate = new THREE.Matrix4().makeRotationX(epsDateDeg * DEG);
    m.multiply(toEquatorialOfDate).multiply(spin).multiply(toEclipticJ2000);
  }
  return m;
}

/**
 * Star size as a continuous function of magnitude, not a handful of fixed
 * tiers.
 *
 * `makeStarPoints` gave every star in a bucket the same flat size — which
 * read as three or four discrete disc sizes stamped across the sky, each
 * one considerably bigger than a planetarium actually draws a star. A real
 * one carries no apparent size at all; the size on screen is standing in
 * for brightness, so it wants to slide smoothly with magnitude the way
 * Sirius visibly outshining a मघा companion does, not jump in steps.
 * Linear in magnitude and clamped at both ends, capped modestly — a couple
 * of pixels for the faintest included, four or five for the very brightest.
 */
export function starPixelSize(
  mag: number,
  { faintest, brightest, minPx, maxPx }: { faintest: number; brightest: number; minPx: number; maxPx: number },
): number {
  const t = Math.min(1, Math.max(0, (faintest - mag) / (faintest - brightest)));
  return minPx + t * (maxPx - minPx);
}

/** Write each star's own pixel size into a group's `aSize` buffer, by magnitude. */
export function sizeStarsByMagnitude(
  points: THREE.Points,
  mags: number[],
  opts: { faintest: number; brightest: number; minPx: number; maxPx: number },
) {
  const attr = points.geometry.getAttribute("aSize") as THREE.BufferAttribute;
  for (let i = 0; i < mags.length; i += 1) {
    attr.setX(i, starPixelSize(mags[i], opts));
  }
  attr.needsUpdate = true;
}

/**
 * A companion star's own name-reveal threshold, continuous in field of
 * view — Stellarium's `StarMgr::maxMagStarName` rises the same way with its
 * limiting magnitude, itself a function of FOV (`StarMgr.cpp:1420-1424`,
 * `StelSkyDrawer::computeLimitMagnitude`), rather than every companion
 * switching on together at one zoom threshold. Wide open, nothing passes;
 * by the time the lens has pulled in to {@link close}'s own 24°, every
 * companion this file ever draws (faintest is 5.5) already clears it — so
 * the old hard cut and this one agree exactly at that edge, and only the
 * approach to it now reveals gradually instead of jumping.
 */
export function companionMagLimit(fovDeg: number): number {
  const wide = 40;
  const tight = 24;
  const t = Math.min(1, Math.max(0, (wide - fovDeg) / (wide - tight)));
  return -2 + t * (5.5 - -2);
}

/**
 * How strongly one deep-sky photograph is showing, 0–1, from how much of
 * the frame it actually covers.
 *
 * The previous attempt gated these on `maxBrightness` against a synthesised
 * limiting magnitude. That was the right *field* — it is what
 * `StelSkyImageTile::getTilesToDraw` really tests — but reproducing
 * `StelSkyDrawer::computeLimitMagnitude()`'s eye-adaptation solve by
 * guessing an anchor produced numbers with no relation to theirs, and the
 * practical result was a catalogue that never appeared at any zoom a reader
 * would actually reach.
 *
 * This is the honest version of the same intent: a photograph is worth
 * drawing when it is big enough on screen to read as a photograph, and not
 * before. `span / fov` is exactly that ratio — no invented constants, and
 * it needs nothing from Stellarium's tone reproducer. It also produces the
 * layering their sky has for free: Barnard's Loop at 14° covers half a 26°
 * frame and is therefore *background*, present the moment you look; the
 * Ring Nebula at 0.06° needs a field under a degree before it is anything
 * but a dot, and stays away until then.
 */
export function nebulaReveal(spanDeg: number, fovDeg: number): number {
  const fraction = spanDeg / Math.max(fovDeg, 0.02);
  /* Below a sixteenth of the frame an image is too small to read as
     anything and is not worth its texture — that is the only edge this
     needs. An upper one used to fade a photograph back out once it grew
     past about half the frame, on the theory that past that point it reads
     as wallpaper rather than an object in the sky. That theory does not
     survive a *large* object: Andromeda's own 3° span crosses that ceiling
     while still well inside the ordinary क्षितिज zoom range (1°–90°), so
     the one photograph a reader is most likely to actually search for
     vanished exactly when they zoomed in on it — the opposite of what
     zooming in on a photograph should ever do. There is no real "too big":
     the texture just shows more of itself, the same as any image viewer,
     right down to going soft at its own pixel limit. */
  return Math.min(1, Math.max(0, (fraction - 0.06) / 0.06));
}

/**
 * The locator ring's own reveal — unlike {@link nebulaReveal} for the
 * photograph itself, this one *does* fade back out once the object is
 * plainly on screen. Its whole job is flagging something too small yet to
 * read as a photo; once the photograph is actually filling a fair chunk of
 * the frame, a ring around it stops being a locator and starts being a
 * circle that just keeps growing as the reader zooms in — exactly the
 * "why is this thing so big" a flag-before-the-fact marker should never
 * cause once the thing itself has arrived. Fades out over the same width
 * it fades in with, so the two ends read as one smooth pulse rather than a
 * ring that snaps to full size the instant it appears and vanishes just as
 * abruptly once the photo has grown enough.
 */
export function nebulaMarkerReveal(spanDeg: number, fovDeg: number): number {
  const fraction = spanDeg / Math.max(fovDeg, 0.02);
  const fadeIn = Math.min(1, Math.max(0, (fraction / 1.6 - 0.06) / 0.06));
  const fadeOut = 1 - Math.min(1, Math.max(0, (fraction - 0.3) / 0.12));
  return Math.min(fadeIn, fadeOut);
}

/**
 * Real atmospheric extinction on the Milky Way panorama — the dimming that
 * comes from actually looking through more air the lower a patch of sky
 * sits, not a flat brightness the same wherever it happens to be in the
 * frame. Stellarium runs its own copy of this exact panorama through this
 * exact curve (`RefractionExtinction.cpp`'s `Extinction::airmass`, the
 * geometric-altitude fit from Young 1994, the same one `MilkyWay.cpp`'s own
 * shader calls) — the galactic bulge's own warm colour dims and reddens
 * toward black as it swings down near the skyline the same way any real
 * patch of sky does, which without this ours had no way to do: the same
 * bright pixel read exactly the same whether it was sitting at the zenith
 * or grazing the horizon.
 *
 * Computed once per vertex rather than per pixel: `vSinAlt` is
 * `sin(altitude)`, read straight off the sphere's own rotated position
 * (`mat3(modelMatrix) * position` — this mesh is re-quaternioned to the
 * observer's horizon every frame, so `modelMatrix` alone already carries
 * the sky's current orientation, with no separate altitude lookup needed).
 * The extinction gradient is smooth enough that the sphere's own vertex
 * density loses nothing visible carrying it this way, and it is one
 * interpolated float instead of a second matrix multiply in the fragment
 * stage.
 */
/**
 * Real MilkyWay.cpp's own light-pollution correction is `1.1 -
 * bortleIntensity * 0.1`, `bortleIntensity` built from the simulated
 * observer's naked-eye limiting magnitude — a live measurement this app has
 * no sky-glow model to drive. `HIPS_BORTLE = 2` is a fixed stand-in for the
 * dark rural site this feature is actually framed around, not a
 * measurement; {@link HIPS_BORTLE_FACTOR} is that same formula evaluated
 * once at that fixed value (0.9) rather than a uniform recomputed
 * per-frame, since nothing here ever changes it.
 */
export const HIPS_BORTLE = 2;

export const HIPS_BORTLE_FACTOR = 1.1 - HIPS_BORTLE * 0.1;

export function injectMilkyWayExtinction(material: THREE.MeshBasicMaterial): void {
  if (material.userData.extinction) return;
  material.userData.extinction = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.(shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vSinAlt;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvSinAlt = normalize(mat3(modelMatrix) * position).y;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying float vSinAlt;
/* Young (1994)'s fit, geometric altitude — {@link Extinction::airmass}'s
   own "apparent_z = false" branch, which is the one MilkyWay.cpp calls.
   Stellarium never evaluates this below the horizon at all — its ground
   blocks the view, so the branch below never mattered there. This dome
   has no such floor at a wide enough field (a fisheye past ~180° shows
   sky *and* what would be underground in every direction at once).

   The fit itself is a rational polynomial only well-behaved for the
   *above*-horizon domain it was built for: fed a large negative cosZ
   (deep "underground") the denominator changes sign and the whole
   fraction goes negative, which as an exponent on 0.3 *brightens* the
   pixel past its own original colour — worse than doing nothing.
   Clamping that blow-up to a single large fixed airmass instead (an
   earlier version of this fix) swung the other way: the real curve is
   already near-total extinction within a couple of degrees of the
   horizon on either side, so *any* "big number" clamp reads as flat
   black the instant the horizon is crossed, and the band simply stopped
   existing below it.

   Mirroring the input around the horizon — abs(cosZ) — sidesteps both
   failure modes at once instead of patching either one: it never leaves
   the polynomial's own well-behaved domain (abs keeps the argument in
   the same [0, 1] range zenith-to-horizon already uses without
   incident), so ten degrees under the horizon gets exactly the
   extinction ten degrees above it already had — a real, continuously
   fading band on both sides of the line, not a cliff to full brightness
   or a cliff to black. */
float milkyWayAirmass(float cosZ) {
  float z = abs(cosZ);
  float nom = (1.002432 * z + 0.148386) * z + 0.0096467;
  float denom = ((z + 0.149864) * z + 0.0102963) * z + 0.000303978;
  return nom / denom;
}`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
/* 0.2 mag/airmass — a typical clear-sky extinction coefficient, the same
   default Stellarium ships. 0.3 as the base, not the photometric 2.512:
   the same deliberate choice already made for {@link skyBoost}'s sibling
   comment, "one magnitude ≈ 30%", so a dim band still reads as present
   near the horizon instead of clipping straight to black a touch too soon.

   Real MilkyWay.cpp multiplies this same pow(0.3, mag) by a second term,
   its own light-pollution correction built from a live Bortle-scale
   estimate — see {@link HIPS_BORTLE_FACTOR}'s own doc comment for why this
   uses a fixed stand-in instead. */
{
  float mag = milkyWayAirmass(vSinAlt) * 0.2;
  diffuseColor.rgb *= pow(0.3, mag) * ${HIPS_BORTLE_FACTOR};
}`,
      );
  };
  const prevKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${prevKey.call(material)}|milkyway-extinction-v1`;
  material.needsUpdate = true;
}

/* Scratch vectors for {@link nebulaInView}: the frame loop runs this per
   image per frame, and allocating there is how a smooth pan turns into a
   sawtooth of garbage collections. */
export const nebulaCamDir = new THREE.Vector3();

export const nebulaToImage = new THREE.Vector3();

/**
 * Is this photograph anywhere near what the camera is actually pointed at?
 *
 * This is the cheap equivalent of `StelSkyImageTile::getTilesToDraw`'s real
 * test — does the image's sky polygon intersect the current field of view —
 * and it is what keeps the catalogue from loading all at once. Zoom alone
 * is not enough of a gate: at 30° every wide field in the catalogue clears
 * {@link nebulaReveal} simultaneously, wherever in the sky it happens to
 * be, so without this the first press of zoom-in fetches images that are
 * behind the reader's head.
 *
 * A sprite is a flat patch centred on one direction, so the polygon test
 * collapses to an angle: the separation between the view axis and the
 * image's own direction, against the frame's half-diagonal plus the
 * image's own half-span. The half-diagonal, not the half-height — an image
 * in a screen corner is in view — and a further 1.35 of margin so an image
 * is fetched slightly before it is panned onto, not as it appears.
 */
export function nebulaInView(
  camera: THREE.Camera,
  at: THREE.Vector3,
  fovDeg: number,
  spanDeg: number,
  aspect: number,
): boolean {
  camera.getWorldDirection(nebulaCamDir);
  nebulaToImage.copy(at).sub(camera.position);
  if (nebulaToImage.lengthSq() === 0) return true;
  nebulaToImage.normalize();
  const sep = Math.acos(Math.min(1, Math.max(-1, nebulaCamDir.dot(nebulaToImage)))) / DEG;
  const halfDiagonal = (fovDeg / 2) * Math.hypot(1, Math.max(1, aspect));
  return sep <= halfDiagonal * 1.35 + spanDeg / 2;
}

/** Write one vertex of any position-buffered object. */
export function setVertex(
  object: THREE.Object3D & { geometry: THREE.BufferGeometry },
  i: number,
  v: [number, number, number],
) {
  const attr = object.geometry.getAttribute("position") as THREE.BufferAttribute;
  attr.setXYZ(i, v[0], v[1], v[2]);
}

export const Y_UP = new THREE.Vector3(0, 1, 0);

/*
 * Eclipse shadow: two open cones on one axis — the dark umbra inside a wider, fainter
 * penumbra. A unit cylinder is reshaped in the vertex shader (radius `uR0` at the near end
 * `y = 0`, `uR1` at the far end `y = 1`), and the fragment shader fades it the way a
 * shadow in thin haze reads: densest looking through the core, gone at the silhouette,
 * eased in at the source and thinning towards the far end. No hard rim, no flat disc.
 */
const SHADOW_VERT = `
uniform float uR0;
uniform float uR1;
varying float vT;
varying vec3 vNormalV;
varying vec3 vPosV;
void main() {
  vT = position.y + 0.5;
  float r = mix(uR0, uR1, vT);
  vec3 p = vec3(position.x * r, position.y, position.z * r);
  vec3 n = normalize(vec3(position.x, 0.0, position.z));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vPosV = mv.xyz;
  vNormalV = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * mv;
}
`;

const SHADOW_FRAG = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uSoft;
uniform float uTail;
varying float vT;
varying vec3 vNormalV;
varying vec3 vPosV;
void main() {
  float facing = abs(dot(normalize(vNormalV), normalize(-vPosV)));
  float body = pow(facing, uSoft);
  float ends = smoothstep(0.0, 0.12, vT) * (1.0 - uTail * vT);
  float a = uOpacity * body * ends;
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

type ShadowLayer = THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial>;

function makeShadowLayer(color: number, soft: number, tail: number, renderOrder: number): ShadowLayer {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 1, 48, 16, true),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 0 },
        uSoft: { value: soft },
        uTail: { value: tail },
        uR0: { value: 1 },
        uR1: { value: 1 },
      },
      vertexShader: SHADOW_VERT,
      fragmentShader: SHADOW_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = renderOrder;
  return mesh;
}

export type EclipseShadow = THREE.Group & { userData: { umbra: ShadowLayer; penumbra: ShadowLayer } };

/** An eclipse shadow (umbra + penumbra), hidden until {@link placeEclipseShadow} shows it. */
export function makeEclipseShadow(umbraColor: number, penumbraColor: number): EclipseShadow {
  const group = new THREE.Group() as EclipseShadow;
  const penumbra = makeShadowLayer(penumbraColor, 2.2, 0.35, 3);
  const umbra = makeShadowLayer(umbraColor, 1.1, 0.2, 4);
  group.add(penumbra, umbra);
  group.userData = { umbra, penumbra };
  group.visible = false;
  return group;
}

export type EclipseShadowShape = {
  /** Umbra radius at the body casting the shadow, and where it lands. */
  umbra: [number, number];
  /** Penumbra radius at the body casting the shadow, and where it lands. */
  penumbra: [number, number];
  /** Peak opacity of the umbra's core; the penumbra gets a share of it. */
  strength: number;
};

/** Run the shadow from the body casting it (`from`) to where it falls (`to`). */
export function placeEclipseShadow(
  shadow: EclipseShadow,
  from: THREE.Vector3,
  to: THREE.Vector3,
  shape: EclipseShadowShape,
  axis: THREE.Vector3,
) {
  axis.copy(to).sub(from);
  const len = axis.length();
  if (len < 0.2 || shape.strength <= 0) {
    shadow.visible = false;
    return;
  }
  shadow.position.copy(from).add(to).multiplyScalar(0.5);
  /* The cylinder's -y end is `from`, so the shader's `vT = 0` is the casting body. */
  shadow.quaternion.setFromUnitVectors(Y_UP, axis.multiplyScalar(1 / len));
  shadow.scale.set(1, len, 1);
  const { umbra, penumbra } = shadow.userData;
  umbra.material.uniforms.uR0!.value = shape.umbra[0];
  umbra.material.uniforms.uR1!.value = shape.umbra[1];
  umbra.material.uniforms.uOpacity!.value = shape.strength;
  penumbra.material.uniforms.uR0!.value = shape.penumbra[0];
  penumbra.material.uniforms.uR1!.value = shape.penumbra[1];
  penumbra.material.uniforms.uOpacity!.value = shape.strength * 0.45;
  shadow.visible = true;
}

/** Free both cones' geometry and shaders. */
export function disposeEclipseShadow(shadow: EclipseShadow) {
  for (const layer of [shadow.userData.umbra, shadow.userData.penumbra]) {
    layer.geometry.dispose();
    layer.material.dispose();
  }
}

/**
 * Whether a freshly projected label list differs from the one on screen by
 * enough to be worth re-rendering — a pixel, in either axis.
 */
export function labelsMoved(prev: ScreenLabel[], next: ScreenLabel[]): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < next.length; i += 1) {
    const a = prev[i];
    const b = next[i];
    /* `dim` counts as movement: which राशि and नक्षत्र are lit changes on
       selection, and on a paused sky nothing else about the label does — so
       leaving it out froze the bright pair on whoever was picked first. */
    if (
      a.id !== b.id ||
      a.dim !== b.dim ||
      /* Same reason as `dim`: crossing the skyline changes nothing about where
         a label sits, only how brightly it is drawn, so on a paused sky the
         fade would never be handed over. */
      a.below !== b.below ||
      Math.abs(a.x - b.x) >= 0.5 ||
      Math.abs(a.y - b.y) >= 0.5
    )
      return true;
  }
  return false;
}

export const NAMED_LABEL_KINDS = new Set(["star", "asterism", "vedicstar", "polestar", "culture"]);

/** Prefer the figure name, then drop any name sitting on top of one already kept. */
export function cullOverlappingNames(labels: ScreenLabel[], minDist = 36): ScreenLabel[] {
  const named = labels.filter((l) => NAMED_LABEL_KINDS.has(l.kind));
  if (named.length < 2) return labels;
  const rest = labels.filter((l) => !NAMED_LABEL_KINDS.has(l.kind));
  const rank = (l: ScreenLabel) =>
    l.kind === "asterism"
      ? 0
      : l.kind === "culture"
        ? 1
        : l.kind === "vedicstar"
          ? 2
          : l.kind === "polestar"
            ? 3
            : 4;
  named.sort((a, b) => rank(a) - rank(b));
  const kept: ScreenLabel[] = [];
  for (const label of named) {
    if (kept.some((k) => Math.hypot(k.x - label.x, k.y - label.y) < minDist)) continue;
    kept.push(label);
  }
  return [...rest, ...kept];
}

const faceX = new THREE.Vector3();
const faceY = new THREE.Vector3();
const faceZ = new THREE.Vector3();
const faceBasis = new THREE.Matrix4();

/**
 * Tidal lock: turn a body so its texture's centre (local +X on a three.js sphere, where an
 * equirectangular map's longitude 0 lands) faces the scene origin — the Earth — with its
 * north along `up`. Called every frame, it makes exactly one rotation per orbit, which is
 * why the Moon always shows us the same face.
 */
export function faceOrigin(object: THREE.Object3D, at: readonly [number, number, number], up: THREE.Vector3) {
  faceX.set(-at[0], -at[1], -at[2]);
  if (faceX.lengthSq() < 1e-12) return;
  faceX.normalize();
  faceZ.crossVectors(faceX, up);
  if (faceZ.lengthSq() < 1e-12) return;
  faceZ.normalize();
  faceY.crossVectors(faceZ, faceX);
  faceBasis.makeBasis(faceX, faceY, faceZ);
  object.quaternion.setFromRotationMatrix(faceBasis);
}

/**
 * Sidereal rotation periods, in days. Negative turns the other way (Venus is retrograde).
 * The Sun's is its equator's (it does not turn as one body); the Moon is tidally locked
 * and set by {@link faceOrigin} instead; राहु / केतु are points and do not turn.
 */
export const ROTATION_PERIOD_DAYS: Partial<Record<GrahaKey, number>> = {
  sun: 25.38,
  mercury: 58.646,
  venus: -243.025,
  mars: 1.02596,
  jupiter: 0.41354,
  saturn: 0.444,
};

/** Spin about the body's own axis at `dtDays` since J2000, radians in [0, 2π). */
export function spinAngle(key: GrahaKey, dtDays: number): number {
  const period = ROTATION_PERIOD_DAYS[key];
  if (!period) return 0;
  const turns = (dtDays / period) % 1;
  return (turns < 0 ? turns + 1 : turns) * Math.PI * 2;
}
