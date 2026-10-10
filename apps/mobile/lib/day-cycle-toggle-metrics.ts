/** Panchanga day-boundary toggle — phone vs tablet (md breakpoint). */
import { nepaliLineHeight } from "@/lib/nepali-text";

export function dayCycleToggleMetrics(isCompact: boolean) {
  const fontSize = isCompact ? 11 : 13;
  /* The label is देवनागरी — अहोरात्र / दिन-रात — so its line box has to be
     sized the way every other Nepali string in the app is. It used to be
     `fontSize + 1`, a 12 px box for 11 px text, and the shell was a flat
     22 px with `overflow: hidden` on top: the शिरोरेखा and the ो matra were
     sliced clean off. Both now follow the text instead of the other way
     round. */
  const lineHeight = nepaliLineHeight(fontSize);
  const height = Math.max(isCompact ? 22 : 31, lineHeight + (isCompact ? 6 : 10));
  return { height, fontSize, lineHeight };
}

/** Kept for callers that reference the nominal chip heights. */
export const DAY_CYCLE_TOGGLE_H_PHONE = dayCycleToggleMetrics(true).height;
export const DAY_CYCLE_TOGGLE_H_TABLET = dayCycleToggleMetrics(false).height;
