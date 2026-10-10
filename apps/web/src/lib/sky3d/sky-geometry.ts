/**
 * Static sky furniture, expressed once in ecliptic / horizon coordinates.
 *
 * None of this moves with time: the zodiac band is always 12 × 30° of ecliptic
 * longitude and the alt-az grid is always fixed to the observer. Only the
 * *mapping* onto the dome changes each frame, so the vertices are built once
 * here and transformed in the render loop.
 */

import { NAKSHATRA_ARC, RASHI_ARC } from "@/lib/sky3d/geocentric-model";

/** A point on the celestial sphere in ecliptic coordinates, degrees. */
export type eclipticPoint = { lon: number; lat: number };
/** A point in the observer's horizon frame, degrees. */
export type HorizonPoint = { alt: number; az: number };

/**
 * Half-width of the zodiac, ±9° about the ecliptic — the Sun's own path, with
 * room either side for every graha's shara. Rashi and nakshatra divide exactly
 * the same band: 12 ways and 27 ways.
 */
export const RASHI_BAND_LAT = 9;
export const NAK_BAND_LAT = 9;

/** Where the rashi name sits, in ecliptic latitude — just inside the north edge. */
export const RASHI_LABEL_LAT = 6.4;
/** Where the nakshatra name sits — inside the south edge, so the two never collide. */
export const NAK_LABEL_LAT = -6.4;

/** Points per full circle for the smooth band edges. */
const EDGE_STEPS = 180;

function edge(lat: number): eclipticPoint[] {
  return Array.from({ length: EDGE_STEPS + 1 }, (_, i) => ({
    lon: (i / EDGE_STEPS) * 360,
    lat,
  }));
}

/** The four long edges of the two bands, plus the ecliptic itself. */
export const BAND_EDGES = {
  rashiOuter: edge(RASHI_BAND_LAT),
  rashiInner: edge(-RASHI_BAND_LAT),
  nakOuter: edge(NAK_BAND_LAT),
  nakInner: edge(-NAK_BAND_LAT),
  ecliptic: edge(0),
};

/** Line-segment pairs, flattened: [a0, b0, a1, b1, …]. */
export type SegmentPairs = eclipticPoint[];

function dividers(count: number, halfLat: number): SegmentPairs {
  const out: SegmentPairs = [];
  for (let i = 0; i < count; i += 1) {
    const lon = (360 / count) * i;
    out.push({ lon, lat: -halfLat }, { lon, lat: halfLat });
  }
  return out;
}

/** The 12 rashi boundaries, drawn across the full width of the zodiac band. */
export const RASHI_DIVIDERS: SegmentPairs = dividers(12, RASHI_BAND_LAT);

/** The 27 nakshatra boundaries, across the inner strip. */
export const NAKSHATRA_DIVIDERS: SegmentPairs = dividers(27, NAK_BAND_LAT);

/** The 108 pada boundaries, as short ticks off the ecliptic. */
export const PADA_TICKS: SegmentPairs = (() => {
  const out: SegmentPairs = [];
  const arc = NAKSHATRA_ARC / 4;
  for (let i = 0; i < 108; i += 1) {
    if (i % 4 === 0) continue; // the nakshatra boundary itself is already drawn
    const lon = arc * i;
    out.push({ lon, lat: -3 }, { lon, lat: 3 });
  }
  return out;
})();

/**
 * A degree scale along the ecliptic: a tick every degree, longer every five,
 * longer still at each rashi boundary — the ruler that runs down the middle of
 * the band in a star atlas.
 */
export const DEGREE_TICKS: SegmentPairs = (() => {
  const out: SegmentPairs = [];
  for (let lon = 0; lon < 360; lon += 1) {
    const inRashi = lon % RASHI_ARC;
    const length = inRashi === 0 ? 2.6 : lon % 5 === 0 ? 1.6 : 0.9;
    out.push({ lon, lat: 0 }, { lon, lat: length });
  }
  return out;
})();

