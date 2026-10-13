/**
 * Sun times (suryakranti) page logic, shared by the website
 * (`apps/web/src/pages/SunTimesYear.tsx` + `components/SunTimesYearGrid.tsx`) and
 * the app (`apps/mobile/app/(tabs)/suryakranti.tsx` + `components/suryakranti/SunTimesYearGrid.tsx`).
 * The app keeps year, era and place where it likes and draws what this returns.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchYearSunTimes, sunYearKeys } from "@vedic-patro/api-client";
import { isGregorianEra, type Era } from "@vedic-patro/domain/era";
import { displayLocationLabel, type PanchangaLocation } from "@vedic-patro/domain/panchanga-location";
import { useLocale } from "@vedic-patro/i18n/react";
import { statusOf, type PageStatus } from "../_shared";
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
  };
}
