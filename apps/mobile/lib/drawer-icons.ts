import { FEATURE_ICON, resolveNavIcon, type NavIconName } from "@vedic-patro/icons";

/**
 * Lucide names the navigation draws — the shared icon identity
 * (@vedic-patro/icons), so a page has the same icon here as on the website.
 */
export type DrawerIconName = NavIconName;

/** The icon a drawer entry is drawn with; same answer as the website's drawer. */
export function resolveDrawerIcon(sectionId: string, itemId: string): DrawerIconName {
  if (sectionId === "main") {
    return (FEATURE_ICON as Record<string, DrawerIconName>)[itemId] ?? "calendar-days";
  }
  return resolveNavIcon(sectionId, itemId);
}

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