/**
 * The alt-az cage, one resolution on screen at a time.
 *
 * The cage is never off — pulled all the way out to the 240° fisheye you still
 * get the full web, verticals running pole to pole through the zenith and the
 * nadir and almucantars ringing them. What changes with zoom is only how fine
 * it is, because the whole web cannot be on screen at once.
 *
 * Only one tier is ever drawn. Stellarium's own grid (GridLinesMgr.cpp's
 * `getClosestResolutionDMS`) picks a single step that keeps the on-screen
 * spacing roughly constant and draws exactly that — never a coarse cage with
 * a finer one layered on top of it. Stacking tiers (an earlier version of
 * this file did) reads as a muddy crosshatch the moment two or three
 * thresholds are satisfied at once; a single resolution is what actually
 * looks like a grid at every zoom.
 *
 * Spacing is in **arcminutes**, not degrees. Once the lens reaches a 1° crop
 * the interesting steps are 30′, 10′, 5′, and stepping a loop by 1/6 of a
 * degree walks off the line it is drawing by the far side of the sphere —
 * integer arcminutes cannot drift.
 *
 * `local` marks the tiers too fine to bake as whole spheres: a 5′ cage over
 * the entire sky is millions of vertices for a window that shows one degree of
 * it. Those are rebuilt each frame over the patch actually in view, which at
 * that zoom is a few hundred points.
 *
 * `maxFov` is exclusive: the tier is on while the vertical field is *below*
 * it, and `Infinity` is the tier that is never off. Ordered coarse to fine.
 */
export type GridTier = {
  /** Spacing in arcminutes. */
  step: number;
  /** Shown while the vertical field of view is under this, degrees. */
  maxFov: number;
  /** Rebuilt per frame over the visible patch instead of baked whole. */
  local?: boolean;
};

/** One arcminute, in degrees. */
export const ARCMIN = 1 / 60;

/** The one line opacity the active tier draws at — Stellarium's grid is a flat grey at any zoom, not fainter the finer it gets. */
export const GRID_OPACITY = 0.8;

/**
 * The exact spacing table from stellarium-web-engine's `src/modules/lines.c`
 * (`STEPS_AZ`) — 15°, 5°, 1°, 20′, 10′, 5′, 1′, 20″, 10″, 5″, 1″ — in
 * arcminutes. Not a round-number ladder of our own choosing: this is the
 * literal list the reference implementation snaps to.
 */
const STEPS_AZ_ARCMIN = [
  900,
  300,
  60,
  20,
  10,
  5,
  1,
  1 / 3,
  1 / 6,
  1 / 12,
  1 / 60,
];

/**
 * `get_steps()` in `lines.c` targets `fov / 6` (so the frame carries roughly
 * six lines along that axis) and `steps_lookup()` snaps that target to a step
 * from `STEPS_AZ`. Only one entry is ever selected — zooming *replaces* the
 * active step, it never layers a finer grid on top of a coarser one still on
 * screen, which this table already does by construction (see
 * {@link gridStepForFov}).
 *
 * A step S stays the right choice for as long as it's no finer than the
 * target, i.e. while `S >= fov/6` — the moment `fov/6` grows past S, S would
 * be drawing *more* than six lines and the next coarser entry takes over.
 * So the field of view at which a step stops being valid is `fov = 6 * S`
 * (in arcmin, `S/10`, since target-in-arcmin is `fov * 10`). That's what
 * `maxFov` below is for each entry, worked out from {@link STEPS_AZ_ARCMIN}
 * rather than picked by eye.
 *
 * This is a ceiling, not a nearest-match: {@link STEPS_AZ_ARCMIN} has real
 * gaps in it (5° to 1° is a 5× jump, with nothing at 2° or 3°), and snapping
 * to whichever entry is numerically *closest* to the target lets the step
 * undershoot badly in the middle of a gap — at fov=15° the nearest entry to
 * a 2.5° target is 1°, which draws fifteen lines instead of six. Snapping up
 * to the smallest entry still `>= target` instead caps the line count at
 * six everywhere, at the cost of sometimes drawing fewer than six right
 * before the next finer step kicks in — sparse reads better than crowded.
 *
 * This app's field of view only ever runs 1°–235°, so the sub-arcminute
 * entries (20″ and finer) never actually get selected — they're kept in the
 * table anyway for fidelity to the reference, as harmless dead entries
 * rather than a truncated copy of it.
 */
