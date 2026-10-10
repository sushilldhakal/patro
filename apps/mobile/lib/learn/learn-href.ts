import type { Href } from "expo-router";

/** Deep link to a learn guide — use string paths (web Expo Router drops `[slug]` params). */
export function hrefForLearnSlug(slug: string): Href {
  return `/learn/${slug}`;
}
