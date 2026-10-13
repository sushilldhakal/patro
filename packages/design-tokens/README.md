# @vedic-patro/design-tokens

The design's values, once, for the website (`apps/web`) and the app
(`apps/mobile`): colours, type, spacing, radii, shadows, sizes, motion and
breakpoints. The values are the website's — it is the design's source of truth.

| File | What |
| --- | --- |
| `src/color.ts` | brand + midnight palettes, the semantic roles per theme (`light`, `dark`), tint recipes, the दिन-चक्र wheel palette, `mobileRoles()` (the website's roles, unchanged) |
| `src/illustration.ts` | the artwork palette (diagrams, wheels, the sky scene): `illustration.amber67` etc., near-identical colours merged. Names are hue family + lightness % |
| `src/scale.ts` | type scales (page `webTypeScale`, diagram labels `diagramTypeScale`), spacing, radii, shadows (`cssShadow`, `nativeShadow`), effects, icon and control sizes, motion, breakpoints |
| `src/classes/*-classes.ts` | per-page class maps (`holidaysClasses`, `kundaliClasses` ...): the page's whole styling, read by both apps. See `src/classes/README.md` |
| `src/specs.ts` | `spec`: the Tailwind classes of the page building blocks (card, label, page title, stat card, table cells ...). Both apps render these strings, so a card cannot differ between them |

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

## Platform differences

There are almost none. The website's values are used as they are, including
the radii (4.8/8.8 px), the roles (`accent` is the gold highlight, `success` the
positive tone, `danger` the status red), muted text and the dark-theme tints.

- **Units** — NativeWind counts 1 rem as 14 px on iOS/Android, so the app's
  Tailwind config (generated here) states spacing, font sizes, radii and
  max widths in px. `p-4` is 16 px in both.
- **Shadows** — native draws one layer, so the app's `shadow-sm|md|lg` use the
  website's deepest layer (`boxShadow` in `mobile-tailwind.json`); inline native
  styles use `nativeShadow("md")`. Android turns the offset into `elevation`.
- **Touch and safe areas** — `size.touchTarget` (44 px) and the device insets are
  the app's alone.

## Rules for apps

- No hand-typed colours, font sizes, radii, paddings or shadows. Use Tailwind
  classes from the scale, `spec.*`, or the TS values here. `npm run check:design`
  counts violations per file against `scripts/design-baseline.json` and fails
  when any file gets more; write `design-ok` in a comment on the line (or
  `design-ok-file`) for real artwork geometry.
- Colours in artwork: `illustration.*`, `brand.*`, `midnight.*`, `neutral.*`,
  `wheel.*`; with opacity `withAlpha(token, 0.4)`. In class names:
  `bg-ill-amber67`, `text-ill-brand-saffron`.
- Type: `text-diagram-2xs|xs|sm` (8/10/12 px) for labels inside diagrams;
  everything else is the page scale. The app's `Text` takes a `variant` from
  `spec` (or a type class) and strips inline `fontSize`. Colour comes from the
  class (`text-foreground`, `text-danger`, …), not from a JavaScript override.
- Add a new building block (a card variant, a chip) to `src/specs.ts` and use it
  in both apps; add a colour to `src/illustration.ts`, then `npm run tokens`.

Equal tokens do not guarantee equal pixels: browsers and native text engines
round line boxes differently, iOS adds no extra leading to Devanagari while
browsers do, and default control styles differ. Compare on device.
