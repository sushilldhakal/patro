import { Link, getRouteApi } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Sun } from "lucide-react";
import { useAbhijitPage, type AbhijitDayView } from "@vedic-patro/features/abhijit";
import { abhijitClasses as ac } from "@vedic-patro/design-tokens/classes/abhijit-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { fetchMonthCalendar } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { usePatroMonthUrlBrowse } from "@/hooks/use-patro-url-browse";
import { PatroMonthYearNav } from "@/components/patro-date";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { useRouteLoading } from "@/lib/route-loading";
import { searchToLocation } from "@/lib/url-state";
import { patroSkel } from "@/lib/patro-classes";

const routeApi = getRouteApi("/panchanga-shell/abhijit-muhurta");

/** Abhijit muhurta — the website's drawing of `useAbhijitPage` (@vedic-patro/features). */
export function AbhijitMuhurta() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));
  const monthBrowse = usePatroMonthUrlBrowse(search, navigate, location, setLocation);
  const page = useAbhijitPage(
    { era: monthBrowse.era, year: monthBrowse.year, month: monthBrowse.month, location: location.params },
    fetchMonthCalendar,
  );
  useRouteLoading(page.status === "loading");
  const today = page.today;

  return (
    <PageShell className="pb-16 space-y-6">
      <div>
        <Link to="/" className="inline-flex items-center gap-1 text-xs hover:text-foreground mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          {page.copy.backHome}
        </Link>
        <h1 className={cn(ac.titleRow, ac.title, "text-[clamp(1.75rem,4vw,2.125rem)] m-0")}>
          <Sparkles className="w-7 h-7 text-secondary shrink-0 dark:text-primary" />
          {page.copy.title}
        </h1>
        <p className={ac.subtitle}>{page.copy.subtitle}</p>
      </div>

      <PatroMonthYearNav
        onBrowse={(next) => monthBrowse.setYearMonth(next.year, next.month)}
        onEraChange={(e) => monthBrowse.commitEraYear(e, monthBrowse.year)}
        era={monthBrowse.era}
        year={monthBrowse.year}
        month={monthBrowse.month}
        location={location}
        onLocationChange={setLocation}
      />

      {today ? (
        <section className={cn(ac.hero, "relative bg-linear-to-br from-secondary/15 via-card to-card dark:from-primary/15")}>
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-secondary/10 blur-2xl dark:bg-primary/10" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={ac.heroEyebrow}>{page.copy.todayHero}</p>
              <p className={ac.heroDate}>
                {today.day} · {today.weekday} · <span className={ac.heroDateAd}>{today.dateAd}</span>
              </p>
              <p className={cn(ac.heroRange, "mono text-[clamp(1.5rem,5vw,2rem)]")}>{today.range}</p>
              <p className={ac.heroNoon}>
                {page.copy.noon}: <span className={cn(ac.heroNoonValue, "mono")}>{today.noon}</span>
              </p>
            </div>
            <div className={cn(ac.sunPanel, "backdrop-blur-sm")}>
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 shrink-0 text-amber-500" />
                <span>{page.copy.sunContext}</span>
              </div>
              <p className={cn(ac.sunDate, "mono")}>{today.dateAd}</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className={cn(ac.noteBox, ac.noteText)}>
        <div className={ac.noteRow}>
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-secondary dark:text-primary" />
          <p className="m-0">{page.copy.note}</p>
        </div>
      </div>

      <div className={ac.headingRow}>
        <h2 className={cn(ac.heading, "m-0")}>{page.copy.heading}</h2>
        {page.status === "ready" && page.copy.count ? <span className={cn(ac.countPill, ac.countText)}>{page.copy.count}</span> : null}
      </div>

      {page.status === "error" ? (
        <div className={cn(ac.errorBox, ac.errorText)}>{page.copy.error}</div>
      ) : page.status === "loading" ? (
        <div className={cn(patroSkel, ac.skeleton)} />
      ) : page.days.length === 0 ? (
        <p className={cn(ac.empty, "m-0")}>{page.copy.none}</p>
      ) : (
        <div className={ac.gridWrap}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
            {page.days.map((d) => (
              <DayCard key={d.key} day={d} todayBadge={page.copy.todayBadge} noonLabel={page.copy.noon} />
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function DayCard({ day, todayBadge, noonLabel }: { day: AbhijitDayView; todayBadge: string; noonLabel: string }) {
  return (
    <article
      className={cn(
        ac.dayCard,
        "group transition-colors",
        day.isToday
          ? cn(ac.dayCardToday, "ring-2 ring-secondary/30 dark:ring-primary/25")
          : cn(ac.dayCardIdle, "hover:border-secondary/30 hover:bg-muted/20 dark:hover:border-primary/30"),
      )}
    >
      <div className={ac.dayHead}>
        <span className={cn(ac.dayWeekday, "truncate")}>{day.weekday}</span>
        {day.isToday ? <span className={cn(ac.todayBadge, ac.todayBadgeText, "shrink-0")}>{todayBadge}</span> : null}
      </div>
      <div className={ac.dayNumRow}>
        <span className={ac.dayNum}>{day.day}</span>
        <span className={ac.dayNumAd}>/{day.adDay}</span>
      </div>
      <div className={ac.dayBody}>
        <p className={cn(ac.dayRange, "mono m-0")}>{day.range}</p>
        <p className={cn(ac.dayNoon, "m-0")}>
          {noonLabel} <span className={cn(ac.dayNoonValue, "mono")}>{day.noon}</span>
        </p>
        <p className={cn(ac.daySun, "mono m-0 truncate")}>
          ↑{day.sunrise} · ↓{day.sunset}
        </p>
      </div>
    </article>
  );
}
