/** Shared by apps/web/src/components/dainikKranti/GocharRashyadiTables.tsx and apps/mobile/components/dainikKranti/GocharRashyadiTables.tsx (moved here from both, unchanged). */
import { type RashyadiSegment, type RashyadiRowKey, RASHYADI_ROW_LABEL } from "./rashyadi";

export function rowLabelFor(segment: RashyadiSegment, key: RashyadiRowKey): string {
  if (key === "rashi") return segment.monthInitialLabel;
  return RASHYADI_ROW_LABEL[key];
}
