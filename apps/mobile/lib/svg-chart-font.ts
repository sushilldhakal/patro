import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import * as Font from "expo-font";
import { NOTO_DEVANAGARI_CHART, NOTO_DEVANAGARI_REGULAR } from "@/lib/fonts";

/*
 * Android chart text froze the app (Sentry PATRO-8/9/C), on 6 GB phones too. react-native-svg 15
 * gives every <Text>/<TSpan> a fresh typeface on every draw: for a font family it opens
 * `assets/fonts/<family>.otf`, then `.ttf`, and parses the whole ~220 KB Noto file again, with no
 * cache. The wheels draw a few hundred labels, and redraw on every scrub and zoom.
 *
 * When neither asset file exists, react-native-svg asks React Native's font manager instead, and
 * that returns a typeface it holds in memory. So the same Noto files are registered here a second
 * time, under names that have no file in assets/fonts. Chart text then reuses one parsed font,
 * with nothing read from disk while drawing. It looks the same: same files, same weights.
 *
 * The fix is JavaScript only, so it reaches store builds over the air. Until the names are
 * registered (a moment after launch), or if registering fails, charts keep the original names.
 * iOS and the website never had the problem and keep the original names.
 */
const ALIAS_CHART = "PatroSvgChart";
const ALIAS_REGULAR = "PatroSvgRegular";

let ready = false;
const listeners = new Set<() => void>();

if (Platform.OS === "android") {
  Font.loadAsync({
    [ALIAS_CHART]: require("../assets/fonts/NotoSansDevanagariSemiCondensed-Bold.ttf"),
    [ALIAS_REGULAR]: require("../assets/fonts/NotoSansDevanagariSemiCondensed-Medium.ttf"),
  })
    .then(() => {
      ready = true;
      for (const listener of listeners) listener();
    })
    .catch(() => {
      // Charts keep the original family names: slower on Android, but they still draw.
    });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getReady(): boolean {
  return ready;
}

type SvgChartFonts = { readonly chart: string; readonly regular: string };

const ALIASED: SvgChartFonts = { chart: ALIAS_CHART, regular: ALIAS_REGULAR };
const ORIGINAL: SvgChartFonts = { chart: NOTO_DEVANAGARI_CHART, regular: NOTO_DEVANAGARI_REGULAR };

/** Font family names for react-native-svg text. Android gets the cached aliases once they're registered. */
export function useSvgChartFonts(): SvgChartFonts {
  return useSyncExternalStore(subscribe, getReady, getReady) ? ALIASED : ORIGINAL;
}
