// Offline Surya Siddhanta tables: fetch a year's slice once, keep it on the
// device, and let the screen derive panchanga from it locally (see
// `@vedic-patro/domain/astronomy/siddhanta-offline`).
//
// A year's slice is ~26 KB at the table's 12 h step. Slices are cached per
// year under the app's cache directory, so a date the user has already
// opened costs no network at all, and the server never computes a position
// for a day view — it only serves the bytes.
//
// The fallback: `assets/siddhanta.cheb.json` ships the 2026–2035 Chebyshev
// coefficients (55 KB of CHEB, base64 — the snapshot push cannot carry
// binary files) with the app. `loadSiddhantaSourceFor` tries the server's
// slice first and uses the bundled coefficients when the server is slow or
// unreachable, so the day panchanga still shows. The file is regenerated
// when the app ships a new version (`siddhanta-table cheb-build` in
// apps/rust); kundali, dashas, muhurta, gochar and festivals stay
// server-side either way.
//
// This helper takes the API base it fetches from and is NOT wired into any
// screen yet: the Rust server that serves `/v1/siddhanta/table` is
// build-only development work until the owner says otherwise, and the app
// keeps using its configured API base (the Python server) for everything.
// When a server the app already talks to serves the file, a screen can call
// `loadSiddhantaTable` and then `positionsAt` / `tithiAt` / `grahaAt` /
// `lagnaAt` from the domain module instead of `fetchPanchanga`.

import * as FileSystem from "expo-file-system/legacy";

import { API_BASE } from "@/lib/api";
import bundledChebJson from "@/assets/siddhanta.cheb.json";
import {
  parseSiddhantaTable,
  type SiddhantaTable,
} from "@vedic-patro/domain/astronomy/siddhanta-offline";
import {
  loadSiddhantaSource,
  type PositionSource,
  type SiddhantaSourceVia,
} from "@vedic-patro/domain/astronomy/siddhanta-source";

const CACHE_DIR = `${FileSystem.cacheDirectory}siddhanta/`;

/** Julian Day (UT) of 1 January, 00:00 UT, of a Gregorian year. */
export function jan1Jd(year: number): number {
  // Fliegel–Van Flandern, Gregorian calendar.
  const a = Math.floor((14 - 1) / 12);
  const y = year + 4800 - a;
  const m = 1 + 12 * a - 3;
  const jdn = 1 + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32_045;
  return jdn - 0.5;
}

/** Gregorian year containing a Julian Day (UT). */
export function yearOfJd(jdUt: number): number {
  // Search from a nearby guess: JD 2451545.0 is 1 January 2000, 12:00 UT.
  let year = 2000 + Math.floor((jdUt - 2_451_545.0) / 365.25);
  while (jan1Jd(year + 1) <= jdUt) year += 1;
  while (jan1Jd(year) > jdUt) year -= 1;
  return year;
}

async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function readCachedSlice(year: number): Promise<Uint8Array | null> {
  try {
    const info = await FileSystem.getInfoAsync(`${CACHE_DIR}${year}.vtab`);
    if (!info.exists) return null;
    const base64 = await FileSystem.readAsStringAsync(`${CACHE_DIR}${year}.vtab`, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function fetchSlice(year: number, baseUrl: string): Promise<Uint8Array> {
  const fromJd = jan1Jd(year);
  const toJd = jan1Jd(year + 1);
  const url = `${baseUrl}/v1/siddhanta/table?from_jd=${fromJd}&to_jd=${toJd}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`siddhanta table slice for ${year} failed: HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  await ensureCacheDir();
  // Store as base64: the legacy FileSystem API has no binary write.
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  await FileSystem.writeAsStringAsync(`${CACHE_DIR}${year}.vtab`, btoa(binary), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return bytes;
}

/**
 * The parsed table covering `jdUt` (the year's slice, from the on-device
 * cache when present, from the server otherwise). Throws when the server
 * has no table for the year or the cached bytes do not parse, so the caller
 * can fall back to the computed API.
 */
export async function loadSiddhantaTable(
  jdUt: number,
  options?: { baseUrl?: string },
): Promise<SiddhantaTable> {
  const year = yearOfJd(jdUt);
  const cached = await readCachedSlice(year);
  const bytes = cached ?? (await fetchSlice(year, options?.baseUrl ?? API_BASE));
  return parseSiddhantaTable(bytes);
}

/** The bundled CHEB bytes shipped with the app (2026–2035), decoded. */
export function bundledSiddhantaCheb(): Uint8Array {
  const binary = atob((bundledChebJson as { cheb: string }).cheb);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Positions for `jdUt`, from the server's slice when it answers in time and
 * from the bundled coefficients otherwise — see `loadSiddhantaSource` in
 * the domain module. `via` tells the caller which one served, so a screen
 * can say so (or stay silent; the numbers agree to a few arcseconds).
 * Not wired into any screen yet, like the rest of this helper.
 */
export async function loadSiddhantaSourceFor(
  jdUt: number,
  options?: { baseUrl?: string; timeoutMs?: number },
): Promise<{ source: PositionSource; via: SiddhantaSourceVia }> {
  return loadSiddhantaSource(jdUt, {
    baseUrl: options?.baseUrl ?? API_BASE,
    timeoutMs: options?.timeoutMs,
    bundledCheb: async () => bundledSiddhantaCheb(),
  });
}