export const GRID_TIERS: readonly GridTier[] = [
  { step: 900, maxFov: Infinity }, // 15° — also the floor: nothing coarser exists above fov=90
  { step: 300, maxFov: 30 }, // 5°
  { step: 60, maxFov: 6 }, // 1°
  { step: 20, maxFov: 2, local: true }, // 20′
  { step: 10, maxFov: 1, local: true }, // 10′
  { step: 5, maxFov: 0.5, local: true }, // 5′
  { step: 1, maxFov: 0.1, local: true }, // 1′
  { step: 1 / 3, maxFov: 1 / 30, local: true }, // 20″
  { step: 1 / 6, maxFov: 1 / 60, local: true }, // 10″
  { step: 1 / 12, maxFov: 1 / 120, local: true }, // 5″
  { step: 1 / 60, maxFov: 1 / 600, local: true }, // 1″
];

/**
 * The spacing the *verticals* are drawn at, arcminutes.
 *
 * Meridians converge on the poles: two of them `Δaz` apart are only
 * `Δaz·cos(alt)` apart on the sky at altitude `alt`, and at the zenith they
 * are not apart at all. Choosing their spacing from the field of view alone —
 * which is what {@link gridStepForFov} does, and what the cage used to do for
 * both families — therefore says nothing about how far apart they will
 * actually look. Pointed near the pole at a 5° field it picked 1°, which is
 * 360 verticals all meeting inside the frame: a solid fan, not a grid.
 *
 * So the field is divided by `cos(alt)` before the tier is chosen — the same
 * projection factor, asked the other way round. Near the horizon `cos` is 1
 * and nothing changes; overhead the target widens until the coarsest tier
 * wins and the pole is crossed by fifteen-degree ribs you can count. That is
 * what Stellarium draws in the same place, and for this reason.
 *
 * The almucantars need no such correction: circles of equal altitude keep
 * their spacing all the way to the pole, which is why the two families are
 * asked separately at all.
 */
export function verticalStepForFov(
  fovDeg: number,
  centreAltDeg: number,
): number {
  const cos = Math.abs(Math.cos((centreAltDeg * Math.PI) / 180));
  /* Floored rather than guarded: exactly at the pole the spread is infinite,
     and every value past the coarsest tier's threshold selects that tier
     anyway, so anything comfortably above it does. */
  const spread = fovDeg / Math.max(cos, 1e-3);
  return gridStepForFov(Math.min(spread, 360));
}

/** The finest spacing the cage is drawing at this field of view, arcminutes. */
export function gridStepForFov(fovDeg: number): number {
  let step = GRID_TIERS[0].step;
  for (const tier of GRID_TIERS) {
    if (fovDeg < tier.maxFov) step = tier.step;
  }
  return step;
}

/* Sanity check the table was built consistently with STEPS_AZ_ARCMIN, since
   the boundary values above are hand-derived from it. */
if (GRID_TIERS.length !== STEPS_AZ_ARCMIN.length) {
  throw new Error("GRID_TIERS must mirror STEPS_AZ_ARCMIN one-for-one");
}

/**
 * 90° of azimuth, in arcminutes — the spacing of उ / पू / द / प.
 *
 * Every tier leaves these four verticals out and {@link CARDINAL_VERTICALS}
 * draws them instead, at full length and full strength, so N–E–S–W read as the
 * ribs of the dome at any zoom rather than dissolving into whatever spacing
 * the lens happens to be showing.
 */
const CARDINAL_AZ_MIN = 5400;

