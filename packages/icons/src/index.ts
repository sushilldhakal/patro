/**
 * Icon identity shared by the website and the mobile app.
 *
 * Both apps draw Lucide artwork: the website with `lucide-react`, the app by
 * rendering the same Lucide icon nodes with react-native-svg
 * (apps/mobile/components/icons). What is shared here is the *meaning*: which
 * Lucide icon stands for which feature, which one the app's Ionicons-style
 * names resolve to, and the size/stroke conventions. Renderers stay per app.
 *
 * Names are Lucide's own kebab-case icon names (`lucide-react/dist/esm/icons/<name>`).
 */
import { iconSize, type IconSize } from "@vedic-patro/design-tokens";

export { iconSize, type IconSize };

// ─── Features ────────────────────────────────────────────────────────────────

/** The icon each feature (page, nav entry, quick link) is shown with, in both apps. */
export const FEATURE_ICON = {
  // Main
  home: "house",
  panchanga: "star",
  kundali: "sparkles",
  dainikkranti: "moon",
  "kundali-milan": "heart",
  rashifal: "sun",
  "panchanga-year": "calendar-range",
  vastu: "compass",
  learn: "book-open",
  documents: "book-marked",
  shanti: "flower-2",
  more: "ellipsis",
  // Patro
  holidays: "party-popper",
  converter: "arrow-left-right",
  suryakranti: "sunrise",
  "panchak-patro": "calendar-clock",
  ritu: "sprout",
  reminders: "calendar-clock",
  // Jyotish
  avakahada: "grid-3x3",
  abhijit: "sparkles",
  // Panchanga spans (the five limbs)
  tithi: "moon",
  nakshatra: "star",
  yoga: "sparkles",
  karana: "layers",
  "chandra-rashi": "moon-star",
  // Day tables
  choghadiya: "clock-3",
  hora: "clock-3",
  lagna: "sunrise",
  chandrabala: "moon-star",
  tarabala: "star",
  "panchaka-rahita": "calendar-clock",
  pushkara: "sparkles",
  // Graha
  gochar: "route",
  "aakash-gochar": "orbit",
  "graha-asta": "sunrise",
  "graha-vakri": "rotate-ccw",
  "chandra-grahan": "moon-star",
  "surya-grahan": "eclipse",
  // Sait (every muhurta category)
  sait: "heart-handshake",
  // Account
  account: "user",
  "sign-in": "log-in",
  "sign-up": "user-plus",
  privacy: "shield",
  terms: "file-text",
} as const;

export type FeatureId = keyof typeof FEATURE_ICON;

/** Sections of the navigation drawer (website MobileNavMenu, app drawer). */
export type NavSectionId = "main" | "patro" | "jyotish" | "spans" | "tables" | "graha" | "sait";

/** What an entry falls back to when its section has no icon of its own for it. */
const SECTION_FALLBACK: Record<NavSectionId, NavIconName> = {
  main: "calendar-days",
  patro: "calendar-days",
  jyotish: "sparkles",
  spans: "moon-star",
  tables: "calendar-clock",
  graha: "orbit",
  sait: "heart-handshake",
};

/** The icon a navigation entry is drawn with. Same answer in both apps. */
export function resolveNavIcon(sectionId: string, itemId: string): NavIconName {
  if (sectionId === "sait") return FEATURE_ICON.sait;
  const own = (FEATURE_ICON as Record<string, NavIconName>)[itemId];
  if (own) return own;
  return SECTION_FALLBACK[sectionId as NavSectionId] ?? "calendar-days";
}

/** Every icon name the navigation can produce — each app's renderer must cover all of them. */
export type NavIconName =
  | (typeof FEATURE_ICON)[FeatureId]
  | "calendar-days"
  | "chevron-right";

export const NAV_ICON_NAMES: readonly NavIconName[] = [
  ...new Set<NavIconName>([...Object.values(FEATURE_ICON), ...Object.values(SECTION_FALLBACK), "chevron-right"]),
];

// ─── Stroke ──────────────────────────────────────────────────────────────────

/**
 * Lucide stroke width for a drawn size: the default 2 up to 16 px, a lighter
 * 1.75 above so large glyphs do not look heavy. Navigation icons use 1.75.
 */
export function iconStrokeWidth(sizePx: number): number {
  return sizePx <= iconSize.md ? 2 : 1.75;
}

export const NAV_ICON_STROKE = 1.75;

// ─── Ionicons-style names (the app) ──────────────────────────────────────────

