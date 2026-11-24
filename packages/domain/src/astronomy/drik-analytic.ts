// Our own built-in Drik: the Moshier-style fallback, with no data file.
//
// The Sun, the Moon and Rahu come from a trigonometric series fitted to our own ephemeris
// kernel (`ephdata analytic-fit`, constants in drik-analytic-data.ts), and the five planets from
// mean orbital elements. It answers for any date, so it is what the app uses when a date is
// outside the bundled years, the server cannot be reached and no batch is cached. It is
// approximate: the fit prints its error per two centuries, and the planets are good to about a
// degree in the span it was fitted over (3000 BCE to 3000 CE; Jupiter and Saturn drift to a few
// and about thirteen degrees at its far end), so a screen showing these says so.
//
// The model runs in TT; the app has UT, so the same delta-T polynomials as the server's
// (apps/rust/crates/ephdata/src/deltat.rs) convert.
import {
  AYANAMSHA_J2000,
  AYANAMSHA_POLY,
  MOON_SERIES,
  PLANET_CORRECTION,
  RAHU_SERIES,
  SUN_SERIES,
  type AnalyticSeries,
} from "./drik-analytic-data";
import { drikFrame } from "./drik-source";
import { wrap360, type PositionSource, type SiddhantaPositions } from "./siddhanta-offline";

const J2000 = 2451545.0;

const poly = (t: number, c: readonly number[]): number => c.reduceRight((acc, k) => acc * t + k, 0);

/** Delta-T (TT - UT), seconds, at a decimal year: the Espenak-Meeus polynomials. */
export function deltaTSeconds(year: number): number {
  const parabola = (y: number) => {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  };
  if (year < -500) return parabola(year);
  if (year < 500) {
    return poly(year / 100, [10583.6, -1014.41, 33.78311, -5.952053, -0.1798452, 0.022174192, 0.0090316521]);
  }
  if (year < 1600) {
    return poly((year - 1000) / 100, [1574.2, -556.01, 71.23472, 0.319781, -0.8503463, -0.005050998, 0.0083572073]);
  }
  if (year < 1700) return poly(year - 1600, [120, -0.9808, -0.01532, 1 / 7129]);
  if (year < 1800) return poly(year - 1700, [8.83, 0.1603, -0.0059285, 0.00013336, -1 / 1174000]);
  if (year < 1860) {
    return poly(year - 1800, [13.72, -0.332447, 0.0068612, 0.0041116, -0.00037436, 0.0000121272, -0.0000001699, 0.000000000875]);
  }
  if (year < 1900) return poly(year - 1860, [7.62, 0.5737, -0.251754, 0.01680668, -0.0004473624, 1 / 233174]);
  if (year < 1920) return poly(year - 1900, [-2.79, 1.494119, -0.0598939, 0.0061966, -0.000197]);
  if (year < 1941) return poly(year - 1920, [21.2, 0.84493, -0.0761, 0.0020936]);
  if (year < 1961) return poly(year - 1950, [29.07, 0.407, -1 / 233, 1 / 2547]);
  if (year < 1986) return poly(year - 1975, [45.45, 1.067, -1 / 260, -1 / 718]);
  if (year < 2005) return poly(year - 2000, [63.86, 0.3345, -0.060374, 0.0017275, 0.000651814, 0.00002373599]);
  if (year < 2050) return poly(year - 2000, [62.92, 0.32217, 0.005589]);
  if (year < 2150) return parabola(year) - 0.5628 * (2150 - year);
  return parabola(year);
}

/** Julian Day in TT for a Julian Day in UT. */
export function utToTt(jdUt: number): number {
  return jdUt + deltaTSeconds(2000 + (jdUt - J2000) / 365.25) / 86400;
}

const RAD = Math.PI / 180;

/** The five arguments at `t` (centuries of TT), radians: D, M, M', F and the lunar node. */
function argumentsAt(t: number): number[] {
  const d = 297.8501921 + t * (445267.1114034 + t * (-0.0018819 + t / 545868));
  const m = 357.5291092 + t * (35999.0502909 + t * (-0.0001536 + t / 24490000));
  const mp = 134.9633964 + t * (477198.8675055 + t * (0.0087414 + t / 69699));
  const f = 93.272095 + t * (483202.0175233 + t * (-0.0036539 - t / 3526000));
  const om = 125.0445479 + t * (-1934.1362891 + t * (0.0020754 + t / 467441));
  return [d, m, mp, f, om].map((x) => x * RAD);
}

