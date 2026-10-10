# @vedic-patro/domain

Pure logic and reference data that the website (`apps/web`) and the mobile app
(`apps/mobile`) both use — one copy, imported as `@vedic-patro/domain/<file>`.

Rules (checked by `npm run lint -w @vedic-patro/domain`, which Turborepo runs):

- Plain TypeScript (`.ts`): no React, React Native or browser APIs.
- Imports only from other files in this package (`./x`).
- The one outside import allowed is `import type { … } from "@vedic-patro/api-client"`
  (API response shapes). It is type-only, so there is no runtime dependency
  between the packages even though api-client imports `Era` from here.
- Language and copy come from the app: each app calls `configureLocale` (see
  `locale.ts`) once at start-up with its current language and catalogue lookup.
