/**
 * A बिक्रम सम्वत् reading for instants the offline table cannot reach.
 *
 * `lib/bs-calendar` carries a compiled table of month starts for बि.सं.
 * 1700–2200 and is authoritative inside it. Past the end it has nothing to say,
 * and {@link adToBS} pins to the last month start — which is why the 3D sky's
 * clock froze at २२०० चैत the moment the simulation ran past AD 2144 while the
 * day number kept climbing.
 *
 * Out there the Sun itself is the calendar, which is what it always was. The
 * बिक्रम months *are* the solar rashi: बैशाख begins at मेष संक्रान्ति, the
 * instant the Sun's sidereal longitude crosses 0°, and each month begins at the
 * next 30°. So the month is read straight off the Sun the scene is already
 * computing, the day is how far into that rashi it has travelled at its own
 * rate, and the year is counted in whole solar years from an anchor the table
 * *does* know.
 *
 * This is a **display** reading, marked as approximate wherever it is shown:
 * the true panchanga resolves a sankranti to the second and applies the day's
 * own rules for which civil day it belongs to. It is honest about the year and
 * the month; the day may sit one either side of the almanac's.
 *
 * Note that this drifts against the Gregorian calendar on purpose. बिक्रम is a
 * sidereal calendar, so मेष संक्रान्ति stays with the stars while the seasons
 * precess away from it — in ten thousand years बैशाख १ is nowhere near April,
 * and that is not an error.
 */

import {
  BS_MONTH_NAMES,
  BS_SUPPORTED_END_YEAR,
  BS_SUPPORTED_START_YEAR,
  adToBS,
  bsToAD,
} from "@/lib/bs-calendar";
import { daysSinceJ2000 } from "@/lib/sky3d/orbital-model";

/** Sidereal year, days — the Sun's own return to the same star. */
const SIDEREAL_YEAR = 365.256363;

/** Mean solar motion, degrees per day. Only a fallback for the day-of-month. */
const MEAN_SUN_RATE = 360 / SIDEREAL_YEAR;

/**
 * The anchor: a बैशाख १ the table knows, with the day count that goes with it.
 * Everything outside the table is counted in whole solar years from here.
 */
const ANCHOR_BS_YEAR = 2083;
const ANCHOR_DT = daysSinceJ2000(bsToAD(ANCHOR_BS_YEAR, 1, 1));

/** The span the compiled table actually covers, as J2000 day numbers. */
const TABLE_START_DT = daysSinceJ2000(bsToAD(BS_SUPPORTED_START_YEAR, 1, 1));
const TABLE_END_DT = daysSinceJ2000(bsToAD(BS_SUPPORTED_END_YEAR, 12, 1));

export type BikramReading = {
  year: number;
  /** 1 = बैशाख. */
  month: number;
  day: number;
  monthName: string;
  /**
   * True when this came from the Sun rather than the table — the year and month
   * are sound, the day may be a day out.
   */
  approximate: boolean;
};

/**
 * The बिक्रम date for a simulated instant.
 *
 * Inside the table's range the table wins, unchanged. Outside it the reading is
 * derived from `sunLongitude` (sidereal, degrees) and `sunSpeed` (degrees per
 * day, the Sun's true rate — it runs slower near aphelion, which is worth a
 * whole day by the end of a rashi).
 *
 * `civilDay` names which calendar day the instant belongs to, as a UTC
 * midnight. Worth passing whenever the reading is shown against a particular
 * place: {@link adToBS} resolves a mid-day instant on the *device's* calendar,
 * so without it an evening in Kathmandu reads as tomorrow to anyone east of it.
 */
export function bikramFromSun(
  date: Date,
  sunLongitude: number,
  sunSpeed?: number,
  civilDay?: Date,
): BikramReading {
  const dt = daysSinceJ2000(date);
  if (dt >= TABLE_START_DT && dt <= TABLE_END_DT) {
    const table = adToBS(civilDay ?? date);
    return { ...table, approximate: false };
  }

  const lon = ((sunLongitude % 360) + 360) % 360;
  const month = Math.floor(lon / 30) + 1;
  const intoRashi = lon - (month - 1) * 30;
  const rate = sunSpeed && sunSpeed > 0.5 ? sunSpeed : MEAN_SUN_RATE;
  const day = Math.max(1, Math.floor(intoRashi / rate) + 1);

  /* Whole solar years from the anchor. The Sun's own longitude gives the
     fraction of the year already elapsed, so subtracting it leaves an integer
     to round — no accumulation, and it cannot drift out of step with the month
     it is paired with. */
  const elapsed = (dt - ANCHOR_DT) / SIDEREAL_YEAR;
  const year = ANCHOR_BS_YEAR + Math.round(elapsed - lon / 360);

  return {
    year,
    month,
    day,
    monthName: BS_MONTH_NAMES[month - 1] ?? BS_MONTH_NAMES[0],
    approximate: true,
  };
}
