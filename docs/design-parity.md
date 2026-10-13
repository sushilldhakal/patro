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

Visual comparison: `npm run check:parity` screenshots the same route in the website and in the app's web build (phone 390 and desktop 1280, light and dark) and reports the share of differing pixels. Playwright is a devDependency. CI installs the browser and fails a page when more than 45% of its pixels differ. Measured on 12 October 2026, the highest share is 0.36, on आकाश गोचर, where the sky is a live 3D scene. Home, the yearly wheel and Vastu sit between 0.17 and 0.32 because the app keeps its floating tab bar and its own header. Every mapped page is under that line.

CI also runs `npx turbo run lint` for both apps (the website's ESLint, the app's typecheck). `@expo/vector-icons` stays: unmapped icon names and the font load still use it, and everything mapped goes through `@vedic-patro/icons`. Native iOS and Android font rasterisation is not what this comparison sees.

## Shared class maps (the page design itself)

Tokens share the values; the **class maps** share the page design. Each page has `packages/design-tokens/src/classes/<page>-classes.ts`, keyed by element role, and both the website and the app read it (`cn(holidaysClasses.title, "web-only extras")`). Conventions are in `packages/design-tokens/src/classes/README.md`.

Stage 1 and 2 (done): every page of both apps except the ones listed below. Pages: home + calendar + date sheet, holidays, panchanga (main, year, avakahada, graha and eclipse), rashifal, kundali (+ detail, milan), vastu, learn (chrome), documents, gochar, account and auth, converter, ritu, sun times, legal, abhijit muhurta, panchak, shanti vidhi, sait, dainik kranti, the date and year navigation, and the page shell (header, nav, footer). 34 map files, about 2,225 keys; 147 website files and 147 app files read them. 98 converted files still hold 247 long local class strings (web-only effects, SVG internals, React Native layout), recorded in `scripts/shared-classes-baseline.json`.

Not converted: the diagram and playground internals of learn, sky3d, the SVG charts and wheels (they use the older diagram, wheel and timeline maps), history (app redirect), the mobile-only screens (more, offline, reminders, day/[ad], onboarding), and the remaining panchanga helper screens with no web page.

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
