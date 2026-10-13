# Mobile behaviour changes from taking the web logic (domain merges)
- patro-day: mobile gains era-aware civil-date helpers (years <100, BCE); same results for modern dates.
- dasha: YEAR_DAYS 360 -> 365.2425 (duration breakdown labels now match API dates).
- birth-date: mobile date/time masking uses web smart splitting ("2021819" -> 2021-08-19, "8" -> "08" etc.).
- zoned-time, time-format: mobile copies were partial; now the full web version (superset).
- bhava: mobile's buildBhavaChart/buildBhavaTable lose the rashiNeFromNumber callback argument (domain rashi-i18n resolves names itself); output identical.
- graha-status: mobile-only bhavaHousesHaveStatusMarks kept in the shared file.
- bs-calendar: mobile now uses the web table (BS 60-3000, +~413 KB JSON in the bundle, month-start table built for 3000 years at import instead of ~500). Mobile pickers/year wheel/3D sky keep their old 1700-2200 limits through apps/mobile/lib/bs-range.ts. Outside that range bsToAD etc. now return a date instead of the old fallback (unreachable from pickers). Mobile-only helpers (todayAdString, toNepaliDigits, formatDigits, formatDashaInstant, formatDashaMoment) kept in the shared file. getZonedParts/formatZoned* and the era-aware date helpers use the web versions.
- graha-details: mobile-only RASHI_EN_NAMES kept in the shared file.
- nakshatra-short: shortened-label language fallback now uses the shared normalizeLang (same results for ne/en).
- sait-data: mobile-only SAIT_CATEGORY_LABELS kept; VAS_SAIT_CATEGORIES identical.
- navatara-bala, graha-sthiti-display: web versions (formatNavataraTara/Quality, grahaSthitiShara/Lord/SubLord wording follow web); mobile-only siderealRashiNumber/grahaKeyFromLordNe were unused and are dropped.
- panchanga-format (+ mobile's .web copy), patro-headline-subtitle, local-calendar, patro-year-axis, patro-year-browse-step, era routing: web versions everywhere. All formatters mobile calls with a language still do (optional lang param added to the clock/digit helpers; defaults unchanged for web). Mobile's rashi-name helpers (rashiNeFromNumber, formatRashiDisplayNe, ...) now come from rashi-i18n; English rashi names are "Aries..." (web) not "Mesha..." (old mobile wheel).
- patro-era (mobile) deleted: mobile uses domain Era (same four codes); helpers isGregorianEra/toggleEraForLanguage/eraToApi/patroBrowseTodayEra added to domain/era.ts; togglePatroBrowseEra is the web one.
- formatBrowsePatroYear: web version (BBS abbreviation "BBS", throws on year < 1 instead of returning "—").
- buildAdCalendarGridDays: web algorithm (takes one flat list of enriched days).
- wheel-data: mobile uses getWheelRashis() (language-aware names) instead of the static WHEEL_RASHIS; mobile keeps scrubGToDatetime in lib/wheel-scrub.ts (its API takes a datetime, web's takes a JD).
- ephemeris-adapters: shared pure helpers + the at-time/daily merge live in domain (web logic); each app keeps only its own fetch calls.
- buildPanchangaDetailCells stays mobile-only (apps/mobile/lib/panchanga-detail-cells.ts).
- Batch 3 (web logic wins): cities/nepal-cities, kundali/{north-indian-layout,bhava-detail,kundali-routes,shadbala-display,yoga-reference-map}, dainikKranti/*, instant-query, learn/chapter-player, panchak/*, panchanga-elements, panchanga-shell-paths, sait-rules-content, sait-suitability, shanti/navagraha-shanti, sky3d/{nakshatra-stars,background-stars,geocentric-model,orbital-model,bikram-solar,day-mechanics,horizon,nebulae,pole-stars,sky-catalogue,sky-culture,sky-zoom,time-steps,two-systems,vedic-constellations}.
  * Element and ceremony titles/blurbs now come from the shared catalogue (panchanga-i18n.ts, sait.categories.*): mobile ceremony labels read e.g. "Marriage" instead of "Vivah".
  * Sait rules are catalogue keys resolved at render (web shape); the rule text is the web's.
  * Shadbala sub-bala labels come from the catalogue.
  * Rashi columns in the dainik-kranti tables use rashi-i18n (English "Aries..." not "Mesha...").
  * Mobile keeps app-only presentation: lib/sait-suitability-style.ts (native colours), lib/element-routes.ts, lib/panchanga-shell-paths.ts (adds the app-only tab routes), lib/sky3d/nebula-sources.ts, sky-textures.ts (per-platform assets).
  * bikram-solar on mobile now spans the web table range (BS 60-3000 via the shared calendar) -- NOTE for review: its precomputed table is larger than before.

## Design tokens, icons, API client, shared helpers (October 2026)

Visible in the app (web is the design's source of truth; review before the release notes):
- Colours: `muted`, `border`, `surfaceInset` and `surfaceMuted` now use the website's values in both themes (light muted #f0ebe3 → #f2e7cb, border #e8dfd0 → #d7c9a4, inset/muted surfaces are a 3% / 2.5% ink tint of the card; dark muted #141929 → #191d31). Light-theme tone tints match the website's mixes (toneBest 14% → 12%, toneGood 9% → 8%, toneBad 8% → 6%).
- Those platform forks were removed afterwards (see the design parity section below): `accent` is the website's gold, muted text and dark tints match the website, radii are 4.8/8.8 px, and type comes from the website's scale.
- Icons: the drawer's Documents entry is the website's book-marked icon (was file-text); the floating tab bar draws through `AppNavIcon` from the shared feature map (same Lucide artwork as before).
- Panchanga sections: anga end times show the website's भोलि / पर्सि prefix when the anga ends on a later day.
- Kundali copy: the app reads the shared catalogue; three labels take the website's wording (surya_nakshatra "Surya Nakshatra", loading "लोड हुँदैछ…", mahadasha_at_birth "महादशा सुरु (जन्मकालीन)").

Not visible, but behaviour:
- Network: every request has a 120 s timeout (the API proxy's own limit); a timeout or "could not connect" is a `NetworkError` (a `TypeError`), so the offline download still answers it. Data errors now carry the backend's `detail` in the app too.
- Accounts (both apps, one shared flow in `packages/api-client/src/auth.ts`, covered by `test/auth.test.ts` against a fake server that rotates refresh tokens like the API):
  * Requests that 401 together share one refresh; website tabs take turns through Web Locks, and a tab whose refresh is rejected because another tab rotated first adopts that tab's tokens instead of signing out. A request that 401s after someone else refreshed retries without rotating again.
  * Only a 401/403 from `/auth/refresh` ends the session, and only if the store still holds the rejected token. The website used to sign out on any refresh failure (a 5xx too); now no connection reaches the caller as `NetworkError` and a server error as `AuthError` 5xx, with the session kept. (The app already kept the session; it used to see these as a 401.)
  * Signing out (or into another account) while a refresh is in flight no longer brings the old session back: the late refresh is discarded and its new token revoked. Both apps had this race before.
  * Account errors are `ApiError`s, so React Query no longer retries 4xx account failures.
- Language: a stored language value is parsed case-insensitively in the app too (as on the website).

## Design parity with the website (October 2026)

The app now matches the website's design values everywhere; the deliberate platform differences listed above are gone. Visible in the app (review before the release notes):
- Radii: cards, chips and sheets use the website's 4.8 / 8.8 / 16 px (the app's older 8 / 12 px are gone).
- Colour roles are the website's. `accent` is the gold highlight (not green); positive states (✓, शुभ, verified, "begins") use `success`; errors use `danger` (a deeper red on midnight than before). Light-theme muted text is the website's muted colour, not full ink. Dark-theme tinted surfaces (today, tone good/bad/best, active tab) are the website's mixes, a little fainter than before.
- Type: sizes come only from the website's scale (the inline sizes were being stripped by `Text` and never applied, so some labels that looked 14 px will now take their nominal 18 or 20 px); diagram labels use three named sizes (8 / 10 / 12 px).
- Shadows: cards and sheets use the website's shadow tokens (one layer on native).
- Artwork colours: ~300 hand-typed hex and rgba colours across diagrams, wheels and the sky scene collapsed into a shared palette of ~200 colours (colours within a few RGB steps of each other merged), so some tones shift very slightly.
- Page building blocks (Card, StatCard, PageHeader, page padding) are built from one shared spec (`spec` in design-tokens) that the website renders too.
- Letter spacing of small uppercase labels: two shared steps (0.12 em and 0.18 em) instead of 0.08 to 0.22 em in places.

Guarded by `npm run check:design` (CI): hand-typed colours, sizes, radii, spacing and shadows can only go down. See `docs/design-parity.md`.
