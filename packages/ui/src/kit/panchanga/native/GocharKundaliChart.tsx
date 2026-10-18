import type { ReactNode } from "react";
import type { BhavaHouse } from "@vedic-patro/domain/bhava";
import { useGocharKundaliChart, type GocharGrahaRow } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Box, Icon, Text } from "@vedic-patro/ui";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { sparklesIcon } from "../icons";
import { GrahaStatusLegend } from "./GrahaStatusBadges";

type Props = {
  grahas: GocharGrahaRow[];
  papanshaLine?: string;
  gapanshaLine?: string;
  dateBs?: string | null;
  dateAd?: string | null;
  loading?: boolean;
  className?: string;
  /** When true, omit title (shown in GocharRashyadiBlock header row). */
  hideTitle?: boolean;
  /** The D1 drawing stays in the app until the wheel family moves. */
  renderChart?: (houses: BhavaHouse[]) => ReactNode;
};

export function GocharKundaliChart({ className, hideTitle, renderChart, ...props }: Props) {
  const chart = useGocharKundaliChart(props);

  return (
    <Box className={cn(dainikKrantiClasses.chartCard, className)}>
      {hideTitle ? null : (
        <Box className={dainikKrantiClasses.chartTitle}>
          <Icon node={sparklesIcon} size={16} tone="secondary" />
          <Text className={dainikKrantiClasses.chartTitleText}>{chart.title}</Text>
        </Box>
      )}

      <Box className={cn("gap-2", hideTitle ? undefined : dainikKrantiClasses.chartLines)}>
        {chart.lines.map((line, i) => (
          <Box key={i} className={dainikKrantiClasses.chartLine}>
            <Text className={dainikKrantiClasses.chartLineText}>{line}</Text>
          </Box>
        ))}
      </Box>

      {chart.houses && renderChart ? (
        renderChart(chart.houses)
      ) : (
        <Text className={dainikKrantiClasses.chartState}>{chart.stateText}</Text>
      )}

      {chart.showStatusLegend ? <GrahaStatusLegend className="mt-2" /> : null}

      {chart.dateLine ? <Text className={dainikKrantiClasses.chartDate}>{chart.dateLine}</Text> : null}
    </Box>
  );
}
