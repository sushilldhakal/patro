# Rules for every agent (third pass)

Goal: every screen's design is written ONCE in `packages/` and `apps/web` / `apps/mobile` only import it. Web is the source of truth for look and behaviour. Four agents work at the same time in separate git worktrees; edit only the files your prompt lists, so the branches merge with no conflicts.

## Kit (what exists)
`@vedic-patro/ui` core has 9 primitives: Box (`widthPercent`), Text, Pressable, Input, Card, Button (`label` or `children` + `ariaLabel`), Icon, Table, Sheet (`maxHeightPercent`). Shared components live in `packages/ui/src/kit/<area>/` (`contract.ts`, `web/<Name>.tsx`, `native/<Name>.tsx`, exported from `web/index.ts` and `native/index.ts`), imported as `@vedic-patro/ui/kit/<area>`. Class maps import by deep path: `@vedic-patro/design-tokens/classes/<folder>/<file>`. Look at an existing kit area for the pattern.

## Never touch (integrator only)
Any `package.json`, `package-lock.json`, `turbo.json`, `scripts/**`, baselines, `packages/i18n/**`, `packages/ui/src/{contract.ts,classes.ts,web/**,native/**}`, any `_layout.tsx`, the web router/App, `docs/*.md` other than your own `docs/agent-handoff/<you>.md`, and any file not in your prompt's list. New strings and missing core primitives go in your handoff file, not in those packages.

## "They are different" is not a reason
Routers, links, navigation, icon sets, device APIs, assets, fonts and app motion helpers never justify two copies. Pass them in as props, callbacks or slots (`onPress` + `href`, `renderLink`, `renderChart`, an icon or asset prop); the app-side file is a thin binder. Native kit files cannot import `lucide-react`, DOM, a router or an app module, and each native `Text` carries its own type classes (React Native does not inherit type). Charts and wheels are shareable: one props contract, data prep and geometry in `packages/domain` or `packages/features`, colours from design tokens, and two SVG halves (web `<svg>`, native `react-native-svg`). Truly 3D scenes (three.js, textures) stay two halves. If something cannot be shared, write the exact technical reason in your handoff file; "it is large", "it uses the router", "different icon set" are not reasons.

## Per component
Read both copies, keep the web look, put non-drawing logic in `packages/features` or `packages/domain`, classes in the class maps, draw once in the kit. Colours and sizes only from design tokens. No inline Nepali text (existing keys through `useTranslation`). Delete both app copies after moving, but grep first: if a file you do not own imports the old path, leave a one-line re-export there and list it under "Shims" in your handoff file. Do not change calculation results (the official patro uses siddhantic ganita; degree differences are not bugs).

## Working
One commit per family: `mobile+web: share <Family> in packages/ui`. No emulators, simulators or browsers; the owner tests on devices. Verify in your worktree: `npx turbo run typecheck` (must be fully clean, web and mobile), `npx turbo run lint test --filter=./packages/*`, `npm run check:shared`, `npm run check:copy`, `npm run check:classes`, `npm run check:design`. Never run a check with `--write` or edit a baseline. Final report: what moved, what is still two copies with the exact reason, shims created, remaining duplicate names in your folders.
