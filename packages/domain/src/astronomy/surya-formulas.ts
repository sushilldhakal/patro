// The Surya Siddhanta's own arithmetic, in the app: the built-in fallback that needs no data.
//
// Positions by the text (Burgess's translation, chapters I-V): the mean longitude from the
// revolutions in a mahayuga, then the manda and sighra corrections. It is pure arithmetic with
// no ephemeris file and no delta-T, so it answers for any date, and it is the very same
// computation the server does (apps/rust/crates/astronomy/src/surya_siddhanta/): the numbers
// agree to rounding. It is what the app uses when a date is outside the bundled years, the
// server cannot be reached and no batch is cached.
//
// Whole days of motion are about 7e11 and revolutions run to 5.8e7, so the products pass 2^53;
// they go through BigInt, as the server's go through i128, and only the fraction of the current
// day is a float.
import {
  SIDDHANTA_BODIES,
  ayanamshaAt,
  wrap360,
  type PositionSource,
  type SiddhantaPositions,
} from "./siddhanta-offline";

const MAHAYUGA_DAYS = 1_577_917_828n;
const KALPA_DAYS = 1000n * MAHAYUGA_DAYS;
const DAYS_CREATION_TO_KALI = (MAHAYUGA_DAYS * 45_275n) / 100n;
const KALI_JD_0H_UT = 588_465.5;
const UJJAIN_LONGITUDE = 75 + 46 / 60;
const KALI_EPOCH_JD = KALI_JD_0H_UT - UJJAIN_LONGITUDE / 360;

/** Revolutions per mahayuga (Burgess I.29-44); the node is retrograde. */
const REVS = {
  sun: 4_320_000n,
  moon: 57_753_336n,
  mars: 2_296_832n,
  mercurySighra: 17_937_060n,
  jupiter: 364_220n,
  venusSighra: 7_022_376n,
  saturn: 146_568n,
  moonApogee: 488_203n,
  moonNode: -232_238n,
} as const;

type StarPlanet = "mars" | "mercury" | "jupiter" | "venus" | "saturn";

/** Revolutions per kalpa of each apsis (manda ucca); the Sun's is `sun`. */
const APSIS_REVS: Record<StarPlanet | "sun", bigint> = {
  sun: 387n,
  mars: 204n,
  mercury: 368n,
  jupiter: 900n,
  venus: 535n,
  saturn: 39n,
};

/** Epicycle circumference, degrees, at the end of the even and the odd quadrant. */
type Epicycle = readonly [even: number, odd: number];

const MANDA: Record<StarPlanet | "sun" | "moon", Epicycle> = {
  sun: [14, 13 + 40 / 60],
  moon: [32, 31 + 40 / 60],
  mars: [75, 72],
  mercury: [30, 28],
  jupiter: [33, 32],
  venus: [12, 11],
  saturn: [49, 48],
};

const SIGHRA: Record<StarPlanet, Epicycle> = {
  mars: [235, 232],
  mercury: [133, 132],
  jupiter: [70, 72],
  venus: [262, 260],
  saturn: [39, 40],
};

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Python's float `%` for a positive divisor. */
function pyMod(x: number, m: number): number {
  const r = x % m;
  if (r === 0) return 0;
  return r < 0 ? r + m : r;
}

/** Fractional revolution after the days of motion up to `jdUt`, exactly. */
function revolutionFraction(revs: bigint, periodDays: bigint, jdUt: number): number {
  const days = Number(DAYS_CREATION_TO_KALI) + (jdUt - KALI_EPOCH_JD);
  const whole = Math.floor(days);
  const part = days - whole;
  let numerator = (revs * BigInt(whole)) % periodDays;
  if (numerator < 0n) numerator += periodDays;
  return pyMod((Number(numerator) + Number(revs) * part) / Number(periodDays), 1);
}

const meanLongitude = (revs: bigint, jdUt: number): number =>
  360 * revolutionFraction(revs, MAHAYUGA_DAYS, jdUt);

const apsisLongitude = (of: StarPlanet | "sun", jdUt: number): number =>
  360 * revolutionFraction(APSIS_REVS[of], KALPA_DAYS, jdUt);

