import { useMemo, useState } from "react";
import type { GrahaKey } from "@/lib/graha-details";
import {
  countIngressByFilter,
  daysFromRef,
  filterIngressEvents,
  ingressEventDetail,
  ingressGrahaLabel,
  relativeDayLabel,
  type GocharIngressRow,
  type IngressFilter,
} from "@/lib/gochar-page-utils";
import { useLocale, bilingualText } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { PatroDayMonthChip } from "@/components/patro-date/PatroDayMonthChip";
import { patroMonthNavBtn } from "@/lib/patro-classes";

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
    <section className="flex max-h-[min(32rem,70vh)] min-h-[18rem] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-ring-soft lg:max-h-[min(36rem,75vh)]">
      <div className="flex shrink-0 flex-col gap-2 border-b border-border px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2 sm:px-4">
        <div className="min-w-0">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {bilingualText(lang, "के परिवर्तन हुँदैछ", "What's changing")}
          </p>
          <h2 className="mt-0.5 mb-0 break-words text-base font-bold text-foreground sm:text-lg">
            {bilingualText(lang, "आगामी गोचर घटनाहरू", "Upcoming transit events")}
          </h2>
        </div>
        {showMonthNav ? (
          <div className="flex shrink-0 items-center justify-end gap-0.5 self-stretch sm:gap-1 sm:self-auto">
            <button
              type="button"
              className={patroMonthNavBtn}
              aria-label={bilingualText(lang, "अघिल्लो महिना", "Previous month")}
              disabled={prevMonthDisabled}
              onClick={onPrevMonth}
            >
              <ChevronLeft className="size-4" strokeWidth={2.25} />
            </button>
            <span className="min-w-0 max-w-[min(100%,8.5rem)] truncate text-center text-sm font-bold text-foreground sm:max-w-none sm:min-w-[6.5rem] sm:text-base">
              {browseMonthLabel}
            </span>
            <button
              type="button"
              className={patroMonthNavBtn}
              aria-label={bilingualText(lang, "अर्को महिना", "Next month")}
              disabled={nextMonthDisabled}
              onClick={onNextMonth}
            >
              <ChevronRight className="size-4" strokeWidth={2.25} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 max-w-full flex-wrap gap-1.5 border-b border-border px-2 py-2 sm:px-3">
        {FILTERS.map((f) => {
          const n = counts[f.id];
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "min-w-0 max-w-full rounded-lg border px-2 py-1.5 text-xs font-bold transition-colors sm:px-2.5 sm:text-sm",
                active
                  ? "border-secondary bg-secondary/15 text-secondary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {bilingualText(lang, f.ne, f.en)} ({lang === "en" ? n : toNepaliDigits(n)})
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1 py-1 sm:px-2">
        {loading ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">{bilingualText(lang, "लोड हुँदै…", "Loading…")}</p>
        ) : visible.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">
            {bilingualText(lang, "यस महिनामा कुनै आगामी गोचर छैन।", "No upcoming transits this month.")}
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
                  className="flex items-center gap-2 border-b border-border/60 px-1.5 py-2 last:border-b-0 sm:gap-2.5 sm:px-2"
                >
                  <PatroDayMonthChip
                    month={row.monthChip.month}
                    day={row.monthChip.day}
                    size="compact"
                  />

                  <GrahaPlanetIcon graha={key} size={22} className="shrink-0" />

                  <div className="min-w-0 flex-1 leading-snug">
                    <p className="m-0 text-sm font-bold text-foreground">{grahaLabel}</p>
                    <p className="m-0 mt-0.5 text-sm font-semibold text-foreground">{detail}</p>
                  </div>

                  <span className="shrink-0 text-sm font-bold text-secondary">{rel}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
