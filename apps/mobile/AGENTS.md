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

### Learn 3D

Two separate things, and they are not interchangeable:

| | Where | What it is |
|---|---|---|
| Diagrams | `components/learn/diagrams/` | One scene per idea, wrapped in `LearnDiagram3D`. Small, fixed, illustrative. |
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

Phone: date/location chips + bottom sheet with **Date | Location** tabs. Tablet: inline pickers (web md+ parity). Era toggle in sheet: **BS↔BBS** (Nepali) or **AD↔BC** (English).

Do not add new date picker UIs outside this folder.


- Opening the **system browser** via `expo-web-browser` for optional external links (privacy policy, support) — not embedding the site in-app.
