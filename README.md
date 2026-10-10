# Vedic Patro

Nepali Bikram Sambat calendar, panchanga, kundali, muhurta and sky view — the
API, the website (vedicpatro.com) and the iOS/Android app in one repository.

```
apps/
  api/      FastAPI · Python · Swiss Ephemeris   (was github.com/sushilldhakal/patro)
  web/      React + Vite, pre-rendered           (was dhakal-patro)
  mobile/   Expo + React Native                  (was vedic-patro-mobile)
packages/
  api-client/     API response types and query keys used by both apps
  design-tokens/  colours, the mobile type scale, radii
  i18n/           the Nepali/English catalogue (strings.ts → ne.json / en.json)
  domain/         pure logic and reference data used by both apps
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

- **Change copy:** edit `packages/i18n/src/strings.ts`, then `npm run i18n`.
- **Change a colour:** edit `packages/design-tokens/src/index.ts`, then
  `npm run tokens` (writes the CSS blocks in both apps).
- **Domain code** must stay plain TypeScript with no React, React Native or
  browser APIs — `npm run lint -w @vedic-patro/domain` checks it.

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
