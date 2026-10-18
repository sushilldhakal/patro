# Vedic Patro

Nepali Bikram Sambat calendar, panchanga, kundali, muhurta and sky view — the
API, the website (vedicpatro.com) and the iOS/Android app in one repository.

```
apps/
  api/      FastAPI · Python · Swiss Ephemeris   (was github.com/sushilldhakal/patro)
  web/      React + Vite, pre-rendered           (was dhakal-patro)
  mobile/   Expo + React Native                  (was vedic-patro-mobile)
packages/
  features/       page logic: one hook per page (data, state, rows, copy) — both apps draw it
  ui/             UI kit: Box, Text, Pressable, Card, Button, Icon, Table, Sheet (HTML + Tailwind / React Native + NativeWind)
  api-client/     API response types and query keys used by both apps
  design-tokens/  colours, the shared type scale, radii, per-page class maps
  i18n/           the Nepali/English catalogue (strings.ts → ne.json / en.json) and the one translator
  domain/         the domain model: pure logic and reference data, no API types
  read-models/    helpers that turn API responses into what a page shows
  icons/          which icon means what
```

The three apps were imported with their full git history (`git log -- apps/web`).

## Working on it

Node 22+ and npm. The API also needs Python 3.11+ (see `apps/api/README.md`).

```bash
npm install            # every workspace, one lockfile at the root
npm run web            # website dev server
npm run mobile         # Expo dev server
npm run typecheck      # both apps (Turborepo)
npm run lint           # shared-package checks (+ each app's own lint)
```

Shared code lives in `packages/` and is imported by name, e.g.
`import { buildWordTrack } from "@vedic-patro/domain/word-tracking"`. Packages ship
TypeScript source; there is no build step.

- **Change a page's behaviour** (what it loads, its rows, search, sort): edit
  its hook in `packages/features/src/<page>/` — both apps follow. Pages not yet
  moved there still have a copy in each app; see `packages/features/README.md`.
- **Change copy:** edit `packages/i18n/src/strings.ts`, then `npm run i18n`.
  Never type text into a component; `npm run check:copy` fails on new inline
  Nepali text in `apps/*`.
- **Build UI** with `@vedic-patro/ui` and the page's class map, so the same
  JSX reads the same on the website and in the app.
- **Change a colour:** edit `packages/design-tokens/src/index.ts`, then
  `npm run tokens` (writes the CSS blocks in both apps).
- **Domain code** must stay plain TypeScript with no React, React Native or
  browser APIs, and no API response types — `npm run lint -w @vedic-patro/domain`
  checks it. Code that reads a response goes in `packages/read-models`; class
  names go in `packages/design-tokens`. See [docs/DDD-PLAN.md](docs/DDD-PLAN.md).

## Deploying

- **API + website:** every push to `main` runs `.github/workflows/deploy.yml`,
  which runs `scripts/deploy.sh` on the server. It deploys only what changed
  since the last successful deploy: `apps/api` restarts the FastAPI service,
  `apps/web` or `packages/` rebuilds and publishes the website. Force one with
  `FORCE_DEPLOY=all|api|web`.
- **Mobile:** unchanged — build and submit with EAS from `apps/mobile`
  (`npm run build:ios -w @vedic-patro/mobile`, `eas submit …`). EAS supports
  npm workspaces; it uploads the repo and installs from the root lockfile.
- **CI** (`.github/workflows/ci.yml`) type-checks both apps and lints the
  shared packages on every push and pull request.

## Releasing the mobile app
See [docs/RELEASING.md](docs/RELEASING.md): `npm run release:check`, then `npm run release` builds and submits iOS (TestFlight) and Android (internal, draft) — nothing goes public until you promote it.
