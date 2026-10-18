/**
 * Panchanga element page logic, shared by the website (`apps/web/src/pages/ElementPage.tsx`)
 * and the app (`apps/mobile/app/(tabs)/panchanga/element/[name].tsx`).
 *
 * A "span" element (tithi, nakshatra, …) is browsed by month and lists its
 * spans; a "table" element is browsed by day and shows that day's rows;
 * chandrabala/tarabala show the day's strength cards. Each app keeps the
 * browsed month/day where it likes and passes it in.
 */
import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  elementKeys,
  fetchElementDay,
  fetchElementSpans,
  fetchPanchanga,
  locationCacheKey,
  PANCHANGA_CACHE_VERSION,
  type PanchangaDay,
} from "@vedic-patro/api-client";
import { getChandraBalamCards, getTaraBalamCards, type BalamCardItem } from "@vedic-patro/read-models/panchanga/balam-cards";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { ELEMENT_BY_ID } from "@vedic-patro/domain/panchanga/panchanga-elements";
import { getChandrabalamTable, getTarabalaTable } from "@vedic-patro/read-models/panchanga/panchanga-format";
import type { PanchangaLocation } from "@vedic-patro/read-models/geography/panchanga-location";
import { defaultClockForTimezone } from "@vedic-patro/domain/panchanga/panchanga-mode";
import { formatRashiDisplay } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";
import { useLocale } from "@vedic-patro/i18n/react";
import type { PageStatus } from "../_shared";
import { elementTable, spanCards } from "./model";

export * from "./model";

const HALF_HOUR = 1000 * 60 * 30;

export type ElementPageScope = {
  name: string | undefined;
  location: PanchangaLocation;
  /** The browsed month (span elements). */
  month: { era: Era; year: number; month: number };
  /** The browsed day (table elements). */
  day: {
    dateAd?: string;
    /** The day's panchanga when the app resolves the day itself (website); fetched here otherwise. */
    panchanga?: PanchangaDay;
    resolvedByApp?: boolean;
    isLoading?: boolean;
  };
};

export function useElementPage({ name, location, month, day }: ElementPageScope) {
  const { t, lang, digits } = useLocale();
  const text = useMemo(() => ({ t, lang, digits: (v: string | number) => digits(v) }), [t, lang, digits]);
  const meta = name ? ELEMENT_BY_ID[name] : undefined;
  const isSpan = meta?.kind === "span";
  const balam: "chandrabala" | "tarabala" | undefined = name === "chandrabala" || name === "tarabala" ? name : undefined;
  const params = location.params;
  const timeZone = resolveTimeZone(undefined, params.timezone);
  const todayAd = todayAdStringInTimezone(new Date(), timeZone);
  const dateAd = day.dateAd ?? "";

  const spanQuery = useQuery({
    queryKey: elementKeys.spans(name ?? "", month, params),
    queryFn: () => fetchElementSpans(name!, month, params),
    enabled: Boolean(meta && isSpan),
    staleTime: HALF_HOUR,
    placeholderData: keepPreviousData,
  });

  const panchangaQuery = useQuery({
    queryKey: ["panchanga", "day", PANCHANGA_CACHE_VERSION, dateAd, "ad", locationCacheKey(params)] as const,
    queryFn: () => fetchPanchanga(dateAd, "ad", params),
    enabled: Boolean(meta && balam && dateAd && !day.resolvedByApp),
    staleTime: HALF_HOUR,
    placeholderData: keepPreviousData,
  });
  const panchanga = day.resolvedByApp ? day.panchanga : panchangaQuery.data;

  const dayQuery = useQuery({
    queryKey: elementKeys.day(name ?? "", dateAd, params),
    queryFn: () => fetchElementDay(name!, dateAd, params),
    enabled: Boolean(meta && !isSpan && !balam && dateAd),
    staleTime: HALF_HOUR,
    placeholderData: keepPreviousData,
  });

  const spans = useMemo(() => (spanQuery.data ? spanCards(spanQuery.data.spans, text) : []), [spanQuery.data, text]);
  const table = useMemo(
    () => (dayQuery.data ? elementTable(dayQuery.data.data, dayQuery.data.sunrise, name ?? "", text) : undefined),
    [dayQuery.data, name, text],
  );

  const balamView = useMemo(() => {
    if (!balam || !panchanga) return undefined;
    const isChandra = balam === "chandrabala";
    const cards = isChandra ? getChandraBalamCards(panchanga) : getTaraBalamCards(panchanga);
    const tbl = isChandra ? getChandrabalamTable(panchanga) : getTarabalaTable(panchanga);
    const pickName = (ne: string, en?: string) => (lang === "en" ? (en ?? ne) : ne);
    const moonLabel = isChandra ? formatRashiDisplay(tbl?.moon_label, tbl?.moon_label_en, lang) : pickName(tbl?.moon_label ?? "", tbl?.moon_label_en);
    return {
      variant: balam as "chandrabala" | "tarabala",
      cards,
      cardName: (card: BalamCardItem) =>
        (isChandra ? formatRashiDisplay(card.name, card.nameEn, lang) : undefined) ?? pickName(card.name, card.nameEn),
      moonRef:
        tbl?.moon_label && moonLabel
          ? t(isChandra ? "element_page.moon_sign_sunrise" : "element_page.moon_nakshatra_sunrise", { label: moonLabel })
          : undefined,
      empty: cards.length === 0 ? t("common.no_data") : undefined,
    };
  }, [balam, panchanga, lang, t]);

  const statusOf = (loading: boolean, data: unknown): PageStatus => (data ? "ready" : loading ? "loading" : "error");
  const status: PageStatus = isSpan
    ? statusOf(spanQuery.isLoading, spanQuery.data)
    : balam
      ? statusOf(day.resolvedByApp ? Boolean(day.isLoading) : panchangaQuery.isLoading || !dateAd, panchanga)
      : statusOf(dayQuery.isLoading || !dateAd, dayQuery.data);

  return {
    /** Old slug: show this element instead. */
    redirectTo: name === "udaya-lagna" ? "lagna" : undefined,
    meta,
    kind: !meta ? undefined : isSpan ? ("span" as const) : balam ? ("balam" as const) : ("table" as const),
    copy: {
      title: meta ? t(`panchanga_elements.${meta.id}.title`) : t("element_page.unknown_element"),
      blurb: meta ? t(`panchanga_elements.${meta.id}.blurb`) : "",
      unknown: t("element_page.unknown_element"),
      backToDetails: t("element_page.back_to_details"),
    },
    todayAd,
    /** Clock for the strength cards: now on today, none on other days. */
    clock: dateAd === todayAd ? defaultClockForTimezone(timeZone) : undefined,
    status,
    /** First load (for the website's route loader). */
    loading: Boolean(meta) && status === "loading",
    spans,
    table,
    balam: balamView,
    /** The day's panchanga (the app's date nav reads it). */
    panchanga,
  };
}

export type ElementPage = ReturnType<typeof useElementPage>;
