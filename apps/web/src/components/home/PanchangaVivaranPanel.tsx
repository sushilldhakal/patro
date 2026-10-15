import { useNavigate } from "@tanstack/react-router";
import type { CalendarDay, PanchangaDay } from "@/lib/api";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { currentPatroDayLinkSearch } from "@/lib/url-state";
import { PanchangaVivaranPanel as View } from "@vedic-patro/ui/kit/shell";

type Props = {
  p?: PanchangaDay;
  selectedDay?: CalendarDay | null;
  selectedAdDate?: string;
  location?: PanchangaLocation;
  bsYear?: number;
  bsMonth?: number;
  loading?: boolean;
};

/** Status badges and the detail link stay here. The panel is `@vedic-patro/ui/kit/shell`. */
export function PanchangaVivaranPanel({ p, selectedDay, selectedAdDate, location, loading }: Props) {
  const navigate = useNavigate();
  const search = location && selectedAdDate ? currentPatroDayLinkSearch(location, selectedAdDate) : undefined;
  return (
    <View
      p={p}
      selectedDay={selectedDay}
      loading={loading}
      renderPlanetStatus={(planet) => (
        <GrahaStatusBadges planetKey={planet.key} isRetrograde={planet.isRetrograde} isCombust={planet.isCombust} size={12} />
      )}
      onOpenDetail={
        search
          ? () => {
              navigate({ to: "/panchanga", search });
            }
          : undefined
      }
    />
  );
}
