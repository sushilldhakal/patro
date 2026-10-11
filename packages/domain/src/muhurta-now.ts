/** Shared by apps/web/src/components/panchanga/MuhurtaNowPanel.tsx and apps/mobile/components/panchanga/MuhurtaNowPanel.tsx (moved here from both, unchanged). */
import type { MuhurtaNowBlock } from "@vedic-patro/api-client";
import { formatTimeShort } from "./panchanga-format";

export function windowLabel(
  block: MuhurtaNowBlock | null | undefined,
  digits: (v: string | number) => string,
): string | undefined {
  if (!block) return undefined;
  const start = formatTimeShort(block.start_time ?? block.start_local);
  const end = formatTimeShort(block.end_time ?? block.end_local);
  if (start && end) return `${digits(start)} – ${digits(end)}`;
  return start ? digits(start) : undefined;
}
