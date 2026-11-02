/**
 * Which calculation the panchanga and kundali rely on: drik (the modern ephemeris)
 * or the सूर्य सिद्धान्त. Independent of language and calendar system.
 *
 * Pure and platform-free, like `calendar-system.ts`: each app stores the value
 * itself and calls `configureCalculationSystemPersistence` once; everything here is
 * an in-memory store with subscribe/notify. The API reads the choice from the
 * `siddhanta` query parameter (apps/api/app/siddhanta_middleware.py).
 */

export type CalculationSystem = "drik" | "surya_siddhanta";

export const CALCULATION_SYSTEMS: readonly CalculationSystem[] = ["drik", "surya_siddhanta"];

/** New installs rely on drik, as every panchanga did before the choice existed. */
export const DEFAULT_CALCULATION_SYSTEM: CalculationSystem = "drik";

/** Where the choice is stored (both apps). */
export const CALCULATION_SYSTEM_STORAGE_KEY = "calculationSystem";

/** The API's query parameter, sent only when the system is not drik. */
export const CALCULATION_SYSTEM_QUERY_PARAM = "siddhanta";

export function parseStoredCalculationSystem(raw: string | null | undefined): CalculationSystem | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase().replace(/-/g, "_");
  return value === "drik" || value === "surya_siddhanta" ? value : null;
}

let current: CalculationSystem = DEFAULT_CALCULATION_SYSTEM;
const listeners = new Set<() => void>();
let persist: (system: CalculationSystem) => void = () => {};

export function getCalculationSystem(): CalculationSystem {
  return current;
}

/** Update, notify subscribers when it changed, and persist (always, so a default pick is stored too). */
export function setCalculationSystem(next: CalculationSystem): void {
  if (!CALCULATION_SYSTEMS.includes(next)) return;
  if (next !== current) {
    current = next;
    for (const listener of [...listeners]) listener();
  }
  try {
    persist(next);
  } catch {
    // Persistence is best-effort; the in-memory value is already updated.
  }
}

export function subscribeCalculationSystem(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function configureCalculationSystemPersistence(opts: { persist: (system: CalculationSystem) => void }): void {
  persist = opts.persist;
}

/**
 * `url` with `siddhanta=<system>` added, unless the system is drik (the API's
 * default) or the URL already names one. The value goes in the URL, not a header,
 * so the CDN and the app's offline store key the two systems apart.
 */
export function withCalculationSystem(url: string, system: CalculationSystem): string {
  if (system === DEFAULT_CALCULATION_SYSTEM) return url;
  if (new RegExp(`[?&]${CALCULATION_SYSTEM_QUERY_PARAM}=`).test(url)) return url;
  const hash = url.indexOf("#");
  const base = hash === -1 ? url : url.slice(0, hash);
  const fragment = hash === -1 ? "" : url.slice(hash);
  return `${base}${base.includes("?") ? "&" : "?"}${CALCULATION_SYSTEM_QUERY_PARAM}=${system}${fragment}`;
}