/** True for azimuth 0° / 90° / 180° / 270°, wrapped, in arcminutes. */
function isCardinalAz(azMin: number): boolean {
  return ((azMin % CARDINAL_AZ_MIN) + CARDINAL_AZ_MIN) % CARDINAL_AZ_MIN === 0;
}

/** Segments along a meridian of constant azimuth, nadir to zenith. */
function verticalArc(az: number, steps: number): HorizonPoint[] {
  const out: HorizonPoint[] = [];
  for (let i = 0; i < steps; i += 1) {
    out.push(
      { alt: -90 + (i / steps) * 180, az },
      { alt: -90 + ((i + 1) / steps) * 180, az },
    );
  }
  return out;
}

/**
 * The four cardinal verticals — great-circle arcs at azimuth 0° (उत्तर), 90°
 * (पूर्व), 180° (दक्षिण) and 270° (पश्चिम), each running from the nadir up
 * through the horizon to the zenith.
 *
 * Their own always-on layer rather than part of a tier: they are the frame you
 * take a bearing against, and at a 260° field the tier they would belong to is
 * thirty-six equally faint lines with no way to tell which one is north.
 */
export const CARDINAL_VERTICALS: HorizonPoint[] = [0, 90, 180, 270].flatMap(
  (az) => verticalArc(az, 120),
);

/**
 * A small diagonal cross on the zenith, and its twin on the nadir.
 *
 * Altitude 90° is a *point*, not a ring — every vertical ends there — so it
 * gets a mark instead of a circle. Laid along the intercardinals so it never
 * sits on top of {@link CARDINAL_VERTICALS}, and stopped short of the pole
 * itself so the four strokes read as a cross rather than a blot.
 */
export const POLE_MARKS: HorizonPoint[] = (() => {
  const out: HorizonPoint[] = [];
  for (const pole of [1, -1]) {
    for (const az of [45, 135, 225, 315]) {
      out.push({ alt: pole * 86, az }, { alt: pole * 89.4, az });
    }
  }
  return out;
})();

/**
 * Disconnected segment pairs for the whole-sky azimuth cage, spacing in
 * arcminutes. Only one tier is ever on screen (see {@link GRID_TIERS}), so
 * this draws every line at its own step rather than leaving the round
 * numbers to a coarser layer underneath.
 */
/**
 * The almucantars — circles of equal altitude — at one spacing.
 *
 * Split from the verticals because the two families no longer share a step:
 * see {@link verticalStepForFov}.
 */
export function buildAlmucantarPairs(stepMin: number): HorizonPoint[] {
  const circleSteps = stepMin <= 60 ? 240 : 180;
  const pairs: HorizonPoint[] = [];
  for (
    let altMin = -5400 + stepMin;
    altMin <= 5400 - stepMin;
    altMin += stepMin
  ) {
    const alt = altMin * ARCMIN;
    for (let i = 0; i < circleSteps; i += 1) {
      pairs.push(
        { alt, az: (i / circleSteps) * 360 },
        { alt, az: ((i + 1) / circleSteps) * 360 },
      );
    }
  }
  return pairs;
}

/** The verticals — meridians from pole to pole — at one spacing. */
export function buildVerticalPairs(stepMin: number): HorizonPoint[] {
  const verticalSteps = stepMin <= 60 ? 180 : 72;
  const pairs: HorizonPoint[] = [];
  for (let azMin = 0; azMin < 21600; azMin += stepMin) {
    if (isCardinalAz(azMin)) continue;
    const az = azMin * ARCMIN;
    for (let i = 0; i < verticalSteps; i += 1) {
      pairs.push(
        { alt: -90 + (i / verticalSteps) * 180, az },
        { alt: -90 + ((i + 1) / verticalSteps) * 180, az },
      );
    }
  }
  return pairs;
}

/** The patch of sky a local tier is drawn over — degrees. */
export type GridWindow = {
  altLo: number;
  altHi: number;
  azLo: number;
  azHi: number;
};