/** Ionicons names the app writes → the Lucide icon drawn for them (the website's artwork). */
export const IONICON_TO_LUCIDE = {
  "add": "plus",
  "add-circle-outline": "circle-plus",
  "airplane-outline": "plane",
  "alert-circle-outline": "circle-alert",
  "arrow-back": "arrow-left",
  "arrow-back-circle-outline": "circle-arrow-left",
  "arrow-down": "arrow-down",
  "arrow-down-circle-outline": "circle-arrow-down",
  "arrow-forward": "arrow-right",
  "arrow-forward-circle-outline": "circle-arrow-right",
  "arrow-up": "arrow-up",
  "book-outline": "book-open",
  "briefcase-outline": "briefcase",
  "build-outline": "wrench",
  "calculator-outline": "calculator",
  "calendar": "calendar",
  "calendar-number-outline": "calendar-days",
  "calendar-outline": "calendar",
  "cash-outline": "banknote",
  "checkmark": "check",
  "checkmark-circle": "circle-check",
  "chevron-back": "chevron-left",
  "chevron-down": "chevron-down",
  "chevron-forward": "chevron-right",
  "chevron-right": "chevron-right",
  "chevron-up": "chevron-up",
  "close": "x",
  "close-circle": "circle-x",
  "close-circle-outline": "circle-x",
  "cloud-download-outline": "cloud-download",
  "cloud-offline-outline": "cloud-off",
  "cloud-outline": "cloud",
  "color-palette-outline": "palette",
  "compass": "compass",
  "compass-outline": "compass",
  "contract-outline": "minimize-2",
  "cut-outline": "scissors",
  "diamond-outline": "gem",
  "document-text-outline": "file-text",
  "download-outline": "download",
  "ellipse-outline": "circle",
  "ellipsis-horizontal-outline": "ellipsis",
  "expand-outline": "maximize-2",
  "eye-off-outline": "eye-off",
  "eye-outline": "eye",
  "finger-print-outline": "fingerprint",
  "fitness-outline": "activity",
  "flag": "flag",
  "flag-outline": "flag",
  "flame": "flame",
  "flame-outline": "flame",
  "flash-outline": "zap",
  "flower-outline": "flower-2",
  "gift-outline": "gift",
  "git-branch-outline": "git-branch",
  "git-compare-outline": "git-compare",
  "globe": "globe",
  "globe-outline": "globe",
  "grid": "layout-grid",
  "grid-outline": "layout-grid",
  "happy-outline": "smile",
  "headset-outline": "headphones",
  "heart": "heart",
  "heart-outline": "heart",
  "help-circle-outline": "circle-help",
  "home": "house",
  "home-outline": "house",
  "infinite-outline": "infinity",
  "information-circle-outline": "info",
  "keypad-outline": "grip",
  "language-outline": "languages",
  "layers-outline": "layers",
  "leaf-outline": "leaf",
  "list": "list",
  "list-outline": "list",
  "locate-outline": "locate",
  "location-outline": "map-pin",
  "lock-closed-outline": "lock",
  "log-out-outline": "log-out",
  "mail-unread-outline": "mail",
  "man-outline": "user",
  "menu-outline": "menu",
  "moon": "moon",
  "moon-outline": "moon",
  "musical-notes-outline": "music",
  "navigate-outline": "navigation",
  "options": "sliders-horizontal",
  "partly-sunny-outline": "cloud-sun",
  "pause": "pause",
  "pencil-outline": "pencil",
  "person-circle-outline": "circle-user",
  "person-outline": "user",
  "phone-portrait-outline": "smartphone",
  "planet": "orbit",
  "planet-outline": "orbit",
  "play": "play",
  "play-back": "rewind",
  "play-forward": "fast-forward",
  "play-skip-back": "skip-back",
  "play-skip-forward": "skip-forward",
  "refresh": "refresh-cw",
  "refresh-outline": "refresh-cw",
  "remove": "minus",
  "remove-circle-outline": "circle-minus",
  "scan-outline": "scan",
  "school-outline": "graduation-cap",
  "search": "search",
  "search-outline": "search",
  "server-outline": "server",
  "shield-outline": "shield",
  "sparkles": "sparkles",
  "sparkles-outline": "sparkles",
  "square-outline": "square",
  "star": "star",
  "star-outline": "star",
  "stats-chart": "chart-column",
  "sunny-outline": "sun",
  "swap-horizontal": "arrow-left-right",
  "swap-horizontal-outline": "arrow-left-right",
  "sync-outline": "refresh-cw",
  "telescope-outline": "telescope",
  "text-outline": "type",
  "time": "clock",
  "time-outline": "clock",
  "trash-outline": "trash-2",
  "triangle-outline": "triangle",
  "warning-outline": "triangle-alert",
  "woman-outline": "user",
} as const satisfies Record<string, string>;

/** Ionicons names that are solid glyphs — drawn filled. */
export const FILLED_IONICONS: ReadonlySet<string> = new Set(["flag", "flame", "heart", "moon", "pause", "play", "star"]);

export type IoniconAlias = keyof typeof IONICON_TO_LUCIDE;
/** Lucide names the app's Ionicons-style aliases draw. */
export type IoniconLucideName = (typeof IONICON_TO_LUCIDE)[IoniconAlias];

/** The Lucide icon an Ionicons-style name draws, or undefined (the app falls back to Ionicons). */
export function lucideForIonicon(name: string): IoniconLucideName | undefined {
  return (IONICON_TO_LUCIDE as Record<string, IoniconLucideName>)[name];
}
