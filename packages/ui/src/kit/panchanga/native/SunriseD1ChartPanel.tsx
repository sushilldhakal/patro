import { Box, Text } from "@vedic-patro/ui";
import { useSunriseD1Chart } from "@vedic-patro/features/panchanga";
import { panchangaPageClasses as cls } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import type { SunriseD1ChartPanelProps } from "../contract";

const aside = cls.aside;

export function SunriseD1ChartPanel({ p, renderChart, renderLegend }: SunriseD1ChartPanelProps) {
  const chart = useSunriseD1Chart(p);
  if (!chart) return null;

  return (
    <Box className={aside.card}>
      <Text className={aside.eyebrow}>{chart.title}</Text>
      <Text className={aside.anchor}>{chart.anchor}</Text>
      <Box className={aside.body}>
        {renderChart(chart.houses)}
        {chart.showStatusLegend ? renderLegend() : null}
      </Box>
    </Box>
  );
}
