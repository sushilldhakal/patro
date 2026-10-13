import { useMemo, useState } from "react";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import {
  countIngressByFilter,
  daysFromRef,
  filterIngressEvents,
  ingressEventDetail,
  ingressGrahaLabel,
  relativeDayLabel,
  type GocharIngressRow,
  type IngressFilter,
} from "@vedic-patro/domain/gochar-page-utils";
import { useLocale, bilingualText } from "@/i18n/locale";
import { cn } from "@vedic-patro/domain/utils";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { PatroDayMonthChip } from "@/components/patro-date/PatroDayMonthChip";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";

import { tFor } from "@vedic-patro/i18n/runtime";
const FILTERS: { id: IngressFilter; ne: string; en: string }[] = [
  { id: "all", ne: "सबै", en: "All" },
  { id: "rashi", ne: "राशि", en: "Sign" },
  { id: "nakshatra", ne: "नक्षत्र", en: "Nakshatra" },
  { id: "asta", ne: "अस्त", en: "Combust" },
  { id: "retrograde", ne: "वक्री", en: "Retrograde" },
];

type Props = {
  rows: GocharIngressRow[];
  refDateAd: string;
  loading?: boolean;
  /** e.g. साउन २०८३ — synced with page browse month */
  browseMonthLabel?: string;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  prevMonthDisabled?: boolean;
  nextMonthDisabled?: boolean;
};

export function GocharIngressSection({
  rows,
  refDateAd,
  loading,
  browseMonthLabel,
  onPrevMonth,
  onNextMonth,
  prevMonthDisabled,
  nextMonthDisabled,
}: Props) {
  const { lang, digits } = useLocale();
  const [filter, setFilter] = useState<IngressFilter>("all");

  const events = useMemo(() => rows.map((r) => r.event), [rows]);
  const counts = useMemo(() => countIngressByFilter(events), [events]);
  const visible = useMemo(
    () => rows.filter((r) => filterIngressEvents([r.event], filter).length > 0),
    [rows, filter],
  );

  const showMonthNav = Boolean(browseMonthLabel && onPrevMonth && onNextMonth);

  return (
    <section className={cn("flex max-h-[min(32rem,70vh)] min-h-[18rem] flex-col shadow-ring-soft lg:max-h-[min(36rem,75vh)]", gocharClasses.ingressCard)}>
      <div className={cn("flex shrink-0 flex-col sm:flex-row sm:items-start sm:justify-between", gocharClasses.ingressHead)}>
        <div className="min-w-0">
          <p className={cn("m-0", gocharClasses.ingressEyebrow)}>
            {tFor(lang, "ui.gochar.what_s_changing")}
          </p>
          <h2 className={cn("mb-0 break-words", gocharClasses.ingressTitle)}>
            {tFor(lang, "ui.gochar.upcoming_transit_events")}
          </h2>
        </div>
        {showMonthNav ? (
          <div className={cn("flex justify-end self-stretch sm:self-auto", gocharClasses.navGroup)}>
            <button
              type="button"
              className={cn("flex transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40", gocharClasses.navButton)}
              aria-label={tFor(lang, "calendar.prev_month")}
              disabled={prevMonthDisabled}
              onClick={onPrevMonth}
            >
              <ChevronLeft className="size-4" strokeWidth={2.25} />
            </button>
            <span className={cn("min-w-0 max-w-[min(100%,8.5rem)] truncate sm:max-w-none sm:min-w-[6.5rem]", gocharClasses.navLabel)}>
              {browseMonthLabel}
            </span>
            <button
              type="button"
              className={cn("flex transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40", gocharClasses.navButton)}
              aria-label={tFor(lang, "calendar.next_month")}
              disabled={nextMonthDisabled}
              onClick={onNextMonth}
            >
              <ChevronRight className="size-4" strokeWidth={2.25} />
            </button>
          </div>
        ) : null}
      </div>

      <div className={cn("flex flex-wrap", gocharClasses.filterBar)}>
        {FILTERS.map((f) => {
          const n = counts[f.id];
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                gocharClasses.filterChip,
                gocharClasses.filterText,
                "transition-colors",
                active
                  ? cn(gocharClasses.filterChipActive, gocharClasses.filterTextActive)
                  : cn(gocharClasses.filterChipIdle, gocharClasses.filterTextIdle, "hover:text-foreground"),
              )}
            >
              {bilingualText(lang, f.ne, f.en)} ({lang === "en" ? n : toNepaliDigits(n)})
            </button>
          );
        })}
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-y-contain", gocharClasses.ingressList)}>
        {loading ? (
          <p className={gocharClasses.ingressStatus}>{tFor(lang, "common.loading")}</p>
        ) : visible.length === 0 ? (
          <p className={gocharClasses.ingressStatus}>
            {tFor(lang, "ui.gochar.no_upcoming_transits_this_month")}
          </p>
        ) : (
          <ul className="m-0 list-none p-0">
            {visible.map((row, i) => {
              const ev = row.event;
              const relDays = daysFromRef(row.rowDateAd, refDateAd);
              const rel = relativeDayLabel(relDays, lang, digits);
              const key = ev.graha as GrahaKey;
              const grahaLabel = ingressGrahaLabel(ev, lang);
              const detail = ingressEventDetail(ev, lang);

              return (
                <li
                  key={`${ev.graha}-${ev.entry_time_utc ?? i}-${ev.level}`}
                  className={cn("flex last:border-b-0", gocharClasses.ingressRow)}
                >
                  <PatroDayMonthChip
                    month={row.monthChip.month}
                    day={row.monthChip.day}
                    size="compact"
                  />

                  <GrahaPlanetIcon graha={key} size={22} className="shrink-0" />

                  <div className={cn("leading-snug", gocharClasses.ingressBody)}>
                    <p className={cn("m-0", gocharClasses.ingressName)}>{grahaLabel}</p>
                    <p className={cn("m-0", gocharClasses.ingressDetail)}>{detail}</p>
                  </div>

                  <span className={gocharClasses.ingressRel}>{rel}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
