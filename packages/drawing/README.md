# @vedic-patro/drawing

Drawing geometry that the UI kit (`packages/ui`), the page hooks
(`packages/features`) and both apps share — imported as
`@vedic-patro/drawing/<context>/<file>`, grouped by the same context folders as
the domain.

It is presentation (radii, sector paths, chart positions, timeline lanes, the
learn scenes' three.js objects), so it does not belong in `packages/domain`; and
the page hooks read some of it, so it cannot live in `packages/ui`, which the
hooks may not import. It sits beside the domain, below both.

Rules (checked by `npm run lint -w @vedic-patro/drawing`, which Turborepo runs):

- Plain TypeScript (`.ts`): no React, React Native or browser APIs.
- Imports only from this package, `@vedic-patro/domain/*` and `three`.
