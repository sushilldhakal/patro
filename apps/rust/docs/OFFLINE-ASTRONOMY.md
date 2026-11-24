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

Per system, for BS 1950 to 2150 (AD 1893 to 2096, with a margin so the first and last days have their neighbours):

| File | Holds | Size (200 y) | Used for |
|---|---|---|---|
| `<system>.index` (a VIDX file) | every boundary, 4 bytes each, 32-day block table | 2.66 MB measured (Drik's full file is 38.5 MB for 2947 y) | tithi/nakshatra/yoga/karana/sankranti lookups, identical to the server |
| `<system>.cheb` | Chebyshev coefficients for the 8 grahas | 1.12 MB measured, both systems | graha longitudes, Sun for rise/set and lagna |

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
   - Drik: a series fitted to our own kernel (`ephdata analytic-fit`), plus orbit elements for the
     planets. No data file, any year. Measured per two centuries over AD 1-2947: Sun within 55",
     Moon within 56" (a tithi end off by 1-2 minutes), Rahu within 145" (0.04 degrees), the
     ayanamsha exact, the planets about half a degree near the present and up to 12 degrees in the
     far past. It is shown as approximate.
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

## Status (2026-11-24)

Built, type-checked and linted, not yet run through tests (the owner asked to test later):

- Surya event index (`siddhanta-table index`), and the Surya server path reads it when loaded
  (`PATRO_RS_SURYA_INDEX`), so boundaries are lookups.
- `Index::slice` and `ChebTable::slice`, and the batch endpoints `/v1/{siddhanta,drik}/{index,cheb}`
  (`PATRO_RS_SURYA_CHEB`, `PATRO_RS_DRIK_CHEB`).
- The four data files for BS 1950-2150, copied into `apps/mobile/assets/sky` and `apps/web/public/sky`.
- TypeScript: VIDX reader (`vidx.ts`), Surya formulas (`surya-formulas.ts`), Drik fallback
  (`drik-analytic.ts`), and the resolver (`sky.ts`) with phone and browser adapters (`lib/sky.ts`).
- `swiss-eph` is not in the server's dependency tree (it is an optional feature of `astronomy` that
  nothing enables); the `ephemeris` crate stays only as a test oracle.

Not built yet:

- No screen reads `getSky()` yet. Day, month and year views still call the server; moving them
  means deriving sunrise, sunset, lagna and the panchanga strip from `Sky` in each screen.
- Festivals, kundali, dashas and muhurta stay server products (see above).
- The Rust server's own Drik fallback when `kernel.veph` is missing (it answers 501); the series is
  in `ephdata::analytic` but `DrikSky` is not yet built on it.
- Surya graha positions on the server are still the formulas (cheap arithmetic); only boundaries are
  stored.

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