/** sin and cos of k * argument for k = 0..4 (the terms use multiples up to 4), per argument. */
function multiplesOf(args: number[]): { sin: number[][]; cos: number[][] } {
  const sin: number[][] = [];
  const cos: number[][] = [];
  for (const x of args) {
    const s1 = Math.sin(x);
    const c1 = Math.cos(x);
    const sk = [0, s1];
    const ck = [1, c1];
    for (let k = 2; k <= 4; k += 1) {
      sk.push(sk[k - 1] * c1 + ck[k - 1] * s1);
      ck.push(ck[k - 1] * c1 - sk[k - 1] * s1);
    }
    sin.push(sk);
    cos.push(ck);
  }
  return { sin, cos };
}

/**
 * The series at `t`. A term's phase is a whole-number mix of five arguments, so its sine and cosine
 * are built from the tables of multiples by the angle-addition rules: no sin or cos call per term.
 */
function seriesAt(series: AnalyticSeries, t: number, multiples: ReturnType<typeof multiplesOf>): number {
  const u = t / 10;
  let value = poly(u, series.poly);
  const { sin, cos } = multiples;
  for (const term of series.terms) {
    let s = 0;
    let c = 1;
    for (let i = 0; i < 5; i += 1) {
      const k = term[i];
      if (k === 0) continue;
      const ks = k < 0 ? -sin[i][-k] : sin[i][k];
      const kc = k < 0 ? cos[i][-k] : cos[i][k];
      const ns = s * kc + c * ks;
      c = c * kc - s * ks;
      s = ns;
    }
    value += term[5] * s + term[6] * c;
  }
  return value;
}

interface Elements {
  a: number[];
  e: number[];
  i: number[];
  l: number[];
  peri: number[];
  node: number[];
}

/** Mean orbital elements at J2000 and per century (Standish, JPL): Mercury, Venus, Earth-Moon, Mars, Jupiter, Saturn. */
const PLANETS: Elements[] = [
  { a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], i: [7.00497902, -0.00594749], l: [252.25032350, 149472.67411175], peri: [77.45779628, 0.16047689], node: [48.33076593, -0.12534081] },
  { a: [0.72333566, 0.00000390], e: [0.00677672, -0.00004107], i: [3.39467605, -0.00078890], l: [181.97909950, 58517.81538729], peri: [131.60246718, 0.00268329], node: [76.67984255, -0.27769418] },
  { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], i: [-0.00001531, -0.01294668], l: [100.46457166, 35999.37244981], peri: [102.93768193, 0.32327364], node: [0.0, 0.0] },
  { a: [1.52371034, 0.00001847], e: [0.09339410, 0.00007882], i: [1.84969142, -0.00813131], l: [-4.55343205, 19140.30268499], peri: [-23.94362959, 0.44441088], node: [49.55953891, -0.29257343] },
  { a: [5.20288700, -0.00011607], e: [0.04838624, -0.00013253], i: [1.30439695, -0.00183714], l: [34.39644051, 3034.74612775], peri: [14.72847983, 0.21252668], node: [100.47390909, 0.20469106] },
  { a: [9.53667594, -0.00125060], e: [0.05386179, -0.00050991], i: [2.48599187, 0.00193609], l: [49.95424423, 1222.49362201], peri: [92.59887831, -0.41897216], node: [113.66242448, -0.28867794] },
];

const at = (pair: number[], t: number): number => pair[0] + pair[1] * t;

