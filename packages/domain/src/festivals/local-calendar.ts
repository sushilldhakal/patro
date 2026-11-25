// The calendar a phone or browser answers by itself: the festival routes made from the bundled sky
// (see festival-payloads.ts). An app builds one with its own sky loader and off switch and hands it
// to the API client; every method returns null rather than throwing, and null means "ask the server".
// The payload code and the rule book load on first use (a dynamic import), never at launch.
import { drikAyanamshaOf, type DrikAyanamsha } from "../astronomy/ayanamsha-modes";
import type { Sky, SkySystem } from "../astronomy/sky";
import type { FestivalPlace, FestivalSkies } from "./festival-payloads";

/** The place fields a request carries (the API client's LocationParams). */
export interface LocalPlaceQuery {
  city_id?: number;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
}

export interface LocalListingQuery {
  year: number;
  era: string;
  month?: number;
  tradition?: string;
  language?: string;
}

export interface LocalMonthQuery {
  year: number;
  month: number;
  era: string;
  excludeInternational?: boolean;
  language?: string;
  /** `full=true`: every row carries the day's panchanga (Surya only; null for the server otherwise). */
  full?: boolean;
  /** `slim=true` with `full`: the blocks a month view does not read are left out. */
  slim?: boolean;
}

/** The day a rashifal reads (the same ways a day is named) and its window. */
export interface LocalRashifalQuery {
  date?: string;
  inputEra?: string;
  year?: number;
  month?: number;
  day?: number;
  jd?: number;
  /** No day named: today at the place. */
  today?: boolean;
  era?: string;
  language?: string;
  period: string;
}

/** A birth moment: a civil day in `era` and the clock on the birth zone's wall (12:00 when absent). */
export interface LocalBirth {
  era: string;
  year: number;
  month: number;
  day: number;
  clock?: string;
  tz: string;
}
export interface LocalPersonalRashifalQuery extends LocalRashifalQuery {
  birth: LocalBirth;
  birthLat: number;
  birthLon: number;
  /** When the dasha is read, as a Julian Day (UT); now when absent. */
  asOfJd?: number;
}
export interface LocalJanmaQuery {
  birth: LocalBirth;
  era?: string;
  language?: string;
}

/** A kundali route (`/kundali/vimshottari`, `/kundali/dasha/expand`, `/shadbala`, `/kundali/detail`): the moment, read at the request's place. */
export type LocalKundaliQuery =
  | { route: "vimshottari" | "shadbala" | "detail"; moment: import("../jyotish/kundali/engine").KundaliMoment; cycles?: number; ayanamsha?: string; era?: string; language?: string }
  | { route: "expand"; lord: string; start: string; end: string; system?: string };

/** One of the gochar routes: a day (`date` or `jd`), the BS year summary (`year`), a timeline (`from`/`to`), a graha year (`graha` + `year`) or graha sthiti (`sthiti`). */
export interface LocalGocharQuery {
  date?: string;
  jd?: number;
  year?: number;
  graha?: "asta" | "vakri";
  from?: string;
  to?: string;
  level?: string;
  grahas?: string;
  sthiti?: string;
  upcoming?: boolean;
  /** Only when the request names an era is the answer rendered for it (the server's era layer). */
  era?: string;
  language?: string;
}

export type LocalElementQuery =
  | { route: "list" }
  | { route: "day"; name: string; date: string; era: string; language?: string }
  | { route: "month"; name: string; year: number; month: number }
  | { route: "spans"; name: string; era: string; year: number; month: number; language?: string };

