# @vedic-patro/read-models

Helpers that read the API's responses (`@vedic-patro/api-client` types) and turn
them into what a page shows — rows, labels, figures, wheel and timeline data.
Both apps import them by path, e.g.
`import { formatTithiEnd } from "@vedic-patro/read-models/panchanga-format"`.

Why a separate package: `@vedic-patro/domain` is the domain model and must not
depend on the API contract (`npm run lint -w @vedic-patro/domain` enforces it).
Anything that takes a `PanchangaDay`, `CalendarDay` or another response type
lives here instead. When a file exists in both packages under the same path,
the domain half holds the pure part and the file here re-exports it, so
importing everything from `read-models/<path>` always works.

Rules (`npm run lint -w @vedic-patro/read-models`): plain `.ts`, no browser or
platform APIs, imports only `@vedic-patro/domain/*` and `import type` from
`@vedic-patro/api-client`.
