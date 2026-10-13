# Design parity: web is the source of truth

Web (`apps/web`) defines how every page looks. Mobile (`apps/mobile`) matches it in text size, colour, padding, margin, radius and shadow, using the same `@vedic-patro/design-tokens`. The only allowed differences are platform limits: safe-area insets, the 44px touch target, and Android's single-layer shadows.

Enforcement: `npm run check:design` fails when any file gets more hand-typed colours, font sizes, radii, spacing, `[Npx]` classes or shadow props than `scripts/design-baseline.json`. Fix a file, run `npm run check:design -- --write`, commit both. `npm run check:design -- --report` prints totals per app.

Where it started and where it is (hand-typed values outside the token tables):

| | hex | `rgb()` | fontSize | radius | spacing | `[Npx]` type/radius/breakpoint | shadow |
|---|---|---|---|---|---|---|---|
| web, at the start | 401 | 42 | 1 | 3 | 8 | 337 | – |
| web, now | 0 | 0 | 0 | 0 | 0 | 0 | – |
| mobile, at the start | 602 | 265 | 91 | 20 | 123 | 79 | 33 |
| mobile, now | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Hand-typed values outside the token tables are at zero. Three lines keep a `design-ok` comment because they are not design: the wheel glyph regex that strips black fills out of authored SVGs, `elevation: 0` that hides the stock tab bar, and `elevation` used as a stacking order on the biometric lock. The CI check cannot let the counts grow.

How the tokens got there (`scripts/monorepo-tools/`): `palette.mts` clustered the 332 distinct hex colours both apps had typed in (colours within 14 RGB steps merged) into `packages/design-tokens/src/illustration.ts`; `rgba.mts` turned `"rgba(r,g,b,a)"` strings into `withAlpha(token, a)`. Both are one-off tools and are kept as a record.

CI also runs `npx turbo run lint` for both apps (the website's ESLint, the app's typecheck). `@expo/vector-icons` stays: unmapped icon names and the font load still use it, and everything mapped goes through `@vedic-patro/icons`. Visual parity between the website and the app is checked by eye; there is no automated screenshot comparison.

## Shared pages and UI kit (the next layer)

Class maps make the two copies of a page *look* the same; they do not stop the copies *behaving* differently. Pages now move to `packages/features` (one hook per page: data, state, rows, copy) and are drawn with `packages/ui` (one props contract, an HTML half and a React Native half). Holidays is the first; moving it fixed three ways the app had drifted from the website (it fetched BS years even with the AD era selected, sorted by date before any column was chosen, and searched fewer columns). See `packages/features/README.md` for the steps per page.

## Shared class maps (the page design itself)

Tokens share the values; the **class maps** share the page design. Each page has `packages/design-tokens/src/classes/<page>-classes.ts`, keyed by element role, and both the website and the app read it (`cn(holidaysClasses.title, "web-only extras")`). Conventions are in `packages/design-tokens/src/classes/README.md`.

Stage 1 and 2 (done): every page of both apps except the ones listed below. Pages: home + calendar + date sheet, holidays, panchanga (main, year, avakahada, graha and eclipse), rashifal, kundali (+ detail, milan), vastu, learn (chrome), documents, gochar, account and auth, converter, ritu, sun times, legal, abhijit muhurta, panchak, shanti vidhi, sait, dainik kranti, the date and year navigation, and the page shell (header, nav, footer). 34 map files, about 2,225 keys; 147 website files and 147 app files read them. 98 converted files still hold 247 long local class strings (web-only effects, SVG internals, React Native layout), recorded in `scripts/shared-classes-baseline.json`.

Not converted: the diagram and playground internals of learn, sky3d, the SVG charts and wheels (they use the older diagram, wheel and timeline maps), history (app redirect), the mobile-only screens (more, offline, reminders, day/[ad], onboarding), and the remaining panchanga helper screens with no web page.

### Font width (the cause of most layout drift)

The website loads Noto Sans Devanagari at semi-condensed width (`index.html`: `wdth@87.5`). The app used the normal-width `@expo-google-fonts` files, which are about 9% wider, so every line wrapped and sized differently (on dainik kranti 183 of 353 texts sat at a different position or width). The app now bundles four static semi-condensed instances (`apps/mobile/assets/fonts/`, built from the Google Fonts variable file, SIL OFL; see the README there) under the same family names. After the change 38 of 353 differ; on home 8 of 150. The `@expo-google-fonts/noto-sans-devanagari` package is no longer imported and can be removed from `apps/mobile/package.json`.

