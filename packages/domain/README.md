# @vedic-patro/domain

Pure logic and reference data that the website (`apps/web`) and the mobile app
(`apps/mobile`) both use — one copy, imported as `@vedic-patro/domain/<file>`.

Rules (checked by `npm run lint -w @vedic-patro/domain`, which Turborepo runs):

- Plain TypeScript (`.ts`): no React, React Native or browser APIs.
- Imports only from other files in this package (`./x`), plus `clsx`, `tailwind-merge`, `three` and `healpix-ts` (pure JS).
- The one outside import allowed is `import type { … } from "@vedic-patro/api-client"`
  (API response shapes). It is type-only, so there is no runtime dependency
  between the packages even though api-client imports `Era` from here.
- Language and copy come from the app: each app calls `configureLocale` (see
  `locale.ts`) once at start-up with its current language and catalogue lookup.

What stays in each app on purpose (platform, not duplication): Tailwind class
tables whose tokens differ (`patro-classes`, `wheel-classes`, `timeline-classes`,
`wheel-svg-classes`), asset/texture loading (`sky-textures`, `nebula-sources`,
`hips-config`, `month-art`, `wheel-glyph-art`), the 3D sun-earth-moon maths
(unit space in the app, pixel space on the site), API request modules, storage,
hooks and anything that needs React, a browser or React Native.
