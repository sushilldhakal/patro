import { cn } from "@vedic-patro/design-tokens/cn";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import type { YearOverview } from "@vedic-patro/features/graha";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";

export type GrahaYearOverviewProps = { overview: YearOverview; tone: "asta" | "vakri" | "eclipse" };

const MARK: Record<GrahaYearOverviewProps["tone"], string> = { asta: "bg-warning", vakri: "bg-danger", eclipse: "bg-primary" };
const INK: Record<GrahaYearOverviewProps["tone"], string> = { asta: "text-warning", vakri: "text-danger", eclipse: "text-primary" };

/** A strip per graha across the year: its stretches marked, today a line through all of them. */
export function GrahaYearOverview({ overview, tone }: GrahaYearOverviewProps) {
  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-base font-bold text-foreground">{overview.title}</h2>
        <span className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-4 rounded-sm", MARK[tone])} />
            {overview.legend}
          </span>
          {overview.today != null ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-0.5 rounded-full bg-foreground" />
              {overview.todayLabel}
            </span>
          ) : null}
        </span>
      </header>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {overview.rows.map((row) => (
          <li key={row.graha} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 sm:grid-cols-[2rem_6rem_minmax(0,1fr)_13rem]">
            <GrahaPlanetIcon graha={row.graha as GrahaKey} size={28} />
            <span className="text-sm font-bold text-foreground">{row.name}</span>
            <div className="relative col-span-2 mt-1 h-3 overflow-hidden rounded-full bg-surface-inset sm:col-span-1 sm:mt-0">
              {row.segments.map((s, i) => (
                <span key={i} className={cn("absolute inset-y-0 rounded-full", MARK[tone])} style={{ left: `${s.from * 100}%`, width: `${Math.max(0.6, (s.to - s.from) * 100)}%` }} />
              ))}
              {overview.today != null ? <span className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${overview.today * 100}%` }} /> : null}
            </div>
            <span className={cn("col-span-2 mt-0.5 text-xs sm:col-span-1 sm:mt-0 sm:text-right", row.on ? cn("font-bold", INK[tone]) : "text-muted-foreground")}>
              {row.status}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 grid grid-cols-12 sm:ml-[9.5rem] sm:mr-[13.75rem]">
        {overview.months.map((m, i) => (
          <span key={m} className={cn("truncate text-center text-diagram-2xs text-muted-foreground", i % 2 === 1 && "max-sm:invisible")}>
            {m}
          </span>
        ))}
      </div>
    </section>
  );
}
