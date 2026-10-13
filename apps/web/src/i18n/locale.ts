import type { ReactNode } from "react";

export { normalizeLang, pickLocale, bilingualText, type Lang } from "@vedic-patro/domain/locale";
import { normalizeLang, type Lang } from "@vedic-patro/domain/locale";

/** The shared hook (@vedic-patro/i18n/react) — the same one the app uses. */
export { useLocale } from "@vedic-patro/i18n/react";

/** Bilingual JSX — picks ne or en React tree based on lang. */
export function bilingualNode(
  lang: Lang | string | undefined,
  ne: ReactNode,
  en: ReactNode,
): ReactNode {
  return normalizeLang(lang) === "en" ? en : ne;
}
