import type { TextStyle, ViewStyle } from "react-native";
import { NOTO_DEVANAGARI_REGULAR } from "./fonts";
import { nepaliLineHeight } from "./nepali-text";

export * from "../../../packages/design-tokens/src/classes/patro-classes";

/** Era / month band — fixed 26px (web `h-[26px]`). */
export const patroMonthChipHeadBoxStyle: ViewStyle = {
  height: 26,
  alignItems: "center",
  justifyContent: "center",
};

/** Year / day band — 32px default; month span `१-३१` uses 26px below sm (640px). */
export function patroMonthChipBodyBoxStyle(opts?: {
  narrow?: boolean;
  monthSpan?: boolean;
}): ViewStyle {
  const narrowSpan = opts?.narrow && opts?.monthSpan;
  return {
    height: narrowSpan ? 26 : 32,
    alignItems: "center",
    justifyContent: "center",
  };
}

export function patroMonthChipHeadLabelStyle(
  useNepaliFont: boolean,
  narrow?: boolean,
): TextStyle {
  const fontSize = narrow ? 12 : 14;
  return {
    fontSize,
    /* Devanagari gets its own line box and keeps the font's padding — that
       padding is exactly what reserves room for the matras, and switching it
       off (which this did for both scripts) is what let them be sliced. */
    lineHeight: useNepaliFont ? nepaliLineHeight(fontSize) : narrow ? 16 : 20,
    textAlign: "center",
    ...(useNepaliFont
      ? { fontFamily: NOTO_DEVANAGARI_REGULAR, includeFontPadding: true }
      : { includeFontPadding: false }),
  };
}