/** The epicycle shrinks from its even- to its odd-quadrant size with |sin anomaly|. */
function epicycleAt([even, odd]: Epicycle, anomaly: number): number {
  return even - (even - odd) * Math.abs(Math.sin(anomaly * RAD));
}

/** Manda correction, degrees, to add. */
function mandaEquation(of: StarPlanet | "sun" | "moon", longitude: number, apsis: number): number {
  const anomaly = longitude - apsis;
  const c = epicycleAt(MANDA[of], anomaly);
  return -Math.asin((c / 360) * Math.sin(anomaly * RAD)) * DEG;
}

function sighraEquation(
  planet: StarPlanet,
  longitude: number,
  sighrocca: number,
): { correction: number; karna: number } {
  const anomaly = sighrocca - longitude;
  const c = epicycleAt(SIGHRA[planet], anomaly) / 360;
  const a = anomaly * RAD;
  const across = c * Math.sin(a);
  const along = 1 + c * Math.cos(a);
  return { correction: Math.atan2(across, along) * DEG, karna: Math.hypot(across, along) };
}

/** True longitude of a star-planet by the four steps of chapter II. */
function starPlanetLongitude(planet: StarPlanet, jdUt: number): number {
  const sun = meanLongitude(REVS.sun, jdUt);
  let mean: number;
  let sighrocca: number;
  switch (planet) {
    case "mercury":
      mean = sun;
      sighrocca = meanLongitude(REVS.mercurySighra, jdUt);
      break;
    case "venus":
      mean = sun;
      sighrocca = meanLongitude(REVS.venusSighra, jdUt);
      break;
    case "mars":
      mean = meanLongitude(REVS.mars, jdUt);
      sighrocca = sun;
      break;
    case "jupiter":
      mean = meanLongitude(REVS.jupiter, jdUt);
      sighrocca = sun;
      break;
    default:
      mean = meanLongitude(REVS.saturn, jdUt);
      sighrocca = sun;
  }
  const apsis = apsisLongitude(planet, jdUt);
  const p1 = mean + sighraEquation(planet, mean, sighrocca).correction / 2;
  const p2 = p1 + mandaEquation(planet, p1, apsis) / 2;
  const p3 = mean + mandaEquation(planet, p2, apsis);
  return wrap360(p3 + sighraEquation(planet, p3, sighrocca).correction);
}

/** A body's true sidereal longitude by the text, degrees in [0, 360). Rahu is the mean node. */
export function suryaLongitude(body: (typeof SIDDHANTA_BODIES)[number], jdUt: number): number {
  switch (body) {
    case "sun": {
      const mean = meanLongitude(REVS.sun, jdUt);
      return wrap360(mean + mandaEquation("sun", mean, apsisLongitude("sun", jdUt)));
    }
    case "moon": {
      const mean = meanLongitude(REVS.moon, jdUt);
      const apogee = meanLongitude(REVS.moonApogee, jdUt);
      return wrap360(mean + mandaEquation("moon", mean, apogee));
    }
    case "rahu":
      return wrap360(meanLongitude(REVS.moonNode, jdUt));
    default:
      return starPlanetLongitude(body, jdUt);
  }
}

/** Half-width, days, of the difference that gives the interpolation speed. */
const SPEED_DELTA = 0.05;

/**
 * The text's arithmetic as a position source: any date, no data. Slower than reading a stored
 * file (a position is a few dozen operations plus BigInt products), so it is the last resort.
 */
export const suryaFormulaSource: PositionSource = {
  positionsAt(jdUt: number): SiddhantaPositions | null {
    if (!Number.isFinite(jdUt)) return null;
    const longitude: number[] = [];
    const speed: number[] = [];
    for (const body of SIDDHANTA_BODIES) {
      longitude.push(suryaLongitude(body, jdUt));
      let diff = suryaLongitude(body, jdUt + SPEED_DELTA) - suryaLongitude(body, jdUt - SPEED_DELTA);
      diff -= 360 * Math.round(diff / 360);
      speed.push(diff / (2 * SPEED_DELTA));
    }
    const aya = ayanamshaAt(jdUt);
    return {
      longitude,
      speed,
      ayanamsha: aya,
      meanSunSayana: wrap360(meanLongitude(REVS.sun, jdUt) + aya),
    };
  },
};
