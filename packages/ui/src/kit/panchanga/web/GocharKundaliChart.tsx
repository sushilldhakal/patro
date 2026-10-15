import type { ReactNode } from "react";
import type { BhavaHouse } from "@vedic-patro/domain/bhava";
import { useGocharKundaliChart, type GocharGrahaRow } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { Box, Icon, Text } from "@vedic-patro/ui";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { sparklesIcon } from "../icons";
import { GrahaStatusLegend } from "./GrahaStatusBadges";

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
  /** The D1 drawing stays in the app until the wheel family moves. */
  renderChart?: (houses: BhavaHouse[]) => ReactNode;
  hideTitle?: boolean;
};

export function GocharKundaliChart({ className, renderChart, hideTitle, ...props }: Props) {
  const chart = useGocharKundaliChart(props);

  return (
    <Box className={cn(dainikKrantiClasses.chartCard, className)}>
      {hideTitle ? null : (
        <Text as="h3" className={cn(dainikKrantiClasses.chartTitle, dainikKrantiClasses.chartTitleText)}>
          <Icon node={sparklesIcon} size={16} tone="secondary" className="h-4 w-4" /> {chart.title}
        </Text>
      )}

      <Box className={cn(dainikKrantiClasses.chartLines, "space-y-2")}>
        {chart.lines.map((line, i) => (
          <Box key={i} className={dainikKrantiClasses.chartLine}>
            <Text as="p" className={dainikKrantiClasses.chartLineText}>
              {line}
            </Text>
          </Box>
        ))}
      </Box>

      {chart.houses && renderChart ? (
        renderChart(chart.houses)
      ) : (
        <Text as="p" className={dainikKrantiClasses.chartState}>
          {chart.stateText}
        </Text>
      )}

      {chart.showStatusLegend ? <GrahaStatusLegend className="mt-2" /> : null}

      {chart.dateLine ? (
        <Text as="p" className={dainikKrantiClasses.chartDate}>
          {chart.dateLine}
        </Text>
      ) : null}
    </Box>
  );
}
