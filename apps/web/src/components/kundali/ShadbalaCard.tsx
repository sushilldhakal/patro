import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { BhavaBalaData, ShadbalaResponse, YuddhaData } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { ShadbalaCard as Shared, ShadbalaChart } from "@vedic-patro/ui/kit/jyotish";

function graha({ graha, size }: { graha: string; size?: number }) {
  return <GrahaPlanetIcon graha={graha as GrahaKey} size={size} />;
}

export function ShadbalaCard({
  data,
  yuddha,
  bhavaBala,
}: {
  data: ShadbalaResponse;
  yuddha?: YuddhaData;
  bhavaBala?: BhavaBalaData | null;
}) {
  return (
    <Shared
      data={data}
      yuddha={yuddha}
      bhavaBala={bhavaBala}
      renderGraha={graha}
      renderChart={(chart) => <ShadbalaChart {...chart} renderGraha={graha} />}
    />
  );
}
