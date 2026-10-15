import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { ShadbalaChart } from "@/components/kundali/ShadbalaChart";
import type { BhavaBalaData, ShadbalaResponse, YuddhaData } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { ShadbalaCard as Shared } from "@vedic-patro/ui/kit/jyotish";

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
      renderGraha={({ graha, size }) => <GrahaPlanetIcon graha={graha as GrahaKey} size={size} />}
      renderChart={(chart) => <ShadbalaChart {...chart} />}
    />
  );
}
