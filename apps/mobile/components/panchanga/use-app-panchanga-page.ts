import { useCallback, useEffect, useMemo, useState } from "react";
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
import { adToBS, bsToAD } from "@vedic-patro/domain/calendar/bs-calendar";
import { rememberBrowse } from "@vedic-patro/domain/calendar/remembered-browse";
import { todayIn } from "@vedic-patro/domain/calendar/event-time";
import { defaultClockForTimezone } from "@vedic-patro/domain/panchanga/panchanga-mode";

/**
 * The app's side of `usePanchangaPage` (@vedic-patro/features): the browsed
 * date and clock live in screen state (a `?date=` link opens on that day), and
 * the day is fetched by AD date through the app's transport (offline-capable).
 */
export function useAppPanchangaPage() {
  const params = useLocalSearchParams<{ date?: string }>();
  const queryClient = useQueryClient();
  const { location, setLocation, ready } = usePanchangaLocation();
  const timezone = location.params.timezone ?? "Asia/Kathmandu";
  /* No ?date=: the place's own today and time, not the phone's. At night in Kathmandu it is already
     tomorrow in Melbourne; the page must still open on Kathmandu's day. Until the reader picks a day or
     a time, both follow the place (a new place, or the saved one loading, moves them). */
  const [pickedDate, setPickedDate] = useState<Date | null>(() =>
    typeof params.date === "string" && params.date ? parseAdStr(params.date) : null,
  );
  // Taken once per place, so a re-render does not move the day or the time under the reader.
  const placeToday = useMemo(() => todayIn(timezone), [timezone]);
  const placeNow = useMemo(() => defaultClockForTimezone(timezone), [timezone]);
  const date = useMemo(() => pickedDate ?? parseAdStr(placeToday), [pickedDate, placeToday]);
  const setDate = useCallback((next: Date) => setPickedDate(next), []);
  useEffect(() => {
    const bs = adToBS(date);
    rememberBrowse("bs", bs.year, bs.month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [civilIsoFromDate(date)]);
  const { clock: pickedClock, setClock: setPickedClock } = usePanchangaClock(timezone);
  const [clockPicked, setClockPicked] = useState(false);
  const clock = clockPicked ? pickedClock : placeNow;
  const setClock = useCallback(
    (next: string) => {
      setClockPicked(true);
      setPickedClock(next);
    },
    [setPickedClock],
  );

  useEffect(() => {
    if (typeof params.date === "string" && params.date) setPickedDate(parseAdStr(params.date));
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
