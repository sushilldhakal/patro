# Client-side engine: the server looks up, the client derives

**The rule (owner):** the server stores minimal universal data and does lookups, plus accounts and
documents. Everything that depends on place and time is derived on the client: sunrise and sunset,
graha positions, lagna, the panchanga strip, and the festival rule engine. After this work the
calendar routes stay only for app versions that still call them (1.2.2), then are retired.

## Where things stand (2026-11-24, evening)

| Piece | Server | Client |
|---|---|---|
| Boundaries (tithi, nakshatra, yoga, karana, sankranti, phases) | lookup in the stored index | reads the same index (done, `vidx.ts`, `sky.ts`) |
| Graha positions | calculated per request | from Chebyshev data (done, `sky.ts`) |
| Sunrise, sunset, lagna, panchanga strip | calculated per request | `sky-day.ts` done and tested against the server for a month, **not wired to any screen** |
| Lunar months (amanta/purnimanta windows, adhik, kshaya) | calculated (`lunar_month.rs`) | ported: `lunar-month.ts` (checked through the festival lists below) |
| Festival rule engine, kshaya and adhik rules | calculated (`festivals/`, `month_type_rules_v1.json`) | ported: `festival-engine.ts`; every row of the golden file matches (BS 2039, 2040, 2081-2085, 2150 Kathmandu, 2083 New York, AD 1990/2026, a year of days) and the owner's BS 2039/2085 dates |
| Festival routes (`/nepal/festivals`, `/nepal/holidays`, `/nepal/festivals/upcoming`) | calculated | made on the client (`festival-payloads.ts`, byte-equal to the server's JSON), wired in both apps through `api-client` `local`, with the off switch |
| Other screens (day, month, year, at-time, sankranti, sait…) | call the server | **not switched**: needs the day/month/year payload builders (`patro` + `panchanga` crates, about 20k lines) ported |

**Note (festival lists and the system):** the server's festival routes ignore `siddhanta` and always
compute on the Surya Siddhanta sky (`SIDDHANTA = "surya_siddhanta"` in `patro/src/festivals.rs`).
The client does the same so nothing changes for users. Computing Drik festivals on Drik tithis would
move dozens of dates a day each year (Fulpati 2026 to 18 Oct, for one); that is the owner's call.

## Steps, in order

1. **Lunar-month engine in `packages/domain`** (`lunar-month.ts`): from the stored index only, build
   a year's lunations: new moons (Phase multiple 0), purnimas, the sankranti inside each lunation,
   the name, adhik and kshaya (two sankrantis), and the civil days a lunar month holds at a place
   (udaya rule, using `skyDay` sunrise). Port of `crates/panchanga/src/lunar_month.rs`.
   Oracle: the Rust server's `/v1/nepal/special-months/{bs_year}` and `/v1/nepal/month-kinds/{bs_year}`
   for BS 1950-2150 (every year), exact dates.
2. **Festival engine** (`festivals.ts`): evaluate `apps/api/rules/festival_rules_v3.json` (585 rules:
   lunar, solar, bs_fixed, ad_fixed, adhik_arambha, ayana), the MoHA overrides
   (`holiday_overrides_v1.json`), `month_type_rules_v1.json` (adhik-only Padmini/Parama, lost-month
   festivals follow the kshaya, Swasthani skip), and date selection (udaya, madhyahna, aparahna,
   pradosh, boundary, para-yuta). Port of `crates/festivals/src/compute.rs` and
   `lunar_month.rs::find_festival_in_lunar_month`. The rules JSON ships in the app (about 300 KB).
   Oracle: `apps/rust/crates/festivals/tests/fixtures/festival_golden.json` (whole BS years for
   Kathmandu and a foreign observer, Gregorian years, per-day lists) and
   `crates/festivals/tests/month_type_rules.rs` for the owner's kshaya and adhik dates.
3. **Month and year strip**: `skyMonth` / `skyYear` over `skyDay`, with the festivals attached.
4. **Wire web, then mobile**: the data layer returns the local result for dates inside BS 1950-2150
   (through `safeSkyDay`, with the off switch) and asks the server only for what the client cannot
   make (accounts, profiles, documents, batches outside the window). Screens: today, day, month,
   year, festivals, sankranti. Keep the old response shapes so the screens do not change.
5. **Acceptance**: airplane mode, any date in BS 1950-2150, both systems, both apps: no request to
   `/v1/panchanga*`, `/v1/nepal/festivals*`, `/v1/nepal/patro*`; output equal to the server's for a
   sampled month in every BS year; no error in the console or Sentry.
6. **Retire**: when 1.2.2 is gone, remove the calendar routes and their calculation from the server.

## Prompt for a separate session

> Read `apps/rust/docs/CLIENT-ENGINE-PLAN.md`, `apps/rust/docs/OFFLINE-ASTRONOMY.md` and the memory
> note `client-derives-server-looks-up`. Do steps 1 and 2 only: port the lunar-month and festival
> engines from Rust (`crates/panchanga/src/lunar_month.rs`, `crates/festivals/src/`) to TypeScript in
> `packages/domain/src/astronomy/`, reading boundaries from the `Sky` (`sky.ts`), with no server call.
> Write the tests against the oracles named in step 1 and 2 first and run them often. Do not push,
> and do not run the Rust test suite on this laptop (use the test box 161.118.228.58). Report exact
> numbers: how many years and festivals match, and every mismatch with its cause.
