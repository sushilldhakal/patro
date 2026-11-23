// One way to ask for Surya Siddhanta positions, whatever the source is.
//
// The normal path is the server: the phone fetches the year's STAB slice
// and reads positions out of it. The fallback is the bundled CHEB file
// (Chebyshev coefficients, shipped with the app): if the server is slow or
// unreachable, the same derivations run on the coefficients instead.
// Nothing here changes what a screen shows — it only decides where the
// positions come from. Kundali, dashas, muhurta, gochar and festivals stay
// server-side; this fallback covers the day panchanga only.
import {
  jdFromUnixMs,
  parseSiddhantaTable,
  stabSource,
  type PositionSource,
  type SiddhantaPositions,
  type SiddhantaTable,
} from "./siddhanta-offline";
import {
  chebPositionsAt,
  parseChebTable,
  type ChebScalars,
  type ChebTable,
} from "./chebyshev";

/** A CHEB coefficient table as a source. */
export function chebSource(table: ChebTable, scalars?: ChebScalars): PositionSource {
  return { positionsAt: (jdUt) => chebPositionsAt(table, jdUt, scalars) };
}

export type { PositionSource, SiddhantaPositions };

export interface SiddhantaSourceOptions {
  /** Server base URL, e.g. the app's API_BASE. */
  baseUrl: string;
  /** How long to wait for the slice before falling back (default 8000 ms). */
  timeoutMs?: number;
  /** The app's bundled CHEB bytes, if it ships the fallback file. */
  bundledCheb?: () => Promise<Uint8Array>;
  /** Overridable for tests. */
  fetchImpl?: typeof fetch;
}

export type SiddhantaSourceVia = "server" | "bundled";

/**
 * Positions for `jdUt`: the server's slice for the year, unless the server
 * is slow (past `timeoutMs`), errors, or is unreachable — then the bundled
 * CHEB file, if the app ships one. Throws when both are unavailable.
 */
export async function loadSiddhantaSource(
  jdUt: number,
  options: SiddhantaSourceOptions,
): Promise<{ source: PositionSource; via: SiddhantaSourceVia }> {
  const year = new Date((jdUt - 2440587.5) * 86_400_000).getUTCFullYear();
  const fromJd = jdFromUnixMs(Date.UTC(year, 0, 1));
  const toJd = jdFromUnixMs(Date.UTC(year + 1, 0, 1));
  const timeoutMs = options.timeoutMs ?? 8000;
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = `${options.baseUrl.replace(/\/$/, "")}/v1/siddhanta/table?from_jd=${fromJd}&to_jd=${toJd}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      throw new Error(`siddhanta slice answered ${response.status}`);
    }
    const table = parseSiddhantaTable(new Uint8Array(await response.arrayBuffer()));
    return { source: stabSource(table), via: "server" };
  } catch (error) {
    if (!options.bundledCheb) {
      throw error;
    }
    const table = parseChebTable(await options.bundledCheb());
    return { source: chebSource(table), via: "bundled" };
  }
}
