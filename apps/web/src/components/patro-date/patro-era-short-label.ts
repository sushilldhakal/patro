import type { TFunction } from "i18next";
import type { Era } from "@/lib/era";

/** Short era label for chips, headlines, and the year-picker era toggle. */
export function patroEraShortLabel(era: Era, t: TFunction): string {
  switch (era) {
    case "ad":
      return t("patro_date.era_ad");
    case "bc":
      return t("patro_date.era_bc", { defaultValue: "BC" });
    case "bbs":
      return t("patro_date.era_pbbs", { defaultValue: "पू.वि.सं." });
    case "bs":
      return t("patro_date.era_bs", { defaultValue: "वि.सं." });
  }
}
