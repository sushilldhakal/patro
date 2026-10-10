import { Platform, type TextStyle } from "react-native";
import { NOTO_DEVANAGARI_BOLD, NOTO_DEVANAGARI_REGULAR } from "@/lib/fonts";

/**
 * Line-height ratio for देवनागरी on native `Text`.
 *
 * Latin sits between a baseline and an x-height and 1.2–1.3 covers it.
 * Devanagari does not: it hangs off a शिरोरेखा with matras stacked *above* it
 * (ि े ै ो ौ ं ँ, and the chandrabindu above those) and more hanging *below*
 * (ु ू ृ, and halant conjuncts that drop a whole second storey). The used
 * extent is close to the font's full ascender-plus-descender, so a line box
 * sized by Latin instinct crops the top marks — and once something shoves the
 * glyph down to save them, it crops the bottom ones instead. Both happened.
 *
 * 1.62 clears Noto Sans Devanagari's ascender and descender together with
 * room to spare, so nothing has to be nudged and nothing lands on an edge.
 */
export const NEPALI_LINE_HEIGHT_RATIO = 1.62;

/** Slightly taller headers — matras + rounded `overflow-hidden` table shells. */
export const TABLE_HEADER_LINE_HEIGHT_RATIO = 1.72;

export function nepaliLineHeight(fontSize: number): number {
  return Math.round(fontSize * NEPALI_LINE_HEIGHT_RATIO);
}

export function tableHeaderLineHeight(fontSize: number): number {
  return Math.round(fontSize * TABLE_HEADER_LINE_HEIGHT_RATIO);
}

/**
 * The smallest देवनागरी this app will render as ordinary reading text.
 *
 * Devanagari carries its meaning above and below the headline — matras,
 * chandrabindu, the conjunct stack — and those are the first strokes to
 * disappear as the size comes down. Sizes that read perfectly well in Latin
 * (9, 10, 11 px) put those marks under a pixel of height, and the text stops
 * being readable rather than merely small. Dense sizes were being chosen all
 * over the app on Latin instincts, so the floor is applied here, at the one
 * place every Nepali string passes through, rather than site by site.
 *
 * Opt out with `{ dense: true }` — for map labels over the sky, where the
 * constraint is how many names fit around a star, not comfortable reading.
 */
export const MIN_NEPALI_FONT_SIZE = 13;

export type NepaliTextOptions = {
  /** Skip {@link MIN_NEPALI_FONT_SIZE}. Overlay labels only. */
  dense?: boolean;
};

/** Font family and Android matra padding. Size comes from text-caption|body|title|display. */
export function nepaliTextStyle(
  _requestedSize?: number,
  _options?: NepaliTextOptions,
): TextStyle {
  return {
    fontFamily: NOTO_DEVANAGARI_REGULAR,
    ...(Platform.OS === "android" ? { includeFontPadding: true } : {}),
  };
}

/**
 * All data-table column headers should use this (via `TableHeaderLabel` in DataTable).
 * Extra top inset avoids Devanagari matras clipped by `overflow-hidden` on table shells.
 */
export function tableHeaderTextStyle(_requestedSize?: number): TextStyle {
  return {
    fontFamily: NOTO_DEVANAGARI_REGULAR,
    paddingTop: 5,
    paddingBottom: 2,
    ...(Platform.OS === "android"
      ? { includeFontPadding: true, textAlignVertical: "center" as const }
      : {}),
  };
}

/** Shared header cell padding — keep in sync with `TableHeaderCell`. */
export function tableHeaderCellPadding(compact?: boolean): {
  horizontal: number;
  top: number;
  bottom: number;
} {
  if (compact) return { horizontal: 6, top: 11, bottom: 9 };
  return { horizontal: 10, top: 12, bottom: 10 };
}

export function tableHeaderFontSize(compact?: boolean): number {
  return compact ? 11 : 12;
}

/** Large day numbers in Nepali — Noto Sans Devanagari (matches web). */
export function nepaliDayNumberStyle(_fontSize?: number): TextStyle {
  return {
    ...nepaliTextStyle(),
    fontFamily: NOTO_DEVANAGARI_BOLD,
  };
}

/** Vertical centering for react-native-svg Text (default y is baseline, which clips matras). */
export const nepaliSvgTextCenter = {
  alignmentBaseline: "central" as const,
};
