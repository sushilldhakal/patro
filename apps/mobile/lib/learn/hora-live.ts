import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPanchanga, panchangaKeys, type ApiHoraSlot } from "@/lib/api";
import { usePanchangaLocation, resolveLocationTimezone } from "@/lib/use-panchanga-location";
import { minutesSinceMidnightInTimezone, todayAdStringInTimezone } from "@/lib/zoned-time";

/** "6:03 AM" / "12:41 PM" → minutes since midnight. */
function parseClockToMinutes(short: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(short.trim());
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const period = m[3]!.toUpperCase();
  if (period === "AM") {
    if (h === 12) h = 0;
  } else if (h !== 12) {
    h += 12;
  }
  return h * 60 + min;
}

/**
 * Today's live 24-hora slot list plus which one is running right now.
 *
 * Native equivalent of web's `HoraArticle` live query (`fetchPanchangaDay` +
 * `usePanchangaLocation`) — reuses mobile's own `fetchPanchanga`/location hook
 * rather than re-deriving fetch logic, per the Learn port plan.
 */
export function useTodayHora(): {
  slots: ApiHoraSlot[] | undefined;
  currentIndex: number;
  loading: boolean;
} {
  const { location } = usePanchangaLocation();
  const timezone = resolveLocationTimezone(location);
  const todayAd = useMemo(() => todayAdStringInTimezone(new Date(), timezone), [timezone]);

  const query = useQuery({
    queryKey: panchangaKeys.day(todayAd, "ad", location.params),
    queryFn: () => fetchPanchanga(todayAd, "ad", location.params),
    staleTime: 1000 * 60 * 30,
  });

  const slots = query.data?.hora;

  const currentIndex = useMemo(() => {
    if (!slots || slots.length === 0) return -1;
    const nowMin = minutesSinceMidnightInTimezone(new Date(), timezone);
    for (let i = 0; i < slots.length; i++) {
      const start = parseClockToMinutes(slots[i]!.start_local_time_short);
      const end = parseClockToMinutes(slots[i]!.end_local_time_short);
      if (start === null || end === null) continue;
      const wrappedEnd = end <= start ? end + 1440 : end;
      const wrappedNow = nowMin < start ? nowMin + 1440 : nowMin;
      if (wrappedNow >= start && wrappedNow < wrappedEnd) return i;
    }
    return -1;
  }, [slots, timezone]);

  return { slots, currentIndex, loading: query.isLoading };
}
