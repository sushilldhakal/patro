import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { VargaCharts } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { GrahaDetailsList as Shared } from "@vedic-patro/ui/kit/jyotish";

export function GrahaDetailsList(props: { division: number; anchorKey: string; vargaCharts: VargaCharts }) {
  return <Shared {...props} renderGraha={({ graha, size }) => <GrahaPlanetIcon graha={graha as GrahaKey} size={size} />} />;
}
