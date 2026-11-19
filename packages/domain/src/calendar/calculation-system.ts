import { AYANAMSHA_MODES, type AyanamshaMode } from "../astronomy/ayanamsha";

/**
 * Which calculation everything relies on — the panchanga, BS months, festivals, साइत
 * and the kundali: a calculation system, drik (the modern ephemeris) or the
 * सूर्य सिद्धान्त, and under drik the reader's ayanamsha (Nepal / Lahiri by default).
 * Independent of language and calendar system.
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

/** Where the ayanamsha is stored (both apps; the name predates the shared store). */
export const AYANAMSHA_STORAGE_KEY = "dhakalPatroAyanamshaMode";

/** New installs use the Nepal Panchang ayanamsha (Lahiri). */
export const DEFAULT_AYANAMSHA: AyanamshaMode = "nepal";
/** The API's query parameter for the drik ayanamsha, sent only when it is not Lahiri. */
export const AYANAMSHA_QUERY_PARAM = "ayanamsha";

export function parseStoredAyanamsha(raw: string | null | undefined): AyanamshaMode | null {
  return raw && AYANAMSHA_MODES.some((m) => m.id === raw) ? (raw as AyanamshaMode) : null;
}

export function parseStoredCalculationSystem(raw: string | null | undefined): CalculationSystem | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase().replace(/-/g, "_");
  return value === "drik" || value === "surya_siddhanta" ? value : null;
}

let current: CalculationSystem = DEFAULT_CALCULATION_SYSTEM;
let currentAyanamsha: AyanamshaMode = DEFAULT_AYANAMSHA;
const listeners = new Set<() => void>();
let persist: (system: CalculationSystem) => void = () => {};
let persistAyanamsha: (mode: AyanamshaMode) => void = () => {};

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

/** The drik ayanamsha the reader chose (the Surya Siddhanta has its own and ignores it). */
export function getAyanamsha(): AyanamshaMode {
  return currentAyanamsha;
}

/** Update, notify the same subscribers as the system (it is part of the calculation), and persist. */
export function setAyanamsha(next: AyanamshaMode): void {
  if (next !== currentAyanamsha) {
    currentAyanamsha = next;
    for (const listener of [...listeners]) listener();
  }
  try {
    persistAyanamsha(next);
  } catch {
    // Persistence is best-effort; the in-memory value is already updated.
  }
}

export function configureAyanamshaPersistence(opts: { persist: (mode: AyanamshaMode) => void }): void {
  persistAyanamsha = opts.persist;
}

/** The engine mode an ayanamsha name stands for: "nepal" is Lahiri (as on the API). */
function ayanamshaEngineMode(mode: AyanamshaMode): Exclude<AyanamshaMode, "nepal"> {
  return mode === "nepal" ? "lahiri" : mode;
}

export type Calculation = { system: CalculationSystem; ayanamsha: AyanamshaMode };

export function getCalculation(): Calculation {
  return { system: current, ayanamsha: currentAyanamsha };
}

/**
 * The whole calculation as one id, the same the API keys its caches on:
 * `drik` (drik with Lahiri / Nepal), `drik.kp`, `surya_siddhanta`.
 */
export function calculationKey(calculation: Calculation = getCalculation()): string {
  if (calculation.system !== "drik") return calculation.system;
  const mode = ayanamshaEngineMode(calculation.ayanamsha);
  return mode === "lahiri" ? "drik" : `drik.${mode}`;
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
  return withQueryParam(url, CALCULATION_SYSTEM_QUERY_PARAM, system);
}

/** `url` with `name=value` added before any `#fragment`, unless the URL already names `name`. */
function withQueryParam(url: string, name: string, value: string): string {
  if (new RegExp(`[?&]${name}=`).test(url)) return url;
  const hash = url.indexOf("#");
  const base = hash === -1 ? url : url.slice(0, hash);
  const fragment = hash === -1 ? "" : url.slice(hash);
  return `${base}${base.includes("?") ? "&" : "?"}${name}=${value}${fragment}`;
}

/**
 * `url` with the whole calculation in it: `siddhanta=` unless drik, and under drik
 * `ayanamsha=` unless Lahiri — each only when the URL does not already name one
 * (a kundali request names its ayanamsha itself). In the URL, so the CDN and the
 * app's offline store key every calculation apart.
 */
export function withCalculation(url: string, calculation: Calculation = getCalculation()): string {
  const withSystem = withCalculationSystem(url, calculation.system);
  if (calculation.system !== "drik") return withSystem;
  const mode = ayanamshaEngineMode(calculation.ayanamsha);
  return mode === "lahiri" ? withSystem : withQueryParam(withSystem, AYANAMSHA_QUERY_PARAM, mode);
}
