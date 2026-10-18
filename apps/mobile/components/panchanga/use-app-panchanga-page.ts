import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { fetchPanchangaAtMidnight, locationCacheKey, PANCHANGA_CACHE_VERSION } from "@vedic-patro/api-client";
import { usePanchangaPage } from "@vedic-patro/features/panchanga";
import { fetchPanchanga, panchangaKeys } from "@/lib/api";
import { buildAtTimeDatetime, fetchEphemerisPanchangaDay } from "@/lib/ephemeris-adapters";
import { usePanchangaClock } from "@/components/panchanga/use-panchanga-mode";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { parseAdStr } from "@vedic-patro/domain/panchanga/panchanga-year-page";
import { civilIsoFromDate } from "@vedic-patro/domain/calendar/patro-day";
import { bsToAD } from "@vedic-patro/domain/calendar/bs-calendar";

/**
 * The app's side of `usePanchangaPage` (@vedic-patro/features): the browsed
 * date and clock live in screen state (a `?date=` link opens on that day), and
 * the day is fetched by AD date through the app's transport (offline-capable).
 */
export function useAppPanchangaPage() {
  const params = useLocalSearchParams<{ date?: string }>();
  const queryClient = useQueryClient();
  const { location, setLocation, ready } = usePanchangaLocation();
  const [date, setDate] = useState(() => (typeof params.date === "string" && params.date ? parseAdStr(params.date) : new Date()));
  const { clock, setClock } = usePanchangaClock(location.params.timezone ?? "Asia/Kathmandu");

  useEffect(() => {
    if (typeof params.date === "string" && params.date) setDate(parseAdStr(params.date));
  }, [params.date]);

  const adDateStr = civilIsoFromDate(date);
  const atTime = buildAtTimeDatetime(adDateStr, clock);
  const daySource = (dateAd: string) => ({
    queryKey: panchangaKeys.day(dateAd, "ad", location.params),
    queryFn: () => fetchPanchanga(dateAd, "ad", location.params),
  });

  const page = usePanchangaPage({
    location,
    date,
    clock,
    setClock,
    enabled: ready,
    sources: {
      udaya: daySource(adDateStr),
      atTime: () => ({
        queryKey: panchangaKeys.atTime(atTime, location.params),
        queryFn: () =>
          fetchEphemerisPanchangaDay(atTime, adDateStr, location.params, {
            dailyFor: (dateAd) => queryClient.ensureQueryData(daySource(dateAd)),
          }),
      }),
      midnight: (civilDateAd) => ({
        queryKey: ["panchanga", "civil-day", PANCHANGA_CACHE_VERSION, civilDateAd, locationCacheKey(location.params)],
        queryFn: () => fetchPanchangaAtMidnight(civilDateAd, "ad", location.params),
      }),
      civilEra: "ad",
    },
  });

  /** The wheel's own BS date/time picker. */
  const commitCalendar = (year: number, month: number, day: number, nextClock: string) => {
    const next = bsToAD(year, month, day);
    page.commitClock(nextClock, civilIsoFromDate(next) !== adDateStr);
    setDate(next);
  };

  return { page, location, setLocation, ready, date, setDate, clock, adDateStr, commitCalendar };
}
