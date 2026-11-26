// `/seasons/tropical`: the current ऋतु, the next five season starts and the two ayanas, each the
// real-sky (tropical) crossing with the sidereal crossing of the same degree beside it
// (apps/rust/crates/patro/src/seasons.rs).
import { bsDateOf, isoFromJdn, localJdn } from "../../astronomy/lunar-month";
import type { Sky } from "../../astronomy/sky";
import { tropicalSun } from "./blocks";

type Json = Record<string, unknown>;

const SUN_DEG_PER_DAY = 360 / 365.2422;
const VASANTA = 330;
const UTTARAYANA = 270;
const DAKSHINAYANA = 90;

const pyMod = (a: number, b: number) => ((a % b) + b) % b;
const signedDiff = (deg: number) => pyMod(pyMod(deg, 360) + 540, 360) - 180;

/** Sixteen Newton steps at the mean solar speed. */
function refine(longitude: (jd: number) => number, target: number, guess: number): number {
  let jd = guess;
  for (let i = 0; i < 16; i += 1) jd -= signedDiff(longitude(jd) - target) / SUN_DEG_PER_DAY;
  return jd;
}

function siderealSun(sky: Sky, jd: number): number {
  const p = sky.positionsAt(jd, 1, false);
  if (!p) throw new Error("no positions");
  return pyMod(p.longitude[0], 360);
}

/** The crossing to the whole second (UTC) and its civil AD / BS day in the zone. */
function startFields(jd: number, timeZone: string): Json {
  const seconds = Math.floor((jd - 2_440_587.5) * 86_400 + 1e-7);
  const iso = new Date(seconds * 1000).toISOString().slice(0, 19);
  const day = localJdn(seconds / 86_400 + 2_440_587.5, timeZone);
  const bs = bsDateOf(day);
  return {
    start_instant_utc: `${iso}+00:00`,
    start_ad: isoFromJdn(day),
    start_bs: bs ? `${bs.year}-${String(bs.month).padStart(2, "0")}-${String(bs.day).padStart(2, "0")}` : null,
  };
}

function withVedic(sky: Sky, angle: number, realJd: number, timeZone: string): Json {
  return { ...startFields(realJd, timeZone), vedic: startFields(refine((jd) => siderealSun(sky, jd), angle, realJd), timeZone) };
}

/** The payload at `nowJd` (UT) for an observer at `latitude` in `timeZone`. */
export function tropicalSeasons(sky: Sky, place: { latitude: number; timeZone: string }, nowJd: number): Json {
  const tz = place.timeZone;
  const lambda = tropicalSun(sky, nowJd);
  const crossing = (angle: number, first: boolean) => {
    const offset = first ? signedDiff(angle - lambda) : pyMod(angle - lambda, 360);
    return refine((jd) => tropicalSun(sky, jd), angle, nowJd + offset / SUN_DEG_PER_DAY);
  };
  const current = Math.floor(pyMod(lambda - VASANTA, 360) / 60);
  const boundaries = [0, 1, 2, 3, 4, 5].map((i) => {
    const slot = (current + i) % 6;
    const angle = (VASANTA + slot * 60) % 360;
    return { slot, angle, ...withVedic(sky, angle, crossing(angle, i === 0), tz), is_current: i === 0 };
  });
  const uttaraNow = lambda >= UTTARAYANA || lambda < DAKSHINAYANA;
  const ayanas = [uttaraNow, !uttaraNow].map((uttara, i) => {
    const angle = uttara ? UTTARAYANA : DAKSHINAYANA;
    return {
      name: uttara ? "Uttarayana" : "Dakshinayana",
      name_ne: uttara ? "उत्तरायण" : "दक्षिणायण",
      angle,
      ...withVedic(sky, angle, crossing(angle, i === 0), tz),
      is_current: i === 0,
    };
  });
  return {
    timezone: tz,
    latitude: place.latitude,
    southern_hemisphere: place.latitude < 0,
    boundaries,
    ayanas,
    vedic_siddhanta: "surya_siddhanta",
  };
}
