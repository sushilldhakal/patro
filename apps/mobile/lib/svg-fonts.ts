import { Platform } from "react-native";
import * as Font from "expo-font";
import { setSvgFontAliases } from "@vedic-patro/ui/svg-font";
import { NOTO_DEVANAGARI_BOLD, NOTO_DEVANAGARI_MEDIUM, NOTO_DEVANAGARI_REGULAR } from "@/lib/fonts";

/*
 * Android only. react-native-svg reads and parses the whole Noto file for every SVG label on every
 * draw (see packages/ui/src/native/svg-font.ts), which froze the Panchanga wheel even on 6 GB
 * phones (Sentry PATRO-8/9/C). The same files are registered here a second time under names that
 * have no file in assets/fonts, so react-native-svg gets React Native's in-memory copy instead.
 *
 * JavaScript only, so it reaches store builds over the air. If registering fails or is slow, SVG
 * text keeps the real names: slower on Android, but it still draws.
 */
const FILES: Record<string, number> = {
  [NOTO_DEVANAGARI_REGULAR]: require("../assets/fonts/NotoSansDevanagariSemiCondensed-Medium.ttf"),
  [NOTO_DEVANAGARI_MEDIUM]: require("../assets/fonts/NotoSansDevanagariSemiCondensed-SemiBold.ttf"),
  [NOTO_DEVANAGARI_BOLD]: require("../assets/fonts/NotoSansDevanagariSemiCondensed-Bold.ttf"),
};

const aliasOf = (name: string) => `Svg-${name}`;

/** Never waits more than this for the aliases before the splash hides. */
const MAX_WAIT_MS = 2500;

function register(): Promise<void> {
  if (Platform.OS !== "android") return Promise.resolve();
  const toLoad = Object.fromEntries(Object.entries(FILES).map(([name, file]) => [aliasOf(name), file]));
  const loading = Font.loadAsync(toLoad)
    .then(() => setSvgFontAliases(new Map(Object.keys(FILES).map((name) => [name, aliasOf(name)]))))
    .catch(() => {
      // SVG text keeps the real names.
    });
  return Promise.race([loading, new Promise<void>((resolve) => setTimeout(resolve, MAX_WAIT_MS))]);
}

/**
 * Settles once the Android aliases are in place (or failed, or took too long). Started at import;
 * the splash does not wait for it (SVG labels pick the aliases up on their next draw).
 */
export const svgFontsSettled: Promise<void> = register();
