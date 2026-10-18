import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { GrahaShantiRecommendation } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { ShantiVidhiPanel as Shared } from "@vedic-patro/ui/kit/jyotish";

export function ShantiVidhiPanel({ grahaShanti, isError }: { grahaShanti?: GrahaShantiRecommendation; isError?: boolean }) {
  return <Shared grahaShanti={grahaShanti} isError={isError} renderGraha={({ graha, size }) => <GrahaPlanetIcon graha={graha as GrahaKey} size={size} />} />;
}

export default ShantiVidhiPanel;
