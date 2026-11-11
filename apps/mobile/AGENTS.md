# Mobile app conventions

## No WebView for product UI

- **Never** load vedicpatro.com (or other website URLs) inside `react-native-webview` for Learn, panchanga, calendar, or any in-app screen the user treats as part of the app.
- Each route under `app/` should be implemented with **native** React Native components (Expo Router screens, shared UI in `components/`).
- The **only** supported integration with the web stack is the **HTTP API** (`apiBaseUrl` in `app.json`) — same backend as production.

## Learn content

- Topic list: `lib/learn/learn-topics-meta.ts`
- Article bodies: `components/learn/articles/` + registry `lib/learn/learn-topics.ts`
- Cross-links use `LearnLink` / `LearnAppRouteLink` in `LearnProse.tsx` (Expo Router), not external URLs.
- `history` is a dedicated native screen at `app/(tabs)/learn/history.tsx`.

### Learn diagrams

The Learn diagrams draw what the website draws. A figure or study is ported
from the website's file and keeps its geometry, timeline, colours and class
constants (`@vedic-patro/design-tokens/classes/*`, read through `useSvgClass`
/ `useTm` in `components/learn/study/study-ink.ts`), so a fix on either side is
easy to carry across. The frame and controls are `components/learn/study/`.

Three things, and they are not interchangeable:

| | Where | What it is |
|---|---|---|
| Figures & studies | `components/learn/figures/`, `components/learn/studies/` | Ports of the website's own SVG figures and interactive studies (`apps/web/src/components/learn`), drawn with `react-native-svg`. Registry: `lib/learn/learn-diagrams.tsx`. |
| Diagrams | `components/learn/diagrams/` | The hand-ported राशि-from-stars study, today's hora, and the reference tables. |
| Playground | `components/learn/playground/` | **One** scene for every topic, configured per slug. |

The playground is a port of the web app's `DayPlaygroundStudy` + `DaySimScene`,
and it is meant to stay one. Its geometry files (`DaySimScene.tsx`,
`EclipticWheel.tsx`) and its maths (`lib/sky3d/day-mechanics.ts`) are kept
line-for-line with the web's so a fix on either side is a diff the other can
take verbatim — the places where the platform forced a change are marked
`── native ──`. See `docs/learn-playground.md` before editing them.

Which topics carry a playground, and what each one opens with, is
`lib/learn/playground-config.ts`. A topic with no entry gets none, which is the
right default for the ones the sim cannot honestly illustrate.

## Patro date + location UI

Single source: `components/patro-date/`.

| Mode | Use case | Component |
|------|----------|-----------|
| `year` | Suryakranti, holidays, yearly graha | `PatroDateNav mode="year"` or `PatroYearDateNav` |
| `year-month` | Home calendar month browse | `PatroDateNav mode="year-month"` |
| `year-month-time` | Panchanga day + clock | `PatroDateNav mode="year-month-time"` or `PanchangaDateNav` |

Phone: date/location chips + bottom sheet with **Date | Location** tabs. Tablet: inline pickers (web md+ parity). Era toggle in sheet: **BS↔BBS** or **AD↔BC** (follows the browsed era, never the language). Language and calendar system (BS | AD, `CalendarSystemToggle`) are independent preferences.

Do not add new date picker UIs outside this folder.


- Opening the **system browser** via `expo-web-browser` for optional external links (privacy policy, support) — not embedding the site in-app.
