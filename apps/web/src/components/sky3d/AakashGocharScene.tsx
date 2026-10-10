/**
 * The 3D scene for Aakash Gochar — everything inside the <Canvas>.
 *
 * Two views of the same sky, both geocentric:
 *
 * • `space` — the solar system seen from outside, Earth at the centre. Grahas
 *   ride shells in the classical Moon-to-Saturn order at their true sidereal
 *   longitude and shara, so vakri loops and the belt geometry read directly.
 * • `horizon` — the sky standing over one place at one instant. Longitudes are
 *   carried through the equatorial frame into alt/az, so the rashi belt tips by
 *   the observer's latitude and swings with the hour, exactly as it does
 *   overhead. This is the view where the ecliptic is emphatically *not* flat.
 *
 * Per-frame work is deliberately imperative: positions are written straight
 * onto object refs. Overlay names follow the same projection as the star
 * points, so they do not lag behind a turning sky. The HUD clock still samples
 * a few times a second via `onSample`.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  EclipticWheel,
  ECLIPTIC_GRID_COLOR,
  BELT_INNER,
  BELT_OUTER,
  MONTH_R,
  NAK_INNER,
  NAK_OUTER,
} from "@/components/learn/EclipticWheel";
import type { GrahaKey } from "@/lib/graha-details";
import {
  DEG,
  eclipticToVec3,
  GRAHA_COLOR,
  NAKSHATRA_ARC,
  normalizeDeg,
  RASHI_ARC,
} from "@/lib/sky3d/geocentric-model";
import {
  altAzToVec3,
  eclipticToAltAz,
  equatorialToAltAz,
  lstDeg,
  obliquity,
  type Observer,
} from "@/lib/sky3d/horizon";
import {
  ayanamsa,
  bodyRadius,
  BODY_RADIUS,
  daysSinceJ2000,
  GEO_BODY_ORDER,
  geocentricPointAt,
  geocentricSky,
  shellRadius,
  deltaLongitude,
  outerPlanetAt,
  type GeoBody,
  type SkyCalibration,
  type OuterPlanetKey,
} from "@/lib/sky3d/orbital-model";
import {
  BAND_EDGES,
  COMPASS_POINTS,
  GLOBE_EQUATOR,
  GLOBE_MERIDIANS,
  GLOBE_PARALLELS,
  GLOBE_TROPICS,
  SOLAR_STATIONS,
  type GeoPoint,
  DEGREE_TICKS,
  buildAlmucantarPairs,
  buildVerticalPairs,
  buildLocalGridPairs,
  CARDINAL_VERTICALS,
  gridStepForFov,
  verticalStepForFov,
  POLE_MARKS,
  GRID_TIERS,
  GRID_OPACITY,
  LOCAL_GRID_CAPACITY,
  type HorizonPoint,
  NAK_LABEL_LAT,
  NAKSHATRA_DIVIDERS,
  PADA_TICKS,
  RASHI_DIVIDERS,
  RASHI_LABEL_LAT,
  type eclipticPoint,
} from "@/lib/sky3d/sky-geometry";
import { flattenAsterisms, NAKSHATRA_ASTERISMS, precessionSinceJ2000, starOverlayNames } from "@/lib/sky3d/nakshatra-stars";
import { VEDIC_CONSTELLATION_LINKS } from "@/lib/sky3d/vedic-constellations";
import { cultureStarLabel, flattenSkyCulture } from "@/lib/sky3d/sky-culture";
import { NEBULA_SOURCES, flattenNebulae } from "@/lib/sky3d/nebulae";
import { flattenBackgroundStars } from "@/lib/sky3d/background-stars";
import {
  placedPoleStars,
  poleStarEpoch,
  poleTrackPoints,
  reigningPoleStar,
} from "@/lib/sky3d/pole-stars";
import type { VedicStarPosition } from "@/lib/api";
import {
  SKY_TEXTURE_KEYS,
  SKY_TEXTURE_SOURCES,
  type SkyTextureKey,
} from "@/lib/sky3d/sky-textures";
import {
  distanceForHorizonFov,
  fovForZoom,
  GLOBE_BAND_R,
  GLOBE_CAM_R,
  GLOBE_R,
  SPACE_FOV,
  type SkyMode,
} from "@/lib/sky3d/sky-zoom";
import {
  createHorizonFisheyeUniforms,
  horizonViewWindow,
  projectHorizonRaw,
  injectHorizonFisheyeIn,
  projectHorizon,
} from "@/lib/sky3d/horizon-projection";
import { buildGridLabels } from "@/lib/sky3d/grid-labels";
import {
  makeMoonMaterial,
  MOON_EARTHSHINE,
  MOON_PHASE_FOV_TIGHT,
  MOON_PHASE_FOV_WIDE,
  MOON_UNLIT_FAR,
  type MoonMaterial,
} from "@/lib/sky3d/moon-material";
import { makeEarthMaterial } from "@/lib/sky3d/earth-material";
import { applyNadirStereographicUVs, prepareKathmanduGround } from "@/lib/sky3d/terrain";
import {
  buildHipsTileOutline,
  clearHipsDebugSnapshot,
  ensureHipsFallbackTexture,
  ensureHipsTile,
  evictHipsTiles,
  findReadyHipsAncestor,
  getHipsSiblings,
  HIPS_MAX_LOCAL_ORDER,
  hipsLoadsInFlightCount,
  hipsTileCount,
  hipsTileKey,
  hipsTileNeedsLoad,
  hipsTilePriority,
  loadHipsTileTexture,
  nextHipsFrame,
  writeHipsDebugSnapshot,
  type HipsDebugTile,
  type HipsTileEntry,
} from "@/lib/sky3d/hips";
import {
  evaluateHipsTiles,
  getHipsTileScreenSizePx,
  HIPS_TILE_REFINE_PIXELS,
  type HipsLodFrame,
  type HipsLodLeaf,
} from "@/lib/sky3d/hips-lod";
import earthToonUrl from "@/assets/graha/earth-orig.png";
import milkyWayUrl from "@/assets/milkyway.png";
import kathmanduUrl from "@/assets/kathmandu.jpeg?url";

/** Same wheel as Learn — radii come from {@link EclipticWheel}. */
export const RASHI_INNER = BELT_INNER;
export const RASHI_OUTER = BELT_OUTER;
/**
 * Month names sit in the inner half of each राशि cell, rashi names in the outer.
 *
 * Pushed to opposite edges of the band rather than either side of its middle.
 * The pair separates radially, so on the left and right of the wheel — where
 * "outward" is sideways — they were reading as one run of text, `वैशाख मेष`.
 * Four units of band between them keeps them apart at every angle.
 */
const MONTH_LABEL_R = RASHI_INNER + 0.9;
const RASHI_LABEL_R = RASHI_OUTER - 0.7;
/**
 * Stretch the classical Moon→Saturn shells so Saturn sits just inside the
 * month ring — the same inner disk the Learn polar grid occupies. Without
 * this the grahas cluster inside r≈8 while the wheel runs out to 32, and
 * they never read as being *on* the grid.
 */
const SPACE_SHELL_SCALE = MONTH_R / 9;
/**
 * How much bigger than schematic the grahas are drawn in अन्तरिक्ष.
 *
 * The shells were stretched out to the month ring but the bodies were not, so
 * zoomed out to the whole wheel every graha was a two-pixel speck on a disc six
 * hundred across — you could see *that* something was in कन्या without being
 * able to see *what*. The shells have far more room between them than the
 * bodies need, and doubling only closes the gap at a conjunction, where two
 * grahas touching is the thing being shown.
 */
const SPACE_BODY_SCALE = 2.1;
/** How far a नक्षत्र's figure is held clear of its segment's own boundaries. */
const PANEL_INSET = 0.14;
/**
 * Camera distance at or below which the belt is close enough to carry its
 * detail: the पाद numbers, and the नक्षत्र's own figure beside its name.
 *
 * Above it they are a hundred and eight numbers stacked on a ring a few hundred
 * pixels across, which is worse than not having them.
 */
export const PADA_ZOOM = 14;
const RASHI_MID = (RASHI_INNER + RASHI_OUTER) / 2;
const NAK_MID = (NAK_INNER + NAK_OUTER) / 2;

/** Radius of the horizon dome. Everything on the sky sits on it. */
const DOME = 100;

/**
 * Size of the नामाङ्कित वैदिक तारा catalogue — see [[vedicField]]. The server
 * currently sends 46 (`build_vedic_stars`); kept with headroom so a future
 * addition there does not silently truncate the list again.
 */
const VEDIC_STAR_CAPACITY = 64;

/** Pixel size from visual magnitude — Sirius (−1.5) reads as a disc, Alcor (4) as a point. */
/**
 * The angular radius a star's glare covers, degrees, by magnitude.
 *
 * Not the rendered point — that is a fixed handful of pixels — but the
 * saturated disc the DSS2 plate has in place of a bright star, which is what
 * a name laid over it disappears into. Capella at magnitude 0.1 burns about a
 * quarter-degree of plate; by magnitude 6 there is nothing to clear.
 */
function starGlowDeg(mag: number): number {
  return 0.3 * Math.pow(10, -Math.max(mag, -1.5) / 6);
}

/** Breathing room between the glare and the top of the text, degrees. */
const GLOW_PAD_DEG = 0.02;

/**
 * That angular radius in pixels at the current lens, floored and capped.
 *
 * Converted per frame rather than baked, because the whole point is that the
 * gap is angular: the same glare is 6 px across at 90° and 300 px across at
 * 2°, and only one of those needs the name moved.
 */
function labelClearPx(
  glowDeg: number,
  fovDeg: number,
  heightPx: number,
  floor: number,
): number {
  const px = ((glowDeg + GLOW_PAD_DEG) / Math.max(fovDeg, 1e-3)) * heightPx;
  return Math.max(floor, Math.min(heightPx * 0.22, px));
}

function vedicStarSize(mag: number): number {
  return Math.max(7, Math.min(20, 13.5 - mag * 1.7));
}

/**
 * How the landscape texture is tinted from night to day. White at noon so the
 * painted grass reads; a dim warm grey after dark so the hills are still there
 * without glowing.
 */
const GROUND_NIGHT = new THREE.Color("#3a3834");
const GROUND_DAY = new THREE.Color("#ffffff");
/**
 * Sun altitudes the ground crosses from night colour to day colour, degrees.
 *
 * Spanning the civil twilight rather than switching at the horizon: the ground
 * is still lit well after sunset and the Sun's own disc is only half up at 0°,
 * so a hard cut at zero reads as the hills changing colour in one frame.
 */
const GROUND_DUSK = -6;
const GROUND_DAWN = 4;
/** How far back the camera sits in the Earth-globe view. */

/** Radius of the Earth globe in the zoomed-out view. */
/**
 * Radius the "you are here" marker sits at — the globe's own surface, near
 * enough. Both the dot and its label are placed here, so they stay the same
 * point on the map as it turns rather than drifting apart with the parallax
 * between two different spheres.
 */
const OBSERVER_R = GLOBE_R * 1.006;
/** Radius the zodiac ring hugs the globe at. */
/** Where the globe camera sits — far enough back to read as orthographic. */
/** Bodies are tuned for the 100-unit dome; bring them down to the ring's scale. */
const GLOBE_BODY_SCALE = 0.55;

const INK_DIM = "#a7c4c3";
const RETRO = "#ef4444";
const ZODIAC = "#d8c84a";
const NAKSHATRA = "#35d05a";
/**
 * The क्षितिज alt/az cage. Brown, not the green it used to be: this grid is
 * drawn over the काठमाडौँ ground panorama and a warm horizon glow, and a
 * saturated green cage on top of that read as a separate overlay laid across
 * the photograph rather than part of the same scene. Only क्षितिज uses this —
 * the globe has {@link GLOBE_GRID}, अन्तरिक्ष the ecliptic wheel's own colour.
 */
const GRID = "#b5824a";
/**
 * The globe's own graticule. Lighter than {@link GRID}, which was picked to sit
 * on a black sky: the same blue over ocean and forest is a line you have to go
 * looking for.
 */
const GLOBE_GRID = "#a8ccf0";
const EARTH_RADIUS = 1;

/** Bodies that get a photographic texture; the nodes are not bodies at all. */
const BODY_TEXTURE: Partial<Record<GrahaKey, SkyTextureKey>> = {
  sun: "sun",
  moon: "moon",
  mercury: "mercury",
  venus: "venus",
  mars: "mars",
  jupiter: "jupiter",
  saturn: "saturn",
};

/** Apparent radii on the horizon dome — exaggerated, or they would be sub-pixel.
    Ranked the way the naked eye actually reads them from the ground: सूर्य and
    चन्द्र dwarf everything, and शुक्र/मंगल — the brightest, reddest points in the
    sky — read bigger than बुध/बृहस्पति/शनि even though the schematic globes
    those two use elsewhere are the other way round. */
const DOME_RADIUS: Record<GrahaKey, number> = {
  sun: 1.7,
  moon: 1.7,
  venus: 1.3,
  mars: 1.2,
  jupiter: 1.0,
  saturn: 0.9,
  mercury: 0.75,
  rahu: 0.7,
  ketu: 0.7,
};

/**
 * Wide open, {@link DOME_RADIUS} alone reads as a dusting of dots — the whole
 * 235° dome in one frame gives every body a sliver of the pixels it had at
 * 90°. So the *drawn* radius grows with the field itself: full triple size at
 * the 235° edge, double at 130°, back to the plain table at 90° and tighter —
 * three points, two straight lines between them, flat past either end.
 */
function horizonBodyScale(fovDeg: number): number {
  if (fovDeg <= 30) return 1;
  if (fovDeg <= 130) return 1 + (fovDeg - 30) / (130 - 30);
  if (fovDeg <= 235) return 2 + (fovDeg - 130) / (235 - 130);
  return 3;
}

/**
 * यम, वरुण, अरुण — decorative only (see the doc comment on
 * {@link OuterPlanetKey} in `orbital-model`): drawn on क्षितिज so they exist
 * in the sky at all, never selectable, never part of a chart. Solid colour
 * rather than a texture — nobody ships a photographic map for three dots
 * this small — tinted toward how each actually reads through a telescope.
 */
const OUTER_PLANET_ORDER: OuterPlanetKey[] = ["uranus", "neptune", "pluto"];
const OUTER_PLANET_NAME: Record<OuterPlanetKey, { ne: string; en: string }> = {
  uranus: { ne: "अरुण", en: "Uranus" },
  neptune: { ne: "वरुण", en: "Neptune" },
  pluto: { ne: "यम", en: "Pluto" },
};
const OUTER_PLANET_COLOR: Record<OuterPlanetKey, string> = {
  uranus: "#9fe8e6",
  neptune: "#4d6fe0",
  pluto: "#c9a27a",
};
/** Same table {@link DOME_RADIUS} is, scaled the same way by
    {@link horizonBodyScale} — smaller than बुध, since none of the three has
    ever been a naked-eye object. */
const OUTER_PLANET_DOME_RADIUS: Record<OuterPlanetKey, number> = {
  uranus: 0.55,
  neptune: 0.5,
  pluto: 0.4,
};

export type { SkyMode };


/** What the camera is looking at. `earth` means the Earth itself / the observer. */
export type FocusKey = GrahaKey | "earth";

/** Mutable, ref-held simulation clock — advanced in `useFrame`, never in state. */
export type SimState = {
  /** Simulated instant, ms since epoch. */
  timeMs: number;
  /** Simulated seconds per real second. 1 = wall clock, 86400 = a day per second. */
  secondsPerRealSecond: number;
  playing: boolean;
};

/**
 * Ref-held camera state, so dragging never re-renders the tree.
 * In `space` view `distance` is how far the camera sits from its target; in
 * `horizon` view the observer cannot move, so it drives the field of view.
 */
export type ViewState = {
  yaw: number;
  pitch: number;
  distance: number;
  /**
   * Rotation about the view direction itself — the horizon camera's third
   * Euler axis, left at 0 by every manual drag and view chip. Only AR mode
   * writes a nonzero value here, from the phone's own tilt-sideways.
   */
  roll?: number;
};

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

export type EclipseState = {
  kind: "solar" | "lunar";
  /** 0–1, 1 is exact node + exact syzygy. */
  mag: number;
  node: "rahu" | "ketu";
} | null;

export type SkySample = {
  timeMs: number;
  sky: Record<GrahaKey, GeoBody>;
  labels: ScreenLabel[];
  /** Sun altitude, deg — negative is night. Drives the daylight wash. */
  sunAltitude: number;
  /** The camera's current `view.distance` — lets the overlay grow rashi and
      nakshatra text as the belt shrinks on screen while zooming out. */
  zoomDistance: number;
  /** Set when Sun, Moon, Earth and a node share a line. */
  eclipse: EclipseState;
};

export type SceneToggles = {
  /** The twelve राशि — gold belt plus their names. */
  rashiBelt: boolean;
  /**
   * The twenty-seven नक्षत्र — green strip, names, and the तारापुञ्ज each
   * नक्षत्र is named for (रोहिणी as the Hyades, ज्येष्ठा as Antares, …).
   */
  nakshatraBelt: boolean;
  /**
   * बिक्रम month names, in the inner half of each राशि cell. No extra ring —
   * the 12-fold is already the राशि.
   */
  monthRing: boolean;
  /** The azimuth grid: almucantars and verticals, 10° down to ½° as you zoom. */
  grid: boolean;
  /**
   * Freeze the Earth's spin. The diurnal rotation drags the whole sky round
   * once a day, which drowns out planetary motion when the clock is running
   * fast; locked, the zodiac holds still and only the grahas move along it.
   */
  lockStars: boolean;
  /**
   * Keep the lock target in the middle of the view while time runs — the
   * camera target follows its motion (works in space, globe, and horizon
   * views). The target is the selected graha, or your own place on the globe
   * when {@link AakashGocharScene}'s `lockObserver` is set.
   */
  lockCenter: boolean;
  /**
   * Thirty-two individually named bright stars — अगस्त्य, अभिजित्, सप्तर्षि and
   * the rest — the ones classical texts single out by name rather than only
   * as नक्षत्र members. See [[vedic-stars]].
   */
  vedicStars: boolean;
  /**
   * The obliquity, drawn as the angle it is: the Earth's axis against the
   * perpendicular to its orbit. In the globe view the Earth is held upright and
   * the ecliptic is what tilts, so without this the 23.44° is in the picture
   * but nothing in it looks tilted.
   */
  tilt: boolean;
  /**
   * काठमाडौँ's meridian, pole to pole on the Earth — the line noon is
   * reckoned against. Same object as the Learn playground's काठमाडौँ रेखा.
   */
  primeMeridian: boolean;
  /**
   * The star figures themselves — the points and the lines joining them into
   * the तारापुञ्ज each नक्षत्र is named for, plus those names.
   *
   * Its own switch rather than a rider on {@link nakshatraBelt}: the belt is
   * the 27-fold division of the ecliptic, the figures are the stars the
   * divisions were named after, and wanting one without the other is the
   * ordinary case — a clean zodiac with no star clutter, or the sky's own
   * figures with no measuring band across them.
   *
   * Carries the राशि figures too — मेष the ram, वृष the bull and the rest,
   * plus सप्तर्षि, शिंशुमारः, सारथिः, त्रिशङ्कुः and the smaller mythological
   * groups (Stellarium's own "indian" sky culture; see [[sky-culture]]).
   * Those had their own राशि आकृति switch until it turned out nobody wants
   * half the figures: they are all the same act — joining stars into a shape
   * — drawn in the same view, and two chips for it only asked the reader to
   * make a distinction the sky does not.
   */
  constellations: boolean;
  /**
   * Horizon view: the ground underfoot and the horizon ring drawn on it.
   *
   * Off, the sphere is drawn whole and unobstructed — the observer's frame
   * without the observer's floor, which is the view an orrery gives.
   */
  landscape: boolean;
  /**
   * Every name the sky writes over itself — राशि, नक्षत्र, grahas, the compass,
   * the star groups. The lines and the bodies stay; only the type goes.
   */
  labels: boolean;
};

/* ── shared primitives ─────────────────────────────────────────────────── */

/**
 * Earth-fixed latitude/longitude → scene vector, axis along +Y.
 *
 * Same handedness as {@link eclipticToVec3}, and the same one three's own
 * sphere UVs use — so the Earth map can be laid on the globe straight and every
 * coastline lands where this function says it should.
 */
function geoToVec3(lat: number, lon: number, radius: number): [number, number, number] {
  const a = lat * DEG;
  const b = lon * DEG;
  const cosLat = Math.cos(a);
  return [radius * cosLat * Math.cos(b), radius * Math.sin(a), -radius * cosLat * Math.sin(b)];
}

function circlePoints(radius: number, segments = 128): THREE.Vector3[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return new THREE.Vector3(radius * Math.cos(a), 0, -radius * Math.sin(a));
  });
}

