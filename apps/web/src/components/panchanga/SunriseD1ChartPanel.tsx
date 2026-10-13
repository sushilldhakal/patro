import { useMemo } from "react";
import type { PanchangaDay } from "@/lib/api";
import { D1Chart } from "@/components/kundali/D1Chart";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusBadges";
import { buildPanchangaD1Houses } from "@vedic-patro/domain/panchanga-sunrise-d1";
import { getPlanetsAnchorLabel } from "@vedic-patro/domain/panchanga-format";
import { useLocale } from "@/i18n/locale";

import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

import { tFor } from "@vedic-patro/i18n/runtime";
type Props = {
  p: PanchangaDay;
};

export function SunriseD1ChartPanel({ p }: Props) {
  const { lang } = useLocale();
  const houses = useMemo(() => buildPanchangaD1Houses(p), [p]);
  const anchor = getPlanetsAnchorLabel(p);

  if (!houses) return null;

  return (
    <div className={panchangaPageClasses.aside.card}>
      <div className={panchangaPageClasses.aside.eyebrow}>
        {tFor(lang, "panchanga.d1_chart")}
      </div>
      <p className={panchangaPageClasses.aside.anchor}>{anchor}</p>
      <div className={panchangaPageClasses.aside.body}>
        <D1Chart houses={houses} />
        {houses.some((h) => h.planets.some((pl) => pl.isRetrograde || pl.isCombust)) && (
          <GrahaStatusLegend className="mt-1" />
        )}
      </div>
    </div>
  );
}
