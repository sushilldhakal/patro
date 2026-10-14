/**
 * The cross-link card to the full Gochar page (under the panchanga), shared
 * by the website's and the app's `components/gochar/GocharPromoCard.tsx`.
 */
import { useLocale } from "@vedic-patro/i18n/react";

export function useGocharPromoCard() {
  const { t } = useLocale();
  return {
    title: t("gochar.promo_title"),
    /** Left out of the website's compact card. */
    body: t("ui.gochar.seen_the_day_s_panchang_now"),
    cta: t("gochar.promo_cta"),
  };
}
