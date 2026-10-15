import type { PanchangaDay } from "@/lib/api";
import { D1Chart } from "@/components/kundali/D1Chart";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusBadges";
import { useSunriseD1Chart } from "@vedic-patro/features/panchanga";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

type Props = {
  p: PanchangaDay;
};

export function SunriseD1ChartPanel({ p }: Props) {
  const chart = useSunriseD1Chart(p);
  if (!chart) return null;

  return (
    <div className={panchangaPageClasses.aside.card}>
      <div className={panchangaPageClasses.aside.eyebrow}>{chart.title}</div>
      <p className={panchangaPageClasses.aside.anchor}>{chart.anchor}</p>
      <div className={panchangaPageClasses.aside.body}>
        <D1Chart houses={chart.houses} />
        {chart.showStatusLegend && <GrahaStatusLegend className="mt-1" />}
      </div>
    </div>
  );
}
