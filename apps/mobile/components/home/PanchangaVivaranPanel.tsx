import { useRouter } from "expo-router";
import type { CalendarDay, PanchangaDay } from "@/lib/api";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { PanchangaVivaranPanel as View } from "@vedic-patro/ui/kit/shell";

type Props = {
  p?: PanchangaDay;
  selectedDay?: CalendarDay | null;
  selectedAd?: string;
  loading?: boolean;
};

/** Status badges and the detail route stay here. The panel is `@vedic-patro/ui/kit/shell`. */
export function PanchangaVivaranPanel({ p, selectedDay, selectedAd, loading }: Props) {
  const router = useRouter();
  return (
    <View
      p={p}
      selectedDay={selectedDay}
      loading={loading}
      renderPlanetStatus={(planet) => (
        <GrahaStatusBadges planetKey={planet.key} isRetrograde={planet.isRetrograde} isCombust={planet.isCombust} size={12} />
      )}
      onOpenDetail={selectedAd ? () => router.push({ pathname: "/panchanga", params: { date: selectedAd } }) : undefined}
    />
  );
}
