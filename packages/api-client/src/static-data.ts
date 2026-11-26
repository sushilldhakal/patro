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

export type TileRow = [number, string, string, number, number, string, number, string | null, string | null, string | null];

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

// ─── Shared file helpers ──────────────────────────────────────────────────────

/** A static JSON file, or null when it is not there or anything fails. */
async function staticJson<T>(file: string): Promise<T | null> {
  const res = await staticFile(file);
  try {
    return res ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Small memo of index files, so scrolling one chapter reads its index once. */
const indexMemo = new Map<string, Promise<unknown>>();
function staticIndex<T>(file: string): Promise<T | null> {
  let hit = indexMemo.get(file) as Promise<T | null> | undefined;
  if (!hit) {
    hit = staticJson<T>(file).then((v) => {
      if (v == null) indexMemo.delete(file);
      return v;
    });
    indexMemo.set(file, hit);
    if (indexMemo.size > 24) indexMemo.delete(indexMemo.keys().next().value!);
  }
  return hit;
}

/** The items at `positions` of a list stored `chunk` to a file as `${dir}/c{k}.json`; null if any chunk fails. */
async function itemsAt<T>(dir: string, chunk: number, positions: readonly number[]): Promise<T[] | null> {
  const ks = [...new Set(positions.map((p) => Math.floor(p / chunk)))];
  const chunks = await Promise.all(ks.map((k) => staticJson<T[]>(`${dir}/c${k}.json`)));
  const byK = new Map(ks.map((k, i) => [k, chunks[i]]));
  const out: T[] = [];
  for (const p of positions) {
    const item = byK.get(Math.floor(p / chunk))?.[p % chunk];
    if (item === undefined) return null;
    out.push(item);
  }
  return out;
}

/** 64-bit FNV-1a of the UTF-8 bytes, 16 hex digits (`value_key` in export_static.rs). */
export function valueKey(s: string): string {
  let h = 0xcbf29ce484222325n;
  for (const b of new TextEncoder().encode(s)) h = ((h ^ BigInt(b)) * 0x100000001b3n) & 0xffffffffffffffffn;
  return h.toString(16).padStart(16, "0");
}

// ─── Paged chapters (catalog_documents.rs `chapter_page_conn`) ────────────────

interface ChapterIndex {
  header: Record<string, unknown>;
  total: number;
  orders: number[];
  labels: (string | null)[];
  chunk: number;
}

const DEVA_DIGITS = "०१२३४५६७८९";
const toLatinDigits = (s: string) => s.replace(/[०-९]/g, (d) => String(DEVA_DIGITS.indexOf(d)));
const toDevaDigits = (s: string) => s.replace(/[0-9]/g, (d) => DEVA_DIGITS[Number(d)]!);

/** `verse_label_forms`: the label as typed, with Latin digits, and with Devanagari digits. */
export function verseLabelForms(label: string): string[] {
  const raw = label.trim();
  const latin = toLatinDigits(label).trim();
  const forms: string[] = [];
  for (const f of [raw, latin, toDevaDigits(latin)]) if (f && !forms.includes(f)) forms.push(f);
  return forms;
}

export interface ChapterPageRequest {
  cursor?: number;
  direction?: string;
  limit?: number;
  verse?: string;
}

/** Positions `[start, end)` of a page in a chapter of `orders`, as the route picks them; null = no such verse. */
export function chapterPageRange(
  orders: readonly number[],
  labels: readonly (string | null)[],
  { cursor, direction = "next", limit, verse }: ChapterPageRequest,
): [number, number] | null {
  const total = orders.length;
  const lim = Math.min(Math.max(Math.trunc(limit ?? 25), 1), 100);
  if (verse && verse.trim()) {
    const forms = verseLabelForms(verse);
    const anchor = labels.findIndex((l) => l != null && forms.includes(l));
    if (anchor < 0) return null;
    const nBefore = anchor;
    const nAfter = total - 1 - anchor;
    let takeBefore = Math.min(Math.trunc((lim - 1) / 2), nBefore);
    let takeAfter = lim - 1 - takeBefore;
    if (takeAfter > nAfter) {
      takeBefore = Math.min(nBefore, takeBefore + (takeAfter - nAfter));
      takeAfter = nAfter;
    }
    return [anchor - takeBefore, anchor + takeAfter + 1];
  }
  if (direction === "prev") {
    const end = cursor == null ? total : orders.findIndex((o) => o >= cursor) === -1 ? total : orders.findIndex((o) => o >= cursor);
    return [Math.max(0, end - lim), end];
  }
  const start = cursor == null ? 0 : orders.findIndex((o) => o > cursor) === -1 ? total : orders.findIndex((o) => o > cursor);
  return [start, Math.min(total, start + lim)];
}

/** One page of a chapter from its static index and chunks, shaped as the API's paged answer. */
export async function staticChapterPage<T>(slug: string, chapter: number, req: ChapterPageRequest): Promise<T | null> {
  if (!SEGMENT.test(slug) || !Number.isInteger(chapter)) return null;
  if (req.direction && req.direction !== "next" && req.direction !== "prev") return null;
  const dir = `documents/${slug}/${chapter}`;
  const index = await staticIndex<ChapterIndex>(`${dir}/index.json`);
  if (!index) return null;
  const range = chapterPageRange(index.orders, index.labels, req);
  if (!range) return null; // the API answers "No such verse"
  const [start, end] = range;
  const positions = Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
  const verses = await itemsAt<unknown>(dir, index.chunk, positions);
  if (!verses) return null;
  const empty = positions.length === 0;
  return {
    ...index.header,
    verses,
    next_cursor: !empty && end < index.total ? index.orders[end - 1] : null,
    prev_cursor: !empty && start > 0 ? index.orders[start] : null,
    total: index.total,
  } as T;
}

// ─── Verse details (catalog_documents.rs `verses_with_detail`) ───────────────

interface DetailIndex {
  value: string;
  total: number;
  slugs: string[];
  chunk: number;
}

const DETAIL_KINDS = new Set(["devata", "rishi", "chhanda", "svara"]);

/** Every verse sharing one detail value, a page at a time, optionally within one document. */
export async function staticVerseDetailPage<T>(
  kind: string,
  value: string,
  { slug, offset = 0, limit = 50 }: { slug?: string; offset?: number; limit?: number },
): Promise<T | null> {
  const v = value.trim();
  if (!DETAIL_KINDS.has(kind) || !v || !Number.isInteger(offset) || offset < 0) return null;
  const lim = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const dir = `veda/details/${kind}/${valueKey(v)}`;
  const index = await staticIndex<DetailIndex>(`${dir}/index.json`);
  if (!index) return null;
  const all = index.slugs.map((_, i) => i);
  const scoped = slug ? all.filter((i) => index.slugs[i] === slug) : all;
  const verses = await itemsAt<unknown>(dir, index.chunk, scoped.slice(offset, offset + lim));
  if (!verses) return null;
  return { kind, value: v, total: scoped.length, offset, verses } as T;
}

// ─── City search (geography/src/cities.rs `search`) ──────────────────────────

/** SQLite's `lower()` and `LIKE` fold ASCII letters only. */
const foldAscii = (s: string) => s.replace(/[A-Z]/g, (c) => c.toLowerCase());

/** SQLite `text LIKE pattern` (ASCII case-insensitive, `%` and `_` wildcards, no escape). */
export function sqlLike(text: string, pattern: string): boolean {
  const t = foldAscii(text);
  const p = foldAscii(pattern);
  if (!/[%_]/.test(p.slice(1, -1)) && p.startsWith("%") && p.endsWith("%") && p.length >= 2) return t.includes(p.slice(1, -1));
  if (!/[%_]/.test(p.slice(0, -1)) && p.endsWith("%")) return t.startsWith(p.slice(0, -1));
  const re = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${re}$`, "su").test(t);
}

export interface CityTable {
  rows: TileRow[];
  /** Folded ascii_name / name, for matching without folding 121k strings per keystroke. */
  ascii: string[];
  name: string[];
  /** Each row's GROUP BY (lower(ascii_name), country, admin1) group, numbered in that key's sort order. */
  groupOf: Int32Array;
  groups: number;
}

/** Folds and groups the rows once, so a search is a scan plus a few small sorts. */
export function buildCityTable(rows: TileRow[]): CityTable {
  const ascii = rows.map((r) => foldAscii(r[2]));
  const name = rows.map((r) => foldAscii(r[1]));
  const keys = rows.map((r, i) => `${ascii[i]}\u0000${r[5]}\u0000${r[8] ?? ""}`);
  const sorted = [...new Set(keys)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const ordinal = new Map(sorted.map((k, i) => [k, i]));
  return { rows, ascii, name, groupOf: Int32Array.from(keys, (k) => ordinal.get(k)!), groups: sorted.length };
}

let cityTable: Promise<CityTable | null> | null = null;
let cityTableTimer: ReturnType<typeof setTimeout> | undefined;
/** The whole table (~12 MB as JSON) is let go after this much quiet, so it does not sit in memory. */
const CITY_TABLE_IDLE_MS = 3 * 60_000;

function loadCityTable(): Promise<CityTable | null> {
  if (cityTableTimer !== undefined) clearTimeout(cityTableTimer);
  cityTableTimer = setTimeout(() => {
    cityTable = null;
  }, CITY_TABLE_IDLE_MS);
  // Node (SSR, tests) would otherwise stay alive for the timer.
  (cityTableTimer as { unref?: () => void }).unref?.();
  cityTable ??= staticJson<TileRow[]>("cities/all.json").then((rows) => {
    if (!rows) {
      cityTable = null;
      return null;
    }
    return buildCityTable(rows);
  });
  return cityTable;
}

const rowCity = (r: TileRow): City => ({
  id: r[0],
  name: r[1],
  ascii_name: r[2],
  lat: r[3],
  lon: r[4],
  country: r[5],
  population: r[6],
  timezone: r[7] as string,
  admin1: r[8],
  admin1_name: r[9],
});

function cityAliases(query: string): string[] {
  if (query === "kanchanpur" || query === "kañchanpur" || query === "कञ्चनपुर") return ["bhimdatta", "mahendranagar"];
  if (query === "mahendranagar" || query === "महेन्द्रनगर") return ["bhimdatta"];
  return [];
}

const PREFERRED_QUERIES = new Set(["kanchanpur", "kañchanpur", "कञ्चनपुर", "mahendranagar", "महेन्द्रनगर", "bhimdatta", "भिमदत्त"]);
const BHIMDATTA_ID = 1_283_095;

/** `Cities::search` on the whole table, with SQLite's grouping and ordering. */
export function searchCityRows(table: CityTable, query: string, limit: number, country?: string, prioritize = "NP"): City[] {
  const q = query.trim();
  if (!q) return [];
  const exact = q.toLowerCase();
  const code = country?.toUpperCase();
  const like = `%${q}%`;
  const prefix = `${q}%`.toLowerCase();
  const plainLike = !/[%_]/.test(q);
  const fq = foldAscii(q);
  // WHERE (ascii_name LIKE %q% OR name LIKE %q%) [AND country = ?], GROUP BY lower(ascii_name), country,
  // admin1 (the most populous row of a group; the first by id on a tie).
  const best = new Int32Array(table.groups).fill(-1);
  const touched: number[] = [];
  for (let i = 0; i < table.rows.length; i++) {
    const r = table.rows[i]!;
    if (code && r[5] !== code) continue;
    const hit = plainLike
      ? table.ascii[i]!.includes(fq) || table.name[i]!.includes(fq)
      : sqlLike(r[2], like) || sqlLike(r[1], like);
    if (!hit) continue;
    const g = table.groupOf[i]!;
    const b = best[g]!;
    if (b < 0) {
      best[g] = i;
      touched.push(g);
    } else if (r[6] > table.rows[b]![6]) best[g] = i;
  }
  const rank = (i: number) => {
    if (table.ascii[i] === exact) return 0;
    if (table.name[i] === exact) return 1;
    if (sqlLike(table.ascii[i]!, prefix)) return 2;
    if (sqlLike(table.name[i]!, prefix)) return 3;
    return 4;
  };
  // ORDER BY rank, prioritized country first, population DESC; equal rows keep group-key order.
  const buckets: number[][] = Array.from({ length: 10 }, () => []);
  for (const g of touched) {
    const i = best[g]!;
    buckets[rank(i) * 2 + (table.rows[i]![5] === prioritize ? 0 : 1)]!.push(g);
  }
  const picked: number[] = [];
  for (const bucket of buckets) {
    if (picked.length >= limit) break;
    bucket.sort((x, y) => table.rows[best[y]!]![6] - table.rows[best[x]!]![6] || x - y);
    for (const g of bucket) {
      if (picked.length >= limit) break;
      picked.push(best[g]!);
    }
  }
  let results = picked.map((i) => rowCity(table.rows[i]!));

  // `_inject_alias_matches`
  const extras: City[] = [];
  const aliasList = cityAliases(exact).length ? cityAliases(exact) : cityAliases(q);
  for (const alias of aliasList) {
    const fa = foldAscii(alias);
    const lowerAlias = alias.toLowerCase();
    const found: number[] = [];
    for (let i = 0; i < table.rows.length; i++) {
      const r = table.rows[i]!;
      if (code && r[5] !== code) continue;
      if (table.ascii[i]!.includes(fa) || table.name[i]!.includes(fa) || table.ascii[i] === lowerAlias) found.push(i);
    }
    found.sort((a, b) => table.rows[b]![6] - table.rows[a]![6]);
    for (const i of found.slice(0, 3)) {
      const city = rowCity(table.rows[i]!);
      if (!results.some((c) => c.id === city.id) && !extras.some((c) => c.id === city.id)) extras.push(city);
    }
  }
  if (extras.length) results = [...extras, ...results];

  // `_prefer_canonical_city`
  if (PREFERRED_QUERIES.has(exact) || PREFERRED_QUERIES.has(q)) {
    const row = table.rows.find((r) => r[0] === BHIMDATTA_ID);
    if (row && (!code || row[5] === code)) {
      const preferred = rowCity(row);
      if (exact === "kanchanpur" || exact === "kañchanpur" || q === "कञ्चनपुर") {
        preferred.name = "कञ्चनपुर (भिमदत्त)";
        preferred.ascii_name = "Kanchanpur (Bhimdatta)";
      } else if (exact === "mahendranagar" || q === "महेन्द्रनगर") {
        preferred.name = "महेन्द्रनगर (भिमदत्त)";
        preferred.ascii_name = "Mahendranagar (Bhimdatta)";
      }
      results = [preferred, ...results.filter((c) => c.id !== BHIMDATTA_ID)];
    }
  }
  return results.slice(0, limit);
}

/** `/cities/search` on the device from `cities/all.json`; null (ask the API) when the table is unavailable. */
export async function staticCitySearch(query: string, limit: number, country?: string): Promise<{ query: string; count: number; cities: City[] } | null> {
  const table = await loadCityTable();
  if (!table) return null;
  const lim = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 50) : 10;
  const cities = searchCityRows(table, query, lim, country);
  return { query, count: cities.length, cities };
}
