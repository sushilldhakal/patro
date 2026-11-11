/**
 * Sun–Earth–Moon eclipse geometry for the lunar-eclipse article.
 * Sun sits at the centre; Earth orbits on the ecliptic ring. The Moon rides a
 * tilted orbit around Earth; its two ecliptic crossings are राहु / केतु.
 */


const RAD = Math.PI / 180;

export const ECL = {
  W: 1240,
  H: 720,
  /** Sun at the centre of the diagram and Earth's orbital ring. */
  sunCX: 620,
  sunCY: 360,
  sunR: 38,
  earthR: 46,
  moonR: 17,
  /** Moon orbit radius on screen (Earth-centred). */
  R: 118,
  /** Earth's heliocentric orbit radius on screen. */
  earthOrbitR: 330,
  /** Visually exaggerated orbital inclination (real ≈ 5.14°). */
  iDeg: 22,
  /** Oblique viewing elevation so the ~5° tilt reads clearly. */
  elevDeg: 26,
  /** Umbra (dark cone) length in local Earth frame (+x = anti-solar). */
  umbraLen: 200,
  /** Penumbra (lighter cone) length in local Earth frame. */
  penumbraLen: 280,
} as const;

const EL_RAD = ECL.elevDeg * RAD;
const SE = Math.sin(EL_RAD);
const CE = Math.cos(EL_RAD);

export interface ScreenPt {
  x: number;
  y: number;
  /** Model-space height above the ecliptic (for front/back layering). */
  z: number;
}

/** Heliocentric ecliptic coords → screen (Sun at origin). */
export function heliocentricToScreen(xh: number, yh: number, zh: number): ScreenPt {
  return {
    x: ECL.sunCX + xh,
    y: ECL.sunCY - (yh * SE + zh * CE),
    z: zh,
  };
}

/** Earth-centred local coords → screen, given Earth's orbital longitude (deg). */
export function localToScreen(xl: number, yl: number, zl: number, earthLon: number): ScreenPt {
  const lr = earthLon * RAD;
  const xh = ECL.earthOrbitR * Math.cos(lr) + xl * Math.cos(lr) - yl * Math.sin(lr);
  const yh = ECL.earthOrbitR * Math.sin(lr) + xl * Math.sin(lr) + yl * Math.cos(lr);
  return heliocentricToScreen(xh, yh, zl);
}

/** Earth's position on the heliocentric ecliptic (lon 0° = to the right of the Sun). */
export function earthScreen(earthLon: number): ScreenPt {
  return localToScreen(0, 0, 0, earthLon);
}

/** Point on the heliocentric ecliptic ring centred on the Sun. */
export function planePtSun(a: number, r: number): ScreenPt {
  const ar = a * RAD;
  return heliocentricToScreen(r * Math.cos(ar), r * Math.sin(ar), 0);
}

export function sunScreen(): ScreenPt {
  return { x: ECL.sunCX, y: ECL.sunCY, z: 0 };
}

/** Real mean inclination — used only to print believable latitude numbers. */
export const REAL_INCL = 5.14;
export function realBeta(modelBetaDeg: number): number {
  return (modelBetaDeg * REAL_INCL) / ECL.iDeg;
}

const TH_TOTAL = 7;
const TH_PARTIAL = 18;
const TH_PENUMBRAL = 26;
const TH_SOLAR = 20;

const SIN_I = Math.sin(ECL.iDeg * RAD);
const COS_I = Math.cos(ECL.iDeg * RAD);

export interface MoonGeo {
  xEc: number;
  yEc: number;
  zEc: number;
  sx: number;
  sy: number;
  /** Elongation 0°=new(औंसी) … 180°=full(पूर्णिमा). */
  E: number;
  betaDeg: number;
  radial: number;
  axial: number;
}

/**
 * Moon position for argument-of-latitude `u` (deg from ascending node),
 * ascending-node longitude `omega` (deg in Earth-local ecliptic), and Earth's
 * heliocentric longitude `earthLon` (deg on the Sun-centred ecliptic).
 */
export function moonGeo(u: number, omega: number, earthLon = 0): MoonGeo {
  const ur = u * RAD;
  const Om = omega * RAD;
  const cu = Math.cos(ur);
  const su = Math.sin(ur);
  const xEc = Math.cos(Om) * cu - Math.sin(Om) * su * COS_I;
  const yEc = Math.sin(Om) * cu + Math.cos(Om) * su * COS_I;
  const zEc = su * SIN_I;
  const scr = localToScreen(ECL.R * xEc, ECL.R * yEc, ECL.R * zEc, earthLon);
  const E = (((Math.atan2(yEc, xEc) / RAD - 180) % 360) + 360) % 360;
  return {
    xEc,
    yEc,
    zEc,
    sx: scr.x,
    sy: scr.y,
    E,
    betaDeg: Math.asin(Math.max(-1, Math.min(1, zEc))) / RAD,
    radial: ECL.R * Math.hypot(yEc, zEc),
    axial: ECL.R * xEc,
  };
}

