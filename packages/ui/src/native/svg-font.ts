import { Platform } from "react-native";
import { fontFamily } from "@vedic-patro/design-tokens";

/*
 * Android: react-native-svg 15 builds a new typeface for every <Text>/<TSpan> on every draw. For a
 * family whose file is in assets/fonts it reads and parses the whole ~220 KB Noto file each time,
 * with no cache, on the main thread. A few dozen labels redrawn on a scrub, zoom or tick froze the
 * Panchanga wheel even on 6 GB phones (Sentry PATRO-8/9/C), and every other chart pays the same.
 *
 * For a family with no asset file it asks React Native's font manager, which returns a typeface it
 * holds in memory. The app registers the same Noto files a second time under alias names (no asset
 * file), then calls `setSvgFontAliases`. Every SVG label goes through `svgFont`, so it reuses one
 * parsed font: same files, same look. Until then, on iOS, and on the website, names pass through.
 *
 * RN <Text> keeps the real names: only react-native-svg has this problem.
 */
let aliases: ReadonlyMap<string, string> = new Map();

/** The app calls this once the alias fonts are registered (Android only). */
export function setSvgFontAliases(map: ReadonlyMap<string, string>): void {
  if (Platform.OS === "android") aliases = map;
}

/** The family name to give react-native-svg text. Read it at render time, not at module load. */
export function svgFont(name: string): string {
  return aliases.get(name) ?? name;
}

/** `fontFamily.native` for react-native-svg text. Getters, so each read sees the registered aliases. */
export const svgFonts = {
  get regular(): string {
    return svgFont(fontFamily.native.regular);
  },
  get medium(): string {
    return svgFont(fontFamily.native.medium);
  },
  get semibold(): string {
    return svgFont(fontFamily.native.semibold);
  },
  get bold(): string {
    return svgFont(fontFamily.native.bold);
  },
};
