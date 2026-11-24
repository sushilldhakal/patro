// Every Drik ayanamsha the apps offer, computed on the client. The Drik data is stored free of any
// ayanamsha (tropical, in effect: see chebyshev.ts), and the reader's choice is applied here, the
// way the Swiss Ephemeris applies a sidereal mode to its tropical positions.
//
// Lahiri, KP and Raman are fixed points among the stars: the tropical longitude a mode names at its
// epoch, carried to any date by IAU 2006 precession (the Rust server's own Lahiri, `ephdata::sky`).
// True Chitra and True Pushya follow a star: Spica stands at 180°, δ Cancri at 106°.
import { utToTt } from "./drik-analytic";

export type DrikAyanamsha = "lahiri" | "kp" | "raman" | "true_citra" | "true_pushya";

const J2000 = 2451545;
const AS = Math.PI / 648000;
const RAD = Math.PI / 180;

type Mat3 = [number[], number[], number[]];

const horner = (t: number, c: number[]) => c.reduceRight((acc, k) => acc * t + k, 0);

function mul(a: Mat3, b: Mat3): Mat3 {
  const out: Mat3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) out[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
  return out;
}
const rx = (phi: number, r: Mat3): Mat3 => {
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  return mul([[1, 0, 0], [0, c, s], [0, -s, c]], r);
};
const rz = (phi: number, r: Mat3): Mat3 => {
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  return mul([[c, s, 0], [-s, c, 0], [0, 0, 1]], r);
};
const apply = (m: Mat3, v: number[]) => [0, 1, 2].map((i) => m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2]);
const applyT = (m: Mat3, v: number[]) => [0, 1, 2].map((i) => m[0][i] * v[0] + m[1][i] * v[1] + m[2][i] * v[2]);

/** IAU 2006 mean obliquity, radians; `t` in Julian centuries of TT from J2000. */
function meanObliquity(t: number): number {
  return horner(t, [84381.406, -46.836769, -0.0001831, 0.0020034, -0.000000576, -0.0000000434]) * AS;
}

/** ICRS vector → mean ecliptic and equinox of date (IAU 2006 Fukushima-Williams with the frame bias). */
function eclipticOfDate(t: number): Mat3 {
  const gamb = horner(t, [-0.052928, 10.556378, 0.4932044, -0.00031238, -0.000002788, 0.000000026]) * AS;
  const phib = horner(t, [84381.412819, -46.811016, 0.0511268, 0.00053289, -0.00000044, -0.0000000176]) * AS;
  const psib = horner(t, [-0.041775, 5038.481484, 1.5584175, -0.00018522, -0.000026452, -0.0000000148]) * AS;
  const eps = meanObliquity(t);
  let r: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  r = rz(gamb, r);
  r = rx(phib, r);
  r = rz(-psib, r);
  r = rx(-eps, r);
  return rx(eps, r);
}

const centuries = (jdTt: number) => (jdTt - J2000) / 36525;
const longitudeOf = (v: number[]) => (((Math.atan2(v[1], v[0]) / RAD) % 360) + 360) % 360;

/** The ICRS direction of the point at tropical longitude `degrees` on the ecliptic of `epochJdTt`. */
function zeroPoint(epochJdTt: number, degrees: number): number[] {
  const a = degrees * RAD;
  return applyT(eclipticOfDate(centuries(epochJdTt)), [Math.cos(a), Math.sin(a), 0]);
}

/** A star's ICRS direction at `jdTt`, moved by its proper motion (mas/yr, μα* and μδ). */
function starAt(raDeg: number, decDeg: number, pmRa: number, pmDec: number, jdTt: number): number[] {
  const years = (jdTt - J2000) / 365.25;
  const dec = (decDeg + (pmDec * years) / 3.6e6) * RAD;
  const ra = (raDeg + (pmRa * years) / 3.6e6 / Math.cos(decDeg * RAD)) * RAD;
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
}

// Epoch and value of each fixed-point mode (the Swiss Ephemeris table; Lahiri as the Rust server).
const FIXED: Record<"lahiri" | "kp" | "raman", number[]> = {
  lahiri: zeroPoint(2435553.5, 23.245524743),
  kp: zeroPoint(2415020.0, 22.363889),
  raman: zeroPoint(2415020.0, 21.01444),
};

// The stars of the two star modes (ICRS, J2000, Hipparcos: RA, Dec in degrees, μα*, μδ in mas/yr).
const SPICA = [201.29824737, -11.16131947, -42.35, -30.67] as const;
const DELTA_CANCRI = [131.17124671, 18.15430650, -17.67, -229.26] as const;

/**
 * What makes each mode agree with the Swiss Ephemeris (which the production server used for them)
 * against our Lahiri, arcseconds `a + b·T` (T in Julian centuries from J2000): its epoch constants
 * and star catalogue differ slightly. Fitted 1900-2100; residual under 0.01″ against Swiss Lahiri's
 * own offset. Lahiri itself is the Rust server's, untouched, so its stored boundaries still apply.
 */
const SWISS_ALIGN: Record<DrikAyanamsha, [number, number]> = {
  lahiri: [0, 0],
  kp: [-0.956, 0.003],
  raman: [-0.956, 0.0028],
  true_citra: [-4.7859, -0.23],
  true_pushya: [18.3107, -0.113],
};

/** The ayanamsha of a mode at `jdUt`, degrees. */
export function ayanamshaFor(mode: DrikAyanamsha, jdUt: number): number {
  const jdTt = utToTt(jdUt);
  const t = centuries(jdTt);
  const [a, b] = SWISS_ALIGN[mode];
  return rawAyanamsha(mode, jdTt, eclipticOfDate(t)) + (a + b * t) / 3600;
}

function rawAyanamsha(mode: DrikAyanamsha, jdTt: number, m: Mat3): number {
  switch (mode) {
    case "lahiri":
    case "kp":
    case "raman":
      return longitudeOf(apply(m, FIXED[mode]));
    case "true_citra": {
      const [ra, dec, pa, pd] = SPICA;
      return longitudeOf(apply(m, starAt(ra, dec, pa, pd, jdTt))) - 180;
    }
    case "true_pushya": {
      const [ra, dec, pa, pd] = DELTA_CANCRI;
      return longitudeOf(apply(m, starAt(ra, dec, pa, pd, jdTt))) - 106;
    }
  }
}

/** The app's ayanamsha choice as a mode here: "nepal" is Lahiri; anything unknown is null. */
export function drikAyanamshaOf(choice: string): DrikAyanamsha | null {
  if (choice === "nepal" || choice === "lahiri") return "lahiri";
  return choice === "kp" || choice === "raman" || choice === "true_citra" || choice === "true_pushya" ? choice : null;
}
