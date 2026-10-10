import type { PatroBrowseEra } from "@/lib/patro-era";
import { useLocale } from "@/lib/i18n";

export function patroEraShortLabel(era: PatroBrowseEra, pick: (ne: string, en: string) => string): string {
  switch (era) {
    case "ad":
      return pick("ई.सं.", "AD");
    case "bc":
      return pick("ई.पू.", "BC");
    case "bbs":
      return pick("पू.वि.सं.", "B.B.S.");
    case "bs":
      return pick("वि.सं.", "B.S.");
  }
}

export function patroEraToggleLabel(
  era: PatroBrowseEra,
  pick: (ne: string, en: string) => string,
  lang: "ne" | "en",
): string {
  if (lang === "en") {
    return era === "ad"
      ? pick("Switch to B.C.", "Switch to B.C.")
      : pick("Switch to A.D.", "Switch to A.D.");
  }
  return era === "bs"
    ? pick("पू.वि.सं. मा जानुहोस्", "Switch to B.B.S.")
    : pick("वि.सं. मा जानुहोस्", "Switch to B.S.");
}

export function patroEraYearSectionTitle(
  era: PatroBrowseEra,
  pick: (ne: string, en: string) => string,
): string {
  switch (era) {
    case "ad":
      return pick("ई.सं. वर्ष", "A.D. year");
    case "bc":
      return pick("ई.पू. वर्ष", "B.C. year");
    case "bbs":
      return pick("पू.वि.सं. वर्ष", "B.B.S. year");
    default:
      return pick("वि.सं. वर्ष", "B.S. year");
  }
}

export function usePatroEraLabels(era: PatroBrowseEra) {
  const { pick, lang } = useLocale();
  return {
    short: patroEraShortLabel(era, pick),
    toggle: patroEraToggleLabel(era, pick, lang),
    yearSection: patroEraYearSectionTitle(era, pick),
  };
}
