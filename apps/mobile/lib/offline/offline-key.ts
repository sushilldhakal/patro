/**
 * Cache key for an API request path, shared by the offline store and the
 * download job so a response saved while downloading is found again by the
 * screen that asks for the same thing later.
 *
 * Cache-busting query params (`cv`, `sv`, `gv`, `v`) are dropped — they change
 * whenever the app ships a new engine version and must not orphan data the
 * user already downloaded. Everything else (location, era, language, dates)
 * stays, with the remaining params sorted so order never matters.
 */
const VOLATILE_PARAMS = new Set(["cv", "sv", "gv", "v"]);

export function normalizeOfflineKey(path: string): string {
  const q = path.indexOf("?");
  if (q === -1) return path;
  const base = path.slice(0, q);
  const pairs = path
    .slice(q + 1)
    .split("&")
    .filter(Boolean)
    .map((p) => {
      const eq = p.indexOf("=");
      return eq === -1 ? ([p, ""] as const) : ([p.slice(0, eq), p.slice(eq + 1)] as const);
    })
    .filter(([k]) => !VOLATILE_PARAMS.has(k))
    .sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : av > bv ? 1 : 0) : a < b ? -1 : 1));
  if (pairs.length === 0) return base;
  return `${base}?${pairs.map(([k, v]) => (v === "" ? k : `${k}=${v}`)).join("&")}`;
}
