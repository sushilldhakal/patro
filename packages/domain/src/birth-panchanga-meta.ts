import type { GhadiPalaVipala } from "@vedic-patro/api-client";
import { toNepaliDigits } from "./panchanga-format";

/** Display formatting for the server-computed ghadi/pala/vipala kalas. */
export function formatGhadiPalaVipala(
  { ghadi, pala, vipala }: GhadiPalaVipala,
  lang?: string,
): string {
  if ((lang ?? "ne").startsWith("en")) {
    return `${ghadi} Ghati ${pala} Pala ${vipala} Vipala`;
  }
  return `${toNepaliDigits(ghadi)} घडी ${toNepaliDigits(pala)} पला ${toNepaliDigits(vipala)} विपला`;
}
