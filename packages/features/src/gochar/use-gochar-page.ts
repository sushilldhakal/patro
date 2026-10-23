/**
 * Gochar (planetary transits) page logic, shared by the website
 * (`apps/web/src/pages/Gochar.tsx`) and the app (`apps/mobile/app/(tabs)/gochar.tsx`).
 *
 * Each app keeps the browsed day where it likes (the URL and a resolved
 * panchanga day on the website, screen state in the app) and passes what it
 * knows about it; this decides the transit fetch, the ingress month (its
 * calendar, range and rows), the filters, the date heading and the copy.
 */
import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchGocharIngress,
  fetchGocharJd,
  gocharKeys,
  locationCacheKey,
  type GocharResponse,
  type LocationParams,
  type MonthCalendar,
} from "@vedic-patro/api-client";
import type { Era } from "@vedic-patro/domain/calendar/era";
import {
  buildGocharIngressMonthList,
  countIngressByFilter,
  daysFromRef,
  filterIngressEvents,
  ingressEventDetail,
  ingressFetchRangeForBrowseMonth,
  ingressGocharFetchEra,
  ingressGrahaLabel,
  relativeDayLabel,
  type IngressFilter,
} from "@vedic-patro/read-models/jyotish/gochar-page-utils";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import type { PanchangaLocation } from "@vedic-patro/read-models/geography/panchanga-location";
import { formatBsIsoDateNepali } from "@vedic-patro/domain/panchanga/panchanga-format";
import { formatPatroCivilDayLabel } from "@vedic-patro/domain/calendar/patro-headline-subtitle";
import { adMonthLabel, bsMonthLabel, isGregorianEraBrowse } from "@vedic-patro/domain/calendar/patro-month-labels";
import { shiftPatroBrowseMonth } from "@vedic-patro/domain/calendar/patro-year-browse-step";
import { useLocale } from "@vedic-patro/i18n/react";

type Parts = { year?: number; month?: number; day?: number };

/** What the app knows about the browsed day. */
export type GocharDay = {
  /** Civil date (AD ISO) of the day. */
  dateAd?: string;
  /** Julian day (0h UT) of the civil day, when the app resolved it; else derived from `dateAd`. */
  jdUt?: number;
  vikram?: Parts;
  gregorian?: Parts;
  /** BS ISO date, when known (date heading). */
  dateBs?: string;
  /** The date the reader typed, before the day resolved (website URL input). */
  input?: { era: Era; year: number; month: number; day: number };
  isLoading?: boolean;
  isError?: boolean;
};

/** Where the ingress month arrows send the reader (same day number, clamped by the app). */
export type GocharMonthTarget = { calendar: "ad" | "vikram"; era: Era; year: number; month: number; day: number };

export type GocharIngressView = {
  key: string;
  graha: GrahaKey;
  chip: { month: string; day: string };
  name: string;
  detail: string;
  /** "Tomorrow", "In 5 days". */
  relative: string;
};

const FILTERS: { id: IngressFilter; key: string }[] = [
  { id: "all", key: "gochar.filter_all" },
  { id: "rashi", key: "gochar.filter_rashi" },
  { id: "nakshatra", key: "gochar.filter_nakshatra" },
  { id: "asta", key: "gochar.filter_asta" },
  { id: "retrograde", key: "gochar.filter_retrograde" },
];

const HALF_HOUR = 1000 * 60 * 30;
const pad = (n: number) => String(n).padStart(2, "0");

/** Julian day at 0h UT of a civil AD date. */
export function civilJdUt(dateAd: string): number | undefined {
  const [y, m, d] = dateAd.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const utc = new Date(Date.UTC(2000, m - 1, d));
  utc.setUTCFullYear(y);
  return utc.getTime() / 86400000 + 2440587.5;
}

