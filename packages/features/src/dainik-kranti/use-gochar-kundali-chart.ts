/**
 * The dainik kranti transit chart card's data, shared by the website's and the
 * app's `components/dainikKranti/GocharKundaliChart.tsx`: the title, the
 * papansha / gapansha lines, the loading / empty state, the bhava houses the
 * chart draws, whether the retro / combust legend applies, and the date line.
 * Each app keeps drawing the chart itself.
 */
import { buildGocharBhavaHouses, formatGocharBsLabel } from "@vedic-patro/domain/dainikKranti/gochar-display";
import { useLocale } from "@vedic-patro/i18n/react";
import type { GocharGrahaRow } from "./use-gochar-rashyadi-table";

export function useGocharKundaliChart({
  grahas,
  papanshaLine = "",
  gapanshaLine = "",
  dateBs,
  dateAd,
  loading,
}: {
  grahas: GocharGrahaRow[];
  papanshaLine?: string;
  gapanshaLine?: string;
  dateBs?: string | null;
  dateAd?: string | null;
  loading?: boolean;
}) {
  const { t } = useLocale();
  const dateLabel = formatGocharBsLabel(dateBs, dateAd);
  return {
    title: t("dainik.transit_chart"),
    lines: [papanshaLine || t("dainik.papashah"), gapanshaLine].filter(Boolean),
    /** Shown instead of the chart while loading or when there are no grahas. */
    stateText: loading ? t("dainik.loading") : grahas.length === 0 ? t("dainik.no_details_available") : null,
    houses: !loading && grahas.length > 0 ? buildGocharBhavaHouses(grahas) : null,
    showStatusLegend: grahas.some((g) => g.is_retrograde || g.is_combust),
    dateLine: dateLabel ? t("ui.dainik_kranti.position_on_datelabel", { dateLabel }) : null,
  };
}
