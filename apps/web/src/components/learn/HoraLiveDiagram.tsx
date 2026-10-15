import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { HoraRing } from "@/components/panchanga/HoraRing";
import {
  resolveLocationTimezone,
  usePanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";
import { useLocale } from "@/i18n/locale";
import { fetchPanchangaDay, panchangaKeys } from "@/lib/api";
import { tmCardPadLg } from "@/lib/learn-classes";
import { AD_DISPLAY, patroDayFetchFromApiDateAd } from "@/lib/patro-day-url";
import { cn } from "@vedic-patro/domain/utils";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";

import { tFor } from "@vedic-patro/i18n/runtime";
/** Today's hora wheel for the Hora chapter — fetches today's panchanga for the chosen place. */
export function HoraLiveDiagram() {
  const { lang } = useLocale();
  const { location } = usePanchangaLocation();
  const todayAd = useMemo(
    () => todayAdStringInTimezone(new Date(), resolveLocationTimezone(location)),
    [location],
  );
  const panchangaQ = useQuery({
    queryKey: panchangaKeys.day(todayAd, "ad", location.params),
    queryFn: () => fetchPanchangaDay(patroDayFetchFromApiDateAd(todayAd, AD_DISPLAY), location.params),
    staleTime: 1000 * 60 * 30,
  });
  const p = panchangaQ.data;
  const timezone = resolveTimeZone(p?.location?.timezone, location.params.timezone);

  if (!p) {
    return (
      <div className={cn(tmCardPadLg, "flex min-h-[200px] items-center justify-center text-sm")}>
        {tFor(lang, "rashifal.profile.loading")}
      </div>
    );
  }
  return <HoraRing p={p} isToday timezone={timezone} />;
}