export function useGocharPage({
  era,
  location,
  day,
  todayAd,
  fetchMonth,
  onPickMonth,
}: {
  era: Era;
  location: PanchangaLocation;
  day: GocharDay;
  todayAd: string;
  fetchMonth: (year: number, month: number, location: LocationParams | undefined, options: { era: Era; full?: boolean }) => Promise<MonthCalendar>;
  onPickMonth: (target: GocharMonthTarget) => void;
}) {
  const { t, lang, digits } = useLocale();
  const [selectedPlanet, setSelectedPlanet] = useState<GrahaKey>("sun");
  const [filter, setFilter] = useState<IngressFilter>("all");
  const params = location.params;
  const refDateAd = day.dateAd ?? todayAd;
  const jdUt = day.jdUt ?? (day.dateAd ? civilJdUt(day.dateAd) : undefined);

  const gocharQ = useQuery<GocharResponse>({
    queryKey: gocharKeys.day(jdUt ?? 0, params),
    queryFn: () => fetchGocharJd(jdUt!, params),
    enabled: jdUt != null,
    staleTime: HALF_HOUR,
    placeholderData: keepPreviousData,
  });

  const gregorianBrowse = isGregorianEraBrowse(era);
  const { vikram, gregorian, input } = day;

  /** The month the ingress list covers, in the browse era's calendar. */
  const browse = useMemo((): { year: number; month: number; day: number; gregorian: boolean } | null => {
    if (gregorianBrowse && gregorian?.year && gregorian.month) {
      return { year: gregorian.year, month: gregorian.month, day: gregorian.day ?? 1, gregorian: true };
    }
    if (vikram?.year && vikram.month) return { year: vikram.year, month: vikram.month, day: vikram.day ?? 1, gregorian: false };
    if (input && (input.era === "bs" || input.era === "bbs" || input.era === "ad")) {
      return { year: input.year, month: input.month, day: input.day, gregorian: input.era === "ad" };
    }
    return null;
  }, [gregorianBrowse, gregorian, vikram, input]);

  const monthQ = useQuery({
    // Only each day's date_ad / day and the month's limits are read here, so the
    // lite month (~1 KB/day) is enough — the full one is ~79 KB/day (~2.4 MB a
    // month). Same key as the home calendar's month, so the two share one entry.
    queryKey: [
      "panchanga",
      "month",
      era,
      browse?.year ?? 0,
      browse?.month ?? 0,
      locationCacheKey(params),
      "lite",
      "intl",
    ] as const,
    queryFn: () => fetchMonth(browse!.year, browse!.month, params, { era, full: false }),
    enabled: browse != null,
    staleTime: HALF_HOUR,
    placeholderData: keepPreviousData,
  });
  const monthDays = useMemo(() => monthQ.data?.calendar ?? [], [monthQ.data?.calendar]);

  const range = useMemo(
    () => (browse ? ingressFetchRangeForBrowseMonth(era, browse.year, browse.month, monthDays) : null),
    [browse, era, monthDays],
  );
  const ingressEra = ingressGocharFetchEra(era);
  const ingressQ = useQuery({
    queryKey: gocharKeys.ingressEra(range?.from ?? "", range?.to ?? "", "patro", ingressEra, params),
    queryFn: () => fetchGocharIngress(range!.from, range!.to, params, { level: "patro", era: ingressEra }),
    enabled: Boolean(range?.from && range?.to),
    staleTime: HALF_HOUR,
  });

  const lng = lang === "en" ? "en" : "ne";
  const allRows = useMemo(() => {
    if (!browse || monthDays.length === 0) return [];
    return buildGocharIngressMonthList(ingressQ.data?.events ?? [], era, browse.year, browse.month, monthDays, refDateAd, lng, digits);
  }, [ingressQ.data?.events, browse, monthDays, era, refDateAd, lng, digits]);

  const counts = useMemo(() => countIngressByFilter(allRows.map((r) => r.event)), [allRows]);
  const rows = useMemo(
    (): GocharIngressView[] =>
      allRows
        .filter((r) => filterIngressEvents([r.event], filter).length > 0)
        .map((r, i) => ({
          key: `${r.event.graha}-${r.event.entry_time_utc ?? i}-${r.event.level}`,
          graha: r.event.graha as GrahaKey,
          chip: r.monthChip,
          name: ingressGrahaLabel(r.event, lng),
          detail: ingressEventDetail(r.event, lng),
          relative: relativeDayLabel(daysFromRef(r.rowDateAd, refDateAd), lng, digits),
        })),
    [allRows, filter, lng, refDateAd, digits],
  );

  const monthLabel = browse
    ? `${browse.gregorian ? adMonthLabel(browse.month, lng) : bsMonthLabel(browse.month, lng)} ${digits(browse.year)}`
    : "";

  const stepMonth = (delta: number) => {
    if (!browse) return;
    const calendarEra: Era = browse.gregorian ? "ad" : era === "bbs" ? "bbs" : "bs";
    const next = shiftPatroBrowseMonth(calendarEra, browse.year, browse.month, delta);
    onPickMonth({ calendar: browse.gregorian ? "ad" : "vikram", era: calendarEra, year: next.year, month: next.month, day: browse.day });
  };

  const dateLabel = useMemo(() => {
    // The browse era (the calendar preference) picks BS vs AD; the language only names the parts.
    if (!gregorianBrowse) {
      const bsIso =
        vikram?.year != null && vikram.month != null && vikram.day != null
          ? `${vikram.year}-${pad(vikram.month)}-${pad(vikram.day)}`
          : (day.dateBs ?? gocharQ.data?.date_bs);
      const bs = bsIso ? formatBsIsoDateNepali(bsIso, { lang, includeYear: true }) : undefined;
      if (bs) return bs;
    }
    if (gregorian?.year && gregorian.month && gregorian.day) {
      return formatPatroCivilDayLabel(`${gregorian.year}-${pad(gregorian.month)}-${pad(gregorian.day)}`, lang, digits);
    }
    return refDateAd ? formatPatroCivilDayLabel(refDateAd, lang, digits) : "—";
  }, [gregorianBrowse, vikram, gregorian, day.dateBs, gocharQ.data?.date_bs, refDateAd, lang, digits]);

  const gochar = gocharQ.data?.gochar;

  return {
    copy: {
      title: t("gochar.page_title"),
      subtitle: t("gochar.page_subtitle"),
      shortTitle: t("ui.gochar.gochar"),
      error: t("gochar.load_error"),
      loading: t("common.loading"),
      footnote: t("ui.gochar.positions_are_computed_at_local_sunrise"),
      ingressEyebrow: t("ui.gochar.what_s_changing"),
      ingressTitle: t("ui.gochar.upcoming_transit_events"),
      ingressEmpty: t("ui.gochar.no_upcoming_transits_this_month"),
      prevMonth: t("calendar.prev_month"),
      nextMonth: t("calendar.next_month"),
    },
    status: gochar ? ("ready" as const) : day.isError || gocharQ.isError ? ("error" as const) : ("loading" as const),
    /** True while the day or its transits load for the first time. */
    loading: Boolean((day.isLoading && !day.dateAd) || (gocharQ.isLoading && !gocharQ.data)),
    gochar,
    dateLabel,
    refDateAd,
    selectedPlanet,
    setSelectedPlanet,
    ingress: {
      rows,
      loading: ingressQ.isLoading || (browse != null && monthQ.isLoading && !monthQ.data),
      monthLabel,
      prevMonth: () => stepMonth(-1),
      nextMonth: () => stepMonth(1),
      filters: FILTERS.map((f) => ({ id: f.id, label: `${t(f.key)} (${digits(counts[f.id])})`, active: f.id === filter })),
      setFilter,
    },
    /** The month payload (the app reads its browse limits from it). */
    month: monthQ.data,
  };
}

export type GocharPage = ReturnType<typeof useGocharPage>;
