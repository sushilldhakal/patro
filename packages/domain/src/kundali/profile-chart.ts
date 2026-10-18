import type { InstantQuery } from "../instant-query";
import { AD_MONTH_NAMES, AD_MONTH_NAMES_NE, BS_MONTH_NAMES, BS_MONTHS_NE } from "../bs-calendar";

/** Display label from the stored era parts (month-name tables only, no conversion). */
export function formatMomentDateLabel(
  q: InstantQuery,
  lang: string,
  digits: (v: string | number) => string = String,
): string {
  const isEn = lang.slice(0, 2) === "en";
  if (q.inputEra === "ad" || q.inputEra === "bc") {
    const months = isEn ? AD_MONTH_NAMES : AD_MONTH_NAMES_NE;
    const era = q.inputEra === "bc" ? (isEn ? " BC" : " ई.पू.") : "";
    return `${months[q.month - 1]} ${digits(q.day)}, ${digits(q.year)}${era}`;
  }
  const months = isEn ? BS_MONTH_NAMES : BS_MONTHS_NE;
  const era = q.inputEra === "bbs" ? (isEn ? " BBS" : " पू.वि.सं.") : "";
  return `${months[q.month - 1] ?? ""} ${digits(q.day)}, ${digits(q.year)}${era}`;
}
