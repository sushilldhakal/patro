# Plan: one UI source of truth, 4 agents in parallel

Goal: every screen's design lives once in `packages/` (`ui`, `features`, `design-tokens`); `apps/web` and `apps/mobile` only mount it. Change a file in `packages/`, both apps change. Web is the design reference (see `design-parity.md`).

Today: data, logic, copy, tokens, class maps, API are shared. About 120 components still exist twice (web ~50k lines, mobile ~53k lines) and `packages/ui` is 8 primitives / ~600 lines.

## How the 4 agents never touch the same file

1. **Own by folder.** Each agent owns a fixed list of folders and pages below. A file not on your list is read-only for you.
2. **One git worktree + branch per agent**, cut from the same commit after Phase 0:
   ```bash
   git worktree add ../wt-a1 -b agent/a1-shell dev
   git worktree add ../wt-a2 -b agent/a2-panchanga dev
   git worktree add ../wt-a3 -b agent/a3-jyotish dev
   git worktree add ../wt-a4 -b agent/a4-learn-sky dev
   ```
   (run `npm install` once in each). Disjoint files mean the four branches merge with no conflicts.
3. **Each agent writes its new shared code into its own folder** in `packages/ui/src/kit/<area>/` (made in Phase 0). No agent edits another agent's folder or any file under "Integrator only".
4. **Missing primitive?** Build it inside your own `kit/<area>/` folder from the existing 8 primitives. Do not touch `packages/ui/src/{web,native}/`. Phase 2 promotes duplicates.
5. **Never delete a file that something outside your area imports.** Grep first. If outside importers exist, leave a one-line re-export at the old path and list it in `docs/agent-handoff/<agent>.md`. Phase 2 removes the shims.
6. **Need new copy (a string)?** Do not edit `packages/i18n/src/strings.ts`, `en.json`, `ne.json`. Write the key and both texts in `docs/agent-handoff/<agent>.md`. Phase 2 adds them.
7. **Typecheck noise.** Other agents are mid-change in their worktrees, but your worktree only contains your edits, so `npx turbo run typecheck` is clean for you. Fix everything it reports.

### Integrator-only files (no agent edits these)
`package.json` (any), `package-lock.json`, `turbo.json`, `scripts/**` (incl. `design-baseline.json`, `shared-classes-baseline.json`, `copy-baseline.json`), `packages/ui/src/{contract.ts,classes.ts,web/**,native/**}`, `packages/ui/package.json`, `packages/ui/scripts/**`, `packages/i18n/**`, `apps/web/src/App.tsx` / router, `apps/mobile/app/_layout.tsx` and every `_layout.tsx`, `packages/design-tokens/src/index.ts`, `docs/*.md` except your own handoff file.

---

## Phase 0: scaffolding (one person/agent, before the 4 start, ~1 hour)

Removes every shared choke point so Phases 1 can run in parallel.

1. `packages/ui/package.json`: add a wildcard export so each area has its own entry and nobody edits a shared barrel:
   ```json
   "./kit/*": { "react-native": "./src/kit/*/native.ts", "default": "./src/kit/*/web.ts" }
   ```
2. Create stubs `packages/ui/src/kit/{shell,panchanga,jyotish,learn}/` each with `contract.ts`, `web.ts`, `native.ts` (empty exports) and `web/`, `native/` folders.
3. Extend `packages/ui/scripts/check-platforms.mjs` to apply its rules (web has no RN, native has no DOM, both halves export what `contract.ts` names, no hex, no copy) inside every `kit/<area>/`.
4. `packages/design-tokens/package.json`: confirm a wildcard export `./classes/*` exists so a new class map is imported by deep path, not through `index.ts`. Add it if missing.
5. Make `scripts/check-shared-usage.mjs` and `check-design-drift.mjs` accept a `--files <glob>` flag so each agent can check only their area (read-only; they never write baselines).
6. Create `docs/agent-handoff/` (empty, one file per agent).
7. Commit. Cut the four worktrees from this commit.

---

## Phase 1: four agents in parallel

