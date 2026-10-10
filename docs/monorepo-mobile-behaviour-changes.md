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
