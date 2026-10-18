/**
 * The vakri / asta markers next to a graha, shared by the website's and the
 * app's `components/graha/GrahaStatusBadges.tsx`: which markers a graha may
 * show (the shared rules in domain/graha-status) and their labels, for the
 * tooltip / accessibility label and the legend.
 */
import { showAsta, showVakri } from "@vedic-patro/domain/jyotish/graha-status";
import { useLocale } from "@vedic-patro/i18n/react";

export function useGrahaStatusLabels() {
  const { t } = useLocale();
  return { retrograde: t("common.retrograde"), combust: t("common.combust") };
}

export function useGrahaStatusBadges({
  planetKey,
  isRetrograde,
  isCombust,
}: {
  /** Graha key ("sun" ... "ketu"); gates which markers are allowed. */
  planetKey?: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
}) {
  const labels = useGrahaStatusLabels();
  const vakri = showVakri(planetKey, isRetrograde);
  const asta = showAsta(planetKey, isCombust);
  return { vakri, asta, any: vakri || asta, labels };
}
