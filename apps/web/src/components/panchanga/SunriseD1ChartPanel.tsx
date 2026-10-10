import { useMemo } from "react";
import type { PanchangaDay } from "@/lib/api";
import { D1Chart } from "@/components/kundali/D1Chart";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusBadges";
import { buildPanchangaD1Houses } from "@/lib/panchanga-sunrise-d1";
import { getPlanetsAnchorLabel } from "@/lib/panchanga-format";
import { useLocale, bilingualText } from "@/i18n/locale";

type Props = {
  p: PanchangaDay;
};

export function SunriseD1ChartPanel({ p }: Props) {
  const { lang } = useLocale();
  const houses = useMemo(() => buildPanchangaD1Houses(p), [p]);
  const anchor = getPlanetsAnchorLabel(p);

  if (!houses) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {bilingualText(lang, "D1 चक्र", "D1 chart")}
      </div>
      <p className="mt-1 mb-0 text-sm text-muted-foreground">{anchor}</p>
      <div className="mt-2">
        <D1Chart houses={houses} />
        {houses.some((h) => h.planets.some((pl) => pl.isRetrograde || pl.isCombust)) && (
          <GrahaStatusLegend className="mt-1" />
        )}
      </div>
    </div>
  );
}
