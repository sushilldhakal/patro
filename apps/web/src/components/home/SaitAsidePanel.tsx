import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { fetchSaitMonthAll, saitMonthAllKey } from "@/lib/api";
import { SAIT_CATEGORIES } from "@/lib/sait-data";
import {
  AD_MONTH_NAMES,
  AD_MONTH_NAMES_NE,
  BS_MONTH_NAMES,
  BS_MONTHS_NE,
  bsToAD,
} from "@/lib/bs-calendar";
import { getBsMonthsOverlappingAdMonth } from "@/lib/local-calendar";
import { useLocale, bilingualText } from "@/i18n/locale";
import { patroEmpty } from "@/lib/patro-classes";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { patroYearLinkSearch } from "@/lib/url-state";
import { cn } from "@/lib/utils";

type Props = {
  /** BS year of the month the calendar is currently showing. */
  year: number;
  /** BS month (1–12) the calendar is currently showing. */
  month: number;
  location: PanchangaLocation;
  /** Day to highlight (the selected calendar day), if it is auspicious. */
  highlightDay?: number;
  /**
   * Gregorian month on screen. When the calendar is in AD mode the grid shows
   * (say) July while `year`/`month` name only the BS month the 1st lands in, so
   * listing that BS month labels July's saait as Ashadh. Given these, the panel
   * lists the Gregorian month instead, in Gregorian day numbers.
   */
  adYear?: number;
  adMonth?: number;
};

/**
 * Home-aside saait: one row per ceremony type, each showing that ceremony's
 * auspicious days for the month the calendar is on (not the whole year). The
 * server computes just that month for all ceremonies in one call. Each row links
 * to the ceremony's /sait/$category page for the full yearly list.
 */
export function SaitAsidePanel({
  year,
  month,
  location,
  highlightDay,
  adYear,
  adMonth,
}: Props) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();

  const isAd = adYear != null && adMonth != null;

  // A Gregorian month straddles two BS months, and the API only computes saait
  // a BS month at a time, so fetch every BS month it touches.
  const bsMonths = useMemo(
    () =>
      isAd
        ? getBsMonthsOverlappingAdMonth(adYear, adMonth)
        : [{ year, month }],
    [isAd, adYear, adMonth, year, month],
  );

  const saitQueries = useQueries({
    queries: bsMonths.map((m) => ({
      queryKey: saitMonthAllKey(m.year, m.month),
      queryFn: () => fetchSaitMonthAll(m.year, m.month),
      staleTime: 1000 * 60 * 60,
      placeholderData: keepPreviousData,
      retry: 1,
    })),
  });

  const isLoading = saitQueries.some((q) => q.isLoading) && !saitQueries.some((q) => q.data);
  const isError = saitQueries.every((q) => q.isError);
  const queriesTick = saitQueries.map((q) => `${q.dataUpdatedAt ?? 0}:${q.status}`).join("|");

  /** Category id → day numbers, in the era the panel is displaying. */
  const cats = useMemo(() => {
    const out: Record<string, number[]> = {};
    saitQueries.forEach((q, i) => {
      const source = q.data?.categories;
      const bs = bsMonths[i];
      if (!source || !bs) return;
      for (const [id, days] of Object.entries(source)) {
        for (const day of days) {
          if (!isAd) {
            (out[id] ??= []).push(day);
            continue;
          }
          // Keep only the BS days that actually land inside the Gregorian month.
          const ad = bsToAD(bs.year, bs.month, day);
          if (ad.getFullYear() === adYear && ad.getMonth() + 1 === adMonth) {
            (out[id] ??= []).push(ad.getDate());
          }
        }
      }
    });
    for (const days of Object.values(out)) days.sort((a, b) => a - b);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queriesTick, bsMonths, isAd, adYear, adMonth]);

  const monthName = isAd
    ? bilingualText(lang, AD_MONTH_NAMES_NE[adMonth - 1], AD_MONTH_NAMES[adMonth - 1])
    : bilingualText(lang, BS_MONTHS_NE[month - 1], BS_MONTH_NAMES[month - 1]);
  const anyDates = Object.values(cats).some((d) => d.length > 0);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-muted-foreground">{monthName}</p>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-md bg-muted" />
      ) : isError ? (
        <p className={patroEmpty}>{t("sait.no_data")}</p>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {SAIT_CATEGORIES.map((cat) => {
              const days = cats[cat.id] ?? [];
              return (
                <li key={cat.id}>
                  <Link
                    to="/sait/$category"
                    params={{ category: cat.id }}
                    search={patroYearLinkSearch(location, year, "bs")}
                    className="flex items-center gap-2 rounded-md bg-surface-inset px-2.5 py-2 text-sm leading-snug transition-colors hover:bg-surface-hover"
                  >
                    <span className="shrink-0 font-bold text-foreground">
                      {t(`sait.categories.${cat.id}`)}
                    </span>
                    <span className="font-num min-w-0 flex-1 text-right text-sm font-semibold text-foreground">
                      {days.length ? (
                        days.map((day, i) => {
                          const hl = highlightDay === day;
                          return (
                            <span key={day}>
                              {i > 0 ? ", " : ""}
                              <span
                                className={cn(
                                  hl && "font-extrabold text-accent underline underline-offset-2",
                                )}
                              >
                                {digits(day)}
                              </span>
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>

          {!anyDates ? (
            <p className={patroEmpty}>{t("sait.no_month_dates")}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