/** Endpoints of the राहु–केतु line through Earth's centre in the Sun-fixed sky frame. */
export function nodeLineEndpointsInertial(
  omegaInertial: number,
  earthLon: number,
  halfLen = ECL.earthOrbitR * 0.92,
) {
  const lr = earthLon * RAD;
  const Or = omegaInertial * RAD;
  const ex = ECL.earthOrbitR * Math.cos(lr);
  const ey = ECL.earthOrbitR * Math.sin(lr);
  const c = Math.cos(Or);
  const s = Math.sin(Or);
  return {
    a: heliocentricToScreen(ex + halfLen * c, ey + halfLen * s, 0),
    b: heliocentricToScreen(ex - halfLen * c, ey - halfLen * s, 0),
  };
}

/** राहु / केतु on the ecliptic through Earth (sky-fixed). */
export function nodeMarkersInertial(omegaInertial: number, earthLon: number, dist = ECL.R) {
  const lr = earthLon * RAD;
  const Or = omegaInertial * RAD;
  const ex = ECL.earthOrbitR * Math.cos(lr);
  const ey = ECL.earthOrbitR * Math.sin(lr);
  const c = Math.cos(Or);
  const s = Math.sin(Or);
  return {
    asc: heliocentricToScreen(ex + dist * c, ey + dist * s, 0),
    desc: heliocentricToScreen(ex - dist * c, ey - dist * s, 0),
  };
}

/** Convert sky-fixed node longitude to Earth-local frame (rotates with Earth's orbit). */
export function earthLocalOmega(omegaInertial: number, earthLon: number): number {
  return (((omegaInertial - earthLon) % 360) + 360) % 360;
}

export type EclipseStatus = "total" | "partial" | "penumbral" | "none";

export function umbraHalfWidth(axial: number): number {
  if (axial <= 0 || axial >= ECL.umbraLen) return 0;
  return ECL.earthR * (1 - axial / ECL.umbraLen);
}
export function penumbraHalfWidth(axial: number): number {
  if (axial <= 0 || axial >= ECL.penumbraLen) return 0;
  return ECL.earthR * (1 - axial / ECL.penumbraLen);
}

export function lunarEclipseStatus(g: MoonGeo): EclipseStatus {
  if (g.xEc <= 0.5) return "none";
  if (g.radial < TH_TOTAL) return "total";
  if (g.radial < TH_PARTIAL) return "partial";
  if (g.radial < TH_PENUMBRAL) return "penumbral";
  return "none";
}

export function isSolarAlignment(g: MoonGeo): boolean {
  return g.xEc < -0.5 && g.radial < TH_SOLAR;
}

/* ------------------------------------------------------------------ */
/* Time-driven model                                                    */
/* ------------------------------------------------------------------ */

export const SYNODIC_MONTH = 29.530589;
export const ECLIPSE_YEAR = 346.62;
export const YEAR_DAYS = 365.2422;
export const NODE_START = 30;
export const ECL_RANGE_DAYS = ECLIPSE_YEAR;
/** Nodal precession: ~0.05°/day (vs Moon ~13°/day). */
export const NODE_DEG_PER_DAY = 360 / ECLIPSE_YEAR;
/** Simulated days advanced per real second when the पात-चक्र play is on (slow). */
export const NODE_PLAY_SPEED = 1;

export function moonLonFromDay(t: number): number {
  return (((360 * t) / SYNODIC_MONTH) % 360 + 360) % 360;
}
/** राहु–केतु axis in the Sun-fixed sky — retrograde (clockwise on the ecliptic). */
export function nodeOmegaInertialFromDay(precDays: number): number {
  return (((NODE_START - (360 * precDays) / ECLIPSE_YEAR) % 360) + 360) % 360;
}
export function earthLonFromDay(t: number): number {
  return (((360 * t) / YEAR_DAYS) % 360 + 360) % 360;
}

export function geoFromDay(
  t: number,
  /** Nodal precession in simulated days (independent of Moon time `t`). */
  precDays = t,
): {
  u: number;
  omega: number;
  omegaInertial: number;
  earthLon: number;
  g: MoonGeo;
} {
  const earthLon = earthLonFromDay(t);
  const omegaInertial = nodeOmegaInertialFromDay(precDays);
  const omega = earthLocalOmega(omegaInertial, earthLon);
  const lam = moonLonFromDay(t);
  const u = (((lam - omega) % 360) + 360) % 360;
  return { u, omega, omegaInertial, earthLon, g: moonGeo(u, omega, earthLon) };
}

export interface EclipseEvent {
  t: number;
  kind: "lunar" | "solar";
  status: EclipseStatus;
  betaDeg: number;
}

export function findEclipses(range = ECL_RANGE_DAYS): EclipseEvent[] {
  const out: EclipseEvent[] = [];
  let cur: { kind: "lunar" | "solar"; best: EclipseEvent } | null = null;
  const flush = () => {
    if (cur) out.push(cur.best);
    cur = null;
  };
  for (let t = 0; t <= range; t += 0.2) {
    const { g } = geoFromDay(t, t);
    const lunar = lunarEclipseStatus(g);
    const kind: "lunar" | "solar" | null =
      lunar !== "none" ? "lunar" : isSolarAlignment(g) ? "solar" : null;
    if (!kind) {
      flush();
      continue;
    }
    const ev: EclipseEvent = { t, kind, status: kind === "lunar" ? lunar : "total", betaDeg: g.betaDeg };
    if (!cur || cur.kind !== kind) {
      flush();
      cur = { kind, best: ev };
    } else if (Math.abs(g.betaDeg) < Math.abs(cur.best.betaDeg)) {
      cur.best = ev;
    }
  }
  flush();
  return out;
}
