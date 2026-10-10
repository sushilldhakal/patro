import type { Era } from "./era";
import { translateKey } from "./locale";

/** Short era label for chips, headlines, and the year-picker era toggle. */
export function patroEraShortLabel(era: Era, lang?: string): string {
  switch (era) {
    case "ad":
      return translateKey("patro_date.era_ad", lang);
    case "bc":
      return translateKey("patro_date.era_bc", lang, "BC");
    case "bbs":
      return translateKey("patro_date.era_pbbs", lang, "पू.वि.सं.");
    case "bs":
      return translateKey("patro_date.era_bs", lang, "वि.सं.");
  }
}