function heliocentric(el: Elements, t: number): [number, number] {
  const a = at(el.a, t);
  const e = at(el.e, t);
  const incl = at(el.i, t) * RAD;
  const peri = at(el.peri, t);
  const node = at(el.node, t) * RAD;
  const m = ((((at(el.l, t) - peri + 180) % 360) + 360) % 360 - 180) * RAD;
  let ecc = m + e * Math.sin(m);
  for (let k = 0; k < 8; k += 1) ecc -= (ecc - e * Math.sin(ecc) - m) / (1 - e * Math.cos(ecc));
  const xp = a * (Math.cos(ecc) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(ecc);
  const w = peri * RAD - node;
  const [cw, sw, co, so, ci] = [Math.cos(w), Math.sin(w), Math.cos(node), Math.sin(node), Math.cos(incl)];
  return [
    (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp,
    (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp,
  ];
}

/** Geocentric longitude of a planet on the J2000 ecliptic, degrees. `row` indexes PLANETS. */
function planetLongitudeJ2000(row: number, t: number): number {
  const [px, py] = heliocentric(PLANETS[row], t);
  const [ex, ey] = heliocentric(PLANETS[2], t);
  return wrap360(Math.atan2(py - ey, px - ex) / RAD);
}

/** Rows of PLANETS and indexes of PLANET_CORRECTION for the planets, by name. */
const PLANET_ROW = { mars: 3, mercury: 0, jupiter: 4, venus: 1, saturn: 5 } as const;
const PLANET_CORR = { mercury: 0, venus: 1, mars: 2, jupiter: 3, saturn: 4 } as const;

/** The Lahiri ayanamsha at `jdUt`, degrees. */
export function drikAyanamshaAt(jdUt: number): number {
  return poly(((utToTt(jdUt) - J2000) / 36525) / 10, AYANAMSHA_POLY);
}

/** Sidereal longitudes in the order sun, moon, mars, mercury, jupiter, venus, saturn, rahu. */
function longitudesAt(jdUt: number, bodies = 8): number[] {
  const t = (utToTt(jdUt) - J2000) / 36525;
  // The orbit elements are fitted to 1800-2050; a polynomial fitted to the kernel over 3000 BCE to
  // 3000 CE takes out the drift of the slow mean motions (valid only over that span).
  const planet = (row: number, corr: number) =>
    wrap360(planetLongitudeJ2000(row, t) - AYANAMSHA_J2000 + poly(t / 10, PLANET_CORRECTION[corr]));
  let shared: ReturnType<typeof multiplesOf> | undefined;
  const mult = () => (shared ??= multiplesOf(argumentsAt(t)));
  const each: (() => number)[] = [
    () => wrap360(seriesAt(SUN_SERIES, t, mult())),
    () => wrap360(seriesAt(MOON_SERIES, t, mult())),
    () => planet(PLANET_ROW.mars, PLANET_CORR.mars),
    () => planet(PLANET_ROW.mercury, PLANET_CORR.mercury),
    () => planet(PLANET_ROW.jupiter, PLANET_CORR.jupiter),
    () => planet(PLANET_ROW.venus, PLANET_CORR.venus),
    () => planet(PLANET_ROW.saturn, PLANET_CORR.saturn),
    () => wrap360(seriesAt(RAHU_SERIES, t, mult())),
  ];
  return each.slice(0, bodies).map((f) => f());
}

const SPEED_DELTA = 0.05;

/** Our own Drik, with no data: any date, approximate. The last resort. */
export const drikAnalyticSource: PositionSource = {
  positionsAt(jdUt: number, bodies = 8, speeds = true): SiddhantaPositions | null {
    if (!Number.isFinite(jdUt)) return null;
    const longitude = longitudesAt(jdUt, bodies);
    const before = speeds ? longitudesAt(jdUt - SPEED_DELTA, bodies) : longitude;
    const after = speeds ? longitudesAt(jdUt + SPEED_DELTA, bodies) : longitude;
    const speed = longitude.map((_, b) => {
      let diff = after[b] - before[b];
      diff -= 360 * Math.round(diff / 360);
      return diff / (2 * SPEED_DELTA);
    });
    const t = (utToTt(jdUt) - J2000) / 36525;
    const aya = drikAyanamshaAt(jdUt);
    return {
      longitude,
      speed,
      ayanamsha: aya,
      meanSunSayana: wrap360(280.46646 + 36000.76983 * t + 0.0003032 * t * t),
    };
  },
  frame: drikFrame,
};