### The recipe every agent follows, per component pair
For a component that exists in `apps/web/src/components/<x>` and `apps/mobile/components/<x>`:
1. Read both. Web is the truth for look and behaviour. Note intentional platform differences (safe area, 44px touch target, scrolling, SVG vs react-native-svg).
2. Logic that is not drawing: move to `packages/features/src/<area>/` (hook) or `packages/domain` (plain function). Already there? Reuse it.
3. Look: Tailwind classes go in `packages/design-tokens/src/classes/<area>-classes.ts` (existing file you own) or a new file under `classes/<area>/`. Colours and sizes only from tokens.
4. Drawing: write the component once in `packages/ui/src/kit/<area>/` as `contract.ts` props + `web/<Name>.tsx` + `native/<Name>.tsx`, built from `Box/Text/Pressable/Card/Button/Icon/Table/Sheet`. Genuinely platform-only pieces (3D canvas, SVG internals) keep two drawing halves but share props, geometry and classes.
5. Replace both app copies with the import. Delete the app copies (rule 5 above).
6. Check (your worktree only): `npx turbo run typecheck lint test --filter=./packages/*`, `npm run check:shared`, `npm run check:copy`, `npm run check:classes`, `npm run check:design -- --files <your folders>`. Do not run `--write` on any baseline.
7. Work in this order inside your area: smallest components first, one commit per component family (`mobile+web: share <Family> in packages/ui`), so a stalled agent leaves a clean branch.
8. Do not build or run emulators/simulators/browsers; the owner tests on devices. Report what changed.

### Agent 1: Shell, home, auth, kit foundation
Owns, web: `components/{auth,common,seo,related,patro-date,patro-page,home,ui}`, root files in `components/*.tsx`, pages `Home, Account, ResetPassword, VerifyEmail, Legal, Holidays, Converter, Ritu, SunTimesYear, AbhijitMuhurta, PanchakPatro, ShantiVidhi` (and any page not listed under another agent).
Owns, mobile: `components/{auth,branding,icons,navigation,notifications,offline,onboarding,legal,seo,related,suryakranti,home,patro-date,ui}`, root files, routes `index, more, offline, reminders, holidays, converter, ritu, sun-times, abhijit-muhurta, panchak-patro, shanti-vidhi, account/*, day/[ad], privacy, terms, reset-password, verify-email, +html`.
Shared code: `packages/ui/src/kit/shell/**`, `packages/features/src/{home,account,legal,holidays,converter,ritu,sun-times,abhijit,panchak,shanti,common}/**`, class maps `{home,patro,patro-date,calendar*,shell,account,holidays,converter,ritu,sun-times,abhijit,panchak,shanti,legal,seo}-classes.ts`.
Tasks:
- Fix the 3 web drift files `PatroCalendarHeader`, `PatroDayTimeHeader`, `PatroHeaderLocation` (`[Npx]` classes to tokens).
- Share: `SiteFooter`, `PatroCalendarHeader`, `PatroDayTimeHeader/Panel`, `PatroHeaderTabs`, `PatroMonthYearNav`, `PatroYearHeader`, `PatroYearNavBlock`, `PatroTableShell`, `HomeQuickLinks`, `HomeVedaMantra`, `HomeRashifalSignPicker`, `TodayHighlightCard`, `StatCard`, `AccountMenu`, `AuthDialog`, `LanguageSwitcher`, `MobileNavMenu`, `BsCalendarGrid`, `BsNativeSelect`, `RelatedPageLinks`, `SeoContentSection`, `VedicPatroLoader`.
- Bring the mobile-only screens (`reminders` 603 lines, `offline-data` 444, `more` 237, `day/[ad]`) onto class maps and a features hook.
- Write `docs/agent-handoff/a1.md`: list of every app-local primitive in `components/ui/*` (web and mobile) with its callers across the repo and the proposed shared primitive. This is the input for Phase 2.

### Agent 2: Panchanga family
Owns, web: `components/{panchanga,avakahada,graha,gochar,dainikKranti,nakshatra}`, pages `Panchanga, PanchangaYear, PanchangaDetailsHub, PanchangaOgPreview, AvakahadaChakra, DainikKranti, Gochar, AakashGochar, GrahaAsta, GrahaVakri, EclipsePage, ElementPage`.
Owns, mobile: `components/{panchanga,avakahada,graha,gochar,dainikKranti}`, routes `panchanga/*`, `dainikkranti, gochar, aakash-gochar, chandrakranti`.
Shared code: `packages/ui/src/kit/panchanga/**`, `packages/features/src/{panchanga,panchanga-details,panchanga-drawing,panchanga-element,panchanga-year,avakahada,graha,gochar,aakash-gochar,dainik-kranti}/**`, class maps `{panchanga*,av-wheel,avakahada,graha,gochar,dainik-kranti,wheel,wheel-svg,timeline,diagram}-classes.ts`, `src/panchanga-classes.ts` is shared with nobody else (check).
Tasks:
- Fix the drift in `WheelChart` (web, mobile, mobile `.web`): hex and rgb to tokens.
- Share: `PanchangaLayout`, `PanchangaSections`, `PanchangaSidebarNav`, `PanchangaMonthGrid`, `PanchangaVivaranPanel`, `MonthLagnaMatrix`, `MonthGrahaSpashta`, `MonthCalcNotes`, `NavataraBalamCardGrid`, `PlanetEventsPanel`, `PlanetSelectMenu`, `GhatiClock`, `DayTimeline`, graha cards, gochar sections, dainik kranti tables.
- Wheels (`PanchangaWheel`, `WheelChart`, `AvakahadaWheel`, `GocharKundaliChart`, `D1Chart`): share geometry, labels and classes; keep two SVG drawing halves behind one props contract.

