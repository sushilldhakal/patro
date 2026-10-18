import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { BhavaBalaData, VargaCharts } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { BhavaBalaCard as Shared, BhavaBalaChart } from "@vedic-patro/ui/kit/jyotish";

function graha({ graha, size }: { graha: string; size?: number }) {
  return <GrahaPlanetIcon graha={graha as GrahaKey} size={size} />;
}

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
      renderGraha={graha}
      renderChart={(chart) => <BhavaBalaChart {...chart} renderGraha={graha} />}
    />
  );
}
