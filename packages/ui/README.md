# @vedic-patro/ui

The UI kit shared by the website (`apps/web`) and the mobile app
(`apps/mobile`). Every component has one props contract (`src/contract.ts`) and
two drawings of it:

| | Website (`src/web`) | App (`src/native`) |
| --- | --- | --- |
| `Box` | `div` (or `section`, `nav`, …via `as`) | `View` |
| `Text` | `span` (or `p`, `h1`… via `as`) | `Text` with the right Noto Sans Devanagari file per weight, body size and foreground colour by default |
| `Pressable` | `button` (`role="tab"`, `aria-selected`…) | `Pressable` with accessibility role/state and press feedback |
| `Card` | `div` with `spec.card` / `cardRoomy` / `cardCompact` | `View`, same classes |
| `Button` | `button`, the website's button look and hover/focus states | `Pressable` + `Text`, same look |
| `Icon` | inline `svg` coloured by the tone's text class | `react-native-svg`, the tone's theme colour for light/dark |
| `Table` | `table` with sortable headers | rows of fixed-width cells that fill the width or scroll sideways |
| `Sheet` | dialog that rises from the bottom (centred from `sm`) | `Modal` that slides up |

```tsx
import { Box, Text, Pressable, Icon, Table } from "@vedic-patro/ui";
import { __iconNode as flag } from "lucide-react/dist/esm/icons/flag";   // app; the website imports ".../flag.mjs"

<Pressable role="tab" selected={active} onPress={select} className={cls.tab} webClassName="hover:text-foreground">
  <Icon node={flag} size="md" tone={active ? "secondary" : "foreground"} />
  <Text className={cls.tabLabel}>{label}</Text>
</Pressable>
```

Both apps import `@vedic-patro/ui`; the package's exports pick the half
(`react-native` condition → `src/native`, otherwise `src/web`). The app's Metro
config sends Expo web to the native half too, so the app looks the same in its
web build.

## Classes

`className` takes the shared Tailwind utilities that both Tailwind 4 (website)
and NativeWind 4 (app) understand — normally from a page's class map in
`@vedic-patro/design-tokens/classes`. Two escape hatches:

- `webClassName` — website-only extras: `hover:`, `focus-visible:`, transitions.
- `nativeClassName` — React Native-only layout.

The kit's own look (text variants, card sizes, button variants, table and sheet
parts, icon tones) is in `src/classes.ts`, written once for both.

## Rules (checked by `npm run lint -w @vedic-patro/ui`)

- `src/web` uses HTML only, `src/native` React Native only; `contract.ts` and
  `classes.ts` import neither.
- Both halves export every component in `UiKit`. Each half's `index.ts` also
  checks itself against the contract (`satisfies UiKit`), so a prop added to
  the contract and not handled on one side fails that app's typecheck.
- No copy (Nepali text) and no hand-typed colours.

## Adding a component

Add its props to `contract.ts` and its name to `UiKit`; shared classes to
`classes.ts`; then `src/web/<Name>.tsx` and `src/native/<Name>.tsx`, exported
from both `index.ts` files.

The apps still have their own older primitives (`apps/mobile/components/ui/*`,
`apps/web/src/components/ui/*`). New and migrated screens use this kit; move
the rest over page by page.
