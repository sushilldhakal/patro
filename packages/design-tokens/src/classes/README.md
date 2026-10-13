# Shared page class maps

One file per page (or page family): `<page>-classes.ts`. Both the website and the app import it, so the page's typography, colour, padding, margin, radius and shadow cannot differ between them.

```ts
// packages/design-tokens/src/classes/holidays-classes.ts
import { spec } from "../specs";
export const holidaysClasses = {
  header: "mb-8",
  title: spec.pageTitle,
  tableHeadCell: "px-4 py-3 text-xs font-semibold uppercase tracking-wide",
  row: "border-b border-border/50",
} as const;
```
Web: `<h1 className={holidaysClasses.title}>`; app: `<Text className={holidaysClasses.title}>`. Import with `@vedic-patro/design-tokens/classes/holidays-classes`.

Rules
- Keys name an element's role (`title`, `row`, `badge`), not its look.
- Only utilities Tailwind 4 and NativeWind 4 both support: sizes, spacing, colours, borders, radius, shadow, flex, grid, responsive (`sm:`), `dark:`. Web-only extras (`hover:`, `focus-visible:`, `group-*`, `transition-*`, gradients, `ring-*`, `backdrop-*`) stay in the web component: `cn(holidaysClasses.card, "hover:bg-muted")`.
- Class names are written out in full (Tailwind scans the text); never build one from a variable.
- Colours are roles (`bg-card`, `text-muted-foreground`) or palette classes (`bg-ill-amber67`), never hex.
- Sizes come from the scale (`text-sm`, `p-4`, `rounded-xl`); no `[Npx]`.
- Layout that differs because the DOM and React Native differ (grid vs stack) is written in each app; share everything else.
- Start from `spec` (specs.ts) for cards, labels, titles, stat cards and table cells.
