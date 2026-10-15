# @vedic-patro/features

Page logic shared by the website (`apps/web`) and the mobile app
(`apps/mobile`). One folder per page, one hook per page:

```ts
import { useHolidaysPage } from "@vedic-patro/features/holidays";

const page = useHolidaysPage({ year, era });
page.copy.title;        // copy, already translated
page.tabs;              // [{ id, label, count, countLabel, active }]
page.columns, page.rows, page.toggleSort, page.search, page.setSearch;
page.status;            // "loading" | "error" | "ready"
```

The hook decides everything about the page that is not drawing: what is
fetched (API call, cache key, stale time), state (tab, search, sort), how API
records become rows and the copy. Each app's page only lays out what the hook
returns, with `@vedic-patro/ui` and the page's class map. So a change to how a
page *behaves* is made once, here, and both apps get it.

| Page | Hook | Website | App |
| --- | --- | --- | --- |
| Holidays | `holidays` → `useHolidaysPage` | `apps/web/src/pages/Holidays.tsx` | `apps/mobile/app/(tabs)/holidays.tsx` |

## Rules (checked by `npm run lint -w @vedic-patro/features`)

- `.ts` only: no JSX. Markup belongs to the apps or `@vedic-patro/ui`.
- Imports: `react`, `@tanstack/react-query` and the shared `@vedic-patro/*`
  packages. No `react-native`, `react-dom`, Expo, router or icon libraries, no
  `window` / `document` / `localStorage`.
- No Nepali text: copy comes from `t()`.
- What differs by platform is passed in. Holidays takes `{ year, era }`
  because the website keeps them in the URL and the app in screen state.

`npm run check:shared` also fails when a feature folder is not used by both
apps.

## Adding a page

1. Create `src/<page>/`: the pure parts in `model.ts` (row building, filters,
   sorting — unit-tested in `test/<page>.test.ts`), the hook in
   `use-<page>-page.ts`, and `index.ts` re-exporting it.
2. Move the page's copy into `packages/i18n/src/strings.ts` if it is not there.
3. Rewrite the website page and the app screen to call the hook and draw its
   result with `@vedic-patro/ui` and the page's class map
   (`@vedic-patro/design-tokens/classes/<page>-classes`). Where the two copies
   behaved differently, the website wins.
4. Add the page to the table above.
