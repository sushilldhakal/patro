/**
 * Sun times (suryakranti) page logic, shared by the website
 * (`apps/web/src/pages/SunTimesYear.tsx` + `components/SunTimesYearGrid.tsx`) and
 * the app (`apps/mobile/app/(tabs)/suryakranti.tsx` + `components/suryakranti/SunTimesYearGrid.tsx`).
 * The app keeps year, era and place where it likes and draws what this returns.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchYearSunTimes, sunYearKeys } from "@vedic-patro/api-client";
import { isGregorianEra, type Era } from "@vedic-patro/domain/calendar/era";
import { displayLocationLabel, type PanchangaLocation } from "@vedic-patro/read-models/geography/panchanga-location";
import { useLocale } from "@vedic-patro/i18n/react";
import { statusOf, type PageStatus } from "../_shared";
import { clockMinutes, spanText, useNowMs, type NowHeroView } from "../common/now-hero";
import { parseHHMM } from "@vedic-patro/domain/panchanga/time-format";
import { todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";
import { buildSunGrid, buildSunLayout, buildSunMatrix, buildSunMonths, type SunMatrixRow, type SunMonth } from "./model";

export * from "./model";

export type SunTimesPage = {
  copy: {
    title: string;
    subtitle: string;
    backHome: string;
    gridTitle: string;
    gridAria: string;
    colDay: string;
    colAyana: string;
    sunrise: string;
    sunset: string;
    northMark: string;
    northLabel: string;
    southMark: string;
    southLabel: string;
    loadError: string;
    loading: string;
    ayanaTitle: string;
    /** Catalogue key of the ayana paragraph — drawn with `<Trans>` (`<north>`/`<south>` parts). */
    ayanaBodyKey: string;
    /** "Location: Kathmandu, NP" (empty when no place). */
    locationLine: string;
  };
  locationLabel: string;
  status: PageStatus;
  /** True while the first data for this year/era/place is loading. */
  loading: boolean;
  monthLabels: readonly string[];
  matrix: SunMatrixRow[];
  months: SunMonth[];
  /** Accordion value of the month to open first. */
  defaultMonth: string;
  /** Today's sun, when the year holds today: up or down, the countdown, the day's length. */
  hero?: NowHeroView;
};

export function useSunTimesPage({ year, era, location }: { year: number; era: Era; location: PanchangaLocation }): SunTimesPage {
  const { t, lang, digits } = useLocale();
  const gregorian = isGregorianEra(era);
  const query = useQuery({
    queryKey: sunYearKeys.year(year, era, location.params),
    queryFn: () => fetchYearSunTimes(year, era, location.params),
    staleTime: 1000 * 60 * 60 * 24,
  });
  const data = query.data;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const view = useMemo(() => {
    const grid = buildSunGrid(data, year, gregorian, lang);
    const layout = buildSunLayout(data, year, gregorian, lang, timeZone);
    return {
      layout,
      matrix: buildSunMatrix(layout, grid, lang),
      months: buildSunMonths(layout, grid, lang, (n) => t("sun_times.days_count", { count: digits(n) })),
    };
  }, [data, year, gregorian, lang, timeZone, t, digits]);

  const locationLabel = displayLocationLabel(location, undefined, lang);

  // Today in the place's own zone (the API names it), counted on its clock.
  const nowMs = useNowMs();
  const hero = useMemo((): NowHeroView | undefined => {
    const zone = (data?.location?.timezone as string | undefined) ?? location.params.timezone ?? "Asia/Kathmandu";
    const todayAd = todayAdStringInTimezone(new Date(nowMs), zone);
    const all = (data?.months ?? []).flatMap((m) => m.calendar);
    const at = all.findIndex((d) => d.date_ad === todayAd);
    if (at < 0) return undefined;
    const day = all[at]!;
    const tomorrow = all[at + 1];
    const rise = parseHHMM(day.sunrise);
    const set = parseHHMM(day.sunset);
    if (rise == null || set == null) return undefined;
    const now = clockMinutes(nowMs, zone);
    const up = now >= rise && now < set;
    const length = (d?: { sunrise?: string; sunset?: string }) => {
      const a = parseHHMM(d?.sunrise);
      const b = parseHHMM(d?.sunset);
      return a != null && b != null ? b - a : null;
    };
    const len = set - rise;
    const nextLen = length(tomorrow);
    const diff = nextLen != null ? nextLen - len : null;
    const toNext = up ? set - now : now < rise ? rise - now : 24 * 60 - now + (parseHHMM(tomorrow?.sunrise) ?? rise);
    return {
      eyebrow: t("now_hero.sun_today"),
      live: up,
      tone: up ? "neutral" : "plain",
      title: `↑ ${digits(day.sunrise ?? "")}  ↓ ${digits(day.sunset ?? "")}`,
      subtitle: lang === "en" ? day.aayan : (day.aayan_ne ?? day.aayan),
      progress: up ? (now - rise) / (len || 1) : undefined,
      foot: {
        left: digits(todayAd),
        right: t(up ? "now_hero.sunset_in" : "now_hero.sunrise_in", { time: spanText(toNext * 60_000, t, digits) }),
      },
      facts: [{ label: t("now_hero.day_length"), value: spanText(len * 60_000, t, digits) }],
      next: tomorrow
        ? {
            label: t("now_hero.tomorrow"),
            title: `↑ ${digits(tomorrow.sunrise ?? "")}  ↓ ${digits(tomorrow.sunset ?? "")}`,
            detail:
              diff == null
                ? undefined
                : diff === 0
                  ? t("now_hero.same_length")
                  : t(diff > 0 ? "now_hero.longer" : "now_hero.shorter", { time: spanText(Math.abs(diff) * 60_000, t, digits) }),
          }
        : undefined,
    };
  }, [data, nowMs, location.params.timezone, lang, t, digits]);

  return {
    copy: {
      title: t("sun_times.title"),
      subtitle: t("sun_times.subtitle", { year: digits(year) }),
      backHome: t("common.back_home"),
      gridTitle: t("sun_times.grid_title"),
      gridAria: t("sun_times.grid_aria", { year }),
      colDay: t("sun_times.col_day"),
      colAyana: t("sun_times.col_ayana_short"),
      sunrise: t("sun_times.col_sunrise"),
      sunset: t("sun_times.col_sunset"),
      northMark: t("ui.suryakranti.n"),
      northLabel: t("sun_times.north_ayana"),
      southMark: t("ui.suryakranti.s"),
      southLabel: t("sun_times.south_ayana"),
      loadError: t("sun_times.load_error"),
      loading: t("common.loading"),
      ayanaTitle: t("sun_times.ayana_title"),
      ayanaBodyKey: "sun_times.ayana_body",
      locationLine: locationLabel ? `${t("location.label")}: ${locationLabel}` : "",
    },
    locationLabel,
    status: statusOf(query),
    loading: query.isLoading,
    monthLabels: view.layout.monthLabels,
    matrix: view.matrix,
    months: view.months,
    defaultMonth: view.layout.defaultMonth,
    hero,
  };
}
