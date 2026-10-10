import { useMemo } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Sparkles, Sun } from "lucide-react";
import {
  fetchMonthCalendar,
  type CalendarDay,
} from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { usePatroMonthUrlBrowse } from "@/hooks/use-patro-url-browse";
import { PatroMonthYearNav } from "@/components/patro-date";
import {
  resolveLocationTimezone,
  usePanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";
import { useRouteLoading } from "@/lib/route-loading";
import { civilIsoDayOfMonth } from "@/lib/patro-day";
import { useLocale, bilingualText } from "@/i18n/locale";
import {
  abhijitFromCalendarDay,
  formatClockNepali,
} from "@/lib/panchanga-format";
import { todayAdStringInTimezone } from "@/lib/zoned-time";
import {
  searchToLocation,
} from "@/lib/url-state";
import {
  patroEmpty,
  patroErrorBox,
  patroSkel,
} from "@/lib/patro-classes";
import { cn } from "@/lib/utils";

const routeApi = getRouteApi("/panchanga-shell/abhijit-muhurta");

type AbhijitRow = {
  day: CalendarDay;
  abhijit: NonNullable<ReturnType<typeof abhijitFromCalendarDay>>;
};

function buildRows(days: CalendarDay[]): AbhijitRow[] {
  return days
    .map((day) => {
      const abhijit = abhijitFromCalendarDay(day);
      if (!abhijit) return null;
      return { day, abhijit };
    })
    .filter((row): row is AbhijitRow => row != null);
}

function AbhijitDayCard({
  row,
  isToday,
}: {
  row: AbhijitRow;
  isToday: boolean;
}) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const { day, abhijit } = row;
  const adDay = civilIsoDayOfMonth(day.date_ad);
  const sunrise = formatClockNepali(day.sunrise) ?? day.sunrise ?? "—";
  const sunset = formatClockNepali(day.sunset) ?? day.sunset ?? "—";
  const weekday = bilingualText(lang, day.weekday_ne ?? day.weekday, day.weekday_en ?? day.weekday);

  return (
    <article
      className={cn(
        "group flex min-h-[132px] flex-col rounded-xl border bg-card p-2.5 shadow-xs transition-colors sm:min-h-[140px] sm:p-3",
        isToday
          ? "border-secondary/50 bg-secondary/10 ring-2 ring-secondary/30 dark:border-primary/40 dark:bg-primary/10 dark:ring-primary/25"
          : "border-border hover:border-secondary/30 hover:bg-muted/20 dark:hover:border-primary/30",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="truncate text-sm font-semibold sm:text-sm">
          {weekday}
        </span>
        {isToday ? (
          <span className="shrink-0 rounded-full bg-secondary/20 px-1.5 py-px text-sm font-bold uppercase text-secondary dark:bg-primary/20 dark:text-primary">
            {t("abhijit.jump_today")}
          </span>
        ) : null}
      </div>

      <div className="mb-2 flex items-baseline justify-center gap-1.5">
        <span className="font-num text-lg font-bold leading-none tabular-nums sm:text-2xl">
          {digits(day.day)}
        </span>
        <span className="font-num text-sm tabular-nums">/{digits(adDay)}</span>
      </div>

      <div className="mt-auto space-y-1.5">
        <p className="mono m-0 text-center text-sm font-bold leading-tight text-secondary sm:text-xs dark:text-primary">
          {abhijit.rangeDisplay}
        </p>
        <p className="m-0 text-center text-sm sm:text-sm">
          {t("abhijit.col_noon")}{" "}
          <span className="mono text-base text-foreground">{abhijit.noonDisplay ?? "—"}</span>
        </p>
        <p className="mono m-0 truncate text-center text-sm sm:text-sm">
          ↑{sunrise} · ↓{sunset}
        </p>
      </div>
    </article>
  );
}

function AbhijitMonthGrid({
  rows,
  todayAd,
}: {
  rows: AbhijitRow[];
  todayAd: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
      {rows.map((row) => (
        <AbhijitDayCard
          key={row.day.date_ad}
          row={row}
          isToday={row.day.date_ad === todayAd}
        />
      ))}
    </div>
  );
}

export function AbhijitMuhurta() {
  const { t } = useTranslation();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { digits, lang } = useLocale();
  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));
  const monthBrowse = usePatroMonthUrlBrowse(search, navigate, location, setLocation);

  const todayAd = useMemo(
    () => todayAdStringInTimezone(new Date(), resolveLocationTimezone(location)),
    [location],
  );

  const monthQ = useQuery({
    queryKey: [
      "panchanga",
      "month",
      monthBrowse.era,
      monthBrowse.year,
      monthBrowse.month,
      location.params,
      "lite",
    ] as const,
    queryFn: () =>
      fetchMonthCalendar(monthBrowse.year, monthBrowse.month, location.params, {
        full: false,
        era: monthBrowse.era,
      }),
    staleTime: 1000 * 60 * 60,
  });

  const rows = useMemo(
    () => buildRows(monthQ.data?.calendar ?? []),
    [monthQ.data?.calendar],
  );

  const todayRow = useMemo(
    () => rows.find(({ day }) => day.date_ad === todayAd) ?? null,
    [rows, todayAd],
  );

  const monthLabel = bilingualText(
    lang,
    monthQ.data?.month_name_ne ?? monthQ.data?.month_name ?? "",
    monthQ.data?.month_name ?? monthQ.data?.month_name_ne ?? "",
  );

  useRouteLoading(monthQ.isLoading);

  function goToToday() {
    monthBrowse.goToday(todayAd);
  }

  function stepMonth(delta: number) {
    monthBrowse.stepMonth(delta);
  }

  return (
    <PageShell className="pb-16 space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-base hover:text-foreground mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("abhijit.back_home")}
        </Link>
        <h1 className="text-[clamp(1.75rem,4vw,2.125rem)] font-bold leading-tight tracking-tight m-0 flex items-center gap-2.5">
          <Sparkles className="w-7 h-7 text-secondary shrink-0 dark:text-primary" />
          {t("abhijit.title")}
        </h1>
        <p className="text-sm mt-1.5 max-w-xl leading-relaxed">
          {t("abhijit.subtitle")}
        </p>
      </div>

      <PatroMonthYearNav
        era={monthBrowse.era}
        year={monthBrowse.year}
        month={monthBrowse.month}
        onMonthChange={(m) => monthBrowse.setYearMonth(monthBrowse.year, m)}
        onYearChange={(y) => monthBrowse.setYearMonth(y, monthBrowse.month)}
        onBrowseCommit={monthBrowse.commitEraYear}
        onPrev={() => stepMonth(-1)}
        onNext={() => stepMonth(1)}
        onToday={goToToday}
        todayAd={todayAd}
        location={location}
        onLocationChange={setLocation}
      />

      {todayRow ? (
        <section className="relative overflow-hidden rounded-2xl border border-secondary/30 bg-linear-to-br from-secondary/15 via-card to-card p-5 sm:p-6 shadow-xs dark:border-primary/30 dark:from-primary/15">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-secondary/10 blur-2xl dark:bg-primary/10" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-secondary dark:text-primary mb-1">
                {t("abhijit.today_hero")}
              </p>
              <p className="text-sm mb-2">
                {digits(todayRow.day.day)}
                {" · "}
                {bilingualText(
                  lang,
                  todayRow.day.weekday_ne ?? todayRow.day.weekday,
                  todayRow.day.weekday_en ?? todayRow.day.weekday,
                )}
                {" · "}
                <span className="font-num tabular-nums">{todayRow.day.date_ad}</span>
              </p>
              <p className="mono text-[clamp(1.5rem,5vw,2rem)] font-bold text-foreground leading-tight">
                {todayRow.abhijit.rangeDisplay}
              </p>
              <p className="mt-2 text-sm">
                {t("abhijit.col_noon")}:{" "}
                <span className="mono font-semibold text-foreground">
                  {todayRow.abhijit.noonDisplay ?? "—"}
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 shrink-0 text-amber-500" />
                <span>
                  {t("abhijit.sun_context", {
                    sunrise:
                      formatClockNepali(todayRow.day.sunrise) ?? todayRow.day.sunrise ?? "—",
                    sunset:
                      formatClockNepali(todayRow.day.sunset) ?? todayRow.day.sunset ?? "—",
                  })}
                </span>
              </div>
              <p className="mono text-xs font-num tabular-nums">{todayRow.day.date_ad}</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3.5 text-sm leading-relaxed">
        <div className="flex gap-2.5">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-secondary dark:text-primary" />
          <p className="m-0">{t("abhijit.note")}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground m-0">
          {t("abhijit.month_heading")} — {monthLabel} {digits(monthBrowse.year)}
        </h2>
        {!monthQ.isLoading && rows.length > 0 ? (
          <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-sm font-semibold">
            {t("abhijit.days_count", { count: rows.length })}
          </span>
        ) : null}
      </div>

      {monthQ.isError ? (
        <div className={patroErrorBox}>{t("abhijit.error")}</div>
      ) : monthQ.isLoading ? (
        <div className={cn(patroSkel, "h-60 w-full rounded-2xl")} />
      ) : rows.length === 0 ? (
        <p className={patroEmpty}>{t("abhijit.none")}</p>
      ) : (
        <div className="rounded-2xl border border-border bg-muted/15 p-3 sm:p-4">
          <AbhijitMonthGrid rows={rows} todayAd={todayAd} />
        </div>
      )}
    </PageShell>
  );
}
