/** Expo-router path for a panchanga element page (tables have their own routes). */
const STATIC_TABLE_IDS = new Set([
  "choghadiya",
  "hora",
  "lagna",
  "chandrabala",
  "tarabala",
  "panchaka-rahita",
  "pushkara",
]);

export function elementHref(id: string): string {
  return STATIC_TABLE_IDS.has(id) ? `/panchanga/${id}` : `/panchanga/element/${id}`;
}
