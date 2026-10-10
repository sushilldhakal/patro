import type { GhadiPalaVipala } from "@/lib/api";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";

export function formatGhadiPalaVipala(
  { ghadi, pala, vipala }: GhadiPalaVipala,
  lang?: string,
): string {
  if ((lang ?? "ne").startsWith("en")) {
    return `${ghadi} Ghati ${pala} Pala ${vipala} Vipala`;
  }
  return `${toNepaliDigits(ghadi)} घडी ${toNepaliDigits(pala)} पला ${toNepaliDigits(vipala)} विपला`;
}
