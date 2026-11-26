/**
 * Read-only data guests ask for, served as static JSON from R2 (static.vedicpatro.com) instead of
 * the server. Written by apps/rust/src/bin/export_static.rs, which saves the API's own answers, so a
 * file is byte for byte what the API would say. Off until an app calls {@link configureStaticData}
 * with a base URL; every miss (no manifest, 404, offline, timeout) falls back to the API.
 */
import type { City, NearestCityResponse } from "./types";

interface StaticManifest {
  version: string;
  tile_deg: number;
}

const STATIC_TIMEOUT_MS = 8_000;
/** After a failed manifest read, go straight to the API for this long before trying again. */
const MANIFEST_RETRY_MS = 5 * 60_000;

let base: string | null = null;
let manifest: Promise<StaticManifest | null> | null = null;
let manifestFailedAt = 0;

/** Turn static reads on (`https://static.vedicpatro.com`) or off (null / ""). */
export function configureStaticData(url: string | null | undefined): void {
  base = url ? url.replace(/\/+$/, "") : null;
  manifest = null;
  manifestFailedAt = 0;
}

async function fetchQuick(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STATIC_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function loadManifest(): Promise<StaticManifest | null> {
  if (!base) return Promise.resolve(null);
  if (!manifest && Date.now() - manifestFailedAt < MANIFEST_RETRY_MS) return Promise.resolve(null);
  manifest ??= fetchQuick(`${base}/manifest.json`)
    .then(async (res) => {
      const m = res.ok ? ((await res.json()) as StaticManifest) : null;
      if (!m || typeof m.version !== "string" || !/^[A-Za-z0-9-]+$/.test(m.version)) throw new Error("bad manifest");
      return m;
    })
    .catch(() => {
      manifest = null;
      manifestFailedAt = Date.now();
      return null;
    });
  return manifest;
}

/** Query keys that never change a static answer (cache versions, the calculation, the UI language). */
const NEUTRAL_PARAMS = new Set(["v", "cv", "siddhanta", "ayanamsha", "language", "lang", "era"]);
const SEGMENT = /^[A-Za-z0-9_.-]+$/;

/** The static file that answers a data-API path (`/documents/rigveda?v=3`), or null. */
export function staticFileFor(path: string): string | null {
  const [pathname = "", query = ""] = path.split("?", 2);
  const params = new URLSearchParams(query);
  const slug = params.get("slug");
  for (const key of params.keys()) if (!NEUTRAL_PARAMS.has(key) && key !== "slug") return null;
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (!parts.every((p) => SEGMENT.test(p) && p !== "." && p !== "..")) return null;
  if (slug != null && !(SEGMENT.test(slug) && parts[0] === "veda")) return null;
  const [a, b, c, d, e] = parts;
  if (parts.length === 3 && a === "nepal" && b === "cities" && c === "popular") return "cities/popular.json";
  if (a === "documents") {
    if (parts.length === 1) return "documents/index.json";
    if (parts.length === 2) return `documents/${b}.json`;
    if (parts.length === 4 && c === "chapters" && /^\d+$/.test(d!)) return `documents/${b}/${d}.json`;
  }
  if (parts.length === 4 && a === "veda" && b === "details" && d === "values" && /^[a-z]+$/.test(c!) && e === undefined) {
    return `veda/details/${c}/values${slug ? `-${slug}` : ""}.json`;
  }
  return null;
}

async function staticFile(file: string): Promise<Response | null> {
  const m = await loadManifest();
  if (!m) return null;
  try {
    const res = await fetchQuick(`${base}/v${m.version}/${file}`);
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

/** The static file's response for an API path, or null (not static, or not there): then call the API. */
export async function staticResponseFor(path: string): Promise<Response | null> {
  const file = staticFileFor(path);
  return file ? staticFile(file) : null;
}

/** {@link staticResponseFor}, parsed. */
export async function staticJsonFor<T>(path: string): Promise<T | null> {
  const res = await staticResponseFor(path);
  try {
    return res ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** `/veda/daily` for one day, from that month's file (`veda/daily/2026-11.json`). */
export async function staticVedaDaily<T>(dateAd: string): Promise<T | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateAd)) return null;
  const res = await staticFile(`veda/daily/${dateAd.slice(0, 7)}.json`);
  try {
    return res ? (((await res.json()) as Record<string, T>)[dateAd] ?? null) : null;
  } catch {
    return null;
  }
}

// ─── Nearest city (geography/src/cities.rs, `nearest_in_box` at 60 km) ────────

type TileRow = [number, string, string, number, number, string, number, string | null, string | null, string | null];

/** Python's `round(x, 3)`, as the server rounds the query point. */
const round3 = (x: number) => Number(x.toFixed(3));

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371.0088;
  const rad = Math.PI / 180;
  const p1 = lat1 * rad;
  const p2 = lat2 * rad;
  const dphi = (lat2 - lat1) * rad;
  const dlmb = (lon2 - lon1) * rad;
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dlmb / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

const NEAR_KM = 60;
const MAX_TILES = 16;

/**
 * The server's first step of `/cities/nearest` (a 60 km box, population ≥ 1), from the 0.5° tiles,
 * with its tie-breaking: candidates in (lat, id) order — id order with a country — and the last at
 * the least distance wins. Null when nothing is that close (the server then widens the box) or any
 * tile could not be read.
 */
export function nearestInRows(rows: readonly TileRow[], lat: number, lon: number, country?: string): City | null {
  const latQ = round3(lat);
  const lonQ = round3(lon);
  const dlat = NEAR_KM / 111;
  const dlon = NEAR_KM / Math.max(111 * Math.cos((latQ * Math.PI) / 180), 1e-6);
  const code = country?.toUpperCase();
  const candidates = rows.filter(
    (r) =>
      r[6] >= 1 &&
      r[3] >= latQ - dlat &&
      r[3] <= latQ + dlat &&
      r[4] >= lonQ - dlon &&
      r[4] <= lonQ + dlon &&
      (!code || r[5] === code),
  );
  candidates.sort(code ? (x, y) => x[0] - y[0] : (x, y) => x[3] - y[3] || x[0] - y[0]);
  let best: TileRow | null = null;
  let bestKm = NEAR_KM;
  for (const r of candidates) {
    const km = haversineKm(latQ, lonQ, r[3], r[4]);
    if (km <= bestKm) {
      bestKm = km;
      best = r;
    }
  }
  if (!best) return null;
  const [id, name, ascii_name, cLat, cLon, cCountry, population, timezone, admin1, admin1_name] = best;
  return { id, name, ascii_name, lat: cLat, lon: cLon, country: cCountry, population, timezone: timezone as string, admin1, admin1_name };
}

export async function staticNearestCity(lat: number, lon: number, country?: string): Promise<NearestCityResponse | null> {
  const m = await loadManifest();
  if (!m || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const deg = m.tile_deg;
  const latQ = round3(lat);
  const lonQ = round3(lon);
  const dlat = NEAR_KM / 111;
  const dlon = NEAR_KM / Math.max(111 * Math.cos((latQ * Math.PI) / 180), 1e-6);
  const a0 = Math.floor((latQ - dlat) / deg);
  const a1 = Math.floor((latQ + dlat) / deg);
  const b0 = Math.floor((lonQ - dlon) / deg);
  const b1 = Math.floor((lonQ + dlon) / deg);
  if ((a1 - a0 + 1) * (b1 - b0 + 1) > MAX_TILES) return null;
  const keys: string[] = [];
  for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) keys.push(`${a}_${b}`);
  try {
    const tiles = await Promise.all(
      keys.map(async (key) => {
        const res = await fetchQuick(`${base}/v${m.version}/cities/tile/${key}.json`);
        if (res.status === 404) return [] as TileRow[]; // no city in that cell
        if (!res.ok) throw new Error(`tile ${key}: ${res.status}`);
        return (await res.json()) as TileRow[];
      }),
    );
    const city = nearestInRows(tiles.flat(), lat, lon, country);
    return city ? { lat, lon, city } : null;
  } catch {
    return null;
  }
}