function makeLine(points: THREE.Vector3[], color: string, opacity: number) {
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

/** Pole-to-pole meridian in the XY plane; rotate about +Y by longitude. */
function makePrimeMeridian(radius: number) {
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
function makeDynamicLine(count: number, color: string, opacity: number, width = 1) {
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
function makeDynamicSegments(count: number, color: string, opacity: number) {
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
const GRID_R = DOME * 1.04;

/**
 * How near a press has to land, in pixels, to count as being on a named star.
 *
 * Generous on purpose: pulled out to the whole dome a star is a couple of
 * pixels across, and a target you have to hit exactly is one you cannot hit at
 * all on a phone. Nearest-wins, so an over-large radius costs nothing where
 * they are far apart and still picks sensibly where they crowd.
 */
const PICK_RADIUS = 26;
/**
 * The same floor for a graha, deliberately bigger.
 *
 * Grahas are already checked before stars — see {@link pick} below — so a
 * press within a graha's own circle always wins. But a graha standing right
 * on top of the नक्षत्र star it currently occupies (सूर्य in मघा is the
 * everyday case) is a small, imprecise target sitting *inside* a star's own
 * {@link PICK_RADIUS}: a press a few pixels off the graha's exact centre
 * missed its floor and fell through to the star underneath it, which reads as
 * "the star keeps stealing my taps." A wider floor here, floored only for
 * grahas, is what a phone actually needs to hit the thing drawn as the
 * visually larger, brighter body without giving stars anywhere near as much
 * slack.
 */
const GRAHA_PICK_RADIUS = 34;

/** Movement past this during a press makes it a drag, not a click. Pixels. */
const DRAG_SLOP = 6;

/** Two presses on one graha inside this are a double press. Milliseconds. */
const DOUBLE_MS = 400;

/** Grahas are picked by hand in every view, so the raycaster must not also try. */
const NO_RAYCAST = () => {};

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
function dressGrid(object: THREE.LineSegments) {
  object.renderOrder = 2;
  const mat = object.material as THREE.LineBasicMaterial;
  mat.depthTest = true;
  /* Reads the depth buffer but never writes it, so the tiers do not cut holes
     in each other and whatever is behind still comes through the mesh. */
  mat.depthWrite = false;
  return object;
}

function bakeHorizonGrid(pairs: HorizonPoint[]) {
  const object = dressGrid(makeDynamicSegments(pairs.length, GRID, GRID_OPACITY));
  for (let i = 0; i < pairs.length; i += 1) {
    setPoint(object, i, altAzToVec3(pairs[i].alt, pairs[i].az, GRID_R));
  }
  flushLine(object);
  return object;
}

function setPoint(line: THREE.Line, i: number, v: [number, number, number]) {
  const attr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
  attr.setXYZ(i, v[0], v[1], v[2]);
}

function flushLine(line: THREE.Line) {
  const attr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
  attr.needsUpdate = true;
}

/**
 * How much wider than its own radius a star's sprite is drawn, to leave the
 * halo somewhere to fall off. See {@link makeStarPoints}'s shaders.
 */
const STAR_HALO_SCALE = 3;

/**
 * There used to be a flat ceiling here — no photograph drawn past 30° of
 * field, on the theory that above that the sky is being read as a whole and
 * these are only clutter. That was wrong for anything bigger than a small
 * object: {@link nebulaReveal}'s own `spanDeg / fovDeg` ratio already goes
 * to zero on its own once a field is too small a fraction of the frame to
 * read as anything, so a wide field like Barnard's Loop (14° across) or the
 * Sagittarius Star Cloud (4°) was being held at zero by the flat ceiling
 * right up until the reader crossed it, then popped in from nothing — the
 * one number was fighting the ratio that already does the job everywhere
 * else. Stellarium has no such ceiling either: `StelSkyImageTile` gates a
 * tile on being on screen and above its own limiting luminance, never on a
 * fixed field. Letting the ratio alone decide means a big, bright field
 * starts easing in as far out as 80–100° — genuinely visible at that
 * range, the same as it would be in Stellarium — while a small object still
 * waits for its own tight crop, because its ratio does not clear 6% until
 * then.
 */

/**
 * Fill of अन्तरिक्ष's ecliptic disc — Earth out to the नक्षत्र rim.
 *
 * Kept well under 0.5 so the Milky Way still reads through it. Still under
 * 1 so the disc stays in the transparent pass and a body behind it reads as
 * under the plane rather than being hidden outright.
 */
const SPACE_PLANE_OPACITY = 0.55;
/**
 * Where the background stars sit in अन्तरिक्ष — a sphere well outside the
 * नक्षत्र rim (32) and outside the furthest camera (130), so the disc is
 * surrounded by sky rather than sitting on a black void.
 */
const SPACE_STAR_R = 220;

/**
 * A cloud of stars whose positions are rewritten with the sky. Point size is in
 * pixels rather than world units — a star has no apparent size, so it must not
 * grow as you zoom in on it.
 */
function makeStarPoints(count: number, color: string, size: number, opacity: number) {
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
function makeHorizonGlow(radius: number, color: string, intensity: number) {
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
function makeMilkyWayGeometry(radius: number, widthSeg = 96, heightSeg = 48) {
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
function equatorialToHorizonMatrix(
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
function starPixelSize(
  mag: number,
  { faintest, brightest, minPx, maxPx }: { faintest: number; brightest: number; minPx: number; maxPx: number },
): number {
  const t = Math.min(1, Math.max(0, (faintest - mag) / (faintest - brightest)));
  return minPx + t * (maxPx - minPx);
}

/** Write each star's own pixel size into a group's `aSize` buffer, by magnitude. */
function sizeStarsByMagnitude(
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
function companionMagLimit(fovDeg: number): number {
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
function nebulaReveal(spanDeg: number, fovDeg: number): number {
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
function nebulaMarkerReveal(spanDeg: number, fovDeg: number): number {
  const fraction = spanDeg / Math.max(fovDeg, 0.02);
  const fadeIn = Math.min(1, Math.max(0, (fraction / 1.6 - 0.06) / 0.06));
  const fadeOut = 1 - Math.min(1, Math.max(0, (fraction - 0.3) / 0.12));
  return Math.min(fadeIn, fadeOut);
}

type LoadState = "idle" | "loading" | "ready";

let ringTextureCache: THREE.CanvasTexture | null = null;

/**
 * A thin ring, drawn once on a canvas and shared by every deep-sky marker —
 * Stellarium's own way of flagging a catalogued object before you have
 * pulled in far enough to see it as a photograph (see their `NebulaMgr`
 * marker pass). One circle is all this ever draws: each marker is a `Sprite`
 * scaled non-uniformly to the object's own width and height, the same trick
 * {@link nebulaField}'s photographs already use, so the single texture comes
 * out an ellipse exactly where the object actually is elongated and a circle
 * where it is not — nothing here needs to know either number.
 */
function ringTexture(): THREE.CanvasTexture {
  if (ringTextureCache) return ringTextureCache;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = size * 0.035;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  ringTextureCache = tex;
  return tex;
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
const HIPS_BORTLE = 2;
const HIPS_BORTLE_FACTOR = 1.1 - HIPS_BORTLE * 0.1;

function injectMilkyWayExtinction(material: THREE.MeshBasicMaterial): void {
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

/**
 * Fetch one deep-sky photograph, the first time anything actually needs it.
 *
 * The catalogue is ~17MB of PNG across 38 files and none of it is visible
 * until {@link nebulaReveal} says so, so loading it up front cost every
 * reader the whole download for something most of them never zoom in far
 * enough to see. Mutates the entry in place: `loadState` guards against a
 * second fetch while the first is still in the air.
 */
/**
 * How many photographs may be in the air at once.
 *
 * The point of loading these lazily is that the reader waits for the few
 * images actually in front of them, not for the catalogue. Without a cap,
 * one press of zoom-in can put every image that clears
 * {@link nebulaReveal} into flight in a single frame — which is the whole
 * download again, just started later. Three at a time keeps the ones in
 * the centre of the view arriving in seconds, and the rest queue behind
 * them: an entry that is turned away here stays `idle`, so the next frame
 * asks again and it starts as soon as a slot frees.
 */
const NEBULA_MAX_CONCURRENT_LOADS = 3;

let nebulaLoadsInFlight = 0;

/**
 * The HiPS Milky Way tile sphere's own radius — just inside the panorama
 * sphere's 400 ({@link makeMilkyWayGeometry}'s own call site), so the real
 * DSS2 tiles draw in front of the low-resolution panorama without
 * z-fighting (both have `depthTest` off, so draw order — `renderOrder`,
 * see {@link HIPS_RENDER_ORDER} — is what actually decides the
 * front/back relationship, not this number; it only has to be close enough
 * that neither sphere reads as visibly nearer or farther than the other).
 */
const HIPS_RADIUS = 398;
/**
 * Draw order for every HiPS leaf tile — after the panorama (-1), before
 * nebula photos (-0.3). One value now, not a parent/target pair: the
 * recursive traversal (`hips-lod.ts`) only ever marks a tile's own leaf
 * mesh visible, borrowing an ancestor's *texture* (Phase 1 fallback) rather
 * than rendering the ancestor as a separate coarser mesh underneath, so
 * there is no second layer left to order against.
 */
const HIPS_RENDER_ORDER = -0.55;
/**
 * Phase 9's cache budget — {@link evictHipsTiles} reclaims the least-
 * recently-touched tile once the cache holds more than this many.
 *
 * The full local order 0–3 set is ~1020 tiles (~45MB, per the module's own
 * earlier "safe to keep forever" reasoning) — this is deliberately well
 * under that, so a long session that has panned across a good fraction of
 * the sky actually reclaims memory instead of the cache quietly growing
 * back toward "keep everything," which is what motivated adding eviction
 * in the first place. 400 comfortably covers what the recursive traversal
 * (`hips-lod.ts`) touches in one frame even at the densest FOV measured so
 * far (452 leaves at 100°, see that module's own doc comment) plus a
 * working margin for tiles just panned away from.
 */
const HIPS_CACHE_MAX_RESIDENT = 400;
/**
 * Phase 8's fade-in window, milliseconds — how long a tile's opacity takes
 * to reach full strength after its own real texture (not a Phase 1
 * fallback) arrives. This app only ever has one mesh per leaf (its own
 * geometry, showing either its own texture or a borrowed ancestor's — see
 * {@link HIPS_RENDER_ORDER}'s own doc comment), so there is no second layer
 * to literally cross-fade against; ramping this leaf's own opacity up from
 * a partial start on arrival softens the swap from "ancestor's cropped
 * quarter" to "this tile's real detail" into a brief reveal instead of an
 * instant pop, which is the visible effect a real two-layer crossfade
 * would give without needing a temporary second mesh to get there.
 */
const HIPS_FADE_IN_MS = 220;
/** The opacity a tile's fade-in starts from — not 0: dropping all the way to invisible would flash the panorama or an even-coarser ancestor through for a moment, trading one pop for another. */
const HIPS_FADE_IN_START = 0.55;
/**
 * `n×n` vertex grid per tile — see {@link buildHipsTileGeometry}'s own doc
 * comment on why a flat quad is not enough. 8 was enough to avoid visible
 * faceting near the equator but still let a tile far enough from it — where
 * a HEALPix cell's true shape departs furthest from square — warp visibly
 * between grid points; 16 quadruples the triangle count for a patch that
 * is at most a few hundred tiles on screen at once, cheap insurance against
 * the same failure mode the doc comment already describes for a single flat
 * quad, just at a finer scale.
 */
const HIPS_TILE_SUBDIVISIONS = 16;
/**
 * The two-layer crossfade's outer edge — at or above this field, {@link
 * hipsVisibility} is 0 and the panorama alone shows. Still what gates
 * whether the HiPS system runs at all (traversal, loading, mounting):
 * above this field {@link hipsVisibility} is already 0, so there is
 * nothing for the tile system to contribute and no reason to pay for it.
 *
 * Same 80° the old one-directional `HIPS_FOV_SHOW_THRESHOLD` used — kept
 * as the outer boundary deliberately (see the real Stellarium Web Engine
 * investigation this replaces: `src/modules/milkyway.c`/`dss.c` cross-fade
 * their own two HiPS layers over a 10°–20° field with `smoothstep()`, not
 * a hard cut — but their `dss` layer is a real, deep survey blending
 * against a *second, purpose-built low-order HiPS* tuned to match it,
 * where ours is blending against a fixed painterly panorama with its own
 * different exposure and content, and our own DSS2 set stops at order 3
 * rather than going as deep as theirs — copying their literal numbers
 * would not carry the reasoning that produced them).
 */
const HIPS_BLEND_START_FOV = 80;
/**
 * The crossfade's inner edge — at or below this field, {@link
 * hipsVisibility} is 1 and the tiles alone carry the sky (modulo the
 * panorama's own separate near-zoom fade, {@link HIPS_BLEND_START_FOV}'s
 * own doc comment).
 *
 * An initial, explicitly provisional value — wider than Stellarium's own
 * 10° inner edge on purpose: their `dss` blends against a survey built to
 * match it tonally, ours against a fixed panorama that was never tuned
 * against DSS2's own exposure, so easing across a wider band gives that
 * mismatch more room to not read as a seam. Meant to be tuned by eye once
 * this mechanism itself is confirmed stable — see the visual test this
 * change shipped with.
 */
const HIPS_BLEND_END_FOV = 30;

/**
 * GLSL-style smoothstep — the same shape Stellarium Web Engine's own
 * `milkyway.c`/`dss.c` use for their cross-fade (`smoothstep()` from
 * `<utils/vec.h>`-adjacent math there), reproduced here since nothing in
 * this file already has a generic one. Works with `edge0 > edge1` exactly
 * as it does the usual way round — the clamp and division both stay
 * correct — which is what lets {@link hipsVisibility} below hand it `
 * (start=80, end=30)` and get a value that *falls* as field grows, without
 * needing a second, inverted formula.
 */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Its own manager, never the shared `THREE.DefaultLoadingManager` — a
 * nebula photo loads on demand whenever the reader zooms in on one, long
 * after the scene's own first-load textures are done, and reporting to the
 * default manager made a global "is anything loading" overlay elsewhere in
 * the app (see `AakashGocharSky.tsx`) flash back in on every such zoom.
 */
const nebulaLoadingManager = new THREE.LoadingManager();

function loadNebulaTexture(entry: {
  url: string;
  material: THREE.SpriteMaterial;
  loadState: LoadState;
}) {
  if (entry.loadState !== "idle") return;
  if (nebulaLoadsInFlight >= NEBULA_MAX_CONCURRENT_LOADS) return;
  entry.loadState = "loading";
  nebulaLoadsInFlight += 1;
  new THREE.TextureLoader(nebulaLoadingManager).load(
    entry.url,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      entry.material.map = tex;
      entry.material.needsUpdate = true;
      entry.loadState = "ready";
      nebulaLoadsInFlight = Math.max(0, nebulaLoadsInFlight - 1);
    },
    undefined,
    () => {
      /* Left at "loading" on purpose: a failed image is simply never
         drawn, rather than retried on every frame it happens to be in
         view. The slot is still given back, or a handful of broken files
         would eventually stall every later load. */
      nebulaLoadsInFlight = Math.max(0, nebulaLoadsInFlight - 1);
    },
  );
}

/* Scratch vectors for {@link nebulaInView}: the frame loop runs this per
   image per frame, and allocating there is how a smooth pan turns into a
   sawtooth of garbage collections. */
const nebulaCamDir = new THREE.Vector3();
const nebulaToImage = new THREE.Vector3();

/* Scratch for the HiPS tile-visibility test, same reasoning: the camera's
   forward direction, then that same vector re-expressed in the tiles' own
   equatorial frame by the group's own (inverse) rotation. */
const hipsForwardWorld = new THREE.Vector3();
const hipsInvQuat = new THREE.Quaternion();
const hipsDirEquatorial = new THREE.Vector3();

/** The recursive traversal's own leaf list — {@link evaluateHipsTiles} clears and refills this in place every frame rather than allocating a fresh array, same reasoning as the vectors above. */
const hipsLodLeaves: HipsLodLeaf[] = [];
/** Phase 6's per-frame load candidates — cleared and refilled every frame rather than allocated fresh, same reasoning as the vectors above. */
const hipsLoadCandidates: { entry: HipsTileEntry; priority: number }[] = [];
/** Every `(order, pix)` the traversal actually touched this frame — leaves and every ancestor refined through on the way to them alike. Doubles as Phase 9's eviction protection set: nothing this frame's LOD walk needed is a safe target to reclaim. */
const hipsTouchedKeys = new Set<string>();
/** Reused across frames so `evaluateHipsTiles` doesn't need a fresh options object every call. */
const hipsLodFrame: HipsLodFrame = {
  camera: null as unknown as THREE.Camera,
  groupQuaternion: new THREE.Quaternion(),
  groupPosition: new THREE.Vector3(),
  radius: 0,
  fovDeg: 0,
  width: 0,
  height: 0,
};

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
function nebulaInView(
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
function setVertex(
  object: THREE.Object3D & { geometry: THREE.BufferGeometry },
  i: number,
  v: [number, number, number],
) {
  const attr = object.geometry.getAttribute("position") as THREE.BufferAttribute;
  attr.setXYZ(i, v[0], v[1], v[2]);
}

/* ── grahas ────────────────────────────────────────────────────────────── */

/**
 * Saturn's ring, sized from the globe it belongs to. The real ring system runs
 * from about 1.2 to 2.3 planet radii; the numbers here are those, so it stays
 * in proportion however the body is scaled.
 */
function SaturnRing({ texture, radius }: { texture: THREE.Texture; radius: number }) {
  const geometry = useMemo(() => {
    const inner = radius * 1.3;
    const outer = radius * 2.2;
    const geo = new THREE.RingGeometry(inner, outer, 96);
    // Remap UVs radially so the ring strip texture reads outward, not around.
    const uv = geo.attributes.uv;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      uv.setXY(i, (r - inner) / (outer - inner), 1);
    }
    return geo;
  }, [radius]);

  return (
    <mesh geometry={geometry} rotation={[Math.PI / 2 - 0.45, 0, 0]} renderOrder={1}>
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        transparent
        opacity={0.92}
        depthWrite={false}
        alphaTest={0.05}
      />
    </mesh>
  );
}

/** How close a new/full moon must be to a node before it is an eclipse. */
const ECLIPSE_NODE_DEG = 16;
/** How close to conjunction/opposition. */
const ECLIPSE_SYZ_DEG = 12;

function circSep(a: number, b: number) {
  return Math.abs(deltaLongitude(a, b));
}

function eclipseOf(sky: Record<GrahaKey, GeoBody>): NonNullable<EclipseState> | { kind: null; mag: number; node: "rahu" | "ketu" } {
  const elong = normalizeDeg(sky.moon.longitude - sky.sun.longitude);
  const toRahu = circSep(sky.moon.longitude, sky.rahu.longitude);
  const toKetu = circSep(sky.moon.longitude, sky.ketu.longitude);
  const nodeSep = Math.min(toRahu, toKetu);
  const node: "rahu" | "ketu" = toRahu <= toKetu ? "rahu" : "ketu";
  const nearNode = nodeSep < ECLIPSE_NODE_DEG;
  const nodeMag = nearNode ? 1 - nodeSep / ECLIPSE_NODE_DEG : 0;
  const conj = Math.min(elong, 360 - elong);
  const opp = Math.abs(elong - 180);
  if (nearNode && conj <= ECLIPSE_SYZ_DEG) {
    return { kind: "solar", mag: nodeMag * (1 - conj / ECLIPSE_SYZ_DEG), node };
  }
  if (nearNode && opp <= ECLIPSE_SYZ_DEG) {
    return { kind: "lunar", mag: nodeMag * (1 - opp / ECLIPSE_SYZ_DEG), node };
  }
  return { kind: null, mag: 0, node };
}

function makeUmbra(color: number, opacity: number, earthEnd = 0.12, moonEnd = 1) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(earthEnd, moonEnd, 1, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.visible = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return mesh;
}

const Y_UP = new THREE.Vector3(0, 1, 0);

function placeUmbra(
  mesh: THREE.Mesh,
  from: THREE.Vector3,
  to: THREE.Vector3,
  base: number,
  axis: THREE.Vector3,
) {
  axis.copy(to).sub(from);
  const len = axis.length();
  if (len < 0.2) {
    mesh.visible = false;
    return;
  }
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(Y_UP, axis.multiplyScalar(1 / len));
  mesh.scale.set(base, len, base);
  mesh.visible = true;
}

/** Blood-moon veil + solar corona, sitting on the Moon itself. */
function MoonEclipseFx({
  eclipse,
  radius,
}: {
  eclipse: React.RefObject<{ kind: "solar" | "lunar" | null; mag: number }>;
  radius: number;
}) {
  const veilRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const e = eclipse.current;
    const veil = veilRef.current;
    if (veil) {
      const on = e.kind === "lunar";
      veil.visible = on;
      if (on) (veil.material as THREE.MeshBasicMaterial).opacity = 0.28 + 0.62 * e.mag;
    }
    const corona = coronaRef.current;
    if (corona) {
      const on = e.kind === "solar";
      corona.visible = on;
      if (on) {
        (corona.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.5 * e.mag;
        corona.lookAt(0, 0, 0);
      }
    }
  });
  return (
    <>
      <mesh ref={veilRef} visible={false} renderOrder={7}>
        <sphereGeometry args={[radius * 1.04, 32, 24]} />
        <meshBasicMaterial color="#7a1c12" transparent depthWrite={false} />
      </mesh>
      <mesh ref={coronaRef} visible={false} renderOrder={8}>
        <ringGeometry args={[radius * 1.08, radius * 1.7, 48]} />
        <meshBasicMaterial
          color="#ffe08a"
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}

function GrahaBody({
  graha,
  textures,
  selected,
  groupRef,
  spinRef,
  retroRef,
  sunLit,
  phaseMaterial,
  eclipse,
}: {
  graha: GrahaKey;
  textures: Record<SkyTextureKey, THREE.Texture>;
  selected: boolean;
  groupRef: (o: THREE.Group | null) => void;
  spinRef: (o: THREE.Mesh | null) => void;
  retroRef: (o: THREE.Group | null) => void;
  /** Space view: the Sun's point light models the terminator (औंसी / पूर्णिमा). */
  sunLit?: boolean;
  /**
   * The Moon, in the two views whose fixed-radius projection makes the Sun's
   * light useless — it carries the phase as a direction instead.
   */
  phaseMaterial?: MoonMaterial;
  eclipse?: React.RefObject<{ kind: "solar" | "lunar" | null; mag: number }>;
}) {
  const texKey = BODY_TEXTURE[graha];
  const radius = BODY_RADIUS[graha];

  return (
    <group ref={groupRef}>
      {texKey ? (
        /* `transparent` plus an explicit `renderOrder` well above every
           HiPS tile's (see `HIPS_RENDER_ORDER` in `AakashGocharScene.tsx`'s
           own module scope) is what keeps a graha from vanishing behind
           one. Three.js renders *all* opaque objects before *any*
           transparent one — that split is decided purely by
           this flag, not by `renderOrder`, which only sorts within
           whichever of the two queues an object already landed in. A tile
           is transparent with `depthTest` off (the same skybox recipe the
           panorama already uses; re-enabling it here would reintroduce the
           far-plane precision bug that made the panorama read as flat
           black in the first place — see that material's own doc comment),
           so it paints over *anything* opaque in its footprint regardless
           of actual distance. An opaque graha sitting where a tile's
           footprint lands was exactly that: correct depth, wrong queue.
           Every material below keeps alpha pinned at 1 (no map used here
           has its own alpha channel), so this changes which pass a graha
           draws in, not how it looks. */
        <mesh ref={spinRef} raycast={NO_RAYCAST} renderOrder={1}>
          <sphereGeometry args={[radius, 40, 40]} />
          {graha === "sun" ? (
            <meshBasicMaterial map={textures.sun} transparent />
          ) : graha === "moon" && sunLit ? (
            <meshStandardMaterial map={textures.moon} roughness={1} metalness={0} transparent />
          ) : graha === "moon" && phaseMaterial ? (
            <primitive object={phaseMaterial} attach="material" />
          ) : (
            <meshStandardMaterial
              map={textures[texKey]}
              emissive="#ffffff"
              emissiveMap={textures[texKey]}
              /* A little self-lighting keeps outer grahas legible where the
                 Sun's falloff would otherwise leave them nearly black. */
              emissiveIntensity={0.22}
              roughness={0.85}
              metalness={0.03}
              transparent
            />
          )}
        </mesh>
      ) : (
        /* राहु / केतु have no photographic texture. A sphere on the same
           material path as the other grahas stays on the belt under the
           stereographic sky; the old SVG sprites did not. Same
           transparent-plus-renderOrder reasoning as the textured branch
           above. */
        <mesh ref={spinRef} raycast={NO_RAYCAST} renderOrder={1}>
          <sphereGeometry args={[radius, 40, 40]} />
          <meshStandardMaterial
            color={GRAHA_COLOR[graha]}
            emissive={GRAHA_COLOR[graha]}
            emissiveIntensity={0.45}
            roughness={0.85}
            metalness={0.03}
            transparent
          />
        </mesh>
      )}
      {graha === "moon" && eclipse ? <MoonEclipseFx eclipse={eclipse} radius={radius} /> : null}

      {graha === "saturn" ? <SaturnRing texture={textures.saturnring} radius={radius} /> : null}

      {/* Vakri collar — shown only while the graha is actually retrograde. */}
      <group ref={retroRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.7, radius * 2.05, 32]} />
          <meshBasicMaterial color={RETRO} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {selected ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 2.4, radius * 2.65, 40]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
    </group>
  );
}

/* ── scene ─────────────────────────────────────────────────────────────── */

const TRAIL_DAYS = 45;
const TRAIL_STEPS = 90;
/** Points along the ecliptic great circle in the horizon view. */
const ecliptic_STEPS = 180;

/**
 * Angles are compared at this resolution before the zodiac band is re-projected
 * — 18 arcseconds, which on the dome is a small fraction of a pixel at any zoom
 * the view allows, so nothing visibly steps.
 */
const BELT_ANGLE_STEP = 0.005;

/** Segments in the little arc that calls out the obliquity. */
const TILT_ARC_STEPS = 24;

const quantizeDeg = (deg: number) => Math.round(deg / BELT_ANGLE_STEP);

/**
 * Whether a freshly projected label list differs from the one on screen by
 * enough to be worth re-rendering — a pixel, in either axis.
 */
function labelsMoved(prev: ScreenLabel[], next: ScreenLabel[]): boolean {
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

const NAMED_LABEL_KINDS = new Set(["star", "asterism", "vedicstar", "polestar", "culture"]);

/** Prefer the figure name, then drop any name sitting on top of one already kept. */
function cullOverlappingNames(labels: ScreenLabel[], minDist = 36): ScreenLabel[] {
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

export function AakashGocharScene({
  sim,
  view,
  mode,
  observer,
  calibration,
  ayanamsaShift = 0,
  vedicStars,
  selectedKey,
  lockObserver = false,
  focusNonce = 0,
  skyAim = null,
  aimedId = null,
  toggles,
  onSelect,
  onFollow,
  onSelectStar,
  onFollowStar,
  onAimSky,
  onFollowSky,
  onEmptyPress,
  onSelectObserver,
  onSample,
  arBackground = false,
  sensorDrive = false,
}: {
  sim: React.RefObject<SimState>;
  view: React.RefObject<ViewState>;
  mode: SkyMode;
  observer: Observer;
  calibration: SkyCalibration;
  /**
   * Degrees to add to the scene's own Lahiri fit so it agrees with the server
   * for the date on screen. Zero until the gochar response has arrived.
   */
  ayanamsaShift?: number;
  /**
   * The 32 named वैदिक तारा, already positioned (sidereal ecliptic degrees)
   * for the date on screen by the Swiss Ephemeris fixed-star catalogue on the
   * server. Plotted as-is — see [[VedicStarPosition]].
   */
  vedicStars?: VedicStarPosition[];
  selectedKey: GrahaKey | null;
  /**
   * Lock onto the observer's own place on the globe rather than onto a graha.
   * Takes precedence over {@link selectedKey} — the two are alternative
   * answers to the same question, "what is the camera following?".
   */
  lockObserver?: boolean;
  /**
   * Bumped every time the reader *asks* to focus something — pressing
   * केन्द्रविन्दु, picking a graha behind it, turning ग्रह पछ्याउनुहोस् on.
   *
   * The lock itself only holds the camera while the clock is running; on a
   * paused sky the drag is the reader's again. So asking to focus has to be
   * its own event rather than a state the camera can read, or pressing it on a
   * paused sky would centre nothing.
   */
  focusNonce?: number;
  /**
   * A fixed point in the sky to centre, from the search box — ecliptic
   * longitude and latitude at J2000, plus a nonce that changes each time it is
   * asked for.
   *
   * Grahas are centred by being selected, because they are objects in the scene
   * with a live position. A star is not: it is a direction. So it arrives as a
   * direction and is aimed at through the same one-frame recentre.
   */
  skyAim?: { lon: number; lat: number; nonce: number; fov?: number; sidereal?: boolean } | null;
  /**
   * Search/pick id of the named star currently under the reticle (`vedic:3`).
   * The matching point is crowned so it is obvious which of the 32 was chosen.
   */
  aimedId?: string | null;
  toggles: SceneToggles;
  onSelect: (key: GrahaKey) => void;
  /** Pressed twice — select it *and* turn following on. */
  onFollow: (key: GrahaKey) => void;
  /** A named वैदिक तारा was pressed — mark it, camera stays put. */
  onSelectStar?: (star: VedicStarPosition, index: number) => void;
  /** Pressed twice — mark it *and* centre the camera on it, same as {@link onFollow}. */
  onFollowStar?: (star: VedicStarPosition, index: number) => void;
  /**
   * A नक्षत्र member (or the figure's own name) was pressed — mark it, camera
   * stays put. `lon`/`lat` are already sidereal ecliptic degrees of date,
   * same frame {@link place} uses.
   */
  onAimSky?: (hit: {
    id: string;
    ne: string;
    en: string;
    lon: number;
    lat: number;
    hintNe?: string;
    hintEn?: string;
    sidereal?: boolean;
  }) => void;
  /** Pressed twice — mark it *and* centre the camera on it, same as {@link onFollow}. */
  onFollowSky?: (hit: {
    id: string;
    ne: string;
    en: string;
    lon: number;
    lat: number;
    hintNe?: string;
    hintEn?: string;
    sidereal?: boolean;
  }) => void;
  /** A press that landed on nothing — empty sky, not a graha. */
  onEmptyPress?: () => void;
  /** The marker on the globe was pressed — your place, chosen as the target. */
  onSelectObserver?: () => void;
  onSample: (sample: SkySample) => void;
  /**
   * AR mode: the real world shows through a transparently-cleared canvas
   * behind this, so the synthetic backdrop that normally stands in for it —
   * the star sphere, the horizon hillside — has nothing left to do here.
   */
  arBackground?: boolean;
  /**
   * The phone's own tilt is driving the horizon camera. Follow/lock-centre
   * must not overwrite yaw/pitch every frame or the sky sits still while
   * the device moves.
   */
  sensorDrive?: boolean;
}) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const loaded = useLoader(THREE.TextureLoader, SKY_TEXTURE_SOURCES as string[]);
  const textures = useMemo(() => {
    /* Anisotropic filtering, at whatever the card will give. A sphere shows its
       map at every angle at once, and towards the limb the texture is being
       squeezed into a few pixels — that is where a trilinear mipmap gives up
       and smears, and it is most of what "the Earth looks blurry" was. */
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy?.() ?? 1;
    const map = {} as Record<SkyTextureKey, THREE.Texture>;
    SKY_TEXTURE_KEYS.forEach((key, i) => {
      const tex = loaded[i];
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAnisotropy;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.needsUpdate = true;
      map[key] = tex;
    });
    return map;
  }, [loaded, gl]);

  /** The dome's own sky — a real equirectangular Milky Way panorama, loaded
      apart from {@link SKY_TEXTURE_SOURCES} since it lives under `src/assets`
      rather than `public/sky3d`. */
  const milkyWayRaw = useLoader(THREE.TextureLoader, milkyWayUrl);
  const milkyWay = useMemo(() => {
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy?.() ?? 1;
    milkyWayRaw.colorSpace = THREE.SRGBColorSpace;
    milkyWayRaw.anisotropy = maxAnisotropy;
    milkyWayRaw.minFilter = THREE.LinearMipmapLinearFilter;
    milkyWayRaw.magFilter = THREE.LinearFilter;
    milkyWayRaw.generateMipmaps = true;
    /* {@link makeMilkyWayGeometry}'s own U runs smoothly past 0 and 1 rather
       than being clamped into range — this is what makes that safe to
       sample instead of smearing the edge pixel across the seam. */
    milkyWayRaw.wrapS = THREE.RepeatWrapping;
    /* Clamp the poles — repeating the panorama in V stacked three copies
       of the band on top of each other and stretched each one. One wrap
       around the sphere, 2:1, is the file's own aspect. */
    milkyWayRaw.wrapT = THREE.ClampToEdgeWrapping;
    milkyWayRaw.repeat.set(1, 1);
    milkyWayRaw.needsUpdate = true;
    return milkyWayRaw;
  }, [milkyWayRaw, gl]);
  const milkyWayGeometry = useMemo(() => makeMilkyWayGeometry(400), []);

  /**
   * The marker ring, sized and positioned exactly like the photograph it
   * belongs to — see the doc comment where it is built, just below.
   */
  const nebulaMarkerTex = useMemo(() => ringTexture(), []);

  /**
   * A small curated set of Stellarium's own deep-sky object photographs —
   * see {@link module:lib/sky3d/nebulae} — each a real astrophoto rather than a synthesised dot,
   * placed at its true position and true angular size. A `Sprite` always
   * faces the camera, which is exactly right here: these are flat
   * photographs of a small patch of sky, not solid bodies with a far side.
   *
   * `depthTest: false` is not optional the way it might look — every one of
   * these sits exactly on the same shell as the star sphere and the Milky
   * Way panorama (`place(…, starRadius)`, the identical radius all three
   * use), so with depth testing on, a sprite and the surface behind it are
   * at the same depth-buffer value and the GPU's rounding decides which
   * wins on any given frame — different sprites winning on different
   * frames is exactly a flicker. `renderOrder` already does the real
   * ordering job here; depth has nothing left to add and only something to
   * break.
   */
  const nebulaField = useMemo(() => {
    return flattenNebulae().map((entry, i) => {
      const material = new THREE.SpriteMaterial({
        /* No map yet — see {@link loadNebulaTexture}. Every one of these is
           a photograph of a few hundred KB, and `useLoader` over the whole
           catalogue fetched and decoded all of them before the sky could
           draw its first frame, for images that are invisible until the
           lens has pulled in on one. They are fetched on first need
           instead. */
        transparent: true,
        /* Additive, exactly as their own tile pass does it
           (`StelSkyImageTile::draw`: `setBlending(true, GL_ONE, GL_ONE)`).
           Not a stylistic choice — these PNGs carry no alpha, their sky is
           *black pixels*, and under normal blending black is a colour that
           gets painted: every image lands as an opaque black rectangle over
           the stars, with its own edges showing. Additive makes black
           contribute nothing, so only the nebulosity is added and the
           rectangle disappears on its own. */
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(material);
      sprite.renderOrder = -0.3;
      sprite.frustumCulled = false;
      sprite.visible = false;
      return {
        ...entry,
        sprite,
        material,
        url: NEBULA_SOURCES[i],
        loadState: "idle" as LoadState,
      };
    });
  }, []);

  /**
   * One marker ring per *named object*, not one per catalogue tile.
   *
   * Barnard's Loop alone is four overlapping photographs — real, correctly
   * placed detail, worth every one of those sprites. A ring is a different
   * thing: it says "an object is here," and four rings all saying that for
   * the one loop, each labelled बर्नार्ड लूप, is not four facts — it is the
   * same fact drawn four times, right on top of itself. Grouped by
   * catalogue designation exactly the way `sky-catalogue.ts` groups them for
   * search, so the ring a reader sees and the target a search pick lands on
   * are the same object measured the same way: the tile with the largest
   * angular area stands for the whole field, both as the ring's centre and
   * as the size it is measured against.
   */
  const nebulaMarkers = useMemo(() => {
    const byDesignation = new Map<string, number>();
    nebulaField.forEach((entry, i) => {
      const key = entry.nebula.catalog || entry.nebula.id;
      const current = byDesignation.get(key);
      if (current == null || entry.spanDeg > nebulaField[current].spanDeg) {
        byDesignation.set(key, i);
      }
    });
    return Array.from(byDesignation.values()).map((nebulaIndex) => {
      /* Normal blending, not additive — a ring is meant to read as a crisp
         line against whatever is behind it, not brighten it, and additive
         would wash the outline out against the Milky Way panorama it is
         usually sitting on top of. Needs no texture of its own to wait for,
         so it can show well before the photograph behind it has finished
         loading — the whole point of a marker. */
      const markerMaterial = new THREE.SpriteMaterial({
        map: nebulaMarkerTex,
        color: "#7fd4ff",
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0,
        sizeAttenuation: true,
      });
      const marker = new THREE.Sprite(markerMaterial);
      marker.renderOrder = -0.29;
      marker.frustumCulled = false;
      marker.visible = false;
      return { nebulaIndex, marker, markerMaterial };
    });
  }, [nebulaField, nebulaMarkerTex]);

  /**
   * See the doc comment on the sky sphere below — a flat brightness
   * multiplier, which `color` on a hex/string prop cannot express.
   *
   * Real MilkyWay.cpp's own equivalent is not a fixed number: `aLum =
   * qMin(0.38f, aLum*2.f)` (MilkyWay.cpp:339) only *caps* a value built by
   * `eye->adaptLuminanceScaled(...)` — a whole simulated eye-adaptation
   * curve this file has no access to reproduce — and that capped `aLum` is
   * then itself multiplied by `intensity * intensityFovScale`
   * (MilkyWay.cpp:343) before ever reaching the texture. Matching the
   * literal `0.38` while skipping the rest of that chain is what actually
   * produced a washed-out panorama next to real Stellarium's own — a
   * ceiling on a curve is not the curve. `intensityFovScale` itself is a
   * no-op here regardless: it only fades the band out below a 2.5° field
   * (MilkyWay.cpp:59-60), and this panorama fades toward the real DSS2
   * tiles well before that — see {@link HIPS_BLEND_START_FOV}/{@link
   * HIPS_BLEND_END_FOV} — rather than owning that whole range outright the
   * way it once did. `0.9` is an empirical stand-in for the net result of
   * the chain this file cannot reproduce piece by piece, checked directly
   * against a real Stellarium screenshot at the same location and time
   * rather than derived from the formula alone.
   */
  const skyBoost = useMemo(() => new THREE.Color(0.9, 0.9, 0.9), []);

  /**
   * अन्तरिक्ष's Earth wears the Learn playground's cartoon map, not the
   * photograph the globe view uses.
   *
   * At the space view's scale the planet is a couple of hundred pixels across
   * and half of it is in shadow: a photograph at that size is mud, while flat
   * colour still reads as continents when dimmed to a third. Raw texels — the
   * shader writes final pixels itself. See `makeEarthMaterial`.
   */
  const earthToon = useLoader(THREE.TextureLoader, earthToonUrl);
  const spaceEarthMat = useMemo(() => {
    earthToon.colorSpace = THREE.NoColorSpace;
    earthToon.anisotropy = gl.capabilities.getMaxAnisotropy?.() ?? 1;
    return makeEarthMaterial(earthToon);
  }, [earthToon, gl]);
  useEffect(() => () => spaceEarthMat.dispose(), [spaceEarthMat]);

  /**
   * The Moon's own face for the dome and the globe — see `makeMoonMaterial`
   * for why those two cannot simply be lit.
   *
   * Its own copy of the map, because the shader writes final pixels and so
   * wants raw texels, while the space view's `meshStandardMaterial` wants the
   * same image tagged sRGB. One `Texture` cannot answer both, and the clone
   * shares the decoded image either way.
   */
  const moonPhaseMat = useMemo(() => {
    const map = textures.moon.clone();
    map.colorSpace = THREE.NoColorSpace;
    map.needsUpdate = true;
    return makeMoonMaterial(map);
  }, [textures]);
  useEffect(
    () => () => {
      moonPhaseMat.uniforms.map.value.dispose();
      moonPhaseMat.dispose();
    },
    [moonPhaseMat],
  );

  const bodyRefs = useRef<Partial<Record<GrahaKey, THREE.Group>>>({});
  const spinRefs = useRef<Partial<Record<GrahaKey, THREE.Mesh>>>({});
  const retroRefs = useRef<Partial<Record<GrahaKey, THREE.Group>>>({});
  const shellRefs = useRef<Partial<Record<GrahaKey, THREE.Line>>>({});
  const earthRef = useRef<THREE.Mesh | null>(null);
  const earthGroupRef = useRef<THREE.Group | null>(null);
  const sunLightRef = useRef<THREE.PointLight | null>(null);
  const ambientRef = useRef<THREE.AmbientLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
  const starsRef = useRef<THREE.Mesh | null>(null);

  /**
   * The HiPS Milky Way — real DSS2 tiles standing in for the single fixed
   * panorama, verified against M8 before any of this was built (see
   * `hips.ts`'s own module doc comment for that whole derivation).
   *
   * `hipsGroupRef` gets the exact same per-frame rotation {@link starsRef}
   * does, a few lines below: tile geometry is built in the same equatorial
   * frame {@link makeMilkyWayGeometry} already uses, so the two share one
   * rotation with nothing extra to keep in sync.
   *
   * `hipsCache` holds every tile mesh ever created for the life of the
   * component — never disposed, never removed from the group, only shown
   * or hidden — because the whole local order 0–3 set is ~45MB, well
   * inside what is safe to keep once fetched (Step 10: "do not build a
   * complicated cache system initially"). What actually varies frame to
   * frame is `.visible` and, on first need, `.state` going from `idle` to
   * `loading` to `ready`.
   */
  const hipsGroupRef = useRef<THREE.Group | null>(null);
  const hipsCache = useRef(new Map<string, HipsTileEntry>());
  /** Step 12's optional tile-boundary visualization — one `THREE.Line` per current leaf tile, rebuilt only while `hipsDebugControls.current.showBoundaries` is on (see the per-frame block). Lives in `hipsGroupRef` so it inherits the same rotation as the tiles it outlines. */
  const hipsDebugOutlines = useRef<THREE.Group | null>(null);
  const [hipsDebugOn, setHipsDebugOn] = useState(
    () => typeof window !== "undefined" && window.location.search.includes("hipsdebug"),
  );
  /**
   * Step 13 isolation controls — developer-only, `null`/`false` (their
   * default) means "no override," so normal production selection runs
   * untouched. A `ref`, not state: these are read once per frame inside
   * `useFrame` and must never themselves trigger a React re-render.
   */
  const hipsDebugControls = useRef<{
    onlyOrder: number | null;
    onlyPix: { order: number; pix: number } | null;
    disableFallback: boolean;
    disableLod: boolean;
    showBoundaries: boolean;
  }>({ onlyOrder: null, onlyPix: null, disableFallback: false, disableLod: false, showBoundaries: false });
  useEffect(() => {
    type HipsDebugApi = (on?: boolean | Partial<(typeof hipsDebugControls)["current"]>) => void;
    (window as unknown as { __hipsDebug?: HipsDebugApi }).__hipsDebug = (arg) => {
      if (typeof arg === "object" && arg !== null) {
        Object.assign(hipsDebugControls.current, arg);
        setHipsDebugOn(true);
        return;
      }
      setHipsDebugOn((prev) => arg ?? !prev);
    };
    return () => {
      delete (window as unknown as { __hipsDebug?: HipsDebugApi }).__hipsDebug;
    };
  }, []);
  /** The HUD outside the Canvas polls a module-level snapshot (see
      {@link writeHipsDebugSnapshot}) — clear it on unmount and whenever
      debug is switched off, so a stale HUD never lingers after the toggle. */
  useEffect(() => {
    if (!hipsDebugOn) clearHipsDebugSnapshot();
    return () => clearHipsDebugSnapshot();
  }, [hipsDebugOn]);
  const horizonGlow = useMemo(() => makeHorizonGlow(399, "#4a3626", 0.16), []);
  const milkyWayMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  useEffect(() => {
    if (milkyWayMatRef.current) injectMilkyWayExtinction(milkyWayMatRef.current);
  }, []);
  const groundRef = useRef<THREE.Group | null>(null);
  const groundMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const horizonGroupRef = useRef<THREE.Group | null>(null);
  const shellRef = useRef<THREE.Mesh | null>(null);
  const globeRootRef = useRef<THREE.Group | null>(null);
  const globeSpinRef = useRef<THREE.Group | null>(null);
  const subsolarRef = useRef<THREE.Mesh | null>(null);
  /**
   * The point the *selected* graha stands over, the same mark the Sun gets.
   *
   * Without it the globe drew only a ray from the Earth's centre out to the
   * body, and a line ending at a centre marks nothing on the surface: where it
   * appears to cross the map is pure parallax, so it slid across the Earth as
   * the camera turned and looked like a broken pointer. One dot planted on the
   * surface along the same direction is what makes it a place. One ref, not
   * nine — only one graha is selected at a time.
   */
  const subGrahaRef = useRef<THREE.Mesh | null>(null);
  const spaceOnlyRef = useRef<THREE.Group | null>(null);
  const sharaFootRef = useRef<THREE.Mesh | null>(null);
  const rashiHiRef = useRef<THREE.Mesh | null>(null);
  const nakHiRef = useRef<THREE.Mesh | null>(null);
  /** Which graha the lit belt segments are currently tinted for. */
  const lastBeltKey = useRef<GrahaKey | null>(null);
  const moonEclipse = useRef<{ kind: "solar" | "lunar" | null; mag: number }>({ kind: null, mag: 0 });
  const umbraAxis = useRef(new THREE.Vector3());
  const umbraFrom = useRef(new THREE.Vector3());
  const umbraTo = useRef(new THREE.Vector3());
  /** Body → the ecliptic plane below or above it: the शर, drawn. */
  const sharaLine = useMemo(() => makeDynamicLine(2, "#ffffff", 0.55), []);
  const lunarUmbra = useMemo(() => makeUmbra(0x5a140e, 0.32), []);
  const solarUmbra = useMemo(() => makeUmbra(0x000000, 0.78, 0.72, 1.05), []);
  useEffect(
    () => () => {
      lunarUmbra.geometry.dispose();
      (lunarUmbra.material as THREE.Material).dispose();
      solarUmbra.geometry.dispose();
      (solarUmbra.material as THREE.Material).dispose();
    },
    [lunarUmbra, solarUmbra],
  );
  const spaceMeridian = useMemo(() => makePrimeMeridian(EARTH_RADIUS), []);
  const globeMeridian = useMemo(() => makePrimeMeridian(GLOBE_R), []);

  /* Sight rays: Earth → through the graha → नक्षत्र rim. */
  const rays = useMemo(() => {
    const out = {} as Record<GrahaKey, THREE.Line>;
    for (const key of GEO_BODY_ORDER) {
      const line = makeDynamicLine(2, GRAHA_COLOR[key], 0.92);
      line.renderOrder = 6;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.depthWrite = false;
      out[key] = line;
    }
    return out;
  }, []);

  /**
   * Whether a solid body is allowed to hide a sightline.
   *
   * In अन्तरिक्ष and क्षितिज, no: the ray lies in the ecliptic plane and the
   * disc drawn on that same plane would bury it along its whole length, which
   * is a z-fight rather than an occlusion.
   *
   * In पृथ्वी गोला, yes — and it has to. There is a 30-unit opaque planet in
   * the middle of that view, and the graha meshes are depth-tested against it,
   * so a ray that ignores depth is drawn across the face of the Earth pointing
   * at a body the Earth is hiding. Depth-writing stays off either way: these
   * are overlay lines and must never occlude each other.
   */
  useEffect(() => {
    const test = mode === "globe";
    for (const key of GEO_BODY_ORDER) {
      const mat = rays[key].material as THREE.LineBasicMaterial;
      mat.depthTest = test;
      mat.needsUpdate = true;
    }
  }, [mode, rays]);

  /* Every graha's path over ±45 days — where the vakri loops show. Each keeps
     its own colour so a crowded belt still reads. */
  const trails = useMemo(() => {
    const out = {} as Record<GrahaKey, THREE.Line>;
    for (const key of GEO_BODY_ORDER) out[key] = makeDynamicLine(TRAIL_STEPS + 1, GRAHA_COLOR[key], 0.4);
    return out;
  }, []);
  /* The trails read as a belt themselves — nine criss-crossing arcs with
     राशि belt off is just a mesh, not nine paths anyone can follow. They ride
     the same switch rather than one of their own. */
  useEffect(() => {
    for (const key of GEO_BODY_ORDER) trails[key].visible = toggles.rashiBelt;
  }, [toggles.rashiBelt, trails]);

  /** यम/वरुण/अरुण — plain spheres, no texture, no pick target, no trail.
      {@link runFrame} moves and sizes them; nothing else about a graha
      applies. */
  const outerPlanets = useMemo(() => {
    const out = {} as Record<OuterPlanetKey, THREE.Mesh>;
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    for (const key of OUTER_PLANET_ORDER) {
      const mesh = new THREE.Mesh(
        geometry,
        /* `transparent` (alpha still pinned at 1 — purely a render-queue
           change) plus an explicit `renderOrder` above every HiPS tile's
           own — see the identical fix and reasoning on `GrahaBody`'s own
           materials. Missing here until now: these three were built as
           their own separate system (see the doc comment on {@link
           OUTER_PLANET_ORDER}) and never got it, so a HiPS tile with
           `depthTest: false` painted straight over an opaque यम/वरुण/अरुण
           the instant one shared its screen position — "getting lost on
           zoom" was that, not the dot actually leaving the sky. */
        new THREE.MeshBasicMaterial({ color: OUTER_PLANET_COLOR[key], transparent: true }),
      );
      mesh.renderOrder = 1;
      mesh.visible = false;
      out[key] = mesh;
    }
    return out;
  }, []);

  /**
   * Horizon view furniture: the banded zodiac, the nakshatra strip inside it,
   * the degree scale, and the alt-az cage. Each entry keeps its source vertices
   * in sky coordinates and is re-projected onto the dome every frame.
   */
  const skyLines = useMemo(() => {
    const band = (
      layer: "rashi" | "nakshatra" | "shared",
      src: eclipticPoint[],
      color: string,
      opacity: number,
      segments = false,
    ) => ({
      layer,
      src,
      object: segments
        ? makeDynamicSegments(src.length, color, opacity)
        : makeDynamicLine(src.length, color, opacity),
    });
    return [
      band("rashi", BAND_EDGES.rashiOuter, ZODIAC, 1),
      band("rashi", BAND_EDGES.rashiInner, ZODIAC, 1),
      band("nakshatra", BAND_EDGES.nakOuter, NAKSHATRA, 0.9),
      band("nakshatra", BAND_EDGES.nakInner, NAKSHATRA, 0.9),
      band("shared", BAND_EDGES.ecliptic, ZODIAC, 0.75),
      band("rashi", RASHI_DIVIDERS, ZODIAC, 0.9, true),
      band("nakshatra", NAKSHATRA_DIVIDERS, NAKSHATRA, 0.8, true),
      band("nakshatra", PADA_TICKS, NAKSHATRA, 0.55, true),
      band("rashi", DEGREE_TICKS, ZODIAC, 0.6, true),
    ];
  }, []);

  /**
   * The Earth globe's graticule, built once in Earth-fixed coordinates and
   * spun by the group it hangs in. Latitude/longitude only — the globe itself
   * is a dark ball, so the grid and the zodiac ring are all there is to read.
   */
  const globeLines = useMemo(() => {
    const asLine = (src: GeoPoint[], color: string, opacity: number) => ({
      src,
      object: makeLine(
        /* Held clear of the sphere rather than on it. At the surface radius the
           grid fought the map for the same depth and came and went in bands as
           the globe turned; a percent of clearance is invisible at this scale
           and settles it. */
        src.map((p) => new THREE.Vector3(...geoToVec3(p.lat, p.lon, GLOBE_R * 1.01))),
        color,
        opacity,
      ),
    });
    /* Brighter than the dark ball this used to be drawn on: over a satellite
       map at a fifth opacity the graticule simply was not there. */
    return {
      parallels: GLOBE_PARALLELS.map((p) => asLine(p, GLOBE_GRID, 0.5)),
      meridians: GLOBE_MERIDIANS.map((m) => asLine(m, GLOBE_GRID, 0.5)),
      equator: asLine(GLOBE_EQUATOR, "#7fd4ff", 0.95),
      tropics: GLOBE_TROPICS.map((t) => ({ ...asLine(t.points, ZODIAC, 0.85), id: t.id, lat: t.lat })),
    };
  }, []);

  /**
   * The नक्षत्र star groups: three point clouds by brightness so the योगतारा
   * and the first-magnitude stars carry the shape, plus the figure lines.
   *
   * Every star is held at its ecliptic longitude for J2000 and precessed in the
   * frame loop, which is what keeps it fixed against the belt while the pair of
   * them drift away from the equinox together.
   */
  const starField = useMemo(() => {
    const { stars, links } = flattenAsterisms();
    const junction: number[] = [];
    const bright: number[] = [];
    const faint: number[] = [];
    stars.forEach((s, i) => {
      if (s.junction) junction.push(i);
      else if (s.mag <= 3.2) bright.push(i);
      else faint.push(i);
    });
    /* Which stars belong to which नक्षत्र, so the group can be named as a group
       — the label goes on the figure, not on the belt segment below it. */
    const byNakshatra = new Map<number, number[]>();
    stars.forEach((s, i) => {
      const list = byNakshatra.get(s.nakshatra);
      if (list) list.push(i);
      else byNakshatra.set(s.nakshatra, [i]);
    });
    const sizeOpts = { faintest: 5.5, brightest: -1.5, minPx: 1.4, maxPx: 5 };
    const junctionPoints = makeStarPoints(junction.length, "#ffd98a", 5, 0.95);
    const brightPoints = makeStarPoints(bright.length, "#eaf2ff", 4, 0.82);
    const faintPoints = makeStarPoints(faint.length, "#c8d8ee", 2.6, 0.58);
    sizeStarsByMagnitude(junctionPoints, junction.map((i) => stars[i].mag), sizeOpts);
    sizeStarsByMagnitude(brightPoints, bright.map((i) => stars[i].mag), sizeOpts);
    sizeStarsByMagnitude(faintPoints, faint.map((i) => stars[i].mag), sizeOpts);
    return {
      stars,
      links,
      byNakshatra: [...byNakshatra.entries()],
      groups: [
        { indices: junction, object: junctionPoints },
        { indices: bright, object: brightPoints },
        { indices: faint, object: faintPoints },
      ],
      lines: makeDynamicSegments(links.length * 2, "#9db9dd", 0.5),
    };
  }, []);

  /**
   * The rest of the Indian sky culture: the twelve राशि as their own figures,
   * plus सप्तर्षि, शिंशुमारः and the other mythological groups — everything
   * [[sky-culture]] carries that the 27 नक्षत्र asterisms above do not
   * already draw. Dome and globe only; unlike {@link starField} it has no
   * रashi-belt layout, so it never appears in अन्तरिक्ष.
   */
  const cultureField = useMemo(() => {
    const { stars, links, figures } = flattenSkyCulture();
    const named: number[] = [];
    const bright: number[] = [];
    const faint: number[] = [];
    stars.forEach((s, i) => {
      if (s.ne || s.en) named.push(i);
      else if (s.mag <= 3.4) bright.push(i);
      else faint.push(i);
    });
    const sizeOpts = { faintest: 5.5, brightest: -1.5, minPx: 1.2, maxPx: 4.4 };
    const namedPoints = makeStarPoints(named.length, "#ffd98a", 4.4, 0.9);
    const brightPoints = makeStarPoints(bright.length, "#dfe8fb", 3.4, 0.7);
    const faintPoints = makeStarPoints(faint.length, "#aebfdd", 2, 0.45);
    sizeStarsByMagnitude(namedPoints, named.map((i) => stars[i].mag), sizeOpts);
    sizeStarsByMagnitude(brightPoints, bright.map((i) => stars[i].mag), sizeOpts);
    sizeStarsByMagnitude(faintPoints, faint.map((i) => stars[i].mag), sizeOpts);
    return {
      stars,
      links,
      figures,
      groups: [
        { indices: named, object: namedPoints },
        { indices: bright, object: brightPoints },
        { indices: faint, object: faintPoints },
      ],
      lines: makeDynamicSegments(links.length * 2, "#7d93b8", 0.4),
    };
  }, []);

  /**
   * The naked-eye sky itself, under every named figure — see
   * [[background-stars]]. No lines, no labels, no toggle: the same as the
   * Milky Way panorama it sits alongside. Dome and globe put it on the sky
   * sphere; अन्तरिक्ष puts it outside the ecliptic disc.
   */
  const backgroundField = useMemo(() => {
    const stars = flattenBackgroundStars();
    const bright: number[] = [];
    const mid: number[] = [];
    const faint: number[] = [];
    stars.forEach((s, i) => {
      if (s.mag <= 2) bright.push(i);
      else if (s.mag <= 4.5) mid.push(i);
      else faint.push(i);
    });
    /* Stellarium never lets a star's radius fall below its own floor either
       (StelSkyDrawer::computeRCMag: under 1.2px it stops shrinking the dot
       and dims its luminance instead) — a sub-pixel point is one the
       renderer may drop or alias into a flicker, not a fainter star.

       Faintest raised from 5.5 to 7.5: at 5.5 this layer topped out around
       2,900 stars, most of them nowhere near the galactic plane — nothing
       left to fill the band itself in once the panorama fades on zoom, which
       is what made it read as a photo rather than a sky dense with actual
       points. 7.5 is a quarter of Stellarium's own default catalogue depth
       and about 25,500 stars, dense enough for the plane to look like the
       plane rather than a scatter of named dots on an empty background. */
    const sizeOpts = { faintest: 7.5, brightest: -1.5, minPx: 1, maxPx: 3 };
    const brightPoints = makeStarPoints(bright.length, "#eef4ff", 2.6, 0.8);
    const midPoints = makeStarPoints(mid.length, "#d7e2f5", 1.6, 0.5);
    const faintPoints = makeStarPoints(faint.length, "#aebedb", 0.9, 0.22);
    sizeStarsByMagnitude(brightPoints, bright.map((i) => stars[i].mag), sizeOpts);
    sizeStarsByMagnitude(midPoints, mid.map((i) => stars[i].mag), sizeOpts);
    sizeStarsByMagnitude(faintPoints, faint.map((i) => stars[i].mag), sizeOpts);
    return {
      stars,
      groups: [
        { indices: bright, object: brightPoints },
        { indices: mid, object: midPoints },
        { indices: faint, object: faintPoints },
      ],
    };
  }, []);

  /**
   * Where each star sits inside its own नक्षत्र, flat on the wheel.
   *
   * The figure is drawn in the belt, not on a drum wall: longitude maps into
   * the segment, latitude maps across the band's width, y stays on the ecliptic.
   * That is the Learn playground's own reading — a नक्षत्र is a patch of the
   * wheel, not a vertical panel standing on it.
   */
  const spaceStarPos = useMemo(() => {
    const out: [number, number, number][] = new Array(starField.stars.length);
    const r0 = NAK_INNER + 0.4;
    const r1 = NAK_OUTER - 0.4;
    for (const [nak, indices] of starField.byNakshatra) {
      /* Longitudes inside a group can straddle 0°/360°, so they are measured
         against the first member rather than in absolute terms. */
      const base = starField.stars[indices[0]].lon;
      const rel = indices.map((i) => {
        let d = starField.stars[i].lon - base;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        return d;
      });
      const lats = indices.map((i) => starField.stars[i].lat);
      const minLon = Math.min(...rel);
      const spanLon = Math.max(...rel) - minLon;
      const minLat = Math.min(...lats);
      const spanLat = Math.max(...lats) - minLat;
      const segStart = (nak - 1) * NAKSHATRA_ARC;
      indices.forEach((starIndex, k) => {
        const u = spanLon > 1e-6 ? (rel[k] - minLon) / spanLon : 0.5;
        const v = spanLat > 1e-6 ? (lats[k] - minLat) / spanLat : 0.5;
        const lon = segStart + (PANEL_INSET + u * (1 - 2 * PANEL_INSET)) * NAKSHATRA_ARC;
        const r = r0 + v * (r1 - r0);
        const a = lon * DEG;
        out[starIndex] = [r * Math.cos(a), 0.04, -r * Math.sin(a)];
      });
    }
    return out;
  }, [starField]);

  /**
   * The ध्रुव तारा, and the circle the celestial pole walks between them.
   *
   * The circle is fixed in the sky — ecliptic latitude 90° − ε all the way
   * round — and the stars sitting on or near it are exactly the ones that get a
   * turn as pole star. Running the clock walks the pole along it.
   */
  const poleField = useMemo(() => {
    const stars = placedPoleStars(23.4392911);
    return {
      stars,
      track: poleTrackPoints(23.4392911),
      trackLine: makeDynamicLine(181, "#8ab4f8", 0.62),
      points: makeStarPoints(stars.length, "#dceaff", 3, 1),
      /* The reigning one is drawn on top of its own dot, larger and gold. */
      crown: makeStarPoints(1, "#ffd166", 4.6, 1),
    };
  }, []);

  /**
   * The named वैदिक तारा — अगस्त्य, अभिजित्, सप्तर्षि and the rest.
   *
   * Unlike every other star field on this page, these carry no client-side
   * precession formula: the server positions them (Swiss Ephemeris
   * fixed-star catalogue, sidereal, for the date on screen) and this just
   * plots what it was given. The buffer is sized to `VEDIC_STAR_CAPACITY`
   * and `setDrawRange` trims it to however many the current
   * response actually carried — fewer while it is still loading, or if the
   * server's star layer failed soft.
   */
  const vedicField = useMemo(() => {
    const points = makeStarPoints(VEDIC_STAR_CAPACITY, "#ffe08a", 4.6, 1);
    points.geometry.setDrawRange(0, 0);
    points.renderOrder = 4;
    const crown = makeStarPoints(1, "#fff6c8", 6.4, 1);
    crown.renderOrder = 5;
    crown.visible = false;
    return { points, crown };
  }, []);

  /**
   * Lines joining the वैदिक तारा that belong to a named figure — सप्तर्षि's
   * bowl and handle, and whatever else [[VEDIC_CONSTELLATION_LINKS]] lists.
   * Sized once for every link every known figure could draw; a figure whose
   * member stars are not all in the current response simply writes nothing,
   * so the buffer only ever carries the shapes that actually resolved.
   */
  const vedicConstLines = useMemo(() => {
    const total = VEDIC_CONSTELLATION_LINKS.reduce((n, g) => n + g.links.length, 0);
    const lines = makeDynamicSegments(total * 2, "#e8c179", 0.45);
    lines.geometry.setDrawRange(0, 0);
    lines.renderOrder = 3;
    return lines;
  }, []);

  const vedicStarsRef = useRef(vedicStars);
  useEffect(() => {
    vedicStarsRef.current = vedicStars;
  }, [vedicStars]);
  const vedicPickRef = useRef(
    Array.from({ length: VEDIC_STAR_CAPACITY }, () => ({
      index: -1,
      world: new THREE.Vector3(),
    })),
  );
  const vedicPickCount = useRef(0);
  const asterismPickRef = useRef(
    starField.stars.map(() => ({
      index: -1,
      lon: 0,
      lat: 0,
      world: new THREE.Vector3(),
    })),
  );
  const asterismPickCount = useRef(0);
  /** One slot per catalogue entry is a safe upper bound: at most this many
      markers can ever be "on and pickable" in a single frame. */
  const nebulaPickRef = useRef(
    nebulaMarkers.map(() => ({
      index: -1,
      world: new THREE.Vector3(),
      worldRadius: 0,
    })),
  );
  const nebulaPickCount = useRef(0);

  /**
   * The obliquity, drawn as an angle rather than left implicit.
   *
   * The globe's axis is +Y and the ecliptic pole sits `eps` off it, so the gap
   * between those two lines *is* the tilt — and it is also the centre of the
   * circle the pole stars stand on, which is why the two read together.
   */
  const tiltMarks = useMemo(
    () => ({
      /** The perpendicular to the orbit: where the axis would point untilted. */
      eclipticAxis: makeDynamicLine(2, "#8ab4f8", 0.55),
      arc: makeDynamicLine(TILT_ARC_STEPS + 1, "#ffd166", 0.9),
    }),
    [],
  );

  /** Earth centre → Sun, and where that ray lands on the globe. */
  const sunRay = useMemo(() => makeDynamicLine(2, "#ffd166", 0.75), []);

  /** The celestial equator — the reference the ecliptic is visibly tilted against. */
  const equatorLine = useMemo(() => makeDynamicLine(ecliptic_STEPS + 1, "#5aa9e6", 0.45), []);

  /**
   * Almucantars and verticals, one tier per zoom band — and each tier is built
   * the first time the lens is tight enough to want it, not at mount.
   *
   * The 1° cage alone is some eighty thousand vertices. Baking all four up
   * front spent that on a sky that opens with no cage at all, and the hitch
   * landed on the first frame of the view rather than on a zoom the reader
   * asked for. The group is created empty and fills in as they push in.
   */
  const grid = useMemo(() => {
    const group = new THREE.Group();
    group.name = "horizon-grid";
    /* The group and the slots it fills are made together and never apart: a
       tier remembered without the group it was added to, or a fresh group
       beside tiers that think they are already in one, is a cage that never
       gets drawn.

       `local` is one buffer, allocated once at its worst case and refilled
       from the view each frame — the arcminute tiers exist for a window a
       degree across, and baking those as whole spheres is millions of
       vertices to draw a few dozen lines. */
    const local = dressGrid(makeDynamicSegments(LOCAL_GRID_CAPACITY, GRID, GRID_OPACITY));
    local.visible = false;
    group.add(local);
    /* उ / पू / द / प, plus the mark on the zenith and the nadir. Baked once
       and never rebuilt: the four ribs of the dome do not depend on the lens,
       and every tier leaves them out so this is the only thing drawing them. */
    const frame = dressGrid(
      makeDynamicSegments(CARDINAL_VERTICALS.length + POLE_MARKS.length, GRID, 0.62),
    );
    [...CARDINAL_VERTICALS, ...POLE_MARKS].forEach((p, i) => {
      setPoint(frame, i, altAzToVec3(p.alt, p.az, GRID_R));
    });
    flushLine(frame);
    group.add(frame);
    return {
      group,
      /* Two families, two caches. They no longer share a spacing — the
         verticals' is chosen against the pole, see `verticalStepForFov` — so
         a single per-tier slot could not hold both. */
      altTiers: GRID_TIERS.map(() => null as THREE.LineSegments | null),
      azTiers: GRID_TIERS.map(() => null as THREE.LineSegments | null),
      local,
      localPairs: [] as HorizonPoint[],
      frame,
    };
  }, []);

  const horizonRing = useMemo(() => {
    const line = makeLine(circlePoints(DOME * 0.999, 180), "#c8ff7a", 0.9);
    line.renderOrder = 5;
    const mat = line.material as THREE.LineBasicMaterial;
    mat.depthTest = false;
    mat.depthWrite = false;
    return line;
  }, []);

  /**
   * काठमाडौँ as a 360° ground: the JPEG is a little-planet (nadir in the
   * middle), remapped onto the inner sky sphere so the city is underfoot and
   * the hills sit on the horizon. Its sky is punched out so the राशि belt
   * still shows through.
   */
  const kathmanduRaw = useLoader(THREE.TextureLoader, kathmanduUrl);
  const landscapeMap = useMemo(() => prepareKathmanduGround(kathmanduRaw), [kathmanduRaw]);
  useEffect(() => () => landscapeMap.dispose(), [landscapeMap]);
  const groundGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(DOME * 0.96, 128, 64);
    applyNadirStereographicUVs(g);
    return g;
  }, []);
  useEffect(() => () => groundGeo.dispose(), [groundGeo]);

  const shells = useMemo(
    () =>
      GEO_BODY_ORDER.filter((k) => k !== "rahu" && k !== "ketu").map((key) => ({
        key,
        points: circlePoints(1, 96),
        attach: (o: THREE.Line | null) => {
          shellRefs.current[key] = o ?? undefined;
        },
      })),
    [],
  );

  /** Stable ref callbacks per graha — fresh closures would churn every render. */
  const handles = useMemo(
    () =>
      Object.fromEntries(
        GEO_BODY_ORDER.map((key) => [
          key,
          {
            group: (o: THREE.Group | null) => {
              bodyRefs.current[key] = o ?? undefined;
            },
            spin: (o: THREE.Mesh | null) => {
              spinRefs.current[key] = o ?? undefined;
            },
            retro: (o: THREE.Group | null) => {
              retroRefs.current[key] = o ?? undefined;
            },
          },
        ]),
      ) as Record<
        GrahaKey,
        {
          group: (o: THREE.Group | null) => void;
          spin: (o: THREE.Mesh | null) => void;
          retro: (o: THREE.Group | null) => void;
        }
      >,
    [],
  );

  const frame = useRef(0);
  const lockedLst = useRef<number | null>(null);
  const lastSample = useRef(0);
  const lastLabelPush = useRef(0);
  const lastTrailKey = useRef("");
  /**
   * Which graha the trail sweep is up to — one per frame, never all at once.
   * Starts finished, so nothing is drawn before there is an epoch to draw it at.
   */
  const trailCursor = useRef(GEO_BODY_ORDER.length);
  /** The instant the sweep in progress is drawing, so all nine lines agree. */
  const trailBaseDt = useRef(0);
  /**
   * The sky mapping the zodiac band was last projected with. The band is a
   * couple of thousand vertices; re-projecting it when nothing has moved is the
   * single most expensive thing this loop can do, and outside the horizon view
   * nothing does move — the ring only creeps by the ayanamsa, a degree in 72
   * years. `null` forces the next frame to rebuild.
   */
  const lastBelt = useRef<{ mode: SkyMode; lst: number; ayan: number; eps: number } | null>(null);
  /** The obliquity the two tropic circles are currently drawn at. */
  const tropicEps = useRef(Number.NaN);
  const labels = useRef<ScreenLabel[]>([]);
  const scratch = useRef(new THREE.Vector3());

  /**
   * Picking a graha, by hand, in all three views.
   *
   * Two things rule out the ordinary way. The raycaster is wrong in क्षितिज:
   * every material there has the fisheye injected into its vertex shader, so
   * what is *drawn* is nowhere the camera matrix knows about — the camera stays
   * a quiet 60° perspective used only for depth — and three was testing a
   * picture nobody is looking at. And the `click` event is unreliable
   * everywhere, because the drag handler calls `preventDefault` on every
   * pointermove, which is enough to stop the browser ever synthesising one. A
   * press that worked before a drag would silently stop working after.
   *
   * So: `pointerup`, with the movement since `pointerdown` deciding whether it
   * was a press or a drag, and the graha found by projecting each body to the
   * screen the same way its label is placed — the fisheye in क्षितिज, the plain
   * camera in the other two — and taking the nearest within {@link PICK_RADIUS}.
   * One path, one behaviour, three views.
   *
   * A second press on the same graha inside {@link DOUBLE_MS} means follow it
   * rather than merely look at it.
   */
  /* onSelect / onFollow / onEmptyPress are new functions every time the
     selection changes — their own deps include the very state a press just
     set. Read through refs instead of putting them in the effect below, or
     every press tears the listeners down and rebuilds them, wiping the
     `lastKey` / `lastAt` closure that tells a double press from two singles —
     which is what made a double press silently stop working the moment the
     first press of it landed. */
  const onSelectRef = useRef(onSelect);
  const onFollowRef = useRef(onFollow);
  const onEmptyPressRef = useRef(onEmptyPress);
  const onSelectStarRef = useRef(onSelectStar);
  const onFollowStarRef = useRef(onFollowStar);
  const onAimSkyRef = useRef(onAimSky);
  const onFollowSkyRef = useRef(onFollowSky);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onFollowRef.current = onFollow;
    onEmptyPressRef.current = onEmptyPress;
    onSelectStarRef.current = onSelectStar;
    onFollowStarRef.current = onFollowStar;
    onAimSkyRef.current = onAimSky;
    onFollowSkyRef.current = onFollowSky;
  }, [onSelect, onFollow, onEmptyPress, onSelectStar, onFollowStar, onAimSky, onFollowSky]);

  useEffect(() => {
    const el = gl.domElement;
    const at = new THREE.Vector3();
    const edge = new THREE.Vector3();
    const rightAxis = new THREE.Vector3();
    const scratchPick = new THREE.Vector3();
    const scratchEdge = new THREE.Vector3();
    let downX = 0;
    let downY = 0;
    let downId: number | null = null;
    /* Prefixed by kind so a graha and a star never collide on the same id —
       "mercury" the graha and a differently-keyed star that happened to share
       a raw name are still two different presses. */
    let lastKey: string | null = null;
    let lastAt = 0;

    const onDown = (e: PointerEvent) => {
      if (downId !== null) return;
      downId = e.pointerId;
      downX = e.clientX;
      downY = e.clientY;
    };

    /* Where a world point lands on screen, mode-aware — the same map the
       labels and the reticle use. Null past the edge of what is drawn. */
    const project = (
      world: THREE.Vector3,
      rect: DOMRect,
      field: number,
      scratch: THREE.Vector3,
    ): { x: number; y: number } | null => {
      if (mode === "horizon") return projectHorizonRaw(world, camera, field, rect.width, rect.height, scratch);
      scratch.copy(world).project(camera);
      if (scratch.z > 1) return null;
      return { x: (scratch.x * 0.5 + 0.5) * rect.width, y: (-scratch.y * 0.5 + 0.5) * rect.height };
    };

    /**
     * The graha nearest the press, with a hit radius that grows with how big
     * the thing actually is on screen.
     *
     * {@link PICK_RADIUS} alone is only right at the distance the sky opens
     * at. Push in on Jupiter in अन्तरिक्ष until it fills a third of the frame
     * and a press anywhere on that disc — which is most of the screen near it
     * — has to count, or the one thing you can no longer miss becomes the one
     * thing you can no longer select. So each body's own apparent size is
     * measured every press, by projecting a point one radius off its centre
     * and reading the gap in pixels, and the hit test uses whichever of that
     * or {@link PICK_RADIUS} is larger.
     */
    const pick = (
      e: PointerEvent,
    ):
      | { kind: "graha"; key: GrahaKey }
      | { kind: "outerplanet"; key: OuterPlanetKey }
      | { kind: "vedicstar"; index: number }
      | { kind: "skystar"; index: number }
      | { kind: "nebula"; index: number }
      | null => {
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const field = fovForZoom("horizon", view.current.distance);
      rightAxis.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      let best: GrahaKey | null = null;
      let bestD = Infinity;
      for (const key of GEO_BODY_ORDER) {
        const group = bodyRefs.current[key];
        if (!group || !group.visible) continue;
        group.getWorldPosition(at);
        const centre = project(at, rect, field, scratchPick);
        if (!centre) continue;
        const d = Math.hypot(centre.x - px, centre.y - py);
        const worldRadius = group.scale.x * BODY_RADIUS[key];
        edge.copy(at).addScaledVector(rightAxis, worldRadius);
        const edgeHit = project(edge, rect, field, scratchEdge);
        const apparentPx = edgeHit ? Math.hypot(edgeHit.x - centre.x, edgeHit.y - centre.y) : 0;
        const radius = Math.max(GRAHA_PICK_RADIUS, apparentPx * 1.15);
        if (d < radius && d < bestD) {
          bestD = d;
          best = key;
        }
      }
      if (best) return { kind: "graha", key: best };
      /* यम/वरुण/अरुण — decorative, so checked after every real graha (one
         must never steal a press meant for something that actually belongs
         to the chart) but before stars/नेबुला, the same priority a graha
         itself gets and for the same reason: three small, similarly-sized
         dots that would otherwise lose every close call to whichever
         background star or नेबुला ring happened to be checked first. */
      let bestOuter: OuterPlanetKey | null = null;
      if (mode === "horizon") {
        for (const key of OUTER_PLANET_ORDER) {
          const mesh = outerPlanets[key];
          if (!mesh.visible) continue;
          mesh.getWorldPosition(at);
          const centre = project(at, rect, field, scratchPick);
          if (!centre) continue;
          const d = Math.hypot(centre.x - px, centre.y - py);
          const worldRadius = mesh.scale.x;
          edge.copy(at).addScaledVector(rightAxis, worldRadius);
          const edgeHit = project(edge, rect, field, scratchEdge);
          const apparentPx = edgeHit ? Math.hypot(edgeHit.x - centre.x, edgeHit.y - centre.y) : 0;
          const radius = Math.max(GRAHA_PICK_RADIUS, apparentPx * 1.15);
          if (d < radius && d < bestD) {
            bestD = d;
            bestOuter = key;
          }
        }
      }
      if (bestOuter) return { kind: "outerplanet", key: bestOuter };
      let starKind: "vedicstar" | "skystar" | "nebula" | null = null;
      let starIndex = -1;
      const nVedic = vedicPickCount.current;
      for (let i = 0; i < nVedic; i += 1) {
        const hit = vedicPickRef.current[i];
        const centre = project(hit.world, rect, field, scratchPick);
        if (!centre) continue;
        const d = Math.hypot(centre.x - px, centre.y - py);
        if (d < PICK_RADIUS && d < bestD) {
          bestD = d;
          starKind = "vedicstar";
          starIndex = hit.index;
        }
      }
      const nAst = asterismPickCount.current;
      for (let i = 0; i < nAst; i += 1) {
        const hit = asterismPickRef.current[i];
        const centre = project(hit.world, rect, field, scratchPick);
        if (!centre) continue;
        const d = Math.hypot(centre.x - px, centre.y - py);
        if (d < PICK_RADIUS && d < bestD) {
          bestD = d;
          starKind = "skystar";
          starIndex = hit.index;
        }
      }
      /* Checked last, same reason a graha is checked first: a नेबुला marker
         can be enormous on screen (Barnard's Loop's own ring is most of a
         wide frame), and a huge hit radius going first would steal presses
         plainly meant for a star or a ग्रह sitting inside it. Sized the same
         way a ग्रह is — the apparent radius on screen, not a flat pixel
         count — because a ring that fills a third of the frame needs a press
         anywhere near its own edge to count, not just its exact centre. */
      const nNeb = nebulaPickCount.current;
      for (let i = 0; i < nNeb; i += 1) {
        const hit = nebulaPickRef.current[i];
        const centre = project(hit.world, rect, field, scratchPick);
        if (!centre) continue;
        const d = Math.hypot(centre.x - px, centre.y - py);
        edge.copy(hit.world).addScaledVector(rightAxis, hit.worldRadius);
        const edgeHit = project(edge, rect, field, scratchEdge);
        const apparentPx = edgeHit ? Math.hypot(edgeHit.x - centre.x, edgeHit.y - centre.y) : 0;
        const radius = Math.max(PICK_RADIUS, apparentPx);
        if (d < radius && d < bestD) {
          bestD = d;
          starKind = "nebula";
          starIndex = hit.index;
        }
      }
      if (starKind && starIndex >= 0) return { kind: starKind, index: starIndex };
      return null;
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== downId) return;
      downId = null;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_SLOP) return;
      const hit = pick(e);
      if (!hit) {
        onEmptyPressRef.current?.();
        return;
      }

      /* One press marks it where it stands; a second press on the *same*
         thing inside {@link DOUBLE_MS} rides it — a graha under
         onSelect/onFollow, a star the same way now. Naming what a single
         press is looking at should not also drag the camera there: that was
         "the sky jumps the instant I touch a star." */
      const thisKey =
        hit.kind === "graha"
          ? `graha:${hit.key}`
          : hit.kind === "outerplanet"
            ? `outerplanet:${hit.key}`
            : hit.kind === "vedicstar"
              ? `vedicstar:${hit.index}`
              : hit.kind === "nebula"
                ? `nebula:${hit.index}`
                : `skystar:${hit.index}`;
      const now = performance.now();
      const again = thisKey === lastKey && now - lastAt < DOUBLE_MS;
      lastKey = again ? null : thisKey;
      lastAt = now;

      if (hit.kind === "outerplanet") {
        /* Identify-only, on purpose — see {@link OUTER_PLANET_ORDER}'s own
           doc comment: "never part of a chart." Routed through the same
           generic sky-aim path a नेबुला or background star click already
           uses, not the graha `onSelect`/`onFollow`/kundali system, so
           clicking यम never pretends it belongs to the nine-graha chart.
           `pos.longitude/latitude` is already the exact current sidereal
           value the render loop itself places the dot with (`place(pos.
           longitude, pos.latitude, 0)`, no separate precession/ayanamsa
           step) — `sidereal: true` here is what tells `skyAim`'s own
           handler to hand it to `place()` unmodified instead of running it
           through the tropical-target conversion, the exact mismatch
           {@link SkyTargetAt} was added to stop happening again. */
        const pos = outerPlanetAt(hit.key, daysSinceJ2000(new Date(sim.current.timeMs)));
        const payload = {
          id: `outerplanet:${hit.key}`,
          ne: OUTER_PLANET_NAME[hit.key].ne,
          en: OUTER_PLANET_NAME[hit.key].en,
          lon: pos.longitude,
          lat: pos.latitude,
          sidereal: true,
        };
        if (again) onFollowSkyRef.current?.(payload);
        else onAimSkyRef.current?.(payload);
        return;
      }

      if (hit.kind === "vedicstar") {
        const star = vedicStarsRef.current?.[hit.index];
        if (!star) return;
        if (again) onFollowStarRef.current?.(star, hit.index);
        else onSelectStarRef.current?.(star, hit.index);
        return;
      }
      if (hit.kind === "skystar") {
        const star = starField.stars[hit.index];
        const nak = NAKSHATRA_ASTERISMS[star.nakshatra - 1];
        const names = nak ? starOverlayNames(star, nak) : null;
        const payload = {
          id: `star:${star.nakshatra}:${star.name}`,
          ne: names?.ne ?? nak?.ne ?? star.name,
          en: names?.en ?? nak?.en ?? star.name,
          hintNe: nak?.ne,
          hintEn: nak?.en,
          /* `star.lon` — the raw catalogue longitude — not `asterismPickRef`'s
             own copy: that copy carries `s.lon + precession - ayan` (see
             where it's populated a few hundred lines up), the *sidereal*
             value this same frame's render already converted to for
             `skyPlace()`. `onAimSky`/`onFollowSky` feed straight into
             `skyAim`, whose own handler expects a raw tropical longitude and
             applies that exact precession-and-ayanamsa conversion itself —
             handing it an already-converted value applied the correction
             twice, landing the reticle a full ayanamsa short of the star
             whose name was right there in the label. */
          lon: star.lon,
          lat: star.lat,
        };
        if (again) onFollowSkyRef.current?.(payload);
        else onAimSkyRef.current?.(payload);
        return;
      }
      if (hit.kind === "nebula") {
        const entry = nebulaField[nebulaMarkers[hit.index].nebulaIndex];
        const payload = {
          id: `nebula:${entry.nebula.id}`,
          ne: entry.nebula.ne,
          en: entry.nebula.en,
          hintNe: entry.nebula.catalog,
          hintEn: entry.nebula.catalog,
          lon: entry.lon,
          lat: entry.lat,
        };
        if (again) onFollowSkyRef.current?.(payload);
        else onAimSkyRef.current?.(payload);
        return;
      }
      if (again) onFollowRef.current(hit.key);
      else onSelectRef.current(hit.key);
    };
    const onCancel = () => {
      downId = null;
    };
    /**
     * Clear the press even when its release never reached the canvas.
     *
     * `onUp` only runs for a `pointerup` on the canvas itself, and it is the
     * only thing that puts `downId` back to null — so a drag that ends with
     * the finger off the edge of the canvas, or a release the browser
     * retargets elsewhere, leaves `downId` set. `onDown` then refuses every
     * later press (`if (downId !== null) return`), and from that moment
     * nothing in the sky can be selected at all: not a graha, not a star,
     * for the rest of the session. Orbiting a view by dragging past the
     * edge is an ordinary thing to do, which is how a sky ends up
     * permanently unclickable without anything looking broken.
     */
    const onWindowUp = () => {
      downId = null;
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    /* Bubble phase, so the canvas's own `onUp` has already run and done the
       picking by the time this clears the latch. */
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("pointerup", onWindowUp);
      window.removeEventListener("pointercancel", onWindowUp);
    };
  }, [camera, gl, mode, view, starField.stars, nebulaField, nebulaMarkers, outerPlanets, sim]);
  /** The last focus request answered, and whether one is still outstanding. */
  const lastFocusNonce = useRef(focusNonce);
  const recentre = useRef(false);
  const lastAim = useRef(0);
  const aimAt = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());
  /** Screen-up in world space, so a name can be hung off the edge of a disc. */
  const screenUp = useRef(new THREE.Vector3());
  /** Your place on the globe, in world space — the camera's other lock target. */
  const observerTrack = useRef(new THREE.Vector3());
  const fisheye = useMemo(() => createHorizonFisheyeUniforms(), []);

  // Re-derive the trail as soon as the graha or the calibration changes, and
  // re-anchor a locked sky to whatever date the nav has just jumped to.
  useEffect(() => {
    lastTrailKey.current = "";
    lockedLst.current = null;
    lastBelt.current = null;
  }, [selectedKey, calibration, mode, observer, ayanamsaShift]);

  // Turning the band or its labels back on has to redraw it: while it was off
  // the projection was skipped, so the vertices are wherever they were left.
  useEffect(() => {
    lastBelt.current = null;
    // The wheel rebuilds its highlight meshes with it, so the tint is gone too.
    lastBeltKey.current = null;
  }, [toggles.rashiBelt, toggles.nakshatraBelt, toggles.monthRing, toggles.constellations]);

  useFrame((state, delta) => {
    try {
      runFrame(state, delta);
    } catch (err) {
      console.error("SKY FRAME ERROR", err);
    }
  });

  function runFrame(state: Parameters<Parameters<typeof useFrame>[0]>[0], delta: number) {
    const s = sim.current;
    if (s.playing) s.timeMs += delta * s.secondsPerRealSecond * 1000;

    const date = new Date(s.timeMs);
    const sky = geocentricSky(date, calibration);
    const dtDays = daysSinceJ2000(date);
    const horizon = mode === "horizon";
    const globe = mode === "globe";
    const space = mode === "space";
    /* Both the dome and the globe draw the banded zodiac and place grahas on
       it; only the space view uses the schematic shells. */
    const zodiac = horizon || globe;
    /* ── whose राशि and नक्षत्र the belts light up ─────────────────────
       One graha at a time, and the Sun until you pick another: the same graha
       the sightline is drawn for, so the lit segments and the line agree about
       where on the belt to look. The month ring is the one thing that stays
       the Sun's — the महिना *are* its twelve signs, so dimming them off
       another graha says nothing. */
    const sunRashi = Math.floor(normalizeDeg(sky.sun.longitude) / RASHI_ARC) % 12;
    const beltKey: GrahaKey = selectedKey ?? "sun";
    const beltLon = normalizeDeg(sky[beltKey].longitude);
    const beltRashi = Math.floor(beltLon / RASHI_ARC) % 12;
    const beltNak = Math.floor(beltLon / NAKSHATRA_ARC) % 27;
    if (space) {
      const tint = lastBeltKey.current !== beltKey ? GRAHA_COLOR[beltKey] : null;
      if (rashiHiRef.current) {
        rashiHiRef.current.rotation.z = beltRashi * (Math.PI / 6);
        if (tint) (rashiHiRef.current.material as THREE.MeshBasicMaterial).color.set(tint);
      }
      if (nakHiRef.current) {
        nakHiRef.current.rotation.z = beltNak * ((Math.PI * 2) / 27);
        if (tint) (nakHiRef.current.material as THREE.MeshBasicMaterial).color.set(tint);
      }
      lastBeltKey.current = beltKey;
    }

    /* The server's Lahiri value for the date on screen, carried as an offset on
       the local fit: exact where the API spoke, and evolving at the right rate
       either side of it. This is the number that decides where the sidereal
       zero — the start of मेष — sits against the equinox, so the whole belt
       hangs off it. */
    const ayan = ayanamsa(dtDays) + ayanamsaShift;
    const eps = obliquity(dtDays);
    /* Locked, the sky keeps the sidereal time it had when the lock went on, so
       the belt stays put and only the grahas walk along it. */
    const liveLst = lstDeg(date, observer.lon);
    if (!toggles.lockStars) lockedLst.current = null;
    else if (lockedLst.current == null) lockedLst.current = liveLst;
    const lst = lockedLst.current ?? liveLst;

    /* The Milky Way sphere turns with the actual sky in क्षितिज — see the
       doc comment on {@link equatorialToHorizonMatrix}. Left untouched in
       globe/space for now: both place things through their own separate
       transforms (`globePlace`, the space wheel), and folding this into
       either is a bigger job than the one this fixes. */
    if (starsRef.current) {
      if (horizon) {
        starsRef.current.quaternion.setFromRotationMatrix(
          equatorialToHorizonMatrix(lst, observer.lat, precessionSinceJ2000(dtDays), eps),
        );
      } else {
        starsRef.current.quaternion.identity();
      }
      /* Ride the camera, which is what a sky at infinity actually does.
         The sphere is centred on the *origin*, so in पृथ्वी गोला and
         अन्तरिक्ष — the two views whose camera sits well out from it — one
         side of it was only 100 units away while the other was 700. That
         near side is a small patch of texture stretched across most of the
         screen, which is why the Milky Way read as enormous and coarse in
         those two views but fine from inside the dome, where the camera is
         at the centre and every direction is the same 400 away.
         Re-centring it on the camera each frame restores that: every point
         of the sky is equidistant again, so the band is drawn at one honest
         scale and simply looks like the sky rather than a wall a few units
         from the lens. Rotation is untouched — only the centre moves, so no
         star drifts against its own position. */
      starsRef.current.position.copy(state.camera.position);
      /* Sphere around the camera in every view. A cylinder around the same
         camera squeezed the 2:1 panorama into ~115° of elevation and
         stretched the band; the sphere keeps one texel per direction. */
      starsRef.current.visible = !arBackground;
    }
    /* The HiPS tile group rides the exact same rotation {@link starsRef}
       does, verbatim — see the doc comment where {@link hipsGroupRef} is
       declared. FOV has to be known before deciding `hipsOn` itself — see
       {@link HIPS_BLEND_START_FOV} — so it is read here rather than
       inside the block below that used to be its only consumer. */
    const hipsFov = fovForZoom("horizon", view.current.distance);
    /**
     * How much of the composite is HiPS's to own right now, 0–1 — the
     * two-layer cross-fade this replaced a one-directional threshold with.
     * `smoothstep(START, END, hipsFov)` with `START(80) > END(30)` falls
     * from 1 to 0 as `hipsFov` *grows* (see {@link smoothstep}'s own doc
     * comment on why the same function handles both directions), landing
     * exactly the shape the brief's own comparison table describes: 0 at
     * wide field, 1 once the field has narrowed past {@link
     * HIPS_BLEND_END_FOV}, easing smoothly between.
     *
     * Computed once, here, rather than separately inside the HiPS block
     * and the panorama block that consume it — the panorama's own
     * compositing fade ({@link HIPS_BLEND_END_FOV}'s doc comment, "concept
     * B") lives much later in this same function, after `hipsOn`'s own
     * block has already returned, so both need this same number in scope
     * rather than each re-deriving it.
     */
    const hipsVisibility = smoothstep(HIPS_BLEND_START_FOV, HIPS_BLEND_END_FOV, hipsFov);
    const hipsOn = horizon && !arBackground && hipsFov <= HIPS_BLEND_START_FOV;
    if (hipsGroupRef.current) {
      if (horizon) {
        hipsGroupRef.current.quaternion.setFromRotationMatrix(
          equatorialToHorizonMatrix(lst, observer.lat, precessionSinceJ2000(dtDays), eps),
        );
      } else {
        hipsGroupRef.current.quaternion.identity();
      }
      hipsGroupRef.current.position.copy(state.camera.position);
      hipsGroupRef.current.visible = hipsOn;
    }
    /* Above {@link HIPS_BLEND_START_FOV} the block below never runs, so
       without this the HUD would freeze on whatever counts it last saw
       while still under the threshold instead of showing the panorama
       having taken back over. */
    if (hipsDebugOn && !hipsOn) {
      writeHipsDebugSnapshot({
        fovDeg: hipsFov,
        minOrderPresent: -1,
        maxOrderPresent: -1,
        refinePixels: HIPS_TILE_REFINE_PIXELS,
        leafCount: 0,
        readyCount: 0,
        loadingCount: 0,
        fallbackCount: 0,
        cachedCount: hipsCache.current.size,
        inFlight: hipsLoadsInFlightCount(),
        tiles: [],
      });
    }
    /**
     * Steps 7–11: pick the order the current field actually earns, work out
     * which tiles at that order (and its immediate parent, for the
     * crossfade) the camera can actually see, make sure each one exists and
     * is on its way in if it is not loaded yet, and only then decide what
     * is actually visible this frame.
     *
     * Runs every frame the HiPS layer is on, not gated behind
     * {@link beltMoved}: field of view changes on every scroll, not on the
     * clock, and a LOD system that only re-evaluated when the sidereal time
     * ticked would leave a paused reader zooming in on tiles chosen for
     * whatever field was live the last time the belt happened to rebuild —
     * the exact bug the Milky Way's own fade and the nebula photographs
     * both already hit this same session.
     */
    if (hipsOn && hipsGroupRef.current) {
      const group = hipsGroupRef.current;
      const width = state.size.width;
      const height = state.size.height;
      /* Tile opacity now rides {@link hipsVisibility} directly — the same
         number the panorama's own complementary fade uses, computed once
         above rather than re-derived here. */
      const win = horizonViewWindow(state.camera, hipsFov, width, height);

      hipsForwardWorld.set(0, 0, -1).applyQuaternion(state.camera.quaternion);
      hipsInvQuat.copy(group.quaternion).invert();
      hipsDirEquatorial.copy(hipsForwardWorld).applyQuaternion(hipsInvQuat);

      /* One counter per frame, stamped onto every entry `ensureHipsTile`
         touches this frame (hit or miss) — Phase 9's eviction recency
         clock, and (via `hipsTouchedKeys` below) its protection set. */
      const frame = nextHipsFrame();
      hipsLoadCandidates.length = 0;
      hipsTouchedKeys.clear();

      /* Phase 6: collect rather than immediately load — {@link
         hipsTilePriority} (closest to view centre wins, `hips.ts`'s own
         doc comment) decides who actually claims one of the limited
         concurrent slots once every candidate this frame is known, not
         whichever happened to be visited first in the traversal's own
         DFS order. */
      const queueLoad = (entry: HipsTileEntry, order: number, pix: number) => {
        hipsTouchedKeys.add(hipsTileKey(order, pix));
        if (hipsTileNeedsLoad(entry)) hipsLoadCandidates.push({ entry, priority: hipsTilePriority(order, pix, hipsDirEquatorial) });
      };

      /* A guaranteed fallback floor — Stellarium's `hips_get_tile_texture()`
         recurses to grandparent, great-grandparent, etc. when a tile isn't
         loaded, but that recursion can only find an ancestor entry {@link
         findReadyHipsAncestor} already knows about. Order 0 is the whole
         sky in 12 tiles total, cheap enough to always have requested rather
         than only reaching for it once a multi-level gap actually happens —
         e.g. right after the HiPS layer first turns on, before the
         recursive traversal below has had a chance to touch order 0 itself
         (Step 7). Routed through the same priority queue as everything
         else below now, rather than loading immediately: once order 0 is
         fully cached (after its first couple of frames) every call here is
         a no-op `idle` check anyway, so folding it in costs nothing and
         keeps exactly one place deciding load order. */
      for (let pix0 = 0; pix0 < hipsTileCount(0); pix0 += 1) {
        const entry0 = ensureHipsTile(hipsCache.current, 0, pix0, HIPS_RADIUS, HIPS_TILE_SUBDIVISIONS, frame);
        queueLoad(entry0, 0, pix0);
      }

      const controls = hipsDebugControls.current;

      /* Phase 2/3: the recursive HEALPix quadtree walk (`hips-lod.ts`)
         replaces the old "one FOV → one global order" selector. Every node
         it visits — leaf or not — gets `ensureHipsTile`/queued via {@link
         queueLoad}, so a tile being split into four children is still
         itself a valid, loading/loaded ancestor the Phase 1 fallback can
         hand to those children while they arrive (Step 10's "parent remains
         visible while children load" falls out of composing the two
         systems, not from any special-casing here). */
      hipsLodFrame.camera = state.camera;
      hipsLodFrame.groupQuaternion = group.quaternion;
      hipsLodFrame.groupPosition = group.position;
      hipsLodFrame.radius = HIPS_RADIUS;
      hipsLodFrame.fovDeg = hipsFov;
      hipsLodFrame.width = width;
      hipsLodFrame.height = height;

      const onVisit = (order: number, pix: number) => {
        const entry = ensureHipsTile(hipsCache.current, order, pix, HIPS_RADIUS, HIPS_TILE_SUBDIVISIONS, frame);
        queueLoad(entry, order, pix);
      };

      if (controls.disableLod) {
        // Step 13 isolation: skip refinement entirely, order 0 only.
        hipsLodLeaves.length = 0;
        for (let pix0 = 0; pix0 < hipsTileCount(0); pix0 += 1) {
          onVisit(0, pix0);
          hipsLodLeaves.push({ order: 0, pix: pix0 });
        }
      } else {
        evaluateHipsTiles(
          hipsLodFrame,
          hipsDirEquatorial,
          win.cone,
          HIPS_MAX_LOCAL_ORDER,
          onVisit,
          hipsLodLeaves,
        );
      }

      /* Phase 6: highest priority — closest to view centre — claims the
         concurrency-capped slots first. `loadHipsTileTexture` still no-ops
         past {@link HIPS_MAX_CONCURRENT_LOADS} on its own, so feeding
         candidates in priority order is the whole mechanism; nothing else
         needs to know about slots directly. */
      if (!controls.disableLod) {
        hipsLoadCandidates.sort((a, b) => b.priority - a.priority);
      }
      for (const { entry } of hipsLoadCandidates) loadHipsTileTexture(entry);

      /* Phase 11: low-priority prefetch — every current leaf's own
         siblings (the rest of its parent's four children), requested only
         *after* every real candidate above has already had first claim on
         this frame's load slots. A small pan tends to need exactly these
         next, and `loadHipsTileTexture`'s own no-op-past-the-cap behaviour
         is what keeps this from ever outbidding something actually
         visible — there is no separate "low priority" queue to maintain,
         just a later turn at the same gate. */
      if (!controls.disableLod) {
        for (const { order, pix } of hipsLodLeaves) {
          for (const [so, sp] of getHipsSiblings(order, pix)) {
            const sibling = ensureHipsTile(hipsCache.current, so, sp, HIPS_RADIUS, HIPS_TILE_SUBDIVISIONS, frame);
            hipsTouchedKeys.add(hipsTileKey(so, sp));
            if (hipsTileNeedsLoad(sibling)) loadHipsTileTexture(sibling);
          }
        }
      }

      const leaves = controls.onlyOrder !== null ? hipsLodLeaves.filter((l) => l.order === controls.onlyOrder) : controls.onlyPix ? hipsLodLeaves.filter((l) => l.order === controls.onlyPix!.order && l.pix === controls.onlyPix!.pix) : hipsLodLeaves;

      let readyCount = 0;
      let loadingCount = 0;
      let fallbackCount = 0;
      let minOrderPresent = -1;
      let maxOrderPresent = -1;
      const neededLeaves = new Set<string>();
      const debugTiles: HipsDebugTile[] = hipsDebugOn ? [] : [];

      for (const { order, pix } of leaves) {
        neededLeaves.add(hipsTileKey(order, pix));
        const entry = ensureHipsTile(hipsCache.current, order, pix, HIPS_RADIUS, HIPS_TILE_SUBDIVISIONS, frame);
        if (entry.mesh.parent !== group) group.add(entry.mesh);
        entry.mesh.renderOrder = HIPS_RENDER_ORDER;
        /* Tried matching the panorama's own `skyBoost` (a flat 0.38× dim)
           and `injectMilkyWayExtinction` (altitude-based atmospheric
           dimming) here on the theory that it would remove a brightness
           jump at the 80° threshold — reverted after a direct comparison
           against real Stellarium: a DSS2 tile is already correctly
           exposed astrophotography, and dragging it down to a stylized
           panorama's own deliberately-dim colour plus a second, aggressive
           dimming curve on top left every tile looking flat and washed out
           next to Stellarium's own vivid, punchy version of the same
           object. Whatever residual mismatch exists right at the threshold
           is the smaller problem — a tile that actually looks like its own
           real astrophotography is worth more. */
        if (entry.state === "loading") loadingCount += 1;
        let shownState: HipsDebugTile["state"] = entry.state;
        if (entry.state === "ready") {
          readyCount += 1;
          entry.mesh.visible = true;
          /* Phase 8: ramp opacity up from {@link HIPS_FADE_IN_START} over
             {@link HIPS_FADE_IN_MS} after this tile's own real texture
             arrived (`entry.readyAt`) — a brief reveal instead of an
             instant swap from whatever ancestor quarter Phase 1 had been
             showing. `entry.readyAt` is only ever set the instant a load
             succeeds (`loadHipsTileTexture`), so a tile that has been
             `ready` for a while (well past the fade window) always lands
             on exactly `hipsVisibility`, not a stale partial value. */
          const fadeT =
            entry.readyAt !== null ? Math.min(1, (performance.now() - entry.readyAt) / HIPS_FADE_IN_MS) : 1;
          entry.material.opacity = hipsVisibility * (HIPS_FADE_IN_START + (1 - HIPS_FADE_IN_START) * fadeT);
          if (minOrderPresent < 0 || order < minOrderPresent) minOrderPresent = order;
          if (order > maxOrderPresent) maxOrderPresent = order;
        } else if (!controls.disableFallback) {
          /* Phase 1 parent fallback: show this tile's own (correctly
             HEALPix-curved) geometry with the nearest already-loaded
             ancestor's texture, cropped to the right quadrant via {@link
             ensureHipsFallbackTexture}, rather than leaving a hole.
             Verified empirically against real downloaded tiles — see that
             function's own doc comment. */
          const ancestor = findReadyHipsAncestor(hipsCache.current, order, pix);
          if (ancestor?.material.map) {
            const fallbackTex = ensureHipsFallbackTexture(entry, ancestor.material.map, ancestor.order);
            if (entry.material.map !== fallbackTex) {
              entry.material.map = fallbackTex;
              entry.material.needsUpdate = true;
            }
            entry.mesh.visible = true;
            entry.material.opacity = hipsVisibility;
            fallbackCount += 1;
            shownState = "fallback";
            if (minOrderPresent < 0 || ancestor.order < minOrderPresent) minOrderPresent = ancestor.order;
            if (ancestor.order > maxOrderPresent) maxOrderPresent = ancestor.order;
          } else {
            entry.mesh.visible = false;
          }
        } else {
          entry.mesh.visible = false;
        }
        if (hipsDebugOn) {
          debugTiles.push({
            order,
            pix,
            state: shownState,
            screenPx: Math.round(getHipsTileScreenSizePx(order, pix, hipsLodFrame)),
          });
        }
      }

      // Hide every cached tile that isn't one of this frame's leaves — a
      // tile from a previous camera direction, a previous LOD selection, or
      // (while `onlyOrder`/`onlyPix` is set) filtered out by the isolation
      // controls above would otherwise stay visible forever, since the loop
      // above only touches the current frame's leaf set.
      for (const entry of hipsCache.current.values()) {
        if (!neededLeaves.has(hipsTileKey(entry.order, entry.pix))) entry.mesh.visible = false;
      }

      /* Phase 9: reclaim tiles nothing this frame's LOD walk needed —
         `hipsTouchedKeys` is exactly "every leaf, every ancestor refined
         through on the way to one, and every prefetched sibling" (built
         alongside the traversal and the prefetch pass above), so anything
         left out genuinely has not been part of the picture this frame.
         `disposeHipsTile` (inside `evictHipsTiles`) frees geometry,
         material, and textures and detaches the mesh — Phase 10's GPU
         disposal is this same call, not a separate pass. */
      evictHipsTiles(hipsCache.current, hipsTouchedKeys, HIPS_CACHE_MAX_RESIDENT);

      /* Step 12's optional tile-boundary visualization — rebuilt from
         scratch each time it's on, since the leaf set itself changes every
         frame; cheap at at most a few dozen leaves, and only runs at all
         while debug mode is both on and this specific toggle is set. */
      if (hipsDebugOn && controls.showBoundaries) {
        if (!hipsDebugOutlines.current) {
          const outlineGroup = new THREE.Group();
          outlineGroup.name = "hips-debug-outlines";
          group.add(outlineGroup);
          hipsDebugOutlines.current = outlineGroup;
        }
        const outlineGroup = hipsDebugOutlines.current;
        while (outlineGroup.children.length > leaves.length) {
          const last = outlineGroup.children[outlineGroup.children.length - 1] as THREE.Line;
          outlineGroup.remove(last);
          last.geometry.dispose();
        }
        leaves.forEach((leaf, i) => {
          const points = buildHipsTileOutline(leaf.order, leaf.pix, HIPS_RADIUS * 1.001, 6);
          let line = outlineGroup.children[i] as THREE.Line | undefined;
          if (!line) {
            const mat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6, depthTest: false });
            line = new THREE.Line(new THREE.BufferGeometry(), mat);
            line.renderOrder = HIPS_RENDER_ORDER + 0.01;
            outlineGroup.add(line);
          }
          line.geometry.dispose();
          line.geometry = new THREE.BufferGeometry().setFromPoints(points);
        });
      } else if (hipsDebugOutlines.current) {
        hipsDebugOutlines.current.visible = false;
      }
      if (hipsDebugOutlines.current) {
        hipsDebugOutlines.current.visible = hipsDebugOn && controls.showBoundaries;
      }

      if (hipsDebugOn) {
        writeHipsDebugSnapshot({
          fovDeg: hipsFov,
          minOrderPresent,
          maxOrderPresent,
          refinePixels: HIPS_TILE_REFINE_PIXELS,
          leafCount: leaves.length,
          readyCount,
          loadingCount,
          fallbackCount,
          cachedCount: hipsCache.current.size,
          inFlight: hipsLoadsInFlightCount(),
          tiles: debugTiles,
        });
      }
    }

    /**
     * How far the Earth has turned, as an angle — Greenwich's hour angle from
     * the equinox, in radians.
     *
     * Greenwich sidereal time, not a count of rotations since J2000: both run
     * at one turn per sidereal day, but the count starts from zero and the
     * real thing started from 280.46° — so the count leaves the map a fixed
     * three-quarter turn away from where the sky says it should be, and the
     * Sun stands over the wrong ocean at local noon. Both frames put the
     * vernal equinox on +X and measure longitude the same way round, so the
     * sidereal angle drops straight in.
     */
    const earthSpin = lstDeg(date, 0) * DEG;

    /**
     * ecliptic → the globe frame: Earth upright with its axis along +Y and its
     * equator in the XZ plane, and the ecliptic tilted off it by the obliquity
     * about the line of equinoxes.
     *
     * That single tilt is the whole story of the ayana. At tropical longitude 0
     * and 180 the ring crosses the equator — the two sampat. At 90 it stands
     * `eps` north (Karka Sankranti) and at 270 `eps` south (Makara Sankranti),
     * and the Sun riding the ring drags the subsolar point between the tropics
     * over the year: uttarayana climbing north, dakshinayana falling south.
     */
    const globePlace = (lonSid: number, latEc: number, radius: number): [number, number, number] => {
      /* The same handedness as the space view and as the globe underneath it.
         The ring used to be mirrored here, to turn the rashi the other way
         round; that put the Earth's own map on backwards, so the frame is now
         the honest one throughout and the rashi run as the geometry has them. */
      const [x, y, z] = eclipticToVec3(lonSid + ayan, latEc, radius);
      const c = Math.cos(eps * DEG);
      const s = Math.sin(eps * DEG);
      /* Tilted about the line of equinoxes, so tropical 90° comes out `eps`
         north — Karka Sankranti at the Tropic of Cancer — and 270° `eps` south.
         Flip the sense of this without the longitude and uttarayana runs
         backwards. */
      return [x, y * c - z * s, y * s + z * c];
    };

    const tiltEcliptic = (p: [number, number, number]): [number, number, number] => {
      const c = Math.cos(eps * DEG);
      const s = Math.sin(eps * DEG);
      return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
    };

    /**
     * Sidereal ecliptic longitude → scene position, in whichever frame is live.
     *
     * Space matches the Learn playground: Earth stands upright (equator in XZ)
     * and the wheel / grid / grahas live in the ecliptic, tilted off that
     * equator by the obliquity — which is why the grid reads as an ellipse
     * around the Earth rather than a flat circle you are looking down on.
     */
    const place = (lonSid: number, latEc: number, spaceRadius: number): [number, number, number] => {
      if (space) return tiltEcliptic(eclipticToVec3(lonSid, latEc, spaceRadius));
      if (globe) return globePlace(lonSid, latEc, GLOBE_BAND_R);
      const { alt, az } = eclipticToAltAz(lonSid + ayan, latEc, eps, lst, observer.lat);
      return altAzToVec3(alt, az, DOME);
    };

    /**
     * Under the observer's feet, with a little slack so the compass points and
     * the skyline furniture — which sit at altitude zero — are not swept up as
     * "below" and faded.
     */
    const belowSky = (at: [number, number, number]) => horizon && at[1] < -0.5;

    /**
     * Whether a label anchor should be drawn. Overlay text has no depth test,
     * so from outside the sphere anything on the far hemisphere has to be
     * culled by hand — and inside the dome, anything under the ground too
     * unless क्षितिजमुनि is off and that half of the sky is in the picture.
     */
    const labelVisible = (at: [number, number, number]) => {
      if (space) return true;
      /* Ground is see-through, so राशि names underfoot stay on the belt. */
      if (horizon) return true;
      // Facing hemisphere only — the globe is opaque, so far-side names would
      // otherwise float over it.
      const c = state.camera.position;
      return at[0] * c.x + at[1] * c.y + at[2] * c.z > 0;
    };

    const width = state.size.width;
    const height = state.size.height;
    const collect = Boolean(toggles.labels);
    const collected: ScreenLabel[] = [];
    // Second column of the camera's world matrix: which way is up on screen.
    screenUp.current.setFromMatrixColumn(state.camera.matrixWorld, 1).normalize();
    /**
     * Is the Earth between the camera and this point?
     *
     * In अन्तरिक्ष the globe is opaque and sits at the origin, but the names are
     * DOM nodes and a DOM node has no depth test — so `सूर्य` went on floating
     * over the Pacific while the Sun itself was correctly hidden behind it. Ray
     * against sphere, from the eye to the label: `oc` is the camera's own
     * position because the sphere is centred on the origin.
     */
    const behindEarth = (at: [number, number, number]) => {
      if (!space) return false;
      const cam = state.camera.position;
      const dx = at[0] - cam.x;
      const dy = at[1] - cam.y;
      const dz = at[2] - cam.z;
      const reach = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (reach < 1e-4) return false;
      const ix = dx / reach;
      const iy = dy / reach;
      const iz = dz / reach;
      const b = cam.x * ix + cam.y * iy + cam.z * iz;
      const c = cam.lengthSq() - EARTH_RADIUS * EARTH_RADIUS;
      const disc = b * b - c;
      if (disc <= 0) return false;
      const hit = -b - Math.sqrt(disc);
      return hit > 0 && hit < reach;
    };

    /**
     * `at` is where the text goes, which is not always where the thing is: a
     * graha's name is hung a body-radius below its disc. `anchor` is the thing
     * itself, so a graha sitting right on the skyline is not called "below"
     * merely because its label hangs under it.
     */
    const project = (
      label: Omit<ScreenLabel, "x" | "y">,
      at: [number, number, number],
      anchor: [number, number, number] = at,
    ) => {
      if (behindEarth(at)) return;
      let x: number;
      let y: number;
      if (horizon) {
        scratch.current.set(at[0], at[1], at[2]);
        const hit = projectHorizon(
          scratch.current,
          state.camera,
          fisheye.uHorizonFov.value,
          width,
          height,
          scratch.current,
        );
        if (!hit) return;
        x = hit.x;
        y = hit.y;
      } else {
        scratch.current.set(at[0], at[1], at[2]).project(state.camera);
        if (scratch.current.z > 1) return;
        x = (scratch.current.x * 0.5 + 0.5) * width;
        y = (-scratch.current.y * 0.5 + 0.5) * height;
        if (x < -60 || y < -30 || x > width + 60 || y > height + 30) return;
      }
      collected.push({ ...label, x, y, ...(belowSky(anchor) ? { below: true } : {}) });
    };

    /* ── bodies ─────────────────────────────────────────────────────── */
    let sunAltitude = -90;
    const horizonFovNow = horizon ? fovForZoom("horizon", view.current.distance) : 0;
    /* Off unless this frame's loop plants it — one selected graha at most, and
       none at all outside पृथ्वी गोला. */
    if (subGrahaRef.current) subGrahaRef.current.visible = false;
    for (const key of GEO_BODY_ORDER) {
      const body = sky[key];
      const spaceR = shellRadius(key, body.distanceAu) * SPACE_SHELL_SCALE;
      const at = place(body.longitude, body.latitude, spaceR);

      if (key === "sun") {
        const { alt } = eclipticToAltAz(body.longitude + ayan, body.latitude, eps, lst, observer.lat);
        sunAltitude = alt;
      }

      /** The body's radius as actually drawn, in world units. */
      const drawnR = globe
        ? DOME_RADIUS[key] * GLOBE_BODY_SCALE
        : horizon
          ? DOME_RADIUS[key] * horizonBodyScale(horizonFovNow)
          : bodyRadius(key, body.distanceAu) * SPACE_SHELL_SCALE * SPACE_BODY_SCALE;

      const group = bodyRefs.current[key];
      if (group) {
        group.position.set(at[0], at[1], at[2]);
        group.scale.setScalar(drawnR / BODY_RADIUS[key]);
        /* Translucent ground no longer hides the underfoot half — the belt
           and the grahas on it stay in the picture through the hills. */
        group.visible = true;
      }

      const spin = spinRefs.current[key];
      // Slow signature spin so each body reads as a globe, not a disc.
      if (spin) spin.rotation.y = (dtDays * (key === "sun" ? 0.25 : 1.6) * Math.PI * 2) % (Math.PI * 2);

      const retro = retroRefs.current[key];
      if (retro) retro.visible = body.retrograde;

      const shell = shellRefs.current[key];
      if (shell) {
        shell.scale.setScalar(spaceR);
        /* Orbits sit *on* the ecliptic plane. Hiding them when the grid is on
           left the plane empty — the grid is the plane, the shells are the
           grahas' paths across it. */
        shell.visible = space;
      }

      /* The selected graha's own sub-point, planted on the globe exactly the
         way the subsolar dot is: normalise the body's direction and drop it on
         the surface. Same frame as the Sun's — celestial, not geographic, so
         the Earth's texture turns underneath it, which is what a sub-point
         does. */
      if (globe && key === selectedKey && key !== "sun" && subGrahaRef.current) {
        const subLen = Math.hypot(at[0], at[1], at[2]) || 1;
        subGrahaRef.current.position.set(
          (at[0] / subLen) * GLOBE_R * 1.01,
          (at[1] / subLen) * GLOBE_R * 1.01,
          (at[2] / subLen) * GLOBE_R * 1.01,
        );
        (subGrahaRef.current.material as THREE.MeshBasicMaterial).color.set(GRAHA_COLOR[key]);
        subGrahaRef.current.visible = true;
      }

      const ray = rays[key];
      if (space) {
        /* Same direction as the body, so Earth, the graha, and the belt hit
           stay colinear — the line runs through the selected planet. */
        setPoint(ray, 0, place(body.longitude, body.latitude, EARTH_RADIUS));
        setPoint(ray, 1, place(body.longitude, body.latitude, NAK_OUTER));
      } else if (globe) {
        /*
         * From the graha down to the spot on the ground it stands over — not
         * from the middle of the planet.
         *
         * The globe is a solid 30-unit sphere with the camera well outside it,
         * so a ray starting at the origin spends its first 30 units buried in
         * rock. Every such ray also converges on that one hidden point, which
         * is why two of them read as a single bent line that changed direction
         * somewhere behind the Earth.
         *
         * Starting at the radius the sub-point markers sit at puts the line's
         * foot exactly on the sub-graha dot below — the same normalise-and-drop
         * as that marker, so the two cannot disagree about where to look.
         */
        const footLen = Math.hypot(at[0], at[1], at[2]) || 1;
        const foot = (GLOBE_R * 1.01) / footLen;
        setPoint(ray, 0, [at[0] * foot, at[1] * foot, at[2] * foot]);
        setPoint(ray, 1, at);
      } else {
        /* क्षितिज: the camera *is* the origin, so a ray from it is the
           observer's own line of sight and has nothing to pass through. */
        setPoint(ray, 0, [0, 0, 0]);
        setPoint(ray, 1, at);
      }
      flushLine(ray);
      /* Space: one sightline, Earth through the graha you picked (Sun until
         you pick one) and on through both belts. Globe shows the selected
         graha's, and leaves the Sun's to the permanent subsolar ray further
         down rather than drawing a second line along it. Horizon: whatever is
         above the ground. */
      ray.visible = space
        ? key === beltKey
        : globe
          ? key !== "sun" && key === selectedKey
          : at[1] > 0;

      // A DOM label has no depth test, so the ground cannot hide it the way it
      // hides the body — {@link labelVisible} has to do it by hand.
      if (collect && labelVisible(at)) {
        /* Hung below the disc rather than pinned to the centre. A fixed pixel
           nudge cannot do this once a body can be anything from a speck to
           half the screen: the offset has to be the body's own radius. */
        const up = screenUp.current;
        project(
          { id: `g-${key}`, kind: "graha", key },
          [at[0] - up.x * drawnR, at[1] - up.y * drawnR, at[2] - up.z * drawnR],
          at,
        );
      }

      /* ── the selected graha, marked against the belt ─────────────────
         Two readings the belt cannot give on its own: where along it the
         graha stands, and how far off its plane. The first is a mark on the
         wall at the graha's own longitude; the second is the drop from the
         body to the plane, which is the शर at the same scale as everything
         around it. Space view only — inside the dome and on the globe the
         belt is a ring on a sphere and has no wall to mark. */
      if (space && key === selectedKey) {
        const local = eclipticToVec3(body.longitude, body.latitude, spaceR);
        const localFoot = eclipticToVec3(body.longitude, 0, spaceR);
        const foot = sharaFootRef.current;
        if (foot) {
          foot.position.set(localFoot[0], localFoot[1], localFoot[2]);
          foot.rotation.set(-Math.PI / 2, 0, 0);
          foot.visible = true;
        }
        setPoint(sharaLine, 0, local);
        setPoint(sharaLine, 1, localFoot);
        flushLine(sharaLine);
        sharaLine.visible = true;
        sharaLine.material.color.set(GRAHA_COLOR[key]);
      }
    }

    /* ── यम/वरुण/अरुण ─────────────────────────────────────────────────
       क्षितिज only — a decorative dot the moment अन्तरिक्ष or पृथ्वी गोला ask
       for, since neither has ever needed them and they were never wired
       into either view's own placement. */
    if (horizon) {
      const up = screenUp.current;
      for (const key of OUTER_PLANET_ORDER) {
        const pos = outerPlanetAt(key, dtDays);
        const at = place(pos.longitude, pos.latitude, 0);
        const drawnR = OUTER_PLANET_DOME_RADIUS[key] * horizonBodyScale(horizonFovNow);
        const mesh = outerPlanets[key];
        mesh.position.set(at[0], at[1], at[2]);
        mesh.scale.setScalar(drawnR);
        mesh.visible = true;
        if (collect && labelVisible(at)) {
          project(
            {
              id: `outer-${key}`,
              kind: "outerplanet",
              text: OUTER_PLANET_NAME[key].en,
              textNe: OUTER_PLANET_NAME[key].ne,
              color: OUTER_PLANET_COLOR[key],
            },
            [at[0] - up.x * drawnR, at[1] - up.y * drawnR, at[2] - up.z * drawnR],
            at,
          );
        }
      }
    } else {
      for (const key of OUTER_PLANET_ORDER) outerPlanets[key].visible = false;
    }

    const ecl = eclipseOf(sky);
    moonEclipse.current.kind = ecl.kind;
    moonEclipse.current.mag = ecl.mag;
    const moonG = bodyRefs.current.moon;
    if (space && moonG && ecl.kind === "lunar") {
      umbraFrom.current.set(0, 0, 0);
      umbraTo.current.copy(moonG.position);
      placeUmbra(
        lunarUmbra,
        umbraFrom.current,
        umbraTo.current,
        EARTH_RADIUS * 0.55,
        umbraAxis.current,
      );
      (lunarUmbra.material as THREE.MeshBasicMaterial).opacity = 0.16 + 0.28 * ecl.mag;
    } else {
      lunarUmbra.visible = false;
    }
    if (space && moonG && ecl.kind === "solar") {
      umbraFrom.current.copy(moonG.position);
      umbraTo.current.set(0, 0, 0);
      placeUmbra(
        solarUmbra,
        umbraFrom.current,
        umbraTo.current,
        BODY_RADIUS.moon * moonG.scale.x * 1.85,
        umbraAxis.current,
      );
      (solarUmbra.material as THREE.MeshBasicMaterial).opacity = 0.72 + 0.22 * ecl.mag;
    } else {
      solarUmbra.visible = false;
    }

    if (!space || !selectedKey) {
      if (sharaFootRef.current) sharaFootRef.current.visible = false;
      sharaLine.visible = false;
    }

    /* ── the banded zodiac, the equator and the alt-az cage ──────────── */
    /* Re-projected only when the mapping has actually changed. Inside the dome
       that is every frame — the sky wheels past — but the globe's ring is drawn
       in the Earth's own frame and nailed to the stars, so there it is built
       once and then left alone, which is what keeps the spin smooth when the
       sky is unlocked. Sidereal time therefore only counts in the dome. */
    const beltLst = horizon ? quantizeDeg(lst) : 0;
    const beltAyan = quantizeDeg(ayan);
    const beltEps = quantizeDeg(eps);
    const beltMoved =
      !lastBelt.current ||
      lastBelt.current.mode !== mode ||
      lastBelt.current.lst !== beltLst ||
      lastBelt.current.ayan !== beltAyan ||
      lastBelt.current.eps !== beltEps;

    /**
     * The sphere the fixed stars are drawn on, for whichever view is live.
     *
     * Inside the dome and around the globe that is the sky itself. In the space
     * view there is no sky sphere — the belt *is* the far edge of the picture —
     * so each figure is laid flat in its own नक्षत्र band, as a patch of the
     * wheel rather than a wall standing on it.
     */
    const starRadius = space ? NAK_OUTER + 0.25 : DOME * 0.995;

    /**
     * Where the stars, figures and deep-sky photographs go.
     *
     * Straight through {@link place}, which in पृथ्वी गोला means they land
     * on `GLOBE_BAND_R` — the same shell the zodiac band sits on, wrapped
     * close around the Earth. That is deliberate and long-standing: the
     * globe view is a diagram of the ring *around* the Earth, and the
     * नक्षत्र clusters belong on that ring where they can be read against
     * it, not thrown out to infinity where the whole point of the view is
     * lost.
     *
     * (An earlier pass moved them out to ~396 on the theory that the ball
     * of stars around the globe was the "black disc" being complained
     * about. It was not — that was the camera's far plane cutting the sky
     * sphere, see `SKY_FAR`. Moving the stars only deleted the ring
     * clusters and fixed nothing.)
     */
    const skyPlace = (lonSid: number, latEc: number): [number, number, number] =>
      place(lonSid, latEc, starRadius);

    /**
     * A fixed star's place, in whichever frame is live.
     *
     * Inside the dome and around the globe the sky is a sphere and the star
     * goes on it, at its true position and precessing. In the space view it
     * goes where the diagram wants it — see {@link spaceStarPos}.
     */
    const starPlace = (index: number, lonSid: number, latEc: number): [number, number, number] =>
      space ? tiltEcliptic(spaceStarPos[index] ?? [0, 0, 0]) : skyPlace(lonSid, latEc);

    if ((zodiac || space) && beltMoved) {
      lastBelt.current = { mode, lst: beltLst, ayan: beltAyan, eps: beltEps };

      /* Dome and globe only: in the space view `place` takes its radius from
         the caller, and the banded zodiac asks for zero — which would fold the
         whole band onto the origin. That band is drawn as flat geometry there
         instead, and needs nothing from this. */
      if ((toggles.rashiBelt || toggles.nakshatraBelt) && zodiac) {
        for (const { src, object } of skyLines) {
          for (let i = 0; i < src.length; i += 1) {
            setPoint(object, i, place(src[i].lon, src[i].lat, 0));
          }
          flushLine(object);
        }
      }

      /* ── the नक्षत्र star groups ──────────────────────────────────────
         A star is fixed against the equinox, not against the belt: its
         longitude of date is its J2000 longitude plus the precession since,
         and `place` then takes the ayanamsa back off to reach the sidereal
         frame everything is drawn in. Do it in that order and the belt stays
         glued to its stars while both walk away from वसन्त सम्पात — which is
         the whole thing the ayanamsa measures. */
      if (toggles.constellations) {
        const precession = precessionSinceJ2000(dtDays);
        const dpr = state.gl.getPixelRatio();
        for (const { indices, object } of starField.groups) {
          (object.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = dpr;
          for (let i = 0; i < indices.length; i += 1) {
            const star = starField.stars[indices[i]];
            setVertex(object, i, starPlace(indices[i], star.lon + precession - ayan, star.lat));
          }
          (object.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
        }
        for (let i = 0; i < starField.links.length; i += 1) {
          const [a, b] = starField.links[i];
          const sa = starField.stars[a];
          const sb = starField.stars[b];
          setVertex(starField.lines, i * 2, starPlace(a, sa.lon + precession - ayan, sa.lat));
          setVertex(starField.lines, i * 2 + 1, starPlace(b, sb.lon + precession - ayan, sb.lat));
        }
        flushLine(starField.lines);
      }

      /* ── the rest of the sky culture: राशि figures, सप्तर्षि, and the like
         Dome and globe only — no space-view segment for these to sit flat
         in, unlike the नक्षत्र figures above. */
      if (zodiac && toggles.constellations) {
        const precession = precessionSinceJ2000(dtDays);
        const dpr = state.gl.getPixelRatio();
        for (const { indices, object } of cultureField.groups) {
          (object.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = dpr;
          for (let i = 0; i < indices.length; i += 1) {
            const star = cultureField.stars[indices[i]];
            setVertex(object, i, skyPlace(star.lon + precession - ayan, star.lat));
          }
          (object.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
        }
        for (let i = 0; i < cultureField.links.length; i += 1) {
          const [a, b] = cultureField.links[i];
          const sa = cultureField.stars[a];
          const sb = cultureField.stars[b];
          setVertex(cultureField.lines, i * 2, skyPlace(sa.lon + precession - ayan, sa.lat));
          setVertex(cultureField.lines, i * 2 + 1, skyPlace(sb.lon + precession - ayan, sb.lat));
        }
        flushLine(cultureField.lines);
      }

      /* ── the naked-eye sky itself — no toggle. Dome and globe put it on
         the sky sphere; अन्तरिक्ष puts it on a sphere outside the disc so
         the wheel is surrounded by stars instead of sitting in a black hole. */
      if (zodiac || space) {
        const precession = precessionSinceJ2000(dtDays);
        const dpr = state.gl.getPixelRatio();
        for (const { indices, object } of backgroundField.groups) {
          (object.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = dpr;
          for (let i = 0; i < indices.length; i += 1) {
            const star = backgroundField.stars[indices[i]];
            const lon = star.lon + precession - ayan;
            setVertex(
              object,
              i,
              space ? place(lon, star.lat, SPACE_STAR_R) : skyPlace(lon, star.lat),
            );
          }
          (object.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
        }
      }

      /* ── the tilt, as an angle you can read ────────────────────────────
         The axis is +Y and the ecliptic pole is `eps` off it, in the plane of
         the solstices. Draw that second line and put an arc between them and
         the obliquity stops being an implicit property of the ring. */
      if (globe && toggles.tilt) {
        const c = Math.cos(eps * DEG);
        const s2 = Math.sin(eps * DEG);
        const reach = GLOBE_R * 1.3;
        setPoint(tiltMarks.eclipticAxis, 0, [0, -reach * c, reach * s2]);
        setPoint(tiltMarks.eclipticAxis, 1, [0, reach * c, -reach * s2]);
        flushLine(tiltMarks.eclipticAxis);

        const arcR = GLOBE_R * 1.12;
        for (let i = 0; i <= TILT_ARC_STEPS; i += 1) {
          const t = (eps * (i / TILT_ARC_STEPS)) * DEG;
          setPoint(tiltMarks.arc, i, [0, arcR * Math.cos(t), -arcR * Math.sin(t)]);
        }
        flushLine(tiltMarks.arc);
      }

      /* ── the tropics, at the tilt of the day ───────────────────────────
         The two parallels *are* the obliquity, laid on the ground: the Sun
         stands overhead there at the ayana ends and nowhere further. Drawn
         once at 23.44° they only match a sky near our own — this clock runs
         to both ends of the बिक्रम axis, where the tilt is most of a degree
         away and the subsolar point crossed a line that was not the tropic.
         Rebuilt only when it has actually moved: within a lifetime it has
         not, and this is a frame loop. */
      if (globe && Math.abs(tropicEps.current - eps) > 0.002) {
        tropicEps.current = eps;
        for (const tropic of globeLines.tropics) {
          const lat = tropic.id === "cancer" ? eps : -eps;
          tropic.lat = lat;
          for (let i = 0; i < tropic.src.length; i += 1) {
            setVertex(tropic.object, i, geoToVec3(lat, tropic.src[i].lon, GLOBE_R * 1.01));
          }
          flushLine(tropic.object);
        }
      }

      /* ── the ध्रुव तारा ────────────────────────────────────────────────
         Same transform as any other fixed star. In this frame the Earth's axis
         is what stands still, so it is the pole *circle* that wheels past it —
         the equivalent picture to the axis sweeping its cone, and the one that
         shows you which star is on duty. */
      if (zodiac && (toggles.vedicStars || toggles.constellations)) {
        const precession = precessionSinceJ2000(dtDays);
        const dpr = state.gl.getPixelRatio();
        for (const object of [poleField.points, poleField.crown]) {
          (object.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = dpr;
        }
        for (let i = 0; i < poleField.stars.length; i += 1) {
          const s = poleField.stars[i];
          setVertex(poleField.points, i, skyPlace(s.lon + precession - ayan, s.lat));
        }
        (poleField.points.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate =
          true;

        for (let i = 0; i < poleField.track.length; i += 1) {
          const p = poleField.track[i];
          setPoint(poleField.trackLine, i, place(p.lon + precession - ayan, p.lat, DOME * 0.995));
        }
        flushLine(poleField.trackLine);

        const reigning = reigningPoleStar(poleField.stars, dtDays, eps);
        if (reigning) {
          setVertex(
            poleField.crown,
            0,
            place(reigning.star.lon + precession - ayan, reigning.star.lat, DOME * 0.995),
          );
          (poleField.crown.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate =
            true;
        }
      }

      if (horizon && (toggles.rashiBelt || toggles.nakshatraBelt)) {
        for (let i = 0; i <= ecliptic_STEPS; i += 1) {
          // Declination 0 all the way round — the celestial equator, which the
          // ecliptic crosses at the two equinoxes and nowhere else. On the
          // globe this is drawn on the sphere itself instead.
          const eq = equatorialToAltAz({ ra: (i / ecliptic_STEPS) * 360, dec: 0 }, lst, observer.lat);
          setPoint(equatorLine, i, altAzToVec3(eq.alt, eq.az, DOME * 0.997));
        }
        flushLine(equatorLine);
      }
    }

    /* ── the curated deep-sky photographs, क्षितिज-only and always on. Scaled off
       the actual radius `place` put them at (`Math.hypot` of the result),
       not a mode-specific constant, since क्षितिज and पृथ्वी गोला place
       the sky at two very different radii and a fixed world size would
       read as the right size in one and wildly wrong in the other.

       Each is drawn only across the band of zoom where it reads as a
       patch of sky rather than as wallpaper — see {@link nebulaReveal} —
       and its texture is not even fetched until it first earns one.

       Additive, and in the galactic plane a few of these genuinely
       overlap — Barnard's Loop's own four tiles, the Lambda Orionis ring
       over the same stars, Heart and Soul side by side in Cassiopeia —
       so a strength that looks right for one image sums brighter where
       two or three stack, and the Milky Way panorama sitting under all of
       them is itself additive. 0.4 is chosen against that pile-up: high
       enough that a single photograph — the ordinary case, and the whole
       point of searching one up — reads as a photograph and not a
       barely-there haze, low enough that two or three genuinely
       overlapping fields still separate instead of clipping to flat
       white or pink.

       Runs every frame, not only when the belt rebuilds ({@link beltMoved}
       above only ticks on a real sidereal-time/ayanamsa/obliquity change):
       `reveal` is a function of the zoom the reader is *at right now*
       (`view.current.distance`), which changes on every scroll and not at
       all on the clock. Gated behind the belt's own throttle, a paused
       क्षितिज never recomputed it — zooming in on a photograph left it at
       whatever opacity, scale and reveal it had the moment the clock last
       ticked, which for a still sky is never again, and the same held for
       the name label below: it never appeared unless the belt happened to
       rebuild in the same frame the reveal crossed its own threshold. */
    /* Always on, and क्षितिज's alone. There is no chip for this any more:
       on the dome the photographs *are* the detail a zoomed-in sky has, so
       switching them off only ever emptied it, and on the globe they sat
       behind a wheel you are looking at from outside — never the thing being
       looked at, and never worth the fill. */
    if (horizon) {
      const precession = precessionSinceJ2000(dtDays);
      const nebulaFov = fovForZoom(mode, view.current.distance);
      const nebulaAspect =
        state.camera instanceof THREE.PerspectiveCamera ? state.camera.aspect : 1;
      for (const entry of nebulaField) {
        const { spanDeg, lon, lat, widthRad, heightRad, sprite, material } = entry;
        const reveal = nebulaReveal(spanDeg, nebulaFov);
        /* Visible only once the photograph is actually here. A
           `SpriteMaterial` with no `map` is not empty — it is a solid
           white quad at the material's colour, so a revealed-but-unloaded
           image paints a flat white rectangle the full angular size of
           the object. On the wide fields that rectangle is 14° across,
           which is most of the frame at these zooms, and several of them
           additive is a white screen. Loading is deliberately lazy,
           throttled and view-gated, so "revealed" and "has a texture" are
           now two different things and only the second may draw. */
        const drawable = reveal > 0 && entry.loadState === "ready";
        sprite.visible = drawable;
        if (reveal <= 0) continue;
        const at = skyPlace(lon + precession - ayan, lat);
        sprite.position.set(at[0], at[1], at[2]);
        /* Position first, then the view test, then the fetch: an image
           outside the frame is left placed and invisible rather than
           downloaded — see {@link nebulaInView}. It is still scaled
           below, so when the pan does bring it in it is already correct
           and only the texture is missing. */
        if (nebulaInView(state.camera, sprite.position, nebulaFov, spanDeg, nebulaAspect)) {
          loadNebulaTexture(entry);
        }
        const radius = Math.hypot(at[0], at[1], at[2]);
        if (!drawable) continue;
        sprite.scale.set(radius * widthRad, radius * heightRad, 1);
        material.opacity = 0.4 * reveal;
        /* Named once it actually reads as a photograph rather than the
           instant it starts fading in — half strength is comfortably past
           {@link nebulaReveal}'s own fade-in band. Shares the reticle's id
           format (`nebula:${...}`) with `sky-catalogue.ts`, so a search
           pick and a reader zooming in unprompted onto the same object
           produce the same label instead of two competing ones. */
        if (collect && reveal > 0.5) {
          project(
            {
              id: `nebula:${entry.nebula.id}`,
              kind: "nebula",
              text: entry.nebula.en,
              textNe: entry.nebula.ne,
              lon,
              lat,
              /* A नेबुला carries its own angular size — the sprite is drawn
                 at it — so the name clears the photograph itself rather than
                 a brightness guess. */
              ...(horizon
                ? {
                    clear: labelClearPx(
                      ((heightRad / 2) * 180) / Math.PI,
                      horizonFovNow,
                      height,
                      6,
                    ),
                  }
                : {}),
            },
            at,
          );
        }
      }

      /* The marker rings — one per named object (see {@link nebulaMarkers}),
         not one per catalogue tile. Earns its keep a little before the
         photograph does — Stellarium's own marker flags a catalogued object
         before the lens has pulled in far enough to show it as a
         photograph — but modestly: the first pass here fed the same ratio a
         flat quarter of the field and scaled the ring 18% past the object's
         own size, and the ring it drew was routinely bigger than anything
         actually visible inside it. 1.6× the field and 8% of headroom is
         close enough to read as "just outside the edge" instead of "empty
         circle floating over black sky". */
      let pickN = 0;
      for (let mi = 0; mi < nebulaMarkers.length; mi += 1) {
        const { nebulaIndex, marker, markerMaterial } = nebulaMarkers[mi];
        const entry = nebulaField[nebulaIndex];
        const { spanDeg, lon, lat, widthRad, heightRad } = entry;
        const markerReveal = nebulaMarkerReveal(spanDeg, nebulaFov);
        marker.visible = markerReveal > 0;
        if (markerReveal <= 0) continue;
        const at = skyPlace(lon + precession - ayan, lat);
        marker.position.set(at[0], at[1], at[2]);
        const radius = Math.hypot(at[0], at[1], at[2]);
        marker.scale.set(radius * widthRad * 1.08, radius * heightRad * 1.08, 1);
        markerMaterial.opacity = 0.6 * markerReveal;
        /* Clickable the moment the ring is — nearest-press picking reads
           this list the same way it already reads grahas and वैदिक तारा
           (see the pointer handler below), so a marker with no photograph
           loaded yet is still a real target, not just a decoration. */
        const slot = nebulaPickRef.current[pickN];
        slot.index = mi;
        slot.world.set(at[0], at[1], at[2]);
        slot.worldRadius = (radius * Math.max(widthRad, heightRad) * 1.08) / 2;
        pickN += 1;
      }
      nebulaPickCount.current = pickN;
    } else {
      nebulaPickCount.current = 0;
    }

    /* ── the named वैदिक तारा ─────────────────────────────────────────
       No precession formula here: `s.lon`/`s.lat` are already sidereal
       ecliptic degrees for the date on screen, computed server-side from
       the Swiss Ephemeris fixed-star catalogue. Runs every frame, not only
       when the belt rebuilds: the payload can arrive after the first bake,
       and a paused क्षितिज would otherwise leave every point at the origin. */
    const aimedVedic =
      aimedId && aimedId.startsWith("vedic:") ? Number(aimedId.slice(6)) : -1;
    if (toggles.vedicStars && zodiac && vedicStars && vedicStars.length > 0) {
      (vedicField.points.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value =
        state.gl.getPixelRatio();
      (vedicField.crown.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value =
        state.gl.getPixelRatio();
      const n = Math.min(vedicStars.length, VEDIC_STAR_CAPACITY);
      const sizes = vedicField.points.geometry.getAttribute("aSize") as THREE.BufferAttribute;
      let crowned: [number, number, number] | null = null;
      const byEn = new Map<string, [number, number, number]>();
      for (let i = 0; i < n; i += 1) {
        const s = vedicStars[i];
        const at = skyPlace(s.lon, s.lat);
        setVertex(vedicField.points, i, at);
        sizes.setX(i, vedicStarSize(s.mag));
        vedicPickRef.current[i].index = i;
        vedicPickRef.current[i].world.set(at[0], at[1], at[2]);
        byEn.set(s.en, at);
        if (i === aimedVedic) crowned = at;
      }
      sizes.needsUpdate = true;
      vedicField.points.geometry.setDrawRange(0, n);
      (vedicField.points.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate =
        true;
      vedicPickCount.current = n;
      if (crowned) {
        setVertex(vedicField.crown, 0, crowned);
        (vedicField.crown.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate =
          true;
        vedicField.crown.visible = true;
      } else {
        vedicField.crown.visible = false;
      }

      /* Each figure's own lines, written back to back — a figure whose
         members are not all present this frame (still loading, or a name
         the server dropped) simply contributes nothing, so the shape
         quietly disappears instead of drawing with a vertex missing. */
      let vIdx = 0;
      for (const group of VEDIC_CONSTELLATION_LINKS) {
        const pts = group.members.map((name) => byEn.get(name));
        if (pts.some((p) => !p)) continue;
        for (const [a, b] of group.links) {
          setVertex(vedicConstLines, vIdx, pts[a]!);
          setVertex(vedicConstLines, vIdx + 1, pts[b]!);
          vIdx += 2;
        }
      }
      vedicConstLines.geometry.setDrawRange(0, vIdx);
      flushLine(vedicConstLines);
    } else {
      vedicConstLines.geometry.setDrawRange(0, 0);
      vedicPickCount.current = 0;
      vedicField.points.geometry.setDrawRange(0, 0);
      vedicField.crown.visible = false;
    }

    /* नक्षत्र member positions for picking — every frame, because a paused
       globe never rebuilds the belt again and the first bake can land before
       the figures are even switched on. */
    if (toggles.constellations && (zodiac || space)) {
      const precession = precessionSinceJ2000(dtDays);
      const n = starField.stars.length;
      for (let i = 0; i < n; i += 1) {
        const s = starField.stars[i];
        const lon = s.lon + precession - ayan;
        const at = starPlace(i, lon, s.lat);
        const slot = asterismPickRef.current[i];
        slot.index = i;
        slot.lon = lon;
        slot.lat = s.lat;
        slot.world.set(at[0], at[1], at[2]);
      }
      asterismPickCount.current = n;
    } else {
      asterismPickCount.current = 0;
    }

    if (collect && (toggles.rashiBelt || toggles.nakshatraBelt || (space && toggles.monthRing))) {
      /**
       * Space view: names sit on the wheel, in the ecliptic plane, the way the
       * Learn playground labels its belts. Globe and horizon still write them
       * on the banded zodiac on the sphere.
       */
      const onWheel = (lon: number, radius: number): [number, number, number] => {
        const a = lon * DEG;
        return tiltEcliptic([radius * Math.cos(a), 0.04, -radius * Math.sin(a)]);
      };

      if (toggles.rashiBelt) {
        for (let i = 0; i < 12; i += 1) {
          const lon = (i + 0.5) * RASHI_ARC;
          const at = space ? onWheel(lon, RASHI_LABEL_R) : place(lon, RASHI_LABEL_LAT, RASHI_MID);
          if (labelVisible(at)) {
            project({ id: `r-${i}`, kind: "rashi", index: i + 1, dim: i !== beltRashi }, at);
          }
        }
      }
      if (space && toggles.monthRing) {
        for (let i = 0; i < 12; i += 1) {
          const lon = (i + 0.5) * RASHI_ARC;
          const at = onWheel(lon, MONTH_LABEL_R);
          if (labelVisible(at)) {
            project({ id: `m-${i}`, kind: "month", index: i + 1, dim: i !== sunRashi }, at);
          }
        }
      }
      if (toggles.nakshatraBelt) {
        for (let i = 0; i < 27; i += 1) {
          const lon = (i + 0.5) * NAKSHATRA_ARC;
          const at = space ? onWheel(lon, NAK_MID) : place(lon, NAK_LABEL_LAT, NAK_MID);
          if (labelVisible(at)) {
            project({ id: `n-${i}`, kind: "nakshatra", index: i + 1, dim: i !== beltNak }, at);
          }
        }

        /* पाद names belong to the globe/horizon band, where the camera can
           push in on a strip of sky. On the space wheel they are 108 numbers
           stacked on a ring — the Learn playground does not draw them. */
        if (!space && view.current.distance <= PADA_ZOOM) {
          const padaArc = NAKSHATRA_ARC / 4;
          for (let i = 0; i < 108; i += 1) {
            const lon = (i + 0.5) * padaArc;
            const at = place(lon, NAK_LABEL_LAT, NAK_OUTER - 0.32);
            if (labelVisible(at)) {
              project(
                { id: `p-${i}`, kind: "pada", index: (i % 4) + 1 },
                at,
              );
            }
          }
        }
      }
    }

    if (collect && horizon && !globe) {
      for (const c of COMPASS_POINTS) {
        project(
          { id: `c-${c.en}`, kind: "cardinal", text: c.en },
          altAzToVec3(0, c.az, DOME * 0.94),
        );
      }
      if (toggles.grid) {
        /* The numbers on the cage. Placing them is its own problem — a line
           has to be *walked* to find where it leaves the frame, or an
           almucantar lying along the bottom edge stamps its number across the
           whole width — so it lives in `grid-labels`. */
        const field = fovForZoom("horizon", view.current.distance);
        for (const g of buildGridLabels({
          camera: state.camera,
          fovDeg: field,
          width,
          height,
          radius: DOME * 0.995,
          gridStep: gridStepForFov(field),
          /* The bearings have to be numbered at the verticals' own spacing,
             not the almucantars' — near the pole those are far apart, and
             labelling at the finer pitch put numbers on meridians that are
             not drawn. */
          azGridStep: verticalStepForFov(
            field,
            horizonViewWindow(state.camera, field, width, height).centreAlt,
          ),
          scratch: scratch.current,
        })) {
          collected.push({
            id: g.id,
            kind: "azimuth",
            text: g.text,
            side: g.side,
            x: g.x,
            y: g.y,
          });
        }
      }
    }

    /* Each star group's own name, anchored on the group.
       The mean of the members lands inside the sphere, so it is pushed back out
       to where the stars are — otherwise the text would sit at a different
       depth from the figure it names and drift against it as the view turns. */
    /* Dome and globe only. In the space view each figure is drawn inside the
       segment named after it, so its own name would be that name twice.
       Once the lens is tight enough to show individual star names too, the
       group label is dropped — a नक्षत्र's योगतारा often shares its name
       with the नक्षत्र itself, so both together would repeat the same text. */
    const closeField = fovForZoom(mode, view.current.distance);
    const close = space ? view.current.distance <= 32 : closeField < 24;

    /* The panorama holds on nearly the whole way in — Stellarium's own
       `MilkyWay.cpp` keeps this exact texture at full brightness down to a
       2.5° field and only dims inside that, so hiding ours by 16°, a
       version of this file tried for one turn, was hiding the one thing
       there was to see: the galactic bulge visibly dimming and reddening
       toward the skyline as it swings down (see
       {@link injectMilkyWayExtinction}) only happens if the panorama is
       still on screen to show it. [1, 4] is that same shape scaled to
       where it actually finishes on this file's own range — the tightest
       field क्षितिज ever reaches is 1°, not Stellarium's 0.25°, so the ramp
       is moved in to land inside range instead of asymptoting toward a
       field the lens can never reach.

       पृथ्वी गोला keeps its own pair: its lens (see `fovForZoom("globe",
       …)`) only ever spans about 0.53°–31.7°, nothing like क्षितिज's
       1°–235°, so the same degrees would mean something quite different
       there. */
    const [fadeLo, fadeHi] = globe ? [1.5, 4] : [1, 4];
    /* Concept A — the near-zoom blur fade above, entirely unrelated to
       HiPS: even with the real DSS2 tiles never in the picture (globe,
       space, or क्षितिज with HiPS switched off) this panorama still wants
       to fade out once a press has pulled in far enough that its own
       2048×1024 texels are showing.
       Concept B — the panorama's own half of the two-layer cross-fade
       ({@link HIPS_BLEND_START_FOV}'s doc comment): the complement of
       {@link hipsVisibility}, so as the tiles ease in this eases out to
       match, deliberately kept as its own separate multiplier rather than
       folded into `skyFade` above — the two fade the panorama out for
       completely different reasons (one because the reader zoomed in past
       what the texture can resolve, the other because a *better* image
       has taken over) and only one of them exists outside क्षितिज. */
    const panoramaHipsFade = horizon && !arBackground ? 1 - hipsVisibility : 1;
    const skyFade = Math.max(0, Math.min(1, (closeField - fadeLo) / (fadeHi - fadeLo)));
    if (milkyWayMatRef.current) milkyWayMatRef.current.opacity = skyFade * panoramaHipsFade;
    /* The horizon glow needs the same fade, for a reason the Milky Way
       panorama does not have to worry about: it is a gradient by *altitude
       across the frame*, and a narrow field of view does not span enough
       altitude for that gradient to read as one any more. At 90° it is a
       soft brightening toward the skyline, barely noticeable against
       everything else in view; by 8° the entire frame sits inside a few
       degrees of altitude, so the "gradient" is now a single, almost
       constant value — and painted at full screen coverage, that constant
       is a flat colour wash, not a glow. Confirmed with the Milky Way
       correctly at zero at that same field: this was the actual source of
       "the whole sky turns into a flat colour when I zoom in", not the
       panorama. Same thresholds as the Milky Way's own fade, since the
       failure mode is the same shrinking-frame effect. */
    {
      const [glowLo, glowHi] = globe ? [8, 22] : [16, 30];
      const glowMat = horizonGlow.material as THREE.ShaderMaterial;
      glowMat.uniforms.uIntensity.value = 0.16 * Math.max(0, Math.min(1, (closeField - glowLo) / (glowHi - glowLo)));
    }
    if (collect && zodiac && toggles.constellations && !close) {
      const precession = precessionSinceJ2000(dtDays);
      for (const [nak, indices] of starField.byNakshatra) {
        let x = 0;
        let y = 0;
        let z = 0;
        let radius = 0;
        for (const i of indices) {
          const s = starField.stars[i];
          const p = starPlace(i, s.lon + precession - ayan, s.lat);
          x += p[0];
          y += p[1];
          z += p[2];
          radius = Math.hypot(p[0], p[1], p[2]);
        }
        /* On a sphere the mean of the members falls inside it, so it is pushed
           back out to where the stars are — otherwise the text sits at a
           different depth from the figure it names and drifts against it as
           the view turns. On the drum's wall the mean is already on the wall in
           height; only its distance from the axis needs restoring. */
        let at: [number, number, number];
        if (space) {
          const flat = Math.hypot(x, z) || 1;
          at = [(x / flat) * starRadius, y / indices.length, (z / flat) * starRadius];
        } else {
          const len = Math.hypot(x, y, z) || 1;
          at = [(x / len) * radius, (y / len) * radius, (z / len) * radius];
        }
        if (labelVisible(at)) {
          const junction = starField.stars[indices[0]];
          project(
            {
              id: `ast-${nak}`,
              kind: "asterism",
              index: nak,
              lon: junction.lon + precession - ayan,
              lat: junction.lat,
            },
            at,
          );
        }
      }
    }

    /* Individual नक्षत्र members — योगतारा always, companions revealed
       gradually by their own brightness as the lens tightens (see
       {@link companionMagLimit}), not all at once past one threshold. */
    if (collect && toggles.constellations && (zodiac || space)) {
      const precession = precessionSinceJ2000(dtDays);
      const companionLimit = space ? (close ? 99 : -99) : companionMagLimit(closeField);
      for (let i = 0; i < starField.stars.length; i += 1) {
        const s = starField.stars[i];
        if (!s.junction && s.mag > companionLimit) continue;
        const lon = s.lon + precession - ayan;
        const at = starPlace(i, lon, s.lat);
        if (!labelVisible(at)) continue;
        const nak = NAKSHATRA_ASTERISMS[s.nakshatra - 1];
        const names = nak ? starOverlayNames(s, nak) : null;
        if (!names) continue;
        project(
          {
            id: `star:${s.nakshatra}:${s.name}`,
            kind: "star",
            text: names.en,
            textNe: names.ne,
            index: i,
            lon,
            lat: s.lat,
            ...(horizon
              ? { clear: labelClearPx(starGlowDeg(s.mag), horizonFovNow, height, 8) }
              : {}),
          },
          at,
        );
      }
    }

    /* राशि / mythological figure labels — one per figure, at the mean of its
       members, the same way नक्षत्र group names are placed above. */
    if (collect && zodiac && toggles.constellations && !close) {
      const precession = precessionSinceJ2000(dtDays);
      for (const { figure, starIndices } of cultureField.figures) {
        let x = 0;
        let y = 0;
        let z = 0;
        let radius = 0;
        for (const i of starIndices) {
          const s = cultureField.stars[i];
          const p = skyPlace(s.lon + precession - ayan, s.lat);
          x += p[0];
          y += p[1];
          z += p[2];
          radius = Math.hypot(p[0], p[1], p[2]);
        }
        const len = Math.hypot(x, y, z) || 1;
        const at: [number, number, number] = [(x / len) * radius, (y / len) * radius, (z / len) * radius];
        if (!labelVisible(at)) continue;
        const anchor = cultureField.stars[starIndices[0]];
        project(
          {
            id: `culture-${figure.id}`,
            kind: "culture",
            text: figure.en,
            textNe: figure.ne,
            lon: anchor.lon + precession - ayan,
            lat: anchor.lat,
          },
          at,
        );
      }
    }

    /* Individually named member stars — अग्नि, ब्रह्महृदयम् and the rest,
       the ones classical texts singled out inside these figures. Shown at
       any zoom, the same as a नक्षत्र's own योगतारा. */
    if (collect && zodiac && toggles.constellations) {
      const precession = precessionSinceJ2000(dtDays);
      for (let i = 0; i < cultureField.stars.length; i += 1) {
        const s = cultureField.stars[i];
        const names = cultureStarLabel(s);
        if (!names) continue;
        const lon = s.lon + precession - ayan;
        const at = skyPlace(lon, s.lat);
        if (!labelVisible(at)) continue;
        project(
          {
            id: `culture-star:${s.hip}`,
            kind: "star",
            text: names.en,
            textNe: names.ne,
            lon,
            lat: s.lat,
            ...(horizon
              ? { clear: labelClearPx(starGlowDeg(s.mag), horizonFovNow, height, 8) }
              : {}),
          },
          at,
        );
      }
    }

    /* The two axes and the angle between them, named. */
    if (collect && globe && toggles.tilt) {
      const c = Math.cos(eps * DEG);
      const s2 = Math.sin(eps * DEG);
      project({ id: "axis-earth", kind: "axis", text: "earth" }, [0, GLOBE_R * 1.38, 0]);
      project({ id: "axis-ecliptic", kind: "axis", text: "ecliptic" }, [
        0,
        GLOBE_R * 1.38 * c,
        -GLOBE_R * 1.38 * s2,
      ]);
      // On the arc's midpoint, pushed out a little so it clears the curve.
      const mid = (eps / 2) * DEG;
      project({ id: "obliquity", kind: "obliquity", deg: eps }, [
        0,
        GLOBE_R * 1.24 * Math.cos(mid),
        -GLOBE_R * 1.24 * Math.sin(mid),
      ]);
    }

    /* Pole-star names, with the year each takes its turn. The reigning one is
       flagged so the overlay can crown it. */
    if (collect && zodiac && toggles.vedicStars) {
      const precession = precessionSinceJ2000(dtDays);
      const simYear = 2000 + dtDays / 365.25;
      const reigning = reigningPoleStar(poleField.stars, dtDays, eps);
      for (const s of poleField.stars) {
        const at = skyPlace(s.lon + precession - ayan, s.lat);
        if (!labelVisible(at)) continue;
        project(
          {
            id: `pole-${s.en}`,
            kind: "polestar",
            text: s.en,
            year: Math.round(poleStarEpoch(s.lon, simYear)),
            index: reigning && reigning.star.en === s.en ? 1 : 0,
          },
          at,
        );
      }
    }

    /* Named वैदिक तारा labels — server-positioned, no year or reigning flag,
       just the name in whichever language is live. Indexed ids: a couple of
       entries (प्रस्वा and लुब्धक-बन्धु) name the same physical star, so an
       id keyed on the name would collide. */
    if (collect && zodiac && toggles.vedicStars && vedicStars) {
      for (let i = 0; i < vedicStars.length && i < VEDIC_STAR_CAPACITY; i += 1) {
        const s = vedicStars[i];
        const at = skyPlace(s.lon, s.lat);
        if (!labelVisible(at)) continue;
        project(
          {
            id: `vedic:${i}`,
            kind: "vedicstar",
            text: s.en,
            textNe: s.ne,
            index: i,
            lon: s.lon,
            lat: s.lat,
            ...(horizon
              ? { clear: labelClearPx(starGlowDeg(s.mag), horizonFovNow, height, 8) }
              : {}),
          },
          at,
        );
      }
    }

    if (collect && globe) {
      /* The four turning points of the solar year, marked on the ring where
         they actually fall: the sampat on the equator, the ayana ends level
         with the two tropics. */
      for (const st of SOLAR_STATIONS) {
        const at = globePlace(st.tropicalLon - ayan, 0, GLOBE_BAND_R * 1.06);
        if (labelVisible(at)) {
          project({ id: `st-${st.id}`, kind: "station", text: st.id }, at);
        }
      }
      for (const t of globeLines.tropics) {
        // Put the tropic's name on the limb facing the camera.
        const at = geoToVec3(t.lat, 0, GLOBE_R * 1.02);
        scratch.current.set(at[0], at[1], at[2]);
        if (globeSpinRef.current) scratch.current.applyQuaternion(globeSpinRef.current.quaternion);
        const world: [number, number, number] = [
          scratch.current.x,
          scratch.current.y,
          scratch.current.z,
        ];
        if (labelVisible(world)) {
          project({ id: `tr-${t.id}`, kind: "tropic", text: t.id }, world);
        }
      }
      /* The observer's place carries no overlay label. A DOM node cannot be
         nailed to a spinning sphere the way the marker mesh is — it is
         re-projected every sixth frame and always trails the dot it belongs
         to — so the dot is left to say it on its own, which it does. */
    }

    /* ── frame-level scenery ────────────────────────────────────────── */
    if (earthGroupRef.current) earthGroupRef.current.visible = space;
    // The globe replaces the ground: from out here you are looking at the whole
    // Earth, not standing on a patch of it.
    /* One switch, not two: भूभाग *is* the ground. `belowHorizon` used to be a
       second chip that had to agree with it before any hillside appeared,
       which meant a reader could turn the landscape on and get nothing. */
    const showGround = horizon && !globe && toggles.landscape && !arBackground;
    /* Half-opaque, so the राशि belt reads through the valley.
     *
     * The fade only starts once the lens is tighter than a 20° crop, and is
     * gone by 6°. It used to begin the moment you left the 90° opening view
     * and be finished by 28° — which was most of the zoom range even before
     * the lens gained its arcminute end, so pressing भूभाग anywhere but the
     * widest view turned on a landscape you could not see. A switch that
     * appears to do nothing is worse than no switch. */
    const horizonFov = fovForZoom("horizon", view.current.distance);
    const zoomFade = horizonFov >= 20 ? 1 : Math.max(0, (horizonFov - 6) / (20 - 6));
    const groundOpacity = 0.5 * zoomFade;
    if (groundRef.current) groundRef.current.visible = showGround && groundOpacity > 0.02;
    /* Light on the hills, following the Sun through the twilight. The map is
       a daytime valley; this tints it down to night without rebuilding it. */
    const x = (sunAltitude - GROUND_DUSK) / (GROUND_DAWN - GROUND_DUSK);
    const dusk = Math.min(1, Math.max(0, x));
    const landT = dusk * dusk * (3 - 2 * dusk);
    if (groundMatRef.current) {
      groundMatRef.current.color.copy(GROUND_NIGHT).lerp(GROUND_DAY, landT);
      groundMatRef.current.opacity = groundOpacity;
    }
    if (spaceOnlyRef.current) {
      spaceOnlyRef.current.visible = space;
      spaceOnlyRef.current.rotation.x = space ? eps * DEG : 0;
    }
    if (globeRootRef.current) globeRootRef.current.visible = globe;
    for (const { layer, object } of skyLines) {
      const on =
        layer === "shared"
          ? toggles.rashiBelt || toggles.nakshatraBelt
          : layer === "rashi"
            ? toggles.rashiBelt
            : toggles.nakshatraBelt;
      object.visible = zodiac && on;
    }
    /* The star groups belong to the sky, so they live wherever the belt does.
       Split along the same seam as ध्रुव तारा below: the नक्षत्र member stars
       are stars and answer to वैदिक तारा, the lines joining them into a figure
       answer to तारापुञ्ज. Both used to sit under तारापुञ्ज, which meant
       turning the figures off also deleted the stars they were drawn between —
       and left तारापुञ्ज as a switch that removed half the sky. */
    for (const { object } of starField.groups) {
      object.visible = (zodiac || space) && toggles.vedicStars;
    }
    starField.lines.visible = (zodiac || space) && toggles.constellations;
    /* Figure lines, so तारापुञ्ज owns them — but their geometry is only
       written while वैदिक तारा is on (the block that computes it needs the
       star positions), and its draw range collapses to zero otherwise. Lines
       between stars that are not on screen would have nothing to join. */
    vedicConstLines.visible = zodiac && toggles.constellations;
    for (const { object } of cultureField.groups) {
      object.visible = zodiac && toggles.constellations;
    }
    cultureField.lines.visible = zodiac && toggles.constellations;
    /* The naked-eye background field — every star that is not a नक्षत्र member,
       a वैदिक तारा or a pole star. वैदिक तारा is the one switch for stars now,
       so this goes with them rather than being the one star layer with no way
       to turn it off. */
    for (const { object } of backgroundField.groups) {
      object.visible = (zodiac || space) && toggles.vedicStars;
    }
    /* Only ever forces them *off* — which of them are on is the reveal's
       own decision, per sprite, in the block above. Setting `visible` true
       here as well would put every photograph back on screen at once. */
    if (!horizon) {
      for (const { sprite } of nebulaField) sprite.visible = false;
    }
    // A skyline glow means nothing without a skyline — only क्षितिज has one.
    horizonGlow.visible = horizon;
    /* ध्रुव तारा has no switch of its own any more, and the two things it used
       to draw never belonged under one anyway. The dots — and the gold crown on
       whichever one is currently on duty — are *stars*, so they go off only
       when वैदिक तारा turns every star off. The circle joining them is the
       precession track: a figure drawn between stars, exactly what तारापुञ्ज
       governs everywhere else on this page. Together they meant that hiding a
       line you did not want also took the pole star off the sky. */
    poleField.points.visible = zodiac && toggles.vedicStars;
    poleField.crown.visible = zodiac && toggles.vedicStars;
    poleField.trackLine.visible = zodiac && toggles.constellations;
    vedicField.points.visible = zodiac && toggles.vedicStars && (vedicStars?.length ?? 0) > 0;
    if (!vedicField.points.visible) vedicField.crown.visible = false;
    // The tilt is only drawn where the Earth is: the globe view.
    tiltMarks.eclipticAxis.visible = globe && toggles.tilt;
    tiltMarks.arc.visible = globe && toggles.tilt;
    equatorLine.visible = horizon && !globe && (toggles.rashiBelt || toggles.nakshatraBelt);
    const gridOn = horizon && !globe && toggles.grid;
    grid.group.visible = gridOn;
    /* Version-guarded inside, so this is a no-op after the first frame. */
    if (gridOn) injectHorizonFisheyeIn(grid.frame, fisheye);
    /* Exactly one tier on screen at a time — the finest whose `maxFov`
       still clears the current field, same rule as {@link gridStepForFov}.
       Stellarium draws one grid resolution and swaps it as you zoom rather
       than layering a coarse cage under a fine one; showing every tier whose
       threshold happened to be satisfied was what made the web read as a
       crosshatch instead of a grid. */
    let activeIndex = -1;
    let azIndex = -1;
    /* Where the lens is pointing — the verticals' spacing depends on it, so
       it is needed on every frame the cage is on, not only the fine ones. */
    const gridView = gridOn
      ? horizonViewWindow(state.camera, horizonFov, width, height)
      : null;
    if (gridOn && gridView) {
      for (let i = 0; i < GRID_TIERS.length; i += 1) {
        if (horizonFov < GRID_TIERS[i].maxFov) activeIndex = i;
      }
      /* The same ladder, asked with the field widened by 1/cos(alt) — so the
         verticals thin out as the pole is approached instead of collapsing
         into a fan. Away from the pole this lands on the same tier as the
         almucantars and the cage is square again. */
      const azStep = verticalStepForFov(horizonFov, gridView.centreAlt);
      for (let i = 0; i < GRID_TIERS.length; i += 1) {
        if (GRID_TIERS[i].step === azStep) azIndex = i;
      }
    }
    let localAltTier: (typeof GRID_TIERS)[number] | null = null;
    let localAzTier: (typeof GRID_TIERS)[number] | null = null;
    for (let i = 0; i < GRID_TIERS.length; i += 1) {
      const tier = GRID_TIERS[i];
      if (tier.local) {
        if (i === activeIndex) localAltTier = tier;
        if (i === azIndex) localAzTier = tier;
      }
      /* Each family shows the baked whole-sky object for its own tier, unless
         that tier is fine enough to be drawn locally instead. */
      const wantAlt = i === activeIndex && !tier.local;
      const wantAz = i === azIndex && !tier.local;
      let altObject = grid.altTiers[i];
      if (wantAlt && !altObject) {
        altObject = bakeHorizonGrid(buildAlmucantarPairs(tier.step));
        injectHorizonFisheyeIn(altObject, fisheye);
        grid.altTiers[i] = altObject;
      }
      if (altObject) {
        if (altObject.parent !== grid.group) grid.group.add(altObject);
        altObject.visible = wantAlt;
      }
      let azObject = grid.azTiers[i];
      if (wantAz && !azObject) {
        azObject = bakeHorizonGrid(buildVerticalPairs(tier.step));
        injectHorizonFisheyeIn(azObject, fisheye);
        grid.azTiers[i] = azObject;
      }
      if (azObject) {
        if (azObject.parent !== grid.group) grid.group.add(azObject);
        azObject.visible = wantAz;
      }
    }
    if ((localAltTier || localAzTier) && gridView) {
      const view = gridView;
      const count = buildLocalGridPairs(
        localAltTier ? localAltTier.step : null,
        localAzTier ? localAzTier.step : null,
        {
          altLo: view.altLo,
          altHi: view.altHi,
          azLo: view.centreAz - view.azHalf,
          azHi: view.centreAz + view.azHalf,
        },
        grid.localPairs,
      );
      for (let i = 0; i < count; i += 1) {
        const p = grid.localPairs[i];
        setPoint(grid.local, i, altAzToVec3(p.alt, p.az, GRID_R));
      }
      grid.local.geometry.setDrawRange(0, count);
      (grid.local.material as THREE.LineBasicMaterial).opacity = GRID_OPACITY;
      flushLine(grid.local);
      injectHorizonFisheyeIn(grid.local, fisheye);
      grid.local.visible = true;
    } else {
      grid.local.visible = false;
    }
    horizonRing.visible = gridOn;
    if (horizonGroupRef.current) horizonGroupRef.current.quaternion.identity();

    /* ── the Earth globe ────────────────────────────────────────────── */
    if (globe) {
      // The graticule turns with the Earth; the zodiac ring around it does not.
      if (globeSpinRef.current) {
        const spin = toggles.lockStars ? 0 : earthSpin;
        // +Y is the axis; positive Y rotation is eastward (prograde), viewed from the north pole.
        globeSpinRef.current.rotation.y = spin % (Math.PI * 2);
      }
      for (const { object } of globeLines.parallels) object.visible = toggles.grid;
      for (const { object } of globeLines.meridians) object.visible = toggles.grid;
      globeLines.equator.object.visible = true;
      for (const { object } of globeLines.tropics) object.visible = true;

      /* The Sun's ray, and the subsolar point it plants on the globe — the
         thing that climbs to the Tropic of Cancer and back. */
      const sunAt = place(sky.sun.longitude, sky.sun.latitude, GLOBE_BAND_R);
      const len = Math.hypot(sunAt[0], sunAt[1], sunAt[2]) || 1;
      /* Foot on the subsolar dot, for the same reason the graha rays start on
         theirs: the half of a centre-anchored ray that is inside the planet is
         not a sightline, and depth-testing it away only hides the mistake. */
      const sub: [number, number, number] = [
        (sunAt[0] / len) * GLOBE_R * 1.01,
        (sunAt[1] / len) * GLOBE_R * 1.01,
        (sunAt[2] / len) * GLOBE_R * 1.01,
      ];
      setPoint(sunRay, 0, sub);
      setPoint(sunRay, 1, sunAt);
      flushLine(sunRay);
      sunRay.visible = true;
      if (subsolarRef.current) subsolarRef.current.position.set(sub[0], sub[1], sub[2]);
    } else {
      sunRay.visible = false;
    }

    // The little Earth in the space view turns on the same angle the globe
    // does — one Earth, one orientation, whichever view is looking at it.
    if (earthRef.current) earthRef.current.rotation.y = earthSpin;
    spaceMeridian.rotation.y = earthSpin + observer.lon * DEG;
    spaceMeridian.visible = space && toggles.primeMeridian;
    globeMeridian.rotation.y = observer.lon * DEG;
    globeMeridian.visible = globe && toggles.primeMeridian;

    // The Sun is the only real light source; put it exactly where the Sun is drawn.
    if (sunLightRef.current) {
      const sunGroup = bodyRefs.current.sun;
      if (sunGroup) sunLightRef.current.position.copy(sunGroup.position);
      /* The globe shades itself, so it needs the Sun's place rather than its
         light. Read it off the light, which is already there. */
      sunLightRef.current.getWorldPosition(spaceEarthMat.uniforms.sunPosition.value);
      /* Space: no inverse-square falloff. The shells are schematic (Moon at
         ~5, Sun at ~10), so decay would make पूर्णिमा dimmer than औंसी just
         because the Moon is drawn farther from the Sun. A constant light lets
         the terminator say the geometry: dark face toward Earth at औंसी, lit
         face toward Earth at पूर्णिमा. */
      sunLightRef.current.decay = space ? 0 : 2;
      sunLightRef.current.intensity = horizon ? 1400 : globe ? 700 : 4.5;
      /* The Moon's phase runs off the Sun's *direction* from the centre — the
         observer on the dome, the Earth on the globe — which is the one thing
         a fixed-radius projection keeps true. */
      if (sunGroup) {
        moonPhaseMat.uniforms.sunDirection.value.copy(sunGroup.position).normalize();
        /* How dark the unlit face is allowed to get, this frame.
         *
         * The phase is the point of this shader, but only while the Moon is
         * big enough to read one off. On पृथ्वी गोला it never is — the Moon
         * is a dot on a ring seen from outside — and in a wide क्षितिज it is
         * not either, so the true 10% earthshine was rendering a black dot on
         * a black sky and the Moon was simply missing for half of every month.
         * Ramped instead: a real terminator once the lens is tight enough to
         * show one, a plainly visible disc whenever it is not. See
         * {@link MOON_UNLIT_FAR}. */
        moonPhaseMat.uniforms.earthshine.value = horizon
          ? MOON_EARTHSHINE +
            (MOON_UNLIT_FAR - MOON_EARTHSHINE) *
              smoothstep(MOON_PHASE_FOV_TIGHT, MOON_PHASE_FOV_WIDE, horizonFovNow)
          : MOON_UNLIT_FAR;
      }
    }
    if (ambientRef.current) ambientRef.current.intensity = space ? 0.1 : 0.28;
    if (fillLightRef.current) fillLightRef.current.intensity = space ? 0 : 0.1;

    /* ── camera ─────────────────────────────────────────────────────── */
    const v = view.current;
    const cam = state.camera as THREE.PerspectiveCamera;
    /**
     * What the camera is following, if anything.
     *
     * Your own place wins over the selected graha — the lock is one target, and
     * choosing the marker is how you say it should be the ground rather than a
     * body. It only means something on the globe: inside the dome you are
     * already standing there, and from space the Earth is the centre anyway.
     *
     * The point rides the spinning globe, so the camera rides round with it —
     * the Earth turns as it always did and your place simply stays in the
     * middle of the screen, which is what the lock is for.
     */
    /* A press of केन्द्रविन्दु centres its target once, whatever the clock is
       doing; after that the hold is only for as long as the sky is moving. */
    if (focusNonce !== lastFocusNonce.current) {
      lastFocusNonce.current = focusNonce;
      recentre.current = true;
    }
    /* `recentre` alone is enough to pick a target: a single press on a graha
       asks to be *shown* it once, which is a different thing from asking the
       camera to ride it, and only the second of those turns केन्द्रविन्दु on. */
    const trackKey =
      (toggles.lockCenter || recentre.current) && !lockObserver && selectedKey
        ? selectedKey
        : null;
    const trackGroup = trackKey ? bodyRefs.current[trackKey] : null;
    let trackAt: THREE.Vector3 | null = trackGroup ? trackGroup.position : null;
    /* A star from the search box. Two different conventions arrive here —
       see {@link SkyTargetAt}'s own doc comment in `sky-catalogue.ts`, which
       `skyAim.sidereal` carries straight through from:
       - unset/false: `skyAim.lon/lat` are the catalogue's raw J2000
         tropical ecliptic coordinates ({@link equatorialToeclipticJ2000},
         untouched by precession or the ayanamsa) — the same numbers every
         fixed star and नेबुला in `sky-catalogue.ts` carries. `place` always
         treats its longitude as *sidereal* and adds the ayanamsa back on to
         reach the tropical value it actually needs, exactly like {@link
         skyPlace} does for every star this file draws (`star.lon +
         precession - ayan`, so `place`'s own `+ayan` cancels back to
         `star.lon + precession`). Aiming has to do the same cancellation.
       - true: a वैदिक तारा, already the current sidereal longitude the
         server computed for the exact date on screen — `place` wants
         exactly this, unmodified; applying the tropical correction above to
         an already-sidereal value was the actual bug (a target landing a
         whole ayanamsa — upwards of 24° — from the star whose name was
         right there in the label): found via a live screenshot showing the
         reticle and the "अभिजित्" star clearly apart, traced to this
         mismatch, not guessed. */
    if (skyAim && skyAim.nonce !== lastAim.current) {
      lastAim.current = skyAim.nonce;
      recentre.current = true;
      const aimLon = skyAim.sidereal ? skyAim.lon : skyAim.lon + precessionSinceJ2000(dtDays) - ayan;
      const at = place(aimLon, skyAim.lat, DOME);
      aimAt.current.set(at[0], at[1], at[2]);
      trackAt = aimAt.current;
      /* A deep-sky photograph asks to be framed, not just centred — most of
         the catalogue is under a degree across, and landing at whatever zoom
         the reader was already at would put it dead centre and still show
         nothing (see {@link nebulaReveal}). Stars/constellations carry no
         `fov`, so this leaves an ordinary aim exactly as it was. */
      if (horizon && skyAim.fov != null) {
        v.distance = distanceForHorizonFov(skyAim.fov);
      }
    }
    if (toggles.lockCenter && lockObserver && globe) {
      const at = geoToVec3(observer.lat, observer.lon, GLOBE_R);
      observerTrack.current.set(at[0], at[1], at[2]);
      // The marker rides the spinning globe, so its world position needs the
      // same quaternion — a no-op while the globe is the thing held still.
      if (globeSpinRef.current) {
        observerTrack.current.applyQuaternion(globeSpinRef.current.quaternion);
      }
      trackAt = observerTrack.current;
    }
    /**
     * Whether the camera is being *held* on the target this frame.
     *
     * Following is for watching something move: run the clock and the graha
     * stays nailed to the middle while the sky slides past it. Paused, there
     * is nothing to follow — the reader wants to look around the thing they
     * just centred, and a camera that snaps back every frame reads as a broken
     * drag. So the hold lasts as long as the clock runs, plus the one frame
     * that answers a press of केन्द्रविन्दु.
     */
    const holdCentre =
      !sensorDrive && trackAt != null && (s.playing || recentre.current);
    if (holdCentre) recentre.current = false;
    if (horizon) {
      /* Equidistant fisheye: screen radius is angle from the look direction.
         A perspective 170° lens is what pinched the nadir into a spike; this
         is the projection Stellarium uses, so zooming out to 180° really does
         put zenith at the top and nadir at the bottom. The camera matrix stays
         a quiet 60° perspective — only used for depth — and lookAt is not
         used, because near the zenith it rolls the cage. */
      cam.position.set(0, 0, 0);
      cam.up.set(0, 1, 0);
      if (holdCentre && trackAt) {
        /* Both negated, because the camera's angles run opposite the sky's.
         *
         * `cam.rotation.set(-pitch, yaw, 0)` in YXZ sends the view direction to
         * (−cos p·sin y, −sin p, −cos p·cos y), which against a point at
         * (cos a·sin A, sin a, −cos a·cos A) gives pitch = −altitude and
         * yaw = −azimuth. Taken straight — as this did — केन्द्रविन्दु aimed at
         * the mirror image of its target: a graha high in the south-east put
         * the camera low in the south-west, and the thing you asked to look at
         * was the one place on the dome you were not looking. */
        const len = Math.hypot(trackAt.x, trackAt.y, trackAt.z) || 1;
        v.pitch = -Math.asin(Math.max(-1, Math.min(1, trackAt.y / len)));
        v.yaw = -Math.atan2(trackAt.x, -trackAt.z);
        target.current.copy(trackAt);
      }
      cam.rotation.order = "YXZ";
      cam.rotation.set(-v.pitch, v.yaw, v.roll ?? 0);
      const field = fovForZoom("horizon", v.distance);
      fisheye.uHorizonStereo.value = 1;
      fisheye.uHorizonFov.value = field;
      fisheye.uHorizonAspect.value = state.size.width / Math.max(state.size.height, 1);
      if (Math.abs(cam.fov - 60) > 0.01) {
        cam.fov = 60;
        cam.updateProjectionMatrix();
      }
      injectHorizonFisheyeIn(state.scene, fisheye);
    } else if (globe) {
      fisheye.uHorizonStereo.value = 0;
      /* A long lens from far back — as close to an orthographic globe as a
         perspective camera gets. The +Y matters: the camera has to stay on the
         side of the ecliptic the pitch asks for, because from underneath the
         whole zodiac runs backwards and every graha appears to go clockwise. */
      const cosP = Math.cos(v.pitch);
      /* Zoom is optical, not positional: the camera stays parked well outside
         the globe and the lens narrows, so you can push in to a couple of
         degrees of ring without ever ending up inside the Earth. */
      const radius = GLOBE_CAM_R;
      const fov = fovForZoom("globe", v.distance);
      if (trackAt) {
        target.current.copy(trackAt);
        scratch.current.copy(target.current);
        const bodyR = scratch.current.length();
        if (!holdCentre) {
          /* Released: the camera goes back to answering the drag, but keeps
             looking at what it was following, so letting go of the clock does
             not throw the target 8° off the middle of the screen. */
          cam.position.set(
            radius * cosP * Math.sin(v.yaw),
            radius * Math.sin(v.pitch),
            radius * cosP * Math.cos(v.yaw),
          );
        } else if (bodyR < 1e-5) {
          cam.position.set(radius * cosP * Math.sin(v.yaw), radius * Math.sin(v.pitch), radius * cosP * Math.cos(v.yaw));
          target.current.set(0, 0, 0);
        } else {
          /* Same hemisphere as the graha: camera rides the outward ray from
             Earth so the body stays in front of the globe, not behind it. */
          scratch.current.multiplyScalar(radius / bodyR);
          cam.position.copy(scratch.current);
          v.yaw = Math.atan2(cam.position.x, cam.position.z);
          v.pitch = Math.asin(Math.max(-1, Math.min(1, cam.position.y / radius)));
        }
        cam.lookAt(target.current);
      } else {
        target.current.set(0, 0, 0);
        cam.position.set(
          radius * cosP * Math.sin(v.yaw),
          radius * Math.sin(v.pitch),
          radius * cosP * Math.cos(v.yaw),
        );
        cam.lookAt(target.current);
      }
      if (Math.abs(cam.fov - fov) > 0.01) {
        cam.fov = fov;
        cam.updateProjectionMatrix();
      }
    } else {
      fisheye.uHorizonStereo.value = 0;
      /* Same orbit as the Learn playground: the reader's yaw/pitch, no floor
         that keeps you north of the ecliptic. Drag under the wheel and you
         go under the wheel. */
      const cosP = Math.cos(v.pitch);
      if (trackAt) target.current.copy(trackAt);
      else target.current.set(0, 0, 0);
      cam.position.set(
        target.current.x + v.distance * cosP * Math.sin(v.yaw),
        target.current.y + v.distance * Math.sin(v.pitch),
        target.current.z + v.distance * cosP * Math.cos(v.yaw),
      );
      cam.lookAt(target.current);
      if (Math.abs(cam.fov - SPACE_FOV) > 0.01) {
        cam.fov = SPACE_FOV;
        cam.updateProjectionMatrix();
      }
    }

    frame.current += 1;

    /* ── trails ─────────────────────────────────────────────────────── */
    /* Nine paths of ninety points is far too much orbital arithmetic for one
       frame — done together it drops a frame every time the epoch turns over,
       which at the fast speeds is several times a second. So the sweep is
       spread: one graha per frame, all of them off the same instant. */
    const epoch = `${mode}:${Math.floor(dtDays / 2)}`;
    const sweeping = trailCursor.current < GEO_BODY_ORDER.length;
    /* At the fast speeds the epoch turns over faster than a sweep can finish;
       letting it restart would mean only the Moon ever got redrawn, so a sweep
       always runs to the end before the next one begins. */
    if (epoch !== lastTrailKey.current && !sweeping) {
      lastTrailKey.current = epoch;
      trailCursor.current = 0;
      trailBaseDt.current = dtDays;
    }
    if (trailCursor.current < GEO_BODY_ORDER.length) {
      const key = GEO_BODY_ORDER[trailCursor.current];
      trailCursor.current += 1;
      const line = trails[key];
      const shift = calibration[key] ?? 0;
      for (let i = 0; i <= TRAIL_STEPS; i += 1) {
        const offsetDays = -TRAIL_DAYS + (i / TRAIL_STEPS) * TRAIL_DAYS * 2;
        const b = geocentricPointAt(key, trailBaseDt.current + offsetDays, shift);
        if (space) {
          setPoint(
            line,
            i,
            tiltEcliptic(
              eclipticToVec3(b.longitude, b.latitude, shellRadius(key, b.distanceAu) * SPACE_SHELL_SCALE),
            ),
          );
        } else {
          // Held at the current sidereal time, so the trail shows the
          // graha's own motion against the stars, not the Earth's spin.
          setPoint(line, i, place(b.longitude, b.latitude, DOME * 0.99));
        }
      }
      flushLine(line);
    }

    /* Keep the previous array whenever nothing has moved half a pixel. Names
       have to follow the star points on the same turn; the HUD clock still
       only ticks five times a second. */
    let labelsChanged = false;
    if (collect) {
      const culled = cullOverlappingNames(collected);
      if (labelsMoved(labels.current, culled)) {
        labels.current = culled;
        labelsChanged = true;
      }
    }

    lastSample.current += delta;
    lastLabelPush.current += delta;
    const hudDue = lastSample.current > 0.2;
    if (hudDue) lastSample.current = 0;
    /* Fast play (a century a second) moves every name every frame, which used
       to push a `setState` at the full 60Hz right along with it. That is
       enough main-thread churn on a phone to eat a tap on the pause button —
       it would sit there needing three or four presses before one landed.
       Labels still owe smooth tracking, just not a React commit for every
       single one of the 60 frames it takes to deliver it — one twelfth of a
       second (~12Hz) reads as continuous to an eye and leaves the thread free
       for the touch that ends the ride. */
    const labelPushDue = labelsChanged && lastLabelPush.current > 1 / 12;
    if (labelPushDue) lastLabelPush.current = 0;
    if (labelPushDue || hudDue) {
      onSample({
        timeMs: s.timeMs,
        sky,
        labels: labels.current,
        sunAltitude,
        zoomDistance: view.current.distance,
        eclipse: ecl.kind ? { kind: ecl.kind, mag: ecl.mag, node: ecl.node } : null,
      });
    }
  }

  return (
    <group>
      <ambientLight ref={ambientRef} intensity={0.28} />
      <pointLight ref={sunLightRef} intensity={520} distance={0} decay={2} color="#fff6e0" />
      {/* A hint of fill so the night side is shape rather than a hole.
          Space turns this off so Earth shows a real terminator, like Learn. */}
      <directionalLight ref={fillLightRef} position={[0, 12, 0]} intensity={0.1} />

      <mesh ref={starsRef} visible={!arBackground} renderOrder={-1}>
        <primitive object={milkyWayGeometry} attach="geometry" />
        {/* Opaque, no depth test or write — the standard skybox recipe. At
            r=400 against a 0.1/600 near/far pair the perspective depth
            buffer has compressed almost all of its precision into the near
            field; this sphere's own fragments were landing a hair past the
            far plane's 1.0 and losing the depth test on every one of them,
            which is why the sky read as flat black regardless of the
            texture. `depthTest={false}` plus `renderOrder={-1}` is what
            every skybox actually wants — drawn first, behind everything,
            never fighting the depth buffer at all. The ecliptic disc's own
            transparency is what keeps stars off the belt, not draw order
            against this any more.

            skyBoost multiplies the sampled texel — a light lift over the
            panorama's own exposure, not a rescue of a near-black
            placeholder any more.

            `transparent` is for the fade only — depth is still off above, so
            this never competes with anything for draw order. The panorama is
            2048×1024 over the whole sphere: fine at the field it was framed
            for, but a few degrees of that is a handful of texels blown up
            into a soft blur once a press has pulled in on one star or
            planet. Rather than ship a sharper file, the fade below just
            takes it out of the picture before it gets that close — the same
            call a real dark-sky photo would make, since the eye stops
            reading it as the Milky Way and starts reading it as one smudged
            star's neighbourhood at that magnification anyway.

            Additive, the same as their own `glBlendFunc(GL_ONE, GL_ONE)` —
            it lets the star points sitting in front of it glow *through* the
            band rather than the band painting over them as a normal-blended
            layer would, and it is why theirs never reads as a brighter
            rectangle laid on top of a dimmer sky: the whole picture is one
            additive stack, this panorama included, not a photo behind a
            layer of dots. */}
        <meshBasicMaterial
          ref={milkyWayMatRef}
          map={milkyWay}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
          depthTest={false}
          color={skyBoost}
          toneMapped={false}
        />
      </mesh>

      {/* HiPS Milky Way tile layer — an independent group of real DSS2 tile
          patches, riding the same equatorial→horizon rotation the panorama
          sphere above already uses. Tiles themselves are not JSX children:
          the visible set changes every frame as the camera moves, so they
          are added/removed imperatively (`group.add(entry.mesh)`) from the
          `hipsCache` Map in the per-frame block above, keyed by
          `order/pix` so a tile already downloaded is never re-fetched. */}
      <group ref={hipsGroupRef} />

      {/* The dark-night floor under an otherwise empty patch of sky — see the
          doc comment on {@link makeHorizonGlow}. क्षितिज only. */}
      <primitive object={horizonGlow} />

      {/* Space view: the Earth itself, tilted by the obliquity of the ecliptic. */}
      <group ref={earthGroupRef}>
        {/* The same globe the Learn playground draws: opaque, and shading
            itself against the Sun so the terminator is a curve that follows the
            Sun north and south. Its night side stays a readable map at
            `EARTH_NIGHT`, which is what lets you orbit round the back of the
            planet and still see where you are looking. */}
        <mesh ref={earthRef} material={spaceEarthMat}>
          <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        </mesh>
        {/* Polar axis — the diurnal spin that walks the lagna round the zodiac. */}
        <mesh>
          <cylinderGeometry args={[0.01, 0.01, EARTH_RADIUS * 3, 8]} />
          <meshBasicMaterial color={INK_DIM} transparent opacity={0.5} />
        </mesh>
        <primitive object={spaceMeridian} />
      </group>

      {/* The observer's own frame: the ground underfoot, the horizon circle and
          the alt-az cage. Standing inside, this is the identity; seen from
          outside the sphere it turns once a sidereal day while the zodiac
          stays nailed to the stars. */}
      <group ref={horizonGroupRef}>
        <group ref={groundRef} visible={false}>
          {/* Inner sky sphere with काठमाडौँ underfoot: little-planet photo
              mapped from the nadir so the hills are the skyline. Its own sky
              is alpha 0 (`alphaTest`) so the stars and the राशि belt pass.
              Turn क्षितिजमुनि off and the group hides. */}
          <mesh
            geometry={groundGeo}
            frustumCulled={false}
            renderOrder={1}
            raycast={() => {}}
          >
            <meshBasicMaterial
              ref={groundMatRef}
              map={landscapeMap}
              side={THREE.BackSide}
              transparent
              opacity={0.5}
              alphaTest={0.12}
              depthWrite={false}
              color="#ffffff"
            />
          </mesh>
        </group>
        <primitive object={horizonRing} />
        <primitive object={grid.group} />
      </group>

      {/* The Earth globe: a dark ball carrying nothing but its graticule, with
          the zodiac ring hugging it. Zooming out of the horizon view lands
          here. */}
      <group ref={globeRootRef} visible={false}>
        {/* Turns once a sidereal day; the ring globe it does not. */}
        <group ref={globeSpinRef}>
          {/* The Earth itself — opaque, so the far side of the grid and of the
              ring is hidden and the Sun picks out the lit half. It sits inside
              the spinning group, not outside it: a map has to turn with the
              graticule drawn on top of it, or Nepal walks away from its dot.

              A little emissive of its own map keeps the night side as geography
              rather than a black hole, the same trick the space view uses. */}
          <mesh ref={shellRef}>
            {/* Enough segments that the limb reads as a curve. This is the one
                sphere in the scene that fills the screen. */}
            <sphereGeometry args={[GLOBE_R * 0.995, 128, 96]} />
            {/* More emissive than before, because the map underneath it changed:
                the old one was pale and low-contrast, so a sixth of its own
                light was enough to keep the night side legible. A real Blue
                Marble has real oceans, and at that setting half the globe went
                to black. */}
            <meshStandardMaterial
              map={textures.earth}
              emissive="#ffffff"
              emissiveMap={textures.earth}
              emissiveIntensity={0.4}
              roughness={0.9}
              metalness={0.02}
            />
          </mesh>
          {/* Weather, faint enough that the graticule and the coastlines under
              it both still read. */}
          <mesh>
            <sphereGeometry args={[GLOBE_R * 1.004, 48, 48]} />
            <meshStandardMaterial
              map={textures.earthclouds}
              transparent
              opacity={0.32}
              depthWrite={false}
            />
          </mesh>

          {globeLines.parallels.map(({ object }, i) => (
            <primitive key={`par-${i}`} object={object} />
          ))}
          {globeLines.meridians.map(({ object }, i) => (
            <primitive key={`mer-${i}`} object={object} />
          ))}
          <primitive object={globeLines.equator.object} />
          {globeLines.tropics.map(({ object, id }) => (
            <primitive key={`trop-${id}`} object={object} />
          ))}
          <primitive object={globeMeridian} />
          {/* Where you are watching from — a bright marker plus a soft glow around
              it, so it reads at a glance instead of disappearing as a single dot
              against the grid. Pressing it picks your own place as what the
              camera follows, the same way pressing a graha picks that. */}
          <group position={geoToVec3(observer.lat, observer.lon, OBSERVER_R)}>
            {/* A place, not a region: at the old size the dot covered most of
                Nepal and the glow the subcontinent, which is both wrong and
                what made it read as sitting above the map rather than on it.
                The invisible disc under them keeps the press target the size a
                finger needs, which the dot no longer is. */}
            <mesh onClick={onSelectObserver}>
              <sphereGeometry args={[GLOBE_R * 0.018, 16, 16]} />
              <meshBasicMaterial color={lockObserver ? "#ffd166" : "#ff6b6b"} />
            </mesh>
            <mesh onClick={onSelectObserver}>
              <sphereGeometry args={[GLOBE_R * 0.036, 16, 16]} />
              <meshBasicMaterial
                color={lockObserver ? "#ffd166" : "#ff6b6b"}
                transparent
                opacity={lockObserver ? 0.45 : 0.3}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            {/* Transparent rather than `visible={false}`: the raycaster skips
                anything invisible, so a hidden hit target is no target. */}
            <mesh onClick={onSelectObserver}>
              <sphereGeometry args={[GLOBE_R * 0.075, 8, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        </group>

        {/* The Sun's ray and the subsolar point it plants between the tropics. */}
        <primitive object={sunRay} />
        {/* The point the Sun stands over. Small on purpose — it marks one spot
            on the map, and at any size worth noticing it stops being one. */}
        <mesh ref={subsolarRef}>
          <sphereGeometry args={[GLOBE_R * 0.014, 12, 12]} />
          <meshBasicMaterial color="#ffd166" />
        </mesh>
        {/* The same mark for whichever graha is selected — see {@link subGrahaRef}. */}
        <mesh ref={subGrahaRef} visible={false}>
          <sphereGeometry args={[GLOBE_R * 0.014, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Earth's axis, drawn out past the poles. */}
        <mesh>
          <cylinderGeometry args={[GLOBE_R * 0.006, GLOBE_R * 0.006, GLOBE_R * 2.5, 8]} />
          <meshBasicMaterial color={INK_DIM} transparent opacity={0.45} />
        </mesh>
      </group>

      {/* Start already in the ecliptic — useFrame keeps the live obliquity.
          Without this, a remount (fullscreen) paints one frame with the wheel
          in Earth's equator, which from the default camera is edge-on and
          reads as the plane having failed to come up. */}
      <group ref={spaceOnlyRef} rotation={[obliquity(0) * DEG, 0, 0]}>
        <EclipticWheel
          grid={toggles.grid}
          rashiBelt={toggles.rashiBelt}
          nakshatraBelt={toggles.nakshatraBelt}
          monthRing={false}
          planeOpacity={SPACE_PLANE_OPACITY}
          planeColor={ECLIPTIC_GRID_COLOR}
          gridInnerR={EARTH_RADIUS}
          planeInnerR={EARTH_RADIUS}
          planeOuterR={NAK_OUTER + 1.1}
          planeY={0}
          rashiHighlightRef={rashiHiRef}
          nakHighlightRef={nakHiRef}
        />
        {shells.map(({ key, points, attach }) => (
          <ShellLine key={key} points={points} attach={attach} />
        ))}

        {/* How far a graha stands off the ecliptic is drawn for the *selected*
            one only — its शर, in its own colour. Every body used to plant a
            dark blob on the plane below it as well, which read as a shadow
            cast by nothing and only ever appeared on whichever one or two
            happened to be south of the plane that day. */}
        <primitive object={sharaLine} />
        <mesh ref={sharaFootRef} visible={false}>
          <circleGeometry args={[0.13, 20]} />
          <meshBasicMaterial
            color={selectedKey ? GRAHA_COLOR[selectedKey] : "#ffffff"}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {skyLines.map(({ object }, i) => (
        <primitive key={`band-${i}`} object={object} />
      ))}
      <primitive object={equatorLine} />

      {/* The नक्षत्र star groups, and the figures joining them. */}
      <primitive object={starField.lines} />
      {starField.groups.map(({ object }, i) => (
        <primitive key={`stars-${i}`} object={object} />
      ))}

      {/* The rest of the sky culture: राशि figures, सप्तर्षि, शिंशुमारः… */}
      <primitive object={cultureField.lines} />
      {cultureField.groups.map(({ object }, i) => (
        <primitive key={`culture-${i}`} object={object} />
      ))}

      {/* The naked-eye sky itself, everything down to magnitude 7.5. */}
      {backgroundField.groups.map(({ object }, i) => (
        <primitive key={`bg-${i}`} object={object} />
      ))}

      {/* A curated set of Stellarium's own deep-sky photographs. */}
      {nebulaField.map(({ sprite }, i) => (
        <primitive key={`neb-${i}`} object={sprite} />
      ))}
      {/* One marker ring per named object — see {@link nebulaMarkers}. */}
      {nebulaMarkers.map(({ marker }, i) => (
        <primitive key={`neb-ring-${i}`} object={marker} />
      ))}

      {/* The obliquity: the orbit's perpendicular, and the angle off it. */}
      <primitive object={tiltMarks.eclipticAxis} />
      <primitive object={tiltMarks.arc} />

      {/* The ध्रुव तारा, and the circle the pole walks between them. */}
      <primitive object={poleField.trackLine} />
      <primitive object={poleField.points} />
      <primitive object={poleField.crown} />
      <primitive object={vedicField.points} />
      <primitive object={vedicField.crown} />
      <primitive object={vedicConstLines} />

      {GEO_BODY_ORDER.map((key) => (
        <GrahaBody
          key={key}
          graha={key}
          textures={textures}
          selected={selectedKey === key}
          groupRef={handles[key].group}
          spinRef={handles[key].spin}
          retroRef={handles[key].retro}
          sunLit={mode === "space"}
          phaseMaterial={key === "moon" ? moonPhaseMat : undefined}
          eclipse={key === "moon" ? moonEclipse : undefined}
        />
      ))}

      {GEO_BODY_ORDER.map((key) => (
        <primitive key={`ray-${key}`} object={rays[key]} />
      ))}

      {GEO_BODY_ORDER.map((key) => (
        <primitive key={`trail-${key}`} object={trails[key]} />
      ))}
      {OUTER_PLANET_ORDER.map((key) => (
        <primitive key={`outer-${key}`} object={outerPlanets[key]} />
      ))}
      <primitive object={lunarUmbra} />
      <primitive object={solarUmbra} />
    </group>
  );
}

/** A unit-radius ring the frame loop scales to the graha's live distance. */
function ShellLine({
  points,
  attach,
}: {
  points: THREE.Vector3[];
  attach: (o: THREE.Line | null) => void;
}) {
  const object = useMemo(() => {
    const line = makeLine(points, INK_DIM, 0.7);
    line.renderOrder = 4;
    line.frustumCulled = false;
    (line.material as THREE.LineBasicMaterial).depthWrite = false;
    return line;
  }, [points]);
  useEffect(() => {
    attach(object);
    return () => attach(null);
  }, [object, attach]);
  return <primitive object={object} />;
}

export default AakashGocharScene;
