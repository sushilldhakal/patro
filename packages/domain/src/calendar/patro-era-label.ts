import type { Era } from "./era";
import { normalizeLang, type Lang } from "../locale";

/**
 * Era labels per language. Kept as a table (mirrors `patro_date.era_*` in the
 * catalogue) so the labels are right for every era × language pair without
 * depending on the catalogue being loaded.
 */
const ERA_SHORT_LABELS: Record<Era, Record<Lang, string>> = {
  bs: { en: "BS", ne: "वि.सं." },
  ad: { en: "AD", ne: "ई.सं." },
  bc: { en: "BC", ne: "ई.पू." },
  bbs: { en: "BBS", ne: "पू.वि.सं." },
};

/** Short era label for chips, headlines, and the year-picker era toggle. */
export function patroEraShortLabel(era: Era, lang?: string): string {
  return ERA_SHORT_LABELS[era][normalizeLang(lang)];
}
