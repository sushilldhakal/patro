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

export interface LocalCalendar {
  festivals(q: LocalListingQuery, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  holidays(q: LocalListingQuery, location?: LocalPlaceQuery): Promise<Record<string, unknown> | null>;
  upcoming(
    q: { days: number; limit: number; holidaysOnly: boolean },
    location?: LocalPlaceQuery,
  ): Promise<Record<string, unknown> | null>;
}

export interface LocalCalendarOptions {
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
  [1283240, { latitude: 27.70169, longitude: 85.3206, timeZone: "Asia/Kathmandu" }], // Kathmandu (the default)
  [1282898, { latitude: 28.26689, longitude: 83.96851, timeZone: "Asia/Kathmandu" }],
  [1283613, { latitude: 27.68027, longitude: 84.43647, timeZone: "Asia/Kathmandu" }],
  [1282931, { latitude: 27.67658, longitude: 85.31417, timeZone: "Asia/Kathmandu" }],
  [1283582, { latitude: 26.45505, longitude: 87.27007, timeZone: "Asia/Kathmandu" }],
  [1283562, { latitude: 27.70055, longitude: 83.44836, timeZone: "Asia/Kathmandu" }],
  [1283460, { latitude: 26.81436, longitude: 87.27972, timeZone: "Asia/Kathmandu" }],
  [6941099, { latitude: 28.05, longitude: 81.61667, timeZone: "Asia/Kathmandu" }],
  [1283095, { latitude: 28.96399, longitude: 80.17715, timeZone: "Asia/Kathmandu" }],
  [1275339, { latitude: 19.07283, longitude: 72.88261, timeZone: "Asia/Kolkata" }],
  [1273294, { latitude: 28.65195, longitude: 77.23149, timeZone: "Asia/Kolkata" }],
  [5128581, { latitude: 40.71427, longitude: -74.00597, timeZone: "America/New_York" }],
  [2147714, { latitude: -33.86785, longitude: 151.20732, timeZone: "Australia/Sydney" }],
]);

/** Keeps a city's coordinates (from a city search, nearest or popular answer) so a later request naming its id is answered here. */
export function rememberCity(city: { id?: unknown; lat?: unknown; lon?: unknown; timezone?: unknown }): void {
  const { id, lat, lon, timezone } = city;
  if (typeof id !== "number" || typeof lat !== "number" || typeof lon !== "number" || typeof timezone !== "string") return;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !timezone) return;
  if (CITIES.size > 2000) return;
  CITIES.set(id, { latitude: lat, longitude: lon, timeZone: timezone });
}

/**
 * The place a request means, as the server resolves it: a city id first (its stored coordinates),
 * then coordinates with a zone. A city it does not know, or a bare name, goes to the server.
 */
function placeOf(location: LocalPlaceQuery | undefined, kathmandu: FestivalPlace): FestivalPlace | null {
  if (!location) return kathmandu;
  if (location.city_id != null) return CITIES.get(Number(location.city_id)) ?? null;
  if (location.city) return null;
  const { lat, lon, timezone } = location;
  if (typeof lat !== "number" || typeof lon !== "number" || !timezone) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { latitude: lat, longitude: lon, timeZone: timezone };
}

export function makeLocalCalendar(options: LocalCalendarOptions): LocalCalendar {
  const run = async (
    location: LocalPlaceQuery | undefined,
    make: (m: typeof import("./festival-payloads"), skies: FestivalSkies, place: FestivalPlace) => Record<string, unknown> | null,
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
      return make(m, { sky, surya }, place);
    } catch (error) {
      options.onError?.(error);
      return null;
    }
  };
  return {
    festivals: (q, location) => run(location, (m, skies, place) => m.festivalListingPayload(skies, place, q)),
    holidays: (q, location) => run(location, (m, skies, place) => m.holidayListingPayload(skies, place, q)),
    upcoming: (q, location) => run(location, (m, skies, place) => m.upcomingFestivalsPayload(skies, place, q)),
  };
}

/** The app's calculation (`getCalculation()`) as a sky choice: Surya, or Drik in any ayanamsha the apps offer. */
export function skyChoiceOf(calculation: { system: string; ayanamsha: string }): { system: SkySystem; ayanamsha: DrikAyanamsha } | null {
  if (calculation.system === "surya_siddhanta") return { system: "surya", ayanamsha: "lahiri" };
  if (calculation.system !== "drik") return null;
  const ayanamsha = drikAyanamshaOf(calculation.ayanamsha);
  return ayanamsha ? { system: "drik", ayanamsha } : null;
}
