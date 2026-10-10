import type { ComponentProps } from "react";
import type { Ionicons } from "@/components/icons/Ionicons";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Lucide names the web drawer uses (`dhakal-patro` MobileNavMenu).
 * Expo web cannot rely on Ionicons' font (it shows the missing-glyph box).
 */
export type DrawerIconName =
  | "home"
  | "star"
  | "book-open"
  | "compass"
  | "party-popper"
  | "arrow-left-right"
  | "sunrise"
  | "calendar-range"
  | "moon"
  | "calendar-clock"
  | "sprout"
  | "grid-3x3"
  | "sparkles"
  | "heart"
  | "sun"
  | "layers"
  | "moon-star"
  | "clock-3"
  | "route"
  | "orbit"
  | "rotate-ccw"
  | "eclipse"
  | "heart-handshake"
  | "calendar-days"
  | "flower-2"
  | "ellipsis"
  | "shield"
  | "file-text"
  | "user"
  | "chevron-right"
  | "log-in"
  | "user-plus";

const PATRO: Record<string, DrawerIconName> = {
  holidays: "party-popper",
  converter: "arrow-left-right",
  suryakranti: "sunrise",
  "panchanga-year": "calendar-range",
  dainikkranti: "moon",
  "panchak-patro": "calendar-clock",
  ritu: "sprout",
};

const JYOTISH: Record<string, DrawerIconName> = {
  avakahada: "grid-3x3",
  abhijit: "sparkles",
  kundali: "sparkles",
  "kundali-milan": "heart",
  rashifal: "sun",
};

const SPAN: Record<string, DrawerIconName> = {
  tithi: "moon",
  nakshatra: "star",
  yoga: "sparkles",
  karana: "layers",
  "chandra-rashi": "moon-star",
};

const TABLE: Record<string, DrawerIconName> = {
  choghadiya: "clock-3",
  hora: "clock-3",
  lagna: "sunrise",
  chandrabala: "moon-star",
  tarabala: "star",
  "panchaka-rahita": "calendar-clock",
  pushkara: "sparkles",
};

const GRAHA: Record<string, DrawerIconName> = {
  gochar: "route",
  "aakash-gochar": "orbit",
  "graha-asta": "sunrise",
  "graha-vakri": "rotate-ccw",
  "chandra-grahan": "moon-star",
  "surya-grahan": "eclipse",
};

const MAIN: Record<string, DrawerIconName> = {
  home: "home",
  panchanga: "star",
  learn: "book-open",
  documents: "file-text",
  vastu: "compass",
  shanti: "flower-2",
  more: "ellipsis",
};

/** Same mapping as web `resolveIcon` in MobileNavMenu. */
export function resolveDrawerIcon(sectionId: string, itemId: string): DrawerIconName {
  if (sectionId === "main") return MAIN[itemId] ?? "calendar-days";
  if (sectionId === "patro") return PATRO[itemId] ?? "calendar-days";
  if (sectionId === "jyotish") return JYOTISH[itemId] ?? "sparkles";
  if (sectionId === "spans") return SPAN[itemId] ?? "moon-star";
  if (sectionId === "tables") return TABLE[itemId] ?? "calendar-clock";
  if (sectionId === "graha") return GRAHA[itemId] ?? "orbit";
  if (sectionId === "sait") return "heart-handshake";
  return "calendar-days";
}

/** Native-only fallback; Expo web uses Lucide SVGs instead. */
export const DRAWER_IONICONS: Record<DrawerIconName, IoniconName> = {
  home: "home-outline",
  star: "star-outline",
  "book-open": "book-outline",
  compass: "compass-outline",
  "party-popper": "gift-outline",
  "arrow-left-right": "swap-horizontal-outline",
  sunrise: "sunny-outline",
  "calendar-range": "calendar-outline",
  moon: "moon-outline",
  "calendar-clock": "time-outline",
  sprout: "leaf-outline",
  "grid-3x3": "grid-outline",
  sparkles: "flash-outline",
  heart: "heart-outline",
  sun: "sunny-outline",
  layers: "layers-outline",
  "moon-star": "moon-outline",
  "clock-3": "time-outline",
  route: "git-branch-outline",
  orbit: "planet-outline",
  "rotate-ccw": "refresh-outline",
  eclipse: "ellipse-outline",
  "heart-handshake": "heart-outline",
  "calendar-days": "calendar-outline",
  "flower-2": "flower-outline",
  ellipsis: "ellipsis-horizontal-outline",
  shield: "shield-outline",
  "file-text": "document-text-outline",
  user: "person-outline",
  "chevron-right": "chevron-forward",
  "log-in": "log-in-outline",
  "user-plus": "person-add-outline",
};

const SPAN_IDS = new Set(["tithi", "nakshatra", "yoga", "karana", "chandra-rashi"]);

/** Panchanga element pages on /more — same icons as the web drawer. */
export function resolveElementDrawerIcon(id: string): DrawerIconName {
  return resolveDrawerIcon(SPAN_IDS.has(id) ? "spans" : "tables", id);
}

const LEARN_ION_TO_DRAWER: Record<string, DrawerIconName> = {
  "time-outline": "calendar-clock",
  "server-outline": "layers",
  "eye-outline": "sparkles",
  "planet-outline": "orbit",
  "calendar-outline": "calendar-days",
  "globe-outline": "orbit",
  "layers-outline": "layers",
  "leaf-outline": "sprout",
  "book-outline": "book-open",
  "moon-outline": "moon",
  "add-circle-outline": "sparkles",
  "remove-circle-outline": "sparkles",
  "star-outline": "star",
  "infinite-outline": "sparkles",
  "cut-outline": "sparkles",
  "sunny-outline": "sunrise",
  "ellipse-outline": "eclipse",
  "compass-outline": "orbit",
};

export function learnTopicDrawerIcon(ionName: string | undefined): DrawerIconName {
  if (!ionName) return "book-open";
  return LEARN_ION_TO_DRAWER[ionName] ?? "book-open";
}
