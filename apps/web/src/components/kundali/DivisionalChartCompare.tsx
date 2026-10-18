import { D1Chart } from "@/components/kundali/D1Chart";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusBadges";
import { BhavaTable } from "@/components/kundali/BhavaTable";
import type { VargaCharts } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import type { DivisionalPanelConfig } from "@vedic-patro/features/kundali";
import { DivisionalChartCompare as Shared } from "@vedic-patro/ui/kit/jyotish";

export function DivisionalChartCompare(props: { vargaCharts: VargaCharts; combustion?: Record<string, boolean | null>; defaultLeft?: DivisionalPanelConfig; defaultRight?: DivisionalPanelConfig }) {
  return (
    <Shared
      {...props}
      renderChart={(houses) => <D1Chart houses={houses} />}
      renderLegend={() => <GrahaStatusLegend />}
      renderBhava={(args) => <BhavaTable {...args} />}
      renderGraha={({ graha, size }) => <GrahaPlanetIcon graha={graha as GrahaKey} size={size} />}
    />
  );
}
