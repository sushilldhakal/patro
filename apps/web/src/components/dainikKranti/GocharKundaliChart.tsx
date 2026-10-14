import { useGocharKundaliChart, type GocharGrahaRow } from "@vedic-patro/features/dainik-kranti";
import { D1Chart } from "@/components/kundali/D1Chart";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { Sparkles } from "lucide-react";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusBadges";

type Props = {
  grahas: GocharGrahaRow[];
  /** The papansha line (planet codes by rashi). */
  papanshaLine?: string;
  /** The gapansha line. */
  gapanshaLine?: string;
  dateBs?: string | null;
  dateAd?: string | null;
  loading?: boolean;
  className?: string;
};

export function GocharKundaliChart({ className, ...props }: Props) {
  const chart = useGocharKundaliChart(props);

  return (
    <div className={cn(dainikKrantiClasses.chartCard, className)}>
      <h3 className={cn(dainikKrantiClasses.chartTitle, dainikKrantiClasses.chartTitleText)}>
        <Sparkles className="h-4 w-4 text-secondary" /> {chart.title}
      </h3>

      <div className={cn(dainikKrantiClasses.chartLines, "space-y-2")}>
        {chart.lines.map((line, i) => (
          <div key={i} className={dainikKrantiClasses.chartLine}>
            <p className={dainikKrantiClasses.chartLineText}>{line}</p>
          </div>
        ))}
      </div>

      {chart.houses ? (
        <D1Chart houses={chart.houses} />
      ) : (
        <p className={dainikKrantiClasses.chartState}>{chart.stateText}</p>
      )}

      {chart.showStatusLegend ? <GrahaStatusLegend className="mt-2" /> : null}

      {chart.dateLine ? <p className={dainikKrantiClasses.chartDate}>{chart.dateLine}</p> : null}
    </div>
  );
}
