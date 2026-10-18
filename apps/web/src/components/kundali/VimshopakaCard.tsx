import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { VimshopakaData } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { VimshopakaCard as Shared } from "@vedic-patro/ui/kit/jyotish";

export function VimshopakaCard({ data }: { data: VimshopakaData }) {
  return <Shared data={data} renderGraha={({ graha, size }) => <GrahaPlanetIcon graha={graha as GrahaKey} size={size} />} />;
}

export default VimshopakaCard;
