/**
 * The panchanga aside's sunrise D1 chart card, shared by the website's and the
 * app's `components/panchanga/SunriseD1ChartPanel.tsx` (data only): the bhava
 * houses the chart draws, the planets' anchor line, whether the retro /
 * combust legend applies, and the title. Each app draws the chart.
 */
import { useMemo } from "react";
import type { PanchangaDay } from "@vedic-patro/api-client";
import { getPlanetsAnchorLabel } from "@vedic-patro/read-models/panchanga/panchanga-format";
import { buildPanchangaD1Houses } from "@vedic-patro/read-models/panchanga/panchanga-sunrise-d1";
import { useLocale } from "@vedic-patro/i18n/react";

export function useSunriseD1Chart(p: PanchangaDay) {
  const { t } = useLocale();
  const houses = useMemo(() => buildPanchangaD1Houses(p), [p]);
  if (!houses) return null;
  return {
    title: t("panchanga.d1_chart"),
    anchor: getPlanetsAnchorLabel(p),
    houses,
    showStatusLegend: houses.some((h) => h.planets.some((pl) => pl.isRetrograde || pl.isCombust)),
  };
}