Position check (same method as below, comparing each text's left edge, width and height at 375 px, tolerance 3 to 4 px) is the way to catch layout drift; the style probe catches type, weight and colour.

### Measured parity (phone width, light theme)

Method: for each route, the website and the app's web build were loaded at 375 px, every visible text was matched by its string, and its computed font size, weight, colour, line height and letter spacing were compared (the website's values were carried across in `window.name`, so no screenshots are needed). Only text is compared: layout, spacing, borders and SVG drawing are not. Colours written as `oklch(...)` on the website and `rgb(...)` in the app are the same colour and are counted as differences here, so these figures understate the match.

| Page | texts on both | identical |
|---|---|---|
| privacy | 18 | 100% |
| documents | 188 | 99% |
| learn | 56 | 98% |
| abhijit muhurta | 136 | 98% |
| home | 150 | 97% (82% before the shared header, button and date-chip fixes) |
| sun times | 120 | 97% |
| panchak | 142 | 96% |
| holidays | 90 | 96% |
| ritu | 57 | 95% |
| sait | 83 | 94% |
| gochar | 96 | 91% |
| panchanga | 465 | 89% |
| converter | 28 | 82% |
| dainik kranti | 353 | 80% (rest is mostly colour-space and 1 to 3 px line height) |
| rashifal | 85 | 74% (rest is mostly colour-space and line height) |
| vastu | 254 | 36%: SVG compass labels, where the website scales the drawing and the app draws fixed sizes; not a style mismatch |

What the probe found and what was fixed: the app's `Button` set `font-medium` on every label (the website's does not), the location chip label was `text-sm font-medium` (website: `text-base`), the date chip's number was 14 px (website: 10.8 px on a phone), and the SEO/FAQ block relied on size inheritance that React Native does not have (now `seo-classes.ts`). A recurring cause worth knowing: web text inherits size and weight from an ancestor, React Native text does not, so every text run in the app has to carry its own size class.

Not covered: dark theme, tablet and desktop widths, kundali (needs a signed-in profile), native font rasterisation, spacing and borders. The script `scripts/design-parity/capture.mjs` covers pixels once Playwright is installed.

Guarded by `npm run check:classes` (CI): every per-page map must be read by both apps, and a converted file cannot gain long literal class strings. The earlier note holds: nothing here has been compared on screen yet. Run `scripts/design-parity/capture.mjs` (or the CI job) before release.

## Page map (status: `todo` → `migrated` → `verified` against web screenshots)

| Mobile screen | Web page | Status |
|---|---|---|
| `(tabs)/index` | `Home` | verified |
| `panchanga/index` | `Panchanga` | verified |
| `panchanga/details` | `PanchangaDetailsHub` | verified |
| `panchanga/year` | `PanchangaYear` | verified |
| `panchanga/element/[name]` | `ElementPage` | verified |
| `panchanga/avakahada-chakra` | `AvakahadaChakra` | verified |
| `panchanga/graha-asta`, `graha-vakri`, `graha-sthiti` | `GrahaAsta`, `GrahaVakri`, graha-sthiti | verified |
| `panchanga/surya-grahan`, `chandra-grahan` | `EclipsePage` | verified |
| `holidays` | `Holidays` | verified |
| `converter` | `Converter` | verified |
| `ritu` | `Ritu` | verified |
| `sun-times`, `suryakranti` | `SunTimesYear` | verified |
| `abhijit-muhurta` | `AbhijitMuhurta` | verified |
| `panchak-patro` | `PanchakPatro` | verified |
| `vivah-sait`, `sait/[category]` | `MarriageSait`, `SaitPage` | verified |
| `dainikkranti` | `DainikKranti` | verified |
| `gochar`, `aakash-gochar` | `Gochar`, `AakashGochar` | verified |
| `kundali/*` | `Kundali`, `KundaliDetail` | verified |
| `jyotish/kundali-milan` | `KundaliMilan` | verified |
| `jyotish/rashifal`, `rashifal` | `Rashifal` | verified |
| `shanti-vidhi` | `ShantiVidhi` | verified |
| `vastu` | `Vastu` | verified |
| `documents/*` | `Documents`, `DocumentDetail`, `DocumentChapterDetail` | verified |
| `learn/*` | `Learn`, `LearnArticle` | verified |
| `account/*` | `Account` | verified |
| `reset-password`, `verify-email` | `ResetPassword`, `VerifyEmail` | verified |
| `privacy`, `terms` | `Legal` | verified |

The comparison opened each row's index route. A kundali profile, a learn article and a document chapter need an id, so those interiors were not screenshotted. `vivah-sait` stands for the sait pages.

Mobile-only screens (no web reference; tokens-only pass): `more`, `offline`, `reminders`, `history`, `chandrakranti`, `day/[ad]`, `account/offline-data`, the panchanga hora / choghadiya / lagna / tarabala / chandrabala / pushkara / panchaka-rahita screens.
