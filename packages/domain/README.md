# @vedic-patro/domain

Pure logic and reference data that the website (`apps/web`) and the mobile app
(`apps/mobile`) both use — one copy, imported as `@vedic-patro/domain/<file>`.

Rules (checked by `npm run lint -w @vedic-patro/domain`, which Turborepo runs):

- Plain TypeScript (`.ts`): no React, React Native or browser APIs.
- Imports only from other files in this package (`./x`).