/** Segments along one line of a local patch. The window is small; this is ample. */
const LOCAL_SEGMENTS = 48;
/** Lines per axis a local patch will draw before it gives up and thins out.
 *  ½° around the zenith is ~360 extra meridians (the 1° set is already baked). */
const LOCAL_MAX_LINES = 400;

/**
 * The same cage, but only over `window` — for the tiers whose whole-sky form
 * would be millions of vertices. Written into `out` and the count returned, so
 * the caller can keep one buffer and refill it per frame. Only one tier is
 * ever on screen (see {@link GRID_TIERS}), so — like {@link
 * buildAzimuthGridPairs} — this draws every line at its own step.
 */
/**
 * The fine cage, built only for the patch of sky in frame.
 *
 * The two steps are independent and either may be null, meaning "that family
 * is coming from a baked whole-sky tier instead". Near the pole that is the
 * normal case: arcminute almucantars local to the window, and verticals coarse
 * enough that the baked 15° tier serves them. See {@link verticalStepForFov}.
 */
export function buildLocalGridPairs(
  altStepMin: number | null,
  azStepMin: number | null,
  window: GridWindow,
  out: HorizonPoint[],
): number {
  let n = 0;
  const push = (alt: number, az: number) => {
    const p = out[n];
    if (p) {
      p.alt = alt;
      p.az = az;
    } else {
      out[n] = { alt, az };
    }
    n += 1;
  };

  let lines = 0;
  if (altStepMin) {
    const altFrom = Math.ceil((window.altLo * 60) / altStepMin) * altStepMin;
    for (
      let altMin = altFrom;
      altMin <= window.altHi * 60;
      altMin += altStepMin
    ) {
      if (lines >= LOCAL_MAX_LINES) break;
      if (Math.abs(altMin) >= 5400) continue;
      lines += 1;
      const alt = altMin * ARCMIN;
      for (let i = 0; i < LOCAL_SEGMENTS; i += 1) {
        const a =
          window.azLo + ((window.azHi - window.azLo) * i) / LOCAL_SEGMENTS;
        const b =
          window.azLo +
          ((window.azHi - window.azLo) * (i + 1)) / LOCAL_SEGMENTS;
        push(alt, a);
        push(alt, b);
      }
    }
  }

  if (azStepMin) {
    const azFrom = Math.ceil((window.azLo * 60) / azStepMin) * azStepMin;
    lines = 0;
    for (let azMin = azFrom; azMin <= window.azHi * 60; azMin += azStepMin) {
      if (lines >= LOCAL_MAX_LINES) break;
      if (isCardinalAz(azMin)) continue;
      lines += 1;
      const az = azMin * ARCMIN;
      for (let i = 0; i < LOCAL_SEGMENTS; i += 1) {
        const a =
          window.altLo + ((window.altHi - window.altLo) * i) / LOCAL_SEGMENTS;
        const b =
          window.altLo +
          ((window.altHi - window.altLo) * (i + 1)) / LOCAL_SEGMENTS;
        push(a, az);
        push(b, az);
      }
    }
  }
  return n;
}

/** Upper bound on the points {@link buildLocalGridPairs} can write. */
export const LOCAL_GRID_CAPACITY = LOCAL_MAX_LINES * LOCAL_SEGMENTS * 2 * 2;

/**
 * Azimuth grid: almucantars every 10° of altitude and verticals every 10° of
 * azimuth — the green cage Stellarium draws over the local sky.
 *
 * Verticals run zenith to nadir so they really do meet at one point when you
 * look up; almucantars skip the poles (a circle of radius zero) and include
 * the horizon. Both hemispheres, so क्षितिजमुनि off still has a cage underfoot.
 */
export const GRID_LINES: HorizonPoint[][] = (() => {
  const lines: HorizonPoint[][] = [];
  for (let alt = -80; alt <= 80; alt += 10) {
    const steps = alt === 0 ? 180 : 144;
    lines.push(
      Array.from({ length: steps + 1 }, (_, i) => ({
        alt,
        az: (i / steps) * 360,
      })),
    );
  }
  for (let az = 0; az < 360; az += 10) {
    lines.push(
      Array.from({ length: 73 }, (_, i) => ({ alt: -90 + (i / 72) * 180, az })),
    );
  }
  return lines;
})();

