/**
 * Typography — matches web `dhakal-patro` (`Noto Sans Devanagari` for UI + numerals).
 * Semi-condensed (width 87.5%, as the website loads it), from assets/fonts. The names are the files'
 * PostScript names, which are also the file names: iOS and Android register them at launch from the
 * build (expo-font plugin in app.json), and the web build loads them in `app/_layout.tsx`.
 */
export const NOTO_DEVANAGARI_REGULAR = "NotoSansDevanagariSemiCondensed-Regular";
export const NOTO_DEVANAGARI_MEDIUM = "NotoSansDevanagariSemiCondensed-Medium";
export const NOTO_DEVANAGARI_SEMIBOLD = "NotoSansDevanagariSemiCondensed-SemiBold";
export const NOTO_DEVANAGARI_BOLD = "NotoSansDevanagariSemiCondensed-Bold";

/** Default SVG / chart labels (semi-bold). */
export const NOTO_DEVANAGARI_CHART = NOTO_DEVANAGARI_SEMIBOLD;
export const NOTO_DEVANAGARI_CHART_SM = NOTO_DEVANAGARI_MEDIUM;

/** Fira Code — converter / monospace only (web parity for code blocks). */
export const FIRA_CODE_REGULAR = "FiraCode_400Regular";
export const FIRA_CODE_BOLD = "FiraCode_700Bold";
