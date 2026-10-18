/**
 * 3D Aakash Gochar page logic, shared by the website (`apps/web/src/pages/AakashGochar.tsx`)
 * and the app (`apps/mobile/app/aakash-gochar.tsx`).
 *
 * The API supplies the sidereal longitudes for the chosen date; each app's
 * scene pins its own orbital model onto them. This holds the day and the time
 * of day (the place's wall clock, following the place until the reader picks
 * an hour), the instant the scene shows, the observer, the fetch, the
 * selection and the copy. The calendar the date nav browses in stays with each
 * app's nav.
 */
import { useCallback, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchGochar, gocharKeys } from "@vedic-patro/api-client";
import { formatGocharPatroDate } from "@vedic-patro/domain/gochar-page-utils";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import {
  displayLocationLabel,
  resolveLocationTimezone,
  type PanchangaLocation,
} from "@vedic-patro/read-models/panchanga-location";
import { toAdStr } from "@vedic-patro/domain/patro-day";
import { KATHMANDU, type Observer } from "@vedic-patro/domain/sky3d/horizon";
import { clockStringInTimezone, todayAdStringInTimezone, zonedWallTimeToInstant } from "@vedic-patro/domain/zoned-time";
import { useLocale } from "@vedic-patro/i18n/react";

export function useAakashGocharPage({ location, ready = true }: { location: PanchangaLocation; ready?: boolean }) {
  const { t, lang } = useLocale();
  /* The default location carries no zone of its own — fall back to Nepal time
     rather than reading "UTC" over a Kathmandu sky. */
  const tz = resolveLocationTimezone(location);
  const todayAd = todayAdStringInTimezone(new Date(), tz);
  /* Noon, and only read for its year/month/day: midday cannot be tipped onto
     the next or previous day by the device's own offset. */
  const [date, setDate] = useState(() => new Date(`${todayAd}T12:00:00`));

  /* The place's wall clock now. Until the reader picks an hour it follows the
     place (picking Tokyo opens on Tokyo's sky now); once chosen it is theirs. */
  const [clock, setClockState] = useState(() => clockStringInTimezone(new Date(), tz));
  const [clockChosen, setClockChosen] = useState(false);
  const setClock = useCallback((next: string) => {
    setClockChosen(true);
    setClockState(next);
  }, []);
  const [clockTz, setClockTz] = useState(tz);
  if (clockTz !== tz) {
    setClockTz(tz);
    if (!clockChosen) setClockState(clockStringInTimezone(new Date(), tz));
  }

  const [selectedKey, setSelectedKey] = useState<GrahaKey | null>(null);
  /** Clicking the card already selected clears it, matching the canvas. */
  const toggleSelected = useCallback((key: GrahaKey) => setSelectedKey((prev) => (prev === key ? null : key)), []);

  /* Proleptic ISO through the shared helper (a BCE day is not "-57-01-01"). */
  const dateAd = useMemo(() => toAdStr(date), [date]);

  /** The instant the scene shows: the picked day at the picked clock, in the place's zone. */
  const sceneDate = useMemo(() => {
    const [hour = 0, minute = 0, second = 0] = clock.split(":").map(Number);
    return zonedWallTimeToInstant(date.getFullYear(), date.getMonth() + 1, date.getDate(), hour || 0, minute || 0, tz, second || 0);
  }, [date, clock, tz]);

  const observer: Observer = useMemo(() => {
    const { lat, lon } = location.params;
    return lat != null && lon != null ? { lat, lon } : KATHMANDU;
  }, [location.params]);

  const query = useQuery({
    queryKey: gocharKeys.dayLegacy(dateAd, "ad", location.params),
    queryFn: () => fetchGochar(dateAd, "ad", location.params),
    /* Keep the previous day on screen so the scene stays mounted (camera,
       mode, fullscreen) while the next day loads. */
    placeholderData: keepPreviousData,
  });

  /* Once the sky has been on screen it stays: swapping it for the loader
     would unmount the scene and lose its state. */
  const [skyShown, setSkyShown] = useState(false);
  if (!skyShown && ready && !query.isLoading) setSkyShown(true);

  const locationLabel = displayLocationLabel(location, undefined, lang);
  const lng = lang === "en" ? "en" : "ne";
  const dateLabel = `${formatGocharPatroDate(dateAd, lng, { includeYear: true })} · ${locationLabel}`;

  return {
    copy: {
      title: t("sidebar_nav.items.aakash-gochar.label"),
      subtitle: `${t("ui.aakash_gochar.live_graha_transits_from_the_geocentric")} · ${locationLabel}`,
      fetchError: t("ui.aakash_gochar.could_not_load_graha_details_from"),
      footnotes: [
        t("ui.aakash_gochar.earth_sits_at_the_centre_and"),
        t("ui.aakash_gochar.the_rashi_belt_tips_with_your"),
        t("ui.aakash_gochar.pick_any_graha_in_the_sky"),
        t("ui.aakash_gochar.the_graha_details_below_come_from"),
        t("ui.aakash_gochar.the_red_marker_on_the_globe"),
        t("ui.aakash_gochar.drag_to_swing_the_sky_and"),
      ],
    },
    timeZone: tz,
    todayAd,
    date,
    setDate,
    dateAd,
    clock,
    setClock,
    sceneDate,
    observer,
    locationLabel,
    dateLabel,
    selectedKey,
    setSelectedKey,
    toggleSelected,
    gochar: query.data?.gochar,
    ayanamsaDeg: query.data?.ayanamsa?.degrees,
    vedicStars: query.data?.vedic_stars,
    /** Show the loader instead of the scene (before it first appears). */
    showLoader: !ready || (query.isLoading && !skyShown),
    /** First load of the route (for the website's route loader). */
    loading: query.isLoading && !query.data,
    isError: query.isError,
    /** The rows on screen still belong to the previous date. */
    stale: query.isPlaceholderData && query.isFetching,
  };
}

export type AakashGocharPage = ReturnType<typeof useAakashGocharPage>;