/* ── the Earth globe ───────────────────────────────────────────────────── */

/** A point on the Earth's surface, degrees. */
export type GeoPoint = { lat: number; lon: number };

/**
 * The obliquity the tropics are *built* at — near enough for any sky within a
 * lifetime of now. The scene rewrites the two circles to the live value when
 * the clock travels far enough for the difference to show, which on this axis
 * is most of a degree.
 */
export const TROPIC_LAT = 23.44;

function parallel(lat: number, steps = 120): GeoPoint[] {
  return Array.from({ length: steps + 1 }, (_, i) => ({
    lat,
    lon: (i / steps) * 360,
  }));
}

function meridian(lon: number, steps = 60): GeoPoint[] {
  return Array.from({ length: steps + 1 }, (_, i) => ({
    lat: -90 + (i / steps) * 180,
    lon,
  }));
}

/** Parallels every 15°, minus the ones drawn in their own colour. */
export const GLOBE_PARALLELS: GeoPoint[][] = (() => {
  const out: GeoPoint[][] = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    if (lat === 0) continue;
    out.push(parallel(lat));
  }
  return out;
})();

/** Meridians every 15° of longitude. */
export const GLOBE_MERIDIANS: GeoPoint[][] = Array.from(
  { length: 24 },
  (_, i) => meridian(i * 15),
);

/** The equator — where the Sun stands at both sampat (equinox) points. */
export const GLOBE_EQUATOR: GeoPoint[] = parallel(0, 180);

/**
 * The two tropics: the northern limit the Sun reaches at Karka Sankranti and
 * the southern limit at Makara Sankranti. Uttarayana is the half-year the
 * subsolar point spends climbing from one to the other.
 */
export const GLOBE_TROPICS: {
  lat: number;
  id: "cancer" | "capricorn";
  points: GeoPoint[];
}[] = [
  { lat: TROPIC_LAT, id: "cancer", points: parallel(TROPIC_LAT) },
  { lat: -TROPIC_LAT, id: "capricorn", points: parallel(-TROPIC_LAT) },
];

/**
 * The four turning points of the Sun's year, by tropical longitude: the two
 * sampat where it crosses the equator and the two ayana ends where it turns.
 */
export const SOLAR_STATIONS: {
  id: string;
  tropicalLon: number;
  ne: string;
  en: string;
}[] = [
  { id: "vasanta", tropicalLon: 0, ne: "वसन्त सम्पात", en: "Vernal equinox" },
  {
    id: "karka",
    tropicalLon: 90,
    ne: "कर्क संक्रान्ति · उत्तरायणान्त",
    en: "Summer solstice",
  },
  { id: "sharad", tropicalLon: 180, ne: "शरद् सम्पात", en: "Autumn equinox" },
  {
    id: "makara",
    tropicalLon: 270,
    ne: "मकर संक्रान्ति · उत्तरायण आरम्भ",
    en: "Winter solstice",
  },
];

/** Azimuth readings that get a degree label on the horizon. */
export const GRID_AZIMUTH_LABELS = Array.from({ length: 36 }, (_, i) => i * 10);

/** The eight compass points, with the four cardinals called out. */
export const COMPASS_POINTS: {
  az: number;
  en: string;
  ne: string;
  major: boolean;
}[] = [
  { az: 0, en: "N", ne: "उ", major: true },
  { az: 45, en: "NE", ne: "ईशान", major: false },
  { az: 90, en: "E", ne: "पू", major: true },
  { az: 135, en: "SE", ne: "आग्नेय", major: false },
  { az: 180, en: "S", ne: "द", major: true },
  { az: 225, en: "SW", ne: "नैऋत्य", major: false },
  { az: 270, en: "W", ne: "प", major: true },
  { az: 315, en: "NW", ne: "वायव्य", major: false },
];
