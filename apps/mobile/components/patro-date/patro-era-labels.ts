import { type Era } from "@vedic-patro/domain/calendar/era";
import { patroEraShortLabel } from "@vedic-patro/domain/calendar/patro-era-label";
import { useLocale } from "@/lib/i18n";
import { tFor } from "@vedic-patro/i18n/runtime";

export { patroEraShortLabel };

/**
 * The pair toggle (BS↔BBS, AD↔BC) follows the era, never the language: English can
 * browse BS and Nepali can browse AD.
 */
export function patroEraToggleLabel(
  era: Era,
  pick: (ne: string, en: string) => string,
  lang: "ne" | "en",
): string {
  if (era === "bs") return pick(tFor("ne", "ui.patro_date.switch_to_b_b_s"), tFor("en", "ui.patro_date.switch_to_b_b_s"));
  if (era === "bbs") return pick(tFor("ne", "ui.patro_date.switch_to_b_s"), tFor("en", "ui.patro_date.switch_to_b_s"));
  const target: Era = era === "ad" ? "bc" : "ad";
  return tFor(lang, "patro_date.switch_to_era", { era: patroEraShortLabel(target, lang) });
}

export function patroEraYearSectionTitle(
  era: Era,
  pick: (ne: string, en: string) => string,
): string {
  switch (era) {
    case "ad":
      return pick(tFor("ne", "ui.patro_date.a_d_year"), tFor("en", "ui.patro_date.a_d_year"));
    case "bc":
      return pick(tFor("ne", "ui.patro_date.b_c_year"), tFor("en", "ui.patro_date.b_c_year"));
    case "bbs":
      return pick(tFor("ne", "ui.patro_date.b_b_s_year"), tFor("en", "ui.patro_date.b_b_s_year"));
    default:
      return pick(tFor("ne", "common.bs_year"), tFor("en", "common.bs_year"));
  }
}

export function usePatroEraLabels(era: Era) {
  const { pick, lang } = useLocale();
  return {
    short: patroEraShortLabel(era, lang),
    toggle: patroEraToggleLabel(era, pick, lang),
    yearSection: patroEraYearSectionTitle(era, pick),
  };
}
