# @vedic-patro/icons

Icon *identity* shared by the website and the app — which icon means what, at
which size and stroke — while each app keeps its own renderer:

- **Website** — `lucide-react`; `apps/web/src/lib/nav-icons.ts` maps every name
  the navigation can produce to its component (`featureIcon("vastu")`,
  `navEntryIcon(section, item)`).
- **App** — the same Lucide icon nodes drawn with react-native-svg;
  `components/icons/AppNavIcon.tsx` (Lucide names) and `components/icons/Ionicons.tsx`
  (Ionicons-style names, mapped to Lucide through `IONICON_TO_LUCIDE`).

| Export | What |
| --- | --- |
| `FEATURE_ICON` | the Lucide icon for each feature/page (Header, drawers, tab bars, quick links) |
| `resolveNavIcon(section, item)` | the drawer/sidebar entry icon, with per-section fallbacks |
| `IONICON_TO_LUCIDE`, `FILLED_IONICONS`, `lucideForIonicon` | the app's Ionicons-style aliases |
| `iconSize`, `iconStrokeWidth(size)`, `NAV_ICON_STROKE` | sizes (from the design tokens) and stroke rule |

Add a feature: give it an entry in `FEATURE_ICON`; TypeScript then requires both
renderers to cover the new Lucide name.
