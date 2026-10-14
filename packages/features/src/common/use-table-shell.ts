/**
 * The titled card around a patro table, shared by the website's and the app's
 * `components/dainikKranti/PatroTableShell.tsx`: the title, the English title
 * shown under it in Nepali, and the optional subtitle (all from copy keys).
 */
import { tFor } from "@vedic-patro/i18n/runtime";
import { useLocale } from "@vedic-patro/i18n/react";

export function usePatroTableShell(titleKey: string, subtitleKey?: string) {
  const { t, lang } = useLocale();
  return {
    title: t(titleKey),
    titleEn: lang === "ne" ? tFor("en", titleKey) : null,
    subtitle: subtitleKey ? t(subtitleKey) : null,
  };
}
