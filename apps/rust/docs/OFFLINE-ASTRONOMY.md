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
   - Drik: a series fitted to our own kernel (`ephdata analytic-fit ... -3000 3000`), plus orbit
     elements and a fitted correction for the planets. No data file. Measured against the kernel over
     3000 BCE to 3000 CE, per two centuries: Sun within 38" (rms 9-17"), Moon within about 35" in
     most centuries and 90" at the 3000 BCE edge (a tithi end off by 1-3 minutes), Rahu within 130",
     the ayanamsha exact, Mercury, Venus and Mars within 1 degree, Jupiter 0.4 to 4 degrees and
     Saturn 1 to 13 degrees (worst at the 3000 BCE end, about 1 degree from 1000 to 2200 CE). Outside
     3000 BCE to 3000 CE it is not measured. It is shown as approximate.
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

## Client integration plan (web and mobile), 2026-11-24

What is true today, checked: the web production build passes (95 pages prerendered, `public/sky/*.bin`
copied into `dist/sky`), and the mobile iOS bundle exports with no errors. **The mobile bundle does not
yet contain the sky files**: Metro only bundles what the app imports, and no screen imports
`apps/mobile/lib/sky.ts`. Until a screen does, the four `.bin` assets cost nothing and do nothing.

Order of work. Each step ends with its own test and must not add a network call inside BS 1950-2150.

1. **Day engine in `packages/domain`** (`sky-day.ts`): from a `Sky`, a date and a place, build the
   day's panchanga strip: sunrise and sunset, tithi, nakshatra, yoga and karana with their end times
   (from the index, so identical to the server), paksha, moon and graha rashis, lagna. Test against
   the server's own answers for 50 dates and three places (Kathmandu, Sydney, New York).
2. **Data layer switch** (mobile `lib/api.ts`, web `src/lib/api.ts`): for the day and month
   panchanga routes, answer from the day engine when the date is inside the window, and from the
   server only for what the engine cannot make (festivals, kundali, muhurta). A flag
   (`SKY_LOCAL=on|off`) decides, so it can be turned off by an OTA update without a release.
3. **Mobile**: import `getSky` from the data layer (this is what puts the `.bin` files in the
   bundle), open the active system lazily on first use, never at launch (RAM and the launch
   watchdog: parse about 4 MB only when a screen needs it). Check the Android low-RAM path.
4. **System switch**: Surya and Drik are separate files. Open only the selected system; keep the
   other closed until the user switches.
5. **Festivals offline** (decision needed): festival dates depend on local sunrise and the rule
   book, so going offline for them means porting the festival engine, or shipping a per-year
   festival list for a few cities.
6. **Account only**: login, signup, profile and sync keep using the server.
7. **Release**: EAS update carries the assets (7.6 MB), a store build is needed only if the
   native asset limit is hit. Web: serve `/sky/*.bin` with a long cache and `Content-Type:
   application/octet-stream`; add gzip for `.bin`.

Acceptance for the whole plan: airplane mode, open any date in BS 1950-2150 on both apps with both
systems, no request to `/v1/panchanga*`, no error in Sentry or the console.

## Range of the fallbacks and of the server's batches (owner's target: 3000 BCE to 3000 CE)

| Piece | Covers today | Needed for 3000 BCE-3000 CE |
|---|---|---|
| Bundled window in the apps | BS 1950-2150 (AD 1893-2096), both systems | nothing, this is the offline window |
| Surya formulas in the app (tier 3) | any date, exact | nothing |
| Drik analytic series in the app (tier 3) | fitted and measured over 3000 BCE-3000 CE (done) | nothing |
| Server batches, Surya | `surya.vidx` and `surya.cheb` built for 13100 BCE-17100 CE (395 MB and 167 MB); beyond that the server computes from the formulas, which are exact | nothing |
| Server batches, Drik | kernel 644 MB, index 395 MB, Chebyshev 194 MB for 13100 BCE-17100 CE (done) | nothing |

### Wide server data (built 2026-11-24, data/wide, not in git)

- Drik kernel from the two DE441 parts, 1 m steps, 13100 BCE-17100 CE: 643.9 MB. Event index 395.5 MB
  (1063 s on two threads). Chebyshev batch file 194 MB, built with `DRIK_WIDE=1` because a single
  ayanamsha line cannot hold over 30,000 years (residual 2.35 degrees); the server sets each slice's
  ayanamsha anchor and rate from the kernel before sending it.
- Surya index 395.5 MB and Chebyshev file 167 MB over the same span.
- Index consistency check (`ephdata check`, 3000 random instants per kind): 0 inconsistent at +/-20 ms
  and +/-50 ms; at the strict +/-5 ms, 441 of 30,000 fail, almost all after 4000 CE. Cause measured:
  the kernel evaluation carries a few milliseconds of timing noise far from the present (delta-T there
  is days), so a boundary is good to about 20 ms, not 1 ms. Irrelevant to a panchanga that shows minutes.
- Found and fixed while testing the far past: the weekday overflowed for Julian Days before 0
  (4713 BCE): a panic in debug, a wrong day in release.
- The server answers month panchangas for both systems from 13000 BCE to 16900 CE (118 of 120 sampled
  requests 200; the other two are the last month of 16900 CE, past the supported span).
