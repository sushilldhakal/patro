import type { GocharPage } from "@vedic-patro/features/gochar";
import { cn } from "@vedic-patro/domain/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { PatroDayMonthChip } from "@/components/patro-date/PatroDayMonthChip";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";

/** Upcoming ingress events of the browsed month — draws `page.ingress` from `useGocharPage`. */
export function GocharIngressSection({ page }: { page: GocharPage }) {
  const { ingress, copy } = page;

  return (
    <section className={cn("flex max-h-[min(32rem,70vh)] min-h-[18rem] flex-col shadow-ring-soft lg:max-h-[min(36rem,75vh)]", gocharClasses.ingressCard)}>
      <div className={cn("flex shrink-0 flex-col sm:flex-row sm:items-start sm:justify-between", gocharClasses.ingressHead)}>
        <div className="min-w-0">
          <p className={cn("m-0", gocharClasses.ingressEyebrow)}>{copy.ingressEyebrow}</p>
          <h2 className={cn("mb-0 break-words", gocharClasses.ingressTitle)}>{copy.ingressTitle}</h2>
        </div>
        {ingress.monthLabel ? (
          <div className={cn("flex justify-end self-stretch sm:self-auto", gocharClasses.navGroup)}>
            <button
              type="button"
              className={cn("flex transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40", gocharClasses.navButton)}
              aria-label={copy.prevMonth}
              onClick={ingress.prevMonth}
            >
              <ChevronLeft className="size-4" strokeWidth={2.25} />
            </button>
            <span className={cn("min-w-0 max-w-[min(100%,8.5rem)] truncate sm:max-w-none sm:min-w-[6.5rem]", gocharClasses.navLabel)}>
              {ingress.monthLabel}
            </span>
            <button
              type="button"
              className={cn("flex transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40", gocharClasses.navButton)}
              aria-label={copy.nextMonth}
              onClick={ingress.nextMonth}
            >
              <ChevronRight className="size-4" strokeWidth={2.25} />
            </button>
          </div>
        ) : null}
      </div>

      <div className={cn("flex flex-wrap", gocharClasses.filterBar)}>
        {ingress.filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => ingress.setFilter(f.id)}
            className={cn(
              gocharClasses.filterChip,
              gocharClasses.filterText,
              "transition-colors",
              f.active
                ? cn(gocharClasses.filterChipActive, gocharClasses.filterTextActive)
                : cn(gocharClasses.filterChipIdle, gocharClasses.filterTextIdle, "hover:text-foreground"),
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-y-contain", gocharClasses.ingressList)}>
        {ingress.loading ? (
          <p className={gocharClasses.ingressStatus}>{copy.loading}</p>
        ) : ingress.rows.length === 0 ? (
          <p className={gocharClasses.ingressStatus}>{copy.ingressEmpty}</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {ingress.rows.map((row) => (
              <li key={row.key} className={cn("flex last:border-b-0", gocharClasses.ingressRow)}>
                <PatroDayMonthChip month={row.chip.month} day={row.chip.day} size="compact" />
                <GrahaPlanetIcon graha={row.graha} size={22} className="shrink-0" />
                <div className={cn("leading-snug", gocharClasses.ingressBody)}>
                  <p className={cn("m-0", gocharClasses.ingressName)}>{row.name}</p>
                  <p className={cn("m-0", gocharClasses.ingressDetail)}>{row.detail}</p>
                </div>
                <span className={gocharClasses.ingressRel}>{row.relative}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
