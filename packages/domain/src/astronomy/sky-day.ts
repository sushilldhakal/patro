// A day's panchanga from the sky the app carries: no server call for any date inside the bundled
// years, and the built-in fallback for the rest. This is the first thing a screen reads.
//
// What it makes (all of it derived, nothing stored per day): sunrise and sunset, the tithi,
// nakshatra, yoga and karana at sunrise with the instant each one ends, the paksha, the Moon's and
// the Sun's rashi, the lagna at sunrise and the eight grahas. Boundaries come from the stored index,
// so they are the same instants the server prints; positions come from the stored Chebyshev data.
// Festivals, kundali, dashas and muhurta are not made here (see OFFLINE-ASTRONOMY.md).
//
// Dates are the civil (Gregorian) date at the place. The caller says the place's UTC offset, so a
// phone can pass its own zone and the web app the place the user chose.
import { Sky, type SkyOrigin } from "./sky";
import {
  SIDDHANTA_BODIES,
  grahaAt,
  lagnaAt,
  sunriseSunset,
  tithiAt,
  yogaAt,
  type GrahaAt,
} from "./siddhanta-offline";

export interface SkyDayInput {
  /** Gregorian civil date at the place. */
  year: number;
  month: number;
  day: number;
  latitude: number;
  /** Degrees east. */
  longitude: number;
  /** The place's UTC offset on that day, minutes (Kathmandu 345). The engine returns instants; this is for printing them with `localClock`. */
  utcOffsetMinutes: number;
}

export interface SkyAnga {
  /** 1-based: tithi 1-30, nakshatra 1-27, yoga 1-27, karana 1-60. */
  number: number;
  /** The instant it ends (Julian Day, UT), or null when nothing could say. */
  endJd: number | null;
}

export interface SkyGraha extends GrahaAt {
  body: (typeof SIDDHANTA_BODIES)[number];
  longitude: number;
  /** Degrees per day (negative while retrograde). */
  speed: number;
}

export interface SkyDay {
  sunriseJd: number | null;
  sunsetJd: number | null;
  tithi: SkyAnga & { paksha: "shukla" | "krishna"; withinPaksha: number };
  nakshatra: SkyAnga & { pada: number };
  yoga: SkyAnga;
  karana: SkyAnga;
  moonRashi: number;
  sunRashi: number;
  /** Lagna (rashi 1-12 and degrees) at sunrise. */
  lagna: { rashi: number; longitude: number } | null;
  grahas: SkyGraha[];
  /** Where the numbers came from: bundled or server data, or a built-in fallback. */
  origin: SkyOrigin;
}

/** Julian Day Number of a Gregorian date (Fliegel and Van Flandern), at 12:00 UT. */
export function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Local clock "HH:MM" of a Julian Day (UT) at a UTC offset, or an empty string. */
export function localClock(jdUt: number | null, utcOffsetMinutes: number): string {
  if (jdUt === null) return "";
  const minutes = Math.round((jdUt + 0.5) * 1440 + utcOffsetMinutes);
  const inDay = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`;
}

/**
 * The day's panchanga. `sky` is the system's sky (surya or drik); open it once and ask for the
 * years that are needed with `sky.ensure(...)` first when the date may be outside the bundled ones.
 */
export function skyDay(sky: Sky, input: SkyDayInput): SkyDay | null {
  const { year, month, day, latitude, longitude } = input;
  // 00:00 UT of the civil date; sunriseSunset shifts it to the place's own midnight.
  const dayStartJd = julianDayNumber(year, month, day) - 0.5;
  const source = sky.source;
  const { sunriseJd, sunsetJd } = sunriseSunset(source, dayStartJd, latitude, longitude);
  // A place with no sunrise that day (polar) is read at local noon instead.
  const at = sunriseJd ?? dayStartJd - longitude / 360 + 0.5;
  const positions = sky.positionsAt(at);
  if (positions === null) return null;
  const sun = positions.longitude[0];
  const moon = positions.longitude[1];

  // Stored boundaries when there are any, else the same numbers from the positions.
  const fromPositions = {
    tithi: tithiAt(sun, moon).number - 1,
    nakshatra: grahaAt(moon).nakshatra - 1,
    yoga: yogaAt(sun, moon).number - 1,
    karana: Math.floor(((((moon - sun) % 360) + 360) % 360) / 6),
  };
  const span = (kind: "tithi" | "nakshatra" | "yoga" | "karana"): SkyAnga => ({
    number: (sky.spanAt(kind, at) ?? fromPositions[kind]) + 1,
    endJd: sky.nextBoundary(kind, at)?.jd ?? null,
  });
  const tithi = span("tithi");
  const nakshatra = span("nakshatra");
  const lagnaDegrees = lagnaAt(source, at, latitude, longitude);

  return {
    sunriseJd,
    sunsetJd,
    tithi: {
      ...tithi,
      paksha: tithi.number <= 15 ? "shukla" : "krishna",
      withinPaksha: tithi.number <= 15 ? tithi.number : tithi.number - 15,
    },
    nakshatra: { ...nakshatra, pada: grahaAt(moon).pada },
    yoga: span("yoga"),
    karana: span("karana"),
    moonRashi: grahaAt(moon).rashi,
    sunRashi: grahaAt(sun).rashi,
    lagna:
      lagnaDegrees === null
        ? null
        : { rashi: Math.floor(lagnaDegrees / 30) + 1, longitude: lagnaDegrees },
    grahas: SIDDHANTA_BODIES.map((body, i) => ({
      body,
      longitude: positions.longitude[i],
      speed: positions.speed[i],
      ...grahaAt(positions.longitude[i]),
    })),
    origin: sky.originAt(at),
  };
}
