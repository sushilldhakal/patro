import { HeartHandshake } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import { PanchangaDetailsBackLink } from "@/components/panchanga/PanchangaDetailsBackLink";
import type { Era } from "@/lib/era";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { SaitDayCard } from "@/components/sait/SaitDayCard";
import { SaitRulesSection, type SaitRule } from "@/components/sait/SaitRulesSection";
import { PageHeader, PageShell } from "@/components/PageShell";
import { useLocale } from "@/i18n/locale";
import type {
  BratabandhaNakshatraMode,
  SaitDetailDay,
  SaitPersonalizeDay,
  SaitSuitability,
} from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle: string;
  year: number;
  onYearChange: (year: number) => void;
  onEraChange?: (era: Era) => void;
  era: Era;
  gregorianRange?: { start: string; end: string } | null;
  rangeLabel?: string | null;
  yearError?: string | null;
  location: PanchangaLocation;
  onLocationChange: (loc: PanchangaLocation) => void;
  method?: { ne?: string; en?: string } | null;
  rules?: SaitRule[] | null;
  engineVersion?: string;
  /** Applied (ON) toggleable rule ids; enables per-rule switches when set. */
  enabledRuleIds?: Set<string> | null;
  onToggleRule?: (id: string, enabled: boolean) => void;
  rulesBusy?: boolean;
  /** Bratabandha nakṣatra tradition selector. */
  nakshatraMode?: BratabandhaNakshatraMode | null;
  onNakshatraModeChange?: (mode: BratabandhaNakshatraMode) => void;
  days?: SaitDetailDay[];
  /** Total auspicious days for the summary line; falls back to days.length. */
  count?: number;
  /** Profile picker + legend, shown below the year/location row. */
  profileControl?: React.ReactNode;
  /** Native verdict per `${bs_month}-${bs_day}`, overlaid on the day cards. */
  suitabilityByDay?: Map<string, SaitSuitability>;
  /** Full per-day annotation (same key) for the card's reason line. */
  personalizeByDay?: Map<string, SaitPersonalizeDay>;
  loading: boolean;
  notice?: React.ReactNode;
  children?: React.ReactNode;
  emptyLabel?: string;
  countLabel?: (count: number, year: number) => string;
  /** Classical-source credits, rendered at the bottom of the page. */
  footer?: React.ReactNode;
}

const NAKSHATRA_MODE_IDS = ["classical", "nepali", "liberal"] as const;

/**
 * Shared ceremonial sāit layout — page header, rules, year/location bar,
 * then month-grouped day cards. Uses the app's default 1400px shell width.
 */
export function SaitCeremonyLayout({
  title,
  subtitle,
  year,
  onYearChange,
  onEraChange,
  era,
  gregorianRange,
  rangeLabel,
  yearError,
  location,
  onLocationChange,
  method,
  rules,
  engineVersion,
  enabledRuleIds,
  onToggleRule,
  rulesBusy = false,
  nakshatraMode = null,
  onNakshatraModeChange,
  days = [],
  count,
  profileControl,
  suitabilityByDay,
  personalizeByDay,
  loading,
  notice,
  children,
  emptyLabel,
  countLabel,
  footer,
}: Props) {
  const { digits, lang } = useLocale();
  const { t } = useTranslation();
  const byMonth = useMemo(() => {
    const map = new Map<number, SaitDetailDay[]>();
    for (const d of days) {
      const list = map.get(d.bs_month) ?? [];
      list.push(d);
      map.set(d.bs_month, list);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [days]);

  const defaultCount = (n: number, y: number) =>
    t("sait.count_label", { count: digits(n), year: digits(y) });
  const displayCount = count ?? days.length;
  const countText = (countLabel ?? defaultCount)(displayCount, year);

  let cardIndex = 0;

  return (
    <PageShell>
      <PageHeader
        icon={<HeartHandshake className="h-6 w-6 text-secondary" />}
        title={title}
        subtitle={subtitle}
      />

      <SaitRulesSection
        method={method}
        rules={rules}
        engineVersion={engineVersion}
        enabledRuleIds={enabledRuleIds}
        onToggleRule={onToggleRule}
        busy={rulesBusy}
      />

      {nakshatraMode && onNakshatraModeChange ? (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm font-medium text-foreground">
            {t("sait.nakshatra_tradition")}
          </span>
          <div
            className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card p-0.5"
            role="radiogroup"
            aria-label={t("sait.nakshatra_tradition")}
          >
            {NAKSHATRA_MODE_IDS.map((id) => {
              const active = nakshatraMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onNakshatraModeChange(id)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  {t(`sait.nakshatra_modes.${id}`)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <PatroYearNavBlock
        era={era}
        year={year}
        onYearChange={onYearChange}
        onEraChange={onEraChange}
        gregorianRange={gregorianRange}
        rangeLabel={rangeLabel}
        yearError={yearError}
        location={location}
        onLocationChange={onLocationChange}
        className=""
      />

      {!loading && displayCount > 0 ? (
        <p className="m-0 text-sm text-muted-foreground">
          {countText}
        </p>
      ) : null}

      {profileControl ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-inset p-3">
          {profileControl}
        </div>
      ) : null}

      {notice}

      <section aria-busy={loading} className="space-y-6">
        {children ? (
          children
        ) : loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border border-border bg-surface-muted"
              />
            ))}
          </div>
        ) : days.length > 0 ? (
          byMonth.map(([month, monthDays]) => {
            const monthNe = monthDays[0]?.bs_month_name_ne;
            const monthLabel =
              lang === "en"
                ? t("sait.month_number", { month: digits(month), defaultValue: `Month ${digits(month)}` })
                : (monthNe ?? t("sait.month_number", { month: digits(month) }));
            return (
              <div key={month} className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <h2 className="m-0 text-lg font-bold text-foreground">
                    {monthLabel}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {t("sait.days_count", { count: digits(monthDays.length) })}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {monthDays.map((d) => {
                    const i = cardIndex++;
                    return (
                      <SaitDayCard
                        key={`${d.bs_month}-${d.bs_day}-${d.window_start}`}
                        d={d}
                        index={i}
                        suitability={suitabilityByDay?.get(`${d.bs_month}-${d.bs_day}`)}
                        personalize={personalizeByDay?.get(`${d.bs_month}-${d.bs_day}`)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <p className="m-0 py-8 text-center text-sm text-muted-foreground">
            {emptyLabel ?? t("sait.empty_year")}
          </p>
        )}
      </section>

      {footer}

      <PanchangaDetailsBackLink labelKey="sait.all_ceremonies" variant="inline" />
    </PageShell>
  );
}

export default SaitCeremonyLayout;
