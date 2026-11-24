# Offline astronomy: the apps never need the server for the sky

Goal (owner, 2026-11-24): web and mobile answer panchanga from data they carry. The server is
for login, signup, profile and sync, plus batches for years outside what a client carries.
Surya Siddhanta and Drik each get their own files and their own fallback. Store the minimum;
the client derives the rest from location and time.

## What is stored, and why this much

Boundaries (tithi, karana, nakshatra, pada, yoga, Moon rashi, Sun nakshatra, sankranti) are the
same at every place on Earth, so they are stored once. Place-dependent things (sunrise, sunset,
lagna, rashi at sunrise, choghadiya, hora) are never stored: the client computes them from the
Sun's position, latitude, longitude and time.

Per system, per 200-year window (default AD 1950-2150, which covers BS 2007-2207):

| File | Holds | Size (200 y) | Used for |
|---|---|---|---|
| `<system>.vidx` | every boundary, 4 bytes each, 32-day block table | about 2.6 MB (Drik's own file is 38.5 MB for 2947 y) | tithi/nakshatra/yoga/karana/sankranti lookups, identical to the server |
| `<system>.cheb` | Chebyshev coefficients for the 8 grahas | about 1.1 MB (Surya, measured; Drik to be measured) | graha longitudes, Sun for rise/set and lagna |

Boundaries come from the index, not from the Chebyshev fit, so a client prints the same minute as
the server. The fit only has to be good to an arcsecond or so (graha longitudes, sunrise).
`STAB` (5.3 MB) stays a server slice format; the bundle uses `cheb`, which is 5x smaller.

Surya and Drik files are never mixed: `surya.vidx`, `surya.cheb`, `drik.vidx`, `drik.cheb`.

## Resolution order on the client (same idea as Swiss Ephemeris, then Moshier)

1. Bundled window (above): no network, no calculation of boundaries.
2. Cached batch from the server for dates outside the window (see below).
3. Moshier-style built-in, used when 1 and 2 have nothing (outside the window and offline):
   - Surya: the Surya Siddhanta formulas themselves, ported to TypeScript. Pure arithmetic, no
     data, exact for any date, so it is the same numbers as the server for all time.
   - Drik: a truncated analytic series (Meeus-style Sun, Moon and planets) in code. No data, any
     year, Moon good to about 10 arcseconds (about 20 s on a tithi end). Shown as approximate.
   The same two exist on the server as its tier 3, so the server never needs `swiss-eph`.

## Server batches (outside the window)

The server only looks up, never solves:
- `GET /v1/{system}/index?from_jd&to_jd` returns a VIDX slice, cut on 32-day blocks (the file
  already has a block table, so a slice is a copy, about 13 KB a year).
- `GET /v1/{system}/cheb?from_jd&to_jd` returns the matching coefficient segments.
- Clients ask in 10-year batches, cache them on disk (mobile) or Cache Storage / IndexedDB
  (web), and prefetch the next batch when a user nears an edge. Responses are immutable per
  range, so a long `Cache-Control` and an ETag are safe.

One file format and two readers (Rust on the server, TypeScript in `packages/domain`), so the
phone and the server cannot disagree.

## Delivery

- Mobile: the two active-window files ship in the app assets (about 4 MB per system). They are
  data, not native code, so an OTA update can replace them. The other system downloads on first
  use.
- Web: not in the JS bundle. Fetched once from static URLs, versioned by hash, kept by the
  service worker. Only the system the user has selected is fetched.

## What stays on the server

Login, signup, profile, saved places and kundali profiles. Also the heavy products that are not
astronomy lookups: kundali reports, dashas, muhurta search, festival generation. Festivals depend
on local sunrise and on the festival rules, so moving them offline means porting that engine to
TypeScript. That is a separate decision, not part of this design.

## Build order

1. Surya event index on the server (`surya.vidx`, from the formulas, same VIDX format).
2. Server Surya positions from the table, formulas as fallback.
3. TypeScript VIDX reader, and index-based tithi/nakshatra/yoga in `packages/domain`.
4. TypeScript Surya formulas (tier 3 for Surya).
5. Drik analytic series in Rust and TypeScript (tier 3 for Drik), measured against `kernel.veph`.
6. Batch endpoints and the client cache.
7. Bundle the windows, switch the apps to the resolver, remove their panchanga calls to the server.
8. Remove `swiss-eph` from the Rust server.

Each step is checked against the existing golden numbers before the next starts. Nothing here is
deployed until the owner says so.