export interface LocalCalendar {
  /** A BS month grid (lite), or null for the server. */
  month(q: LocalMonthQuery, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  /** The scored rashifal for a day's window (`/panchanga/rashifal`), or null for the server. */
  rashifal(q: LocalRashifalQuery, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  /** The rashifal read against one birth chart (`/panchanga/rashifal/personal`), or null for the server. */
  personalRashifal(q: LocalPersonalRashifalQuery, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  /** The birth Moon's nakshatra and rashi (`/panchanga/rashifal/janma`), or null for the server. */
  janma(q: LocalJanmaQuery, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  /** The sait listings (`/nepal/sait/{year}/{category}` and `/month/{m}`), or null for the server. */
  sait(
    q: {
      year: number;
      category?: string;
      month?: number;
      /** The detail route: each day's window; the rules switched off and the bratabandha nakshatra mode. */
      detail?: { exclude?: string[]; nakshatraMode?: string };
      /** The personalize route: the days read against one birth chart. */
      personalize?: import("./sait-routes").SaitBirth;
      era?: string;
      language?: string;
    },
    location?: LocalPlaceQuery,
  ): Promise<Record<string, unknown> | null>;
  /** The gochar routes (transit table, ingress timelines, year summary, graha asta/vakri, graha sthiti), or null for the server. */
  gochar(q: LocalGocharQuery, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  /** The lite grid alone (what `month` builds on). */
  liteMonth(q: LocalMonthQuery, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  festivals(q: LocalListingQuery, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  holidays(q: LocalListingQuery, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  upcoming(
    q: { days: number; limit: number; holidaysOnly: boolean },
    location?: LocalPlaceQuery,
  ): Promise<Record<string, unknown> | null>;
  /** A day's panchanga (`/panchanga/{date}`, Surya Siddhanta, a known city or the default place), or null for the server. */
  day(q: { date?: string; inputEra?: string; jd?: number; today?: boolean; era: string; language?: string; detail?: boolean; slim?: boolean; festivals?: boolean; midnight?: boolean; civil?: boolean }, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  /** The panchanga at a clock on a civil day (`/panchanga/at-time?clock=` with `jd`, a typed date or today), or null for the server. */
  atTime(q: { jd?: number; date?: string; inputEra?: string; today?: boolean; clock: string; era?: string; language?: string; ayanamsha?: string }, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  /** The sunrise / sunset / ayana grid of a BS year (`/panchanga/year/{year}/sun`), or null for the server. */
  yearSun(q: { year: number; era: string; language?: string }, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  /** The year wheel's payload (`/panchanga/year/{year}?wheel=true`, a BS year), or null for the server. */
  yearWheel(q: { year: number; era: string }, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  /** An element route (`/panchanga/element/...`, `/panchanga/elements`, Surya Siddhanta), or null for the server. */
  element(q: LocalElementQuery, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  /** The printable patro month (`/nepal/patro/{y}/{m}`, the default format), or null for the server. */
  patro(q: { year: number; month: number }, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  /** A graha year route (`/nepal/panchak/year/{year}`), or null for the server. */
  grahaYear(q: { kind: "panchak"; year: number; era: string; language?: string }, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  /** A kundali route made on the device, or null for the server. */
  kundali(q: LocalKundaliQuery, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  /** The eclipses of a year (Surya Siddhanta only), or null for the server. */
  eclipse(q: { kind: "solar" | "lunar"; year: number; era: string; language?: string }, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
}

/** The shared store a month may be read from and offered to (the server's `/v1/shared/month/{key}`). */
export interface SharedMonthStore {
  /** The stored month, "miss" when the server has none yet, "error" when it could not be asked. */
  get(key: string): Promise<Record<string, unknown> | "miss" | "error">;
  /** Offers a month other devices at the same place can reuse. Fire and forget. */
  put(key: string, body: string): void;
}

export interface LocalCalendarOptions {
  /** Shared results: asked before working a month out, offered one after. Optional. */
  shared?: SharedMonthStore;
  /** The app's sky of one system, opened once. */
  loadSky: (system: SkySystem) => Promise<Sky>;
  /** The calculation the request is for, read on every call (the app's choice); null sends it to the server. */
  system: () => { system: SkySystem; ayanamsha: DrikAyanamsha } | null;
  /** Read on every call: false sends every request to the server (the kill switch). */
  enabled: () => boolean;
  /** For a breadcrumb; never rethrown. */
  onError?: (error: unknown) => void;
}

/** Cities a request names by id: the default and the popular list, and every city the app has been sent. */
const CITIES = new Map<number, FestivalPlace>([
  [1283240, { latitude: 27.70169, longitude: 85.3206, timeZone: "Asia/Kathmandu", cityId: 1283240, cityName: "Kathmandu" }], // Kathmandu (the default)
  [1282898, { latitude: 28.26689, longitude: 83.96851, timeZone: "Asia/Kathmandu", cityId: 1282898, cityName: "Pokhara" }],
  [1283613, { latitude: 27.68027, longitude: 84.43647, timeZone: "Asia/Kathmandu", cityId: 1283613, cityName: "Bharatpur" }],
  [1282931, { latitude: 27.67658, longitude: 85.31417, timeZone: "Asia/Kathmandu", cityId: 1282931, cityName: "Pātan" }],
  [1283582, { latitude: 26.45505, longitude: 87.27007, timeZone: "Asia/Kathmandu", cityId: 1283582, cityName: "Biratnagar" }],
  [1283562, { latitude: 27.70055, longitude: 83.44836, timeZone: "Asia/Kathmandu", cityId: 1283562, cityName: "Butwāl" }],
  [1283460, { latitude: 26.81436, longitude: 87.27972, timeZone: "Asia/Kathmandu", cityId: 1283460, cityName: "Dharān" }],
  [6941099, { latitude: 28.05, longitude: 81.61667, timeZone: "Asia/Kathmandu", cityId: 6941099, cityName: "Nepalgunj" }],
  [1283095, { latitude: 28.96399, longitude: 80.17715, timeZone: "Asia/Kathmandu", cityId: 1283095, cityName: "Bhimdatta" }],
  [1275339, { latitude: 19.07283, longitude: 72.88261, timeZone: "Asia/Kolkata", cityId: 1275339, cityName: "Mumbai" }],
  [1273294, { latitude: 28.65195, longitude: 77.23149, timeZone: "Asia/Kolkata", cityId: 1273294, cityName: "Delhi" }],
  [5128581, { latitude: 40.71427, longitude: -74.00597, timeZone: "America/New_York", cityId: 5128581, cityName: "New York City" }],
  [2147714, { latitude: -33.86785, longitude: 151.20732, timeZone: "Australia/Sydney", cityId: 2147714, cityName: "Sydney" }],
]);

/** Keeps a city's coordinates (from a city search, nearest or popular answer) so a later request naming its id is answered here. */
export function rememberCity(city: { id?: unknown; lat?: unknown; lon?: unknown; timezone?: unknown; name?: unknown }): void {
  const { id, lat, lon, timezone } = city;
  if (typeof id !== "number" || typeof lat !== "number" || typeof lon !== "number" || typeof timezone !== "string") return;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !timezone) return;
  if (CITIES.size > 2000) return;
  const name = (city as { name?: unknown }).name;
  CITIES.set(id, { latitude: lat, longitude: lon, timeZone: timezone, cityId: id, cityName: typeof name === "string" ? name : undefined });
}

/**
 * The place a request means, as the server resolves it: a city id first (its stored coordinates),
 * then coordinates with a zone. A city it does not know, or a bare name, goes to the server.
 */
function placeOf(location: LocalPlaceQuery | undefined, kathmandu: FestivalPlace): FestivalPlace | null {
  if (!location) return kathmandu;
  if (location.city_id != null) return CITIES.get(Number(location.city_id)) ?? null;
  if (location.city) return null;
  const { lat, lon } = location;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  // A link with coordinates but no zone: Nepal's box is Nepal time; elsewhere the server finds the zone.
  const inNepal = lat >= 26.3 && lat <= 30.5 && lon >= 80 && lon <= 88.3;
  const timezone = location.timezone || (inNepal ? "Asia/Kathmandu" : null);
  if (!timezone) return null;
  return { latitude: lat, longitude: lon, timeZone: timezone };
}

/**
 * A coordinate place's name, as the server's nearest-town lookup gives it: the nearest city the
 * device knows within 25 km, otherwise the coordinates themselves.
 */
export function coordinateName(place: { latitude: number; longitude: number }): string {
  const rad = Math.PI / 180;
  let best: { name: string; km: number } | null = null;
  for (const city of CITIES.values()) {
    if (!city.cityName) continue;
    const dLat = (city.latitude - place.latitude) * rad;
    const dLon = (city.longitude - place.longitude) * rad * Math.cos(place.latitude * rad);
    const km = 6371 * Math.hypot(dLat, dLon);
    if (km <= 25 && (!best || km < best.km)) best = { name: city.cityName, km };
  }
  return best?.name ?? `${place.latitude.toFixed(2)}°, ${place.longitude.toFixed(2)}°`;
}

const MONTHS = new Map<string, Record<string, unknown>>();
function remember(key: string, month: Record<string, unknown>): void {
  MONTHS.delete(key);
  MONTHS.set(key, month);
  while (MONTHS.size > 36) MONTHS.delete(MONTHS.keys().next().value as string);
}

const cell = (negative: string, positive: string, value: number) =>
  `${value < 0 ? negative : positive}${Math.abs(Math.round(value * 100))}`;

/** `{system}-{ayanamsha}.{bsYear}.{month}.{lat}.{lon}.{flags}`: letters, digits, `-`, `_` and `.` only. */
function monthKey(calc: { system: SkySystem; ayanamsha: DrikAyanamsha }, q: LocalMonthQuery, lat: number, lon: number): string {
  const system = calc.system === "surya" ? "surya" : `drik-${calc.ayanamsha}`;
  return [system, q.year, q.month, cell("s", "n", lat), cell("w", "e", lon), q.excludeInternational ? "x1" : "x0"].join(".");
}

function looksLikeMonth(v: Record<string, unknown>, q: LocalMonthQuery): boolean {
  return v.year_bs === q.year && v.month_bs === q.month && Array.isArray(v.calendar) && v.calendar.length === v.month_length;
}

export function makeLocalCalendar(options: LocalCalendarOptions): LocalCalendar {
  const run = async (
    location: LocalPlaceQuery | undefined,
    make: (m: typeof import("./festival-payloads"), skies: FestivalSkies, place: FestivalPlace) => Record<string, unknown> | null | Promise<Record<string, unknown> | null>,
  ): Promise<Record<string, unknown> | null> => {
    if (!options.enabled()) return null;
    try {
      const m = await import("./festival-payloads");
      const place = placeOf(location, m.KATHMANDU_PLACE);
      if (!place) return null;
      const calc = options.system();
      if (calc === null) return null;
      const surya = await options.loadSky("surya");
      const sky = calc.system === "surya" ? surya : (await options.loadSky("drik")).withAyanamsha(calc.ayanamsha);
      return await make(m, { sky, surya }, place);
    } catch (error) {
      options.onError?.(error);
      return null;
    }
  };
  /**
   * The reader's sky (Surya, or Drik in the reader's ayanamsha), the Surya sky (the civil grid and the
   * solar festival rules always read it) and the place the device can answer for (the default, or a
   * known city), or null for the server.
   */
  const surya = async (location?: LocalPlaceQuery, ayanamsha?: string) => {
    if (!options.enabled()) return null;
    // A request that names an ayanamsha is read in it, from the Drik sky (the Surya Siddhanta has none).
    const named = ayanamsha ? drikAyanamshaOf(ayanamsha) : null;
    if (ayanamsha && !named) return null;
    const calc = named ? { system: "drik" as const, ayanamsha: named } : options.system();
    if (calc === null) return null;
    // A known city, or any coordinate pair with its time zone: the device computes it (the server is
    // only a lookup). Without a time zone placeOf gives null and the server answers.
    const m = await import("./festival-payloads");
    const found = placeOf(location, m.KATHMANDU_PLACE);
    if (!found) return null;
    const snap = (v: number) => (location ? Math.round(v * 100) / 100 : v);
    const suryaSky = await options.loadSky("surya");
    const sky = calc.system === "surya" ? suryaSky : (await options.loadSky("drik")).withAyanamsha(calc.ayanamsha);
    return {
      sky,
      surya: suryaSky,
      place: { latitude: snap(found.latitude), longitude: snap(found.longitude), timeZone: found.timeZone, name: found.cityName ?? (location ? coordinateName(found) : "Kathmandu"), ...(found.cityId !== undefined ? { cityId: found.cityId } : {}) },
    };
  };

  /** The civil day (JDN) a request names: a Julian Day, today at the place, or a date in the era it is written in. */
  const namedJdn = async (
    q: { date?: string; inputEra?: string; jd?: number; today?: boolean; year?: number; month?: number; day?: number; era?: string },
    zone: string,
  ): Promise<number | null> => {
    const { jdnFromIso, bsToJdn } = await import("../astronomy/lunar-month");
    if (q.jd !== undefined) return Math.floor(q.jd + 0.5);
    if (q.today) {
      const { wallIn } = await import("../panchanga/engine/instant");
      return jdnFromIso(wallIn(Date.now() / 86_400_000 + 2_440_587.5, zone).iso.slice(0, 10));
    }
    const era = q.inputEra ?? q.era ?? "bs";
    if (q.year !== undefined && q.month !== undefined && q.day !== undefined) {
      const pad = (n: number) => String(n).padStart(2, "0");
      if (era === "ad") return jdnFromIso(`${String(q.year).padStart(4, "0")}-${pad(q.month)}-${pad(q.day)}`);
      return era === "bs" ? bsToJdn(q.year, q.month, q.day) : null;
    }
    if (q.date === undefined) return null;
    if (era === "ad") return jdnFromIso(q.date);
    if (era === "bs") {
      const [y, mo, d] = q.date.split("-").map(Number);
      return bsToJdn(y, mo, d);
    }
    return null;
  };

  const FULL_MONTHS = new Map<string, Record<string, unknown>>();

  const calendar: LocalCalendar = {
    month: async (q, location) => {
      const lite = await calendar.liteMonth(q, location);
      if (!lite || !q.full) return lite;
      try {
        const lat = (lite.location as { lat?: number }).lat;
        const lon = (lite.location as { lon?: number }).lon;
        const calc = options.system();
        if (!calc) return null;
        const key = `${monthKey(calc, q, lat ?? 0, lon ?? 0)}.${q.slim ? "slim" : "full"}.${q.era}.${q.language ?? ""}.${(lite.location as { city_id?: number }).city_id ?? ""}`;
        const memo = FULL_MONTHS.get(key);
        if (memo) return memo;
        const suryaSky = await options.loadSky("surya");
        const sky = calc.system === "surya" ? suryaSky : (await options.loadSky("drik")).withAyanamsha(calc.ayanamsha);
        const { fullMonth } = await import("../panchanga/engine/month-full");
        const made = fullMonth(sky, suryaSky, lite, { slim: q.slim, era: q.era });
        if (!made) return null;
        FULL_MONTHS.delete(key);
        FULL_MONTHS.set(key, made);
        while (FULL_MONTHS.size > 4) FULL_MONTHS.delete(FULL_MONTHS.keys().next().value as string);
        return made;
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    liteMonth: async (q, location) => {
      if (q.era === "ad" || q.era === "bc") {
        // A Gregorian month is the same rows over the civil days of that month, each with its BS date.
        const calc = options.system();
        if (calc === null) return null;
        return run(location, async (_m, skies, place) => {
          const lat = Math.round(place.latitude * 100) / 100;
          const lon = Math.round(place.longitude * 100) / 100;
          const key = `${monthKey(calc, q, lat, lon)}.${q.era}`;
          const echo = {
            lat,
            lon,
            timezone: place.timeZone,
            name: place.cityName ?? (place.cityId !== undefined ? "" : "Kathmandu"),
            ...(place.cityId !== undefined ? { city_id: place.cityId } : {}),
          };
          const memo = MONTHS.get(key);
          const finish = (shared: Record<string, unknown>) => ({ ...shared, location: echo, language: q.language === "en" || q.language === "ne" ? q.language : "en" });
          if (memo) return finish(memo);
          const { skyGregorianMonth } = await import("../astronomy/sky-month");
          const made = skyGregorianMonth(skies, { year: q.year, month: q.month, era: q.era as "ad" | "bc", excludeInternational: q.excludeInternational, language: q.language, place: { latitude: lat, longitude: lon, timeZone: place.timeZone } });
          if (!made) return null;
          const { location: _l, language: _g, ...shareable } = made;
          remember(key, shareable);
          return finish(shareable);
        });
      }
      if (q.era !== "bs") return null;
      const calc = options.system();
      if (calc === null) return null;
      return run(location, async (_m, skies, place) => {
        // Every device at the same place makes the same bytes: the place is snapped to 0.01 degree
        // (about a kilometre, two seconds of sunrise) and what differs between callers (the
        // location echo, the language) is left out of what is shared and put back after.
        const lat = Math.round(place.latitude * 100) / 100;
        const lon = Math.round(place.longitude * 100) / 100;
        const key = monthKey(calc, q, lat, lon);
        const echo = {
          lat,
          lon,
          timezone: place.timeZone,
          name: place.cityName ?? (place.cityId !== undefined ? "" : "Kathmandu"),
          ...(place.cityId !== undefined ? { city_id: place.cityId } : {}),
        };
        const finish = (shared: Record<string, unknown>) => ({
          ...shared,
          location: echo,
          language: q.language === "en" || q.language === "ne" ? q.language : "ne",
        });
        const memo = MONTHS.get(key);
        if (memo) return finish(memo);
        let missed = false;
        if (options.shared) {
          const hit = await options.shared.get(key).catch(() => "error" as const);
          if (hit !== "miss" && hit !== "error" && looksLikeMonth(hit, q)) {
            remember(key, hit);
            return finish(hit);
          }
          missed = hit === "miss";
        }
        const { skyMonth } = await import("../astronomy/sky-month");
        const made = skyMonth(skies, {
          bsYear: q.year,
          bsMonth: q.month,
          excludeInternational: q.excludeInternational,
          language: q.language,
          place: { latitude: lat, longitude: lon, timeZone: place.timeZone },
        });
        if (!made) return null;
        const { location: _l, language: _g, ...shareable } = made;
        remember(key, shareable);
        if (missed && options.shared) {
          try {
            options.shared.put(key, JSON.stringify(shareable));
          } catch {
            // Offering a result is best effort.
          }
        }
        return finish(shareable);
      });
    },
    festivals: (q, location) => run(location, (m, skies, place) => m.festivalListingPayload(skies, place, q)),
    holidays: (q, location) => run(location, (m, skies, place) => m.holidayListingPayload(skies, place, q)),
    upcoming: (q, location) => run(location, (m, skies, place) => m.upcomingFestivalsPayload(skies, place, q)),
    day: async (q, location) => {
      try {
        const ctx = await surya(location);
        if (!ctx) return null;
        const { civilFromJdn } = await import("../astronomy/lunar-month");
        const jdn = await namedJdn(q, ctx.place.timeZone);
        if (jdn === null || jdn === undefined) return null;
        const day = civilFromJdn(jdn);
        const { dayResponse } = await import("../panchanga/engine/day-response");
        return dayResponse(
          ctx.sky,
          { year: day.year, month: day.month, day: day.day, ...ctx.place },
          { era: q.era, language: q.language, detail: q.detail, slim: q.slim, festivals: q.festivals ? { surya: ctx.surya } : undefined, midnight: q.midnight, civil: q.civil, surya: ctx.surya },
        );
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    yearSun: async (q, location) => {
      // The year in the path is the BS year; another era's reading of it is the server's.
      if (q.era !== "bs") return null;
      try {
        const ctx = await surya(location);
        if (!ctx) return null;
        const { yearSunTimes } = await import("../panchanga/engine/year");
        return yearSunTimes(ctx.sky, q.year, ctx.place, { era: q.era, language: q.language });
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    yearWheel: async (q, location) => {
      if (q.era !== "bs" && q.era !== "ad") return null;
      try {
        const ctx = await surya(location);
        if (!ctx) return null;
        const { yearWheel } = await import("../panchanga/engine/year");
        // The request names an era only for BS (the app's `yearWheelRequestPath`); the response is rendered for it then.
        return yearWheel(ctx.sky, q.year, ctx.place, q.era === "bs" ? { era: "bs" } : undefined);
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    element: async (q, location) => {
      try {
        const ctx = await surya(location);
        if (!ctx) return null;
        const el = await import("../panchanga/engine/element");
        if (q.route === "list") return el.elementsList();
        if (q.route === "month") return el.elementMonth(ctx.sky, q.name, q.year, q.month, ctx.place);
        if (q.route === "spans") {
          const window = el.eraMonthWindow(q.era, q.year, q.month);
          return window ? el.elementSpans(ctx.sky, q.name, window[0], window[1], ctx.place, { era: q.era, language: q.language }) : null;
        }
        if (q.era !== "ad") return null;
        const { jdnFromIso, civilFromJdn } = await import("../astronomy/lunar-month");
        const jdn = jdnFromIso(q.date);
        if (jdn === null) return null;
        const day = civilFromJdn(jdn);
        return el.elementDay(ctx.sky, q.name, { year: day.year, month: day.month, day: day.day, ...ctx.place }, { era: q.era, language: q.language });
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    atTime: async (q, location) => {
      try {
        const ctx = await surya(location, q.ayanamsha);
        if (!ctx) return null;
        const { civilFromJdn } = await import("../astronomy/lunar-month");
        const jdn = await namedJdn(q, ctx.place.timeZone);
        if (jdn === null) return null;
        const day = civilFromJdn(jdn);
        const { atTimeResponse } = await import("../panchanga/engine/at-time");
        return atTimeResponse(ctx.sky, { year: day.year, month: day.month, day: day.day, ...ctx.place }, { clock: q.clock, era: q.era, language: q.language, surya: ctx.surya });
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    rashifal: async (q, location) => {
      try {
        const period = q.period as import("../jyotish/rashifal/engine").Period;
        if (!["daily", "weekly", "monthly", "yearly"].includes(period)) return null;
        const ctx = await surya(location);
        if (!ctx) return null;
        const jdn = await namedJdn(q, ctx.place.timeZone);
        if (jdn === null) return null;
        const { rashifalForDay } = await import("../jyotish/rashifal/engine");
        const payload = rashifalForDay(ctx.sky, jdn, ctx.place, period);
        if (!payload) return null;
        const { renderForEra, eraLanguage } = await import("../panchanga/engine/era-render");
        return q.era ? renderForEra(payload, q.era, q.language ?? eraLanguage(q.era)) : payload;
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    sait: async (q, location) => {
      try {
        const ctx = await surya(location);
        if (!ctx) return null;
        const r = await import("./sait-routes");
        const payload =
          q.month !== undefined
            ? r.saitMonthAll(ctx.sky, q.year, q.month, ctx.place)
            : !q.category
              ? null
              : q.personalize
                ? r.saitPersonalize(ctx.sky, q.year, q.category, ctx.place, q.personalize)
                : q.detail
                  ? r.saitDetail(ctx.sky, q.year, q.category, ctx.place, q.detail)
                  : r.saitMonthEntries(ctx.sky, q.year, q.category, ctx.place);
        if (!payload) return null;
        const { renderForEra, eraLanguage } = await import("../panchanga/engine/era-render");
        return q.era ? renderForEra(payload, q.era, q.language ?? eraLanguage(q.era)) : payload;
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    personalRashifal: async (q, location) => {
      try {
        const period = q.period as import("../jyotish/rashifal/engine").Period;
        if (!["daily", "weekly", "monthly", "yearly"].includes(period)) return null;
        const ctx = await surya(location);
        if (!ctx) return null;
        const jdn = await namedJdn(q, ctx.place.timeZone);
        if (jdn === null) return null;
        const e = await import("../jyotish/rashifal/engine");
        const moment = e.birthMoment(q.birth, { lat: q.birthLat, lon: q.birthLon });
        if (!moment) return null;
        const natal = e.castNatal(ctx.sky, moment.utc, moment.wall, moment.zone, q.birthLat, q.birthLon);
        if (!natal) return null;
        const asOf = q.asOfJd ?? Date.now() / 86_400_000 + 2_440_587.5;
        const payload = e.personalRashifalForDay(ctx.sky, natal, jdn, ctx.place, period, asOf);
        if (!payload) return null;
        const { renderForEra, eraLanguage } = await import("../panchanga/engine/era-render");
        return q.era ? renderForEra(payload, q.era, q.language ?? eraLanguage(q.era)) : payload;
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    janma: async (q, location) => {
      try {
        const ctx = await surya(location);
        if (!ctx) return null;
        const e = await import("../jyotish/rashifal/engine");
        const moment = e.birthMoment(q.birth);
        if (!moment) return null;
        const payload = e.janma(ctx.sky, moment.utc);
        if (!payload) return null;
        const { renderForEra, eraLanguage } = await import("../panchanga/engine/era-render");
        return q.era ? renderForEra(payload, q.era, q.language ?? eraLanguage(q.era)) : payload;
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    gochar: async (q, location) => {
      try {
        const ctx = await surya(location);
        if (!ctx) return null;
        const g = await import("../panchanga/engine/gochar");
        const { jdnFromIso, bsToJdn } = await import("../astronomy/lunar-month");
        const { renderForEra, eraLanguage } = await import("../panchanga/engine/era-render");
        const where = ctx.place;
        const render = (payload: Record<string, unknown> | null, era: string | undefined) => (payload && era ? renderForEra(payload, era, q.language ?? eraLanguage(era)) : payload);
        const dateKey = (key: string, era: string): number | null => {
          if (era === "ad") return jdnFromIso(key);
          if (era !== "bs") return null;
          const [y, m, d] = key.split("-").map(Number);
          return bsToJdn(y, m, d);
        };
        if (q.sthiti !== undefined) {
          const jdn = dateKey(q.sthiti, q.era ?? "ad");
          return jdn === null ? null : render(g.grahaSthiti(ctx.sky, jdn, where), q.era);
        }
        if (q.graha) {
          const { yearSpanJd, stampYear } = await import("../panchanga/engine/panchak");
          const era = q.era ?? "bs";
          const span = q.year === undefined ? null : yearSpanJd(era, q.year);
          if (!span || q.year === undefined) return null;
          if (q.graha === "vakri") return render(g.grahaVakriSpan(ctx.sky, span[0], span[1], where), q.era);
          return stampYear(g.grahaAstaSpan(ctx.sky, span[0], span[1], where), era, q.year, span, q.language);
        }
        if (q.year !== undefined) return render(g.gocharYear(ctx.sky, q.year, where), q.era);
        if (q.from !== undefined && q.to !== undefined) {
          const era = q.era ?? "ad";
          const a = dateKey(q.from, era);
          const b = dateKey(q.to, era);
          const level = (q.level ?? "pada") as import("../panchanga/engine/gochar").GocharLevel;
          if (a === null || b === null || b < a || !["pada", "nakshatra", "rashi", "patro", "udayast"].includes(level)) return null;
          const names = q.grahas ? q.grahas.split(",").map((n) => n.trim()).filter(Boolean) : undefined;
          if (names && names.some((n) => !g.GRAHA_ALL.includes(n as import("../panchanga/engine/gochar").GrahaKey))) return null;
          return render(g.gocharIngress(ctx.sky, a - 0.5, b - 0.5, where, level, names as import("../panchanga/engine/gochar").GrahaKey[] | undefined), q.era);
        }
        const jdn = q.jd !== undefined ? Math.floor(q.jd + 0.5) : q.date !== undefined ? dateKey(q.date, q.era ?? "bs") : null;
        return jdn === null ? null : render(g.gocharDay(ctx.sky, jdn, where, q.upcoming === true), q.era);
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    kundali: async (q, location) => {
      try {
        const k = await import("../jyotish/kundali/engine");
        if (q.route === "expand") return options.enabled() ? k.dashaExpand(q) : null;
        const ctx = await surya(location, q.ayanamsha);
        if (!ctx) return null;
        const jd = k.momentJd(q.moment, ctx.place.timeZone);
        if (jd === null) return null;
        const echo = { era: q.era, language: q.language };
        if (q.route === "vimshottari") return k.vimshottari(ctx.sky, jd, ctx.place, q.cycles ?? 1, echo);
        if (q.route === "shadbala") return k.shadbalaRoute(ctx.sky, jd, ctx.place, echo);
        if (q.route === "detail") {
          const { kundaliDetail } = await import("../jyotish/kundali/detail-engine");
          const m = q.moment;
          const pad = (n: number) => String(n).padStart(2, "0");
          const date = m.year !== undefined && m.month !== undefined && m.day !== undefined ? `${m.year}-${pad(m.month)}-${pad(m.day)}` : undefined;
          return kundaliDetail(ctx.sky, jd, ctx.place, Date.now() / 86_400_000 + 2440587.5, { ...echo, date });
        }
        return null;
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    eclipse: async (q, location) => {
      // The text's eclipses are the only ones there are: Drik answers 501 on the server, so it goes there.
      if (!options.enabled() || options.system()?.system !== "surya") return null;
      try {
        const m = await import("./festival-payloads");
        const place = placeOf(location, m.KATHMANDU_PLACE);
        if (!place) return null;
        return (await import("./eclipse-payload")).eclipseYearPayload(q, place);
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    grahaYear: async (q, location) => {
      try {
        const ctx = await surya(location);
        if (!ctx) return null;
        const { panchakYear } = await import("../panchanga/engine/panchak");
        return panchakYear(ctx.sky, q.era, q.year, ctx.place, q.language);
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
    patro: async (q, location) => {
      try {
        const ctx = await surya(location);
        if (!ctx) return null;
        // The patro page is the lite month grid under a header the month's middle day gives.
        const month = await calendar.month({ year: q.year, month: q.month, era: "bs" }, location);
        if (!month) return null;
        const pm = await import("../panchanga/engine/patro-month");
        const header = pm.calendarHeader(ctx.sky, q.year, q.month, ctx.place);
        return header ? pm.patroMonth(q.year, q.month, month, header) : null;
      } catch (error) {
        options.onError?.(error);
        return null;
      }
    },
  };
  return calendar;
}

/** The app's calculation (`getCalculation()`) as a sky choice: Surya, or Drik in any ayanamsha the apps offer. */
export function skyChoiceOf(calculation: { system: string; ayanamsha: string }): { system: SkySystem; ayanamsha: DrikAyanamsha } | null {
  if (calculation.system === "surya_siddhanta") return { system: "surya", ayanamsha: "lahiri" };
  if (calculation.system !== "drik") return null;
  const ayanamsha = drikAyanamshaOf(calculation.ayanamsha);
  return ayanamsha ? { system: "drik", ayanamsha } : null;
}
