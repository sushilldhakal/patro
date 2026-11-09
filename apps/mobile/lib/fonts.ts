/**
 * Typography — matches web `dhakal-patro` (`Noto Sans Devanagari` for UI + numerals).
 * Semi-condensed (width 87.5%, as the website loads it), from assets/fonts. The names are the files'
 * PostScript names, which are also the file names: iOS and Android register them at launch from the
 * build (expo-font plugin in app.json), and the web build loads them in `app/_layout.tsx`.
 */
/* Each weight draws one face heavier than its name, as in the design tokens (`fontFamily.native`):
   plain text in the Regular face read too thin on a phone. */
export const NOTO_DEVANAGARI_REGULAR = "NotoSansDevanagariSemiCondensed-Medium";
export const NOTO_DEVANAGARI_MEDIUM = "NotoSansDevanagariSemiCondensed-SemiBold";
export const NOTO_DEVANAGARI_SEMIBOLD = "NotoSansDevanagariSemiCondensed-Bold";
export const NOTO_DEVANAGARI_BOLD = "NotoSansDevanagariSemiCondensed-Bold";

/** Mantra text (shlokas) only: Adishila Vedic, loaded at runtime in `app/_layout.tsx`. */
export const ADISHILA_VEDIC = "AdishilaVedic";

/** Default SVG / chart labels (semi-bold). */
export const NOTO_DEVANAGARI_CHART = NOTO_DEVANAGARI_SEMIBOLD;
export const NOTO_DEVANAGARI_CHART_SM = NOTO_DEVANAGARI_MEDIUM;

/** Fira Code — converter / monospace only (web parity for code blocks). */
export const FIRA_CODE_REGULAR = "FiraCode_400Regular";
export const FIRA_CODE_BOLD = "FiraCode_700Bold";
