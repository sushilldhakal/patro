import { useMemo } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@vedic-patro/i18n/react";
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
import { civilIsoDayOfMonth } from "@vedic-patro/domain/patro-day";
import { useLocale, bilingualText } from "@/i18n/locale";
import {
  abhijitFromCalendarDay,
  formatClockNepali,
} from "@vedic-patro/domain/panchanga-format";
import { todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import {
  searchToLocation,
} from "@/lib/url-state";
import { patroSkel } from "@/lib/patro-classes";
import { abhijitClasses as ac } from "@vedic-patro/design-tokens/classes/abhijit-classes";
import { cn } from "@vedic-patro/domain/utils";

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
        ac.dayCard,
        "group transition-colors",
        isToday
          ? cn(ac.dayCardToday, "ring-2 ring-secondary/30 dark:ring-primary/25")
          : cn(ac.dayCardIdle, "hover:border-secondary/30 hover:bg-muted/20 dark:hover:border-primary/30"),
      )}
    >
      <div className={ac.dayHead}>
        <span className={cn(ac.dayWeekday, "truncate")}>
          {weekday}
        </span>
        {isToday ? (
          <span className={cn(ac.todayBadge, ac.todayBadgeText, "shrink-0")}>
            {t("abhijit.jump_today")}
          </span>
        ) : null}
      </div>

      <div className={ac.dayNumRow}>
        <span className={ac.dayNum}>
          {digits(day.day)}
        </span>
        <span className={ac.dayNumAd}>/{digits(adDay)}</span>
      </div>

      <div className={ac.dayBody}>
        <p className={cn(ac.dayRange, "mono m-0")}>
          {abhijit.rangeDisplay}
        </p>
        <p className={cn(ac.dayNoon, "m-0")}>
          {t("abhijit.col_noon")}{" "}
          <span className={cn(ac.dayNoonValue, "mono")}>{abhijit.noonDisplay ?? "—"}</span>
        </p>
        <p className={cn(ac.daySun, "mono m-0 truncate")}>
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
          className="inline-flex items-center gap-1 text-xs hover:text-foreground mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("abhijit.back_home")}
        </Link>
        <h1 className={cn(ac.titleRow, ac.title, "text-[clamp(1.75rem,4vw,2.125rem)] m-0")}>
          <Sparkles className="w-7 h-7 text-secondary shrink-0 dark:text-primary" />
          {t("abhijit.title")}
        </h1>
        <p className={ac.subtitle}>
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
        <section className={cn(ac.hero, "relative bg-linear-to-br from-secondary/15 via-card to-card dark:from-primary/15")}>
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-secondary/10 blur-2xl dark:bg-primary/10" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={ac.heroEyebrow}>
                {t("abhijit.today_hero")}
              </p>
              <p className={ac.heroDate}>
                {digits(todayRow.day.day)}
                {" · "}
                {bilingualText(
                  lang,
                  todayRow.day.weekday_ne ?? todayRow.day.weekday,
                  todayRow.day.weekday_en ?? todayRow.day.weekday,
                )}
                {" · "}
                <span className={ac.heroDateAd}>{todayRow.day.date_ad}</span>
              </p>
              <p className={cn(ac.heroRange, "mono text-[clamp(1.5rem,5vw,2rem)]")}>
                {todayRow.abhijit.rangeDisplay}
              </p>
              <p className={ac.heroNoon}>
                {t("abhijit.col_noon")}:{" "}
                <span className={cn(ac.heroNoonValue, "mono")}>
                  {todayRow.abhijit.noonDisplay ?? "—"}
                </span>
              </p>
            </div>
            <div className={cn(ac.sunPanel, "backdrop-blur-sm")}>
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
              <p className={cn(ac.sunDate, "mono")}>{todayRow.day.date_ad}</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className={cn(ac.noteBox, ac.noteText)}>
        <div className={ac.noteRow}>
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-secondary dark:text-primary" />
          <p className="m-0">{t("abhijit.note")}</p>
        </div>
      </div>

      <div className={ac.headingRow}>
        <h2 className={cn(ac.heading, "m-0")}>
          {t("abhijit.month_heading")} — {monthLabel} {digits(monthBrowse.year)}
        </h2>
        {!monthQ.isLoading && rows.length > 0 ? (
          <span className={cn(ac.countPill, ac.countText)}>
            {t("abhijit.days_count", { count: rows.length })}
          </span>
        ) : null}
      </div>

      {monthQ.isError ? (
        <div className={cn(ac.errorBox, ac.errorText)}>{t("abhijit.error")}</div>
      ) : monthQ.isLoading ? (
        <div className={cn(patroSkel, ac.skeleton)} />
      ) : rows.length === 0 ? (
        <p className={cn(ac.empty, "m-0")}>{t("abhijit.none")}</p>
      ) : (
        <div className={ac.gridWrap}>
          <AbhijitMonthGrid rows={rows} todayAd={todayAd} />
        </div>
      )}
    </PageShell>
  );
}
