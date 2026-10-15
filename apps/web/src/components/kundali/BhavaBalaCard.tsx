import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { BhavaBalaChart } from "@/components/kundali/BhavaBalaChart";
import type { BhavaBalaData, VargaCharts } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { BhavaBalaCard as Shared } from "@vedic-patro/ui/kit/jyotish";

export function BhavaBalaCard({
  data,
  vargaCharts,
  combustion,
}: {
  data: BhavaBalaData;
  vargaCharts?: VargaCharts;
  combustion?: Record<string, boolean | null>;
}) {
  return (
    <Shared
      data={data}
      vargaCharts={vargaCharts}
      combustion={combustion}
      renderGraha={({ graha, size }) => <GrahaPlanetIcon graha={graha as GrahaKey} size={size} />}
      renderChart={(chart) => <BhavaBalaChart {...chart} />}
    />
  );
}
