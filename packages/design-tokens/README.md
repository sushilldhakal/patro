# @vedic-patro/design-tokens

The design's values, once, for the website (`apps/web`) and the app
(`apps/mobile`): colours, type, spacing, radii, shadows, sizes, motion and
breakpoints. The values are the website's — it is the design's source of truth.

| File | What |
| --- | --- |
| `src/color.ts` | brand + midnight palettes, the semantic roles per theme (`light`, `dark`), tint recipes, the दिन-चक्र wheel palette, `mobileRoles()` |
| `src/scale.ts` | type scales, spacing, radii, shadows (`cssShadow`, `nativeShadow`), icon and control sizes, motion, breakpoints |

## How each app reads them

- **Website** — CSS variables. `npm run tokens` writes generated blocks into
  `apps/web/src/index.css` (roles, status colours, shadows, motion, radius base,
  the Tailwind `@theme` type scale, breakpoints and tinted surfaces, the wheel
  palette). Components keep using Tailwind utilities (`bg-card`,
  `text-muted-foreground`, `text-sm`, `rounded-lg`); TS that needs a value imports
  it (`minWidthQuery("xl")`).
- **App** — typed TS values. `lib/theme.ts`, `lib/nativewind-theme-vars.ts` and
  `lib/responsive.ts` import this package; `tailwind.config.js` (CommonJS) reads
  `generated/mobile-tailwind.json`; `npm run tokens` also writes the
  `--tw-*` channel blocks into `apps/mobile/global.css`. Brand colours in
  components are `brand.*`, never typed-in hex.

Change a value here, run `npm run tokens` at the repo root and commit the
generated files. `npm run lint -w @vedic-patro/design-tokens` fails when they are
stale; `npm test -w @vedic-patro/design-tokens` covers the colour maths.

## Deliberate platform differences

Kept apart in the tokens rather than forced equal:

- **Type** — the app has four larger sizes (15/18/22/28 px, line height ~1.6 for
  Devanagari matras); the website uses the Tailwind scale from 10.8 px.
- **Radii** — the app's touch cards are rounder (8/12 px) than the website's
  (4.8/8.8 px from a 0.3 rem base).
- **Roles** — `mobileRoles()`: the app's `accent` is the positive tone (green on
  light, gold on dark), native muted text is full ink, dark tints are stronger.
- **Units** — NativeWind counts 1 rem as 14 px on iOS/Android, so `p-4` is 14 px
  in the app and 16 px on the website; use `space` (px) where a size must match.

Equal tokens do not guarantee equal pixels: browsers and native text engines
round line boxes differently, iOS adds no extra leading to Devanagari while
browsers do, and default control styles differ. Compare on device.
