import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import type { AshtakavargaData } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { AshtakavargaCard as Shared } from "@vedic-patro/ui/kit/jyotish";

export function AshtakavargaCard({ data }: { data: AshtakavargaData }) {
  return (
    <Shared
      data={data}
      renderGraha={({ graha, size }) => <GrahaPlanetIcon graha={graha as GrahaKey} size={size} />}
      renderRashi={({ number, name, size }) => <RashiGlyphIcon number={number} name={name} size={size} />}
    />
  );
}
