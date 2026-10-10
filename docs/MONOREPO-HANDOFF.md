# Monorepo handoff — read this first in a new session

Branch: `monorepo` (do NOT merge to `main`: the iOS app is in App Store review; this ships with the next mobile release). Keep pushing to `monorepo`.

Rule the owner set: **web is the source of truth.** Where the website and the app differ, the web version wins and the app adopts it. One copy of anything shared, in `packages/`.

## Layout
`apps/api` (FastAPI) · `apps/web` (React+Vite) · `apps/mobile` (Expo) · `packages/{domain,i18n,design-tokens,api-client}`. npm workspaces + Turborepo, one root lockfile.

- `packages/domain` — plain TS shared logic/data, imported as `@vedic-patro/domain/<path>`. Lint (`npm run lint -w @vedic-patro/domain`) allows imports only from the package, `import type` from `@vedic-patro/api-client`, and `clsx`, `tailwind-merge`, `three`, `healpix-ts`. No React / browser / React Native.
- Language and copy: each app calls `configureLocale` once (`domain/locale.ts`); web in `apps/web/src/i18n/index.ts`, mobile in `apps/mobile/lib/i18n.tsx`. Copy lives in `packages/i18n/src/strings.ts` (run `npm run generate -w @vedic-patro/i18n` after editing).
- Learn chapters are data (`domain/src/learn/articles/**`), rendered by `apps/web/src/lib/learn/article-render.tsx` and `apps/mobile/components/learn/article-render.tsx`. Inline markup: `**strong**`, `*teal*`, `~amber~`, `` `num` ``, `[[slug|label]]` link. A literal tilde in prose is written `∼`.

## Checks before every push
```
npx turbo run typecheck
npm run lint -w @vedic-patro/domain
npm test -w @vedic-patro/api-client          # URL contract
npm run build -w @vedic-patro/web            # prerenders 63 pages
cd apps/mobile && npx expo export --platform all --clear
git checkout apps/mobile/store/assets/feature-graphic.png   # postinstall regenerates it — never commit it
```
Commit trailers: `Co-Authored-By` + `Claude-Session` lines as in earlier commits.

## What stays per app on purpose (not duplication)
Tailwind class tables with different tokens (`patro-classes`, `wheel-classes`, `timeline-classes`, `wheel-svg-classes`); asset/texture loading (`sky-textures`, `nebula-sources`, `hips-config`, `month-art`, `wheel-glyph-art`); the 3D sun-earth-moon maths (unit space in the app, pixel space on web); API request modules and storage; React hooks; route tables, icon maps, app-only nav (`panchanga-sidebar-nav`, `related-page-links` paths); mobile-only `panchanga-detail-cells`, `wheel-scrub`, `sait-suitability-style`, `element-routes`, `panchanga-shell-paths`, `bs-range` (1700–2200 picker limits).

## Still open
- Visual review of the converted Learn pages in a browser (text/structure verified, pixels not).
- Remaining same-named duplicates are hooks or asset/UI files; re-run `scripts/monorepo-tools/closure.py` to list any pair still movable.
- Stale web scripts `extract-bhava-reference-content.mjs`, `extract-vastu-content.mjs` point at files that no longer exist (pre-existing).
- `apps/web/src/lib/learn/learn-topics-meta.ts` and mobile `learn-library.ts` map the shared library icons per app.

## Behaviour changes the app picked up from web
See `docs/monorepo-mobile-behaviour-changes.md` (dasha year length, BS table range, catalogue copy, etc.) — review before release notes.

## Tools used (saved in `scripts/monorepo-tools/`, paths hard-coded to /home/user/patro)
`mv.py` move web files into domain and rewrite imports · `closure.py` list pairs movable into domain · `convert.mts` / `hwc.mts` JSX chapters → article data · `parity.mts` word-level text parity.
