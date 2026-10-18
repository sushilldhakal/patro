import { GrahaStatusMarksSvg } from "@/components/graha/GrahaStatusBadges";
import type { BhavaHouse } from "@vedic-patro/domain/jyotish/bhava";
import { D1Chart as Shared } from "@vedic-patro/ui/kit/jyotish";

export function D1Chart({ houses, size }: { houses: BhavaHouse[]; size?: number }) {
  return (
    <Shared
      houses={houses}
      size={size}
      renderMarks={(mark) => (
        <GrahaStatusMarksSvg
          planetKey={mark.planetKey}
          isRetrograde={mark.isRetrograde}
          isCombust={mark.isCombust}
          x={mark.x}
          y={mark.y}
          size={mark.size}
        />
      )}
    />
  );
}
