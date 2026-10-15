# @vedic-patro/i18n

All interface copy for the website (`apps/web`) and the mobile app
(`apps/mobile`), in Nepali and English, and the one translator both apps use.

| File | What |
| --- | --- |
| `src/strings.ts` | the catalogue: every string in both languages, one entry each — **edit this** |
| `src/ne.json`, `src/en.json` | generated full bundles (the app ships both) |
| `src/web/ne.json`, `src/web/en.json` | generated website bundles: the same minus `ui.*` copy no website code reads |
| `src/runtime.ts` | lookup, `{{value}}` filling, fallbacks, the current language (no React) |
| `src/react.tsx` | `useTranslation`, `useLocale`, `useLanguage`, `<Trans>` |
| `src/setup.ts` | `setupI18n()` — each app calls it once at start-up |

## Using copy

```tsx
import { useLocale, useTranslation, Trans } from "@vedic-patro/i18n/react";

const { t } = useTranslation();
t("holidays.page_title");
t("documents.chapter_label", { number: digits(3) });     // {{number}}

const { lang, t, digits, pick } = useLocale();
pick(item.name_ne, item.name_en);                         // data the API sends in both languages — not copy

<Trans i18nKey="sun_times.ayana_body" components={{ north: <span className="…" /> }} />
```

Both apps also re-export these from their own modules (`@/i18n/locale` on the
website, `@/lib/i18n` in the app), so older imports keep working.

**Never type Nepali (or English) interface text into a component.** Add it to
`strings.ts`, run `npm run i18n`, and read it with `t()`. `npm run check:copy`
(CI) fails when a file in `apps/*` gains inline Nepali text, and
`packages/features` / `packages/ui` may hold none at all.

## Keys

Dotted paths grouped by page (`holidays.col_name`). Copy moved out of a screen
by `scripts/i18n-tools/extract-inline-copy.mjs` lives under `ui.<area>.<slug>`;
a string used by several areas is `ui.common.<slug>`. Reuse a key before adding
one — the extractor already reuses any key whose text is identical.

`ui.*` keys must be read as literal strings (`t("ui.home.today")`, never a
built key): the generator scans the website's source for them to decide what
goes into the website bundle. Keys outside `ui.*` always ship to both apps, so
built keys (`t(\`seo_faq.${route}.intro\`)`) are fine there.

## Behaviour

The same on both platforms, and the same as the website had with i18next:

- a missing English value falls back to Nepali; a missing key gives
  `defaultValue`, else the key itself;
- a `{{value}}` that is not passed becomes empty;
- `returnObjects: true` returns lists (the SEO FAQ blocks) with values filled in;
- while the website is still fetching the English bundle the UI reports, and
  is, Nepali; it switches once the bundle lands.

The domain package's locale helpers (`translateKey`, `normalizeLang()` without
an argument) read the same language and copy (`setupI18n` connects them).