### Agent 3: Jyotish and life
Owns, web: `components/{kundali,vastu,rashifal,sait,documents}`, pages `Kundali, KundaliDetail, KundaliMilan, Vastu, Rashifal, MarriageSait, SaitPage, Documents, DocumentDetail, DocumentChapterDetail`.
Owns, mobile: `components/{kundali,vastu,rashifal,sait,documents}`, routes `kundali/*, kundali-milan, jyotish/*, vastu, rashifal, vivah-sait, sait/*, documents/*`.
Shared code: `packages/ui/src/kit/jyotish/**`, `packages/features/src/{kundali,vastu,rashifal,sait,documents}/**`, class maps `{kundali,kundali-detail,vastu,rashifal,sait,documents}-classes.ts`.
Tasks:
- Share: `KundaliReport`, `KundaliSectionNav`, `KundaliSidebarSubnav`, `ProfileForm`, `KundaliProfilePicker`, `KundaliMilanResult`, `OwnerCompatibility`, `DashaTree`, `DashaSystemPanel`, `Shadbala*`, `BhavaBala*`, `BhavaDetailDialog`, `DivisionalChartCompare`, `AshtakavargaCard`, `VimshopakaCard`, `HouseRequirementsForm`, `PlotPlanner`, `VastuCompassRing`, `VastuPurushaWheel`, rashifal cards, sait cards and layout, `DocumentCard`, `DocumentJumpForm`.
- Decide and resolve the known differing copies: `KUNDALI_SECTIONS` / `dashaSystemFromSection`, vastu `PlotState`, `profileToInput` (web wins, record the choice in `a3.md`).

### Agent 4: Learn, sky and tithi mechanics
Owns, web: `components/{learn,sky3d,tithi-mechanics}`, `lib/learn/**`, pages `Learn, LearnArticle`.
Owns, mobile: `components/learn`, `components/sky3d`, `lib/learn*`, routes `learn/*, history`.
Shared code: `packages/ui/src/kit/learn/**`, `packages/features/src/{learn,sky3d}/**`, `packages/domain/src/{learn,sky3d,history}/**`, class maps `{learn,learn-page}-classes.ts`.
Tasks:
- Unify the two article renderers (`article-render.tsx` web and mobile) behind one block contract in `kit/learn` (markup `**strong** *teal* ~amber~ \`num\` [[slug|label]]` parsed once in `domain`).
- Share learn chrome and cards: `LearnMoreCard`, `ChapterOverlay`, `ChapterStill`, `PlaybackBar`, `DayChapterPlayer`, `EotGraph`, `EarthRotationDiagram`, `EclipticWheel`, `ServerPipelineDiagram`, `TwoSystemsStudy`, `SkyTimeSheet`, `CompassControl`.
- sky3d and tithi-mechanics: 3D scene code stays two halves on purpose. Hoist anything still identical (geometry, labels, time steps) into `packages/domain/src/sky3d`; do not force a rewrite of the renderers.
- Largest area by line count (~46k) but most of it is data or per-platform 3D; expect the smallest net deletion.

---

## Phase 2: integration (one person/agent, after all four finish)

1. Merge the four branches (no conflicts expected), then resolve the shims in each handoff file.
2. Promote duplicated local primitives (from `a1.md` and each area's local helpers) into `packages/ui/src/{web,native}` and `contract.ts`; update `UiKit`.
3. Migrate remaining callers of `apps/*/components/ui/*` to the shared kit; delete those files (12 web, 14 mobile).
4. Add copy listed in the handoff files (`npm run i18n`).
5. Regenerate baselines once: `npm run check:design -- --write`, and the classes baseline. The design baseline should reach zero hand-typed values.
6. Add a CI guard `check:duplicates`: a component basename present in both `apps/web/src/components` and `apps/mobile/components` fails unless on a short documented per-app list (3D scenes, SVG internals).
7. Full pre-push list from `MONOREPO-HANDOFF.md` (typecheck, lint, test, checks, web build with 63 prerendered pages, `expo export`).
8. Owner tests web and phone screens by hand (no automated screenshot comparison exists).

## Order and timing
Phase 0 (serial) then Phase 1 (A1..A4 parallel, each its own worktree) then Phase 2 (serial). Agents never wait on each other: A2..A4 import only the 8 existing primitives and their own `kit/<area>` code.

## Definition of done
- Zero component names present in both apps outside the documented per-app list.
- `check:design` baseline is all zeros and `check:duplicates` passes in CI.
- Changing a class map, a `kit/*` component or a `features` hook changes both apps with no other edit.
