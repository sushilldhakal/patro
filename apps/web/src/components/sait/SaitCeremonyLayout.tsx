import { HeartHandshake } from "lucide-react";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import { PanchangaDetailsBackLink } from "@/components/panchanga/PanchangaDetailsBackLink";
import type { Era } from "@vedic-patro/domain/era";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { SaitDayCard } from "@/components/sait/SaitDayCard";
import { SaitRulesSection, type SaitRule } from "@vedic-patro/ui/kit/jyotish";
import { PageHeader, PageShell } from "@/components/PageShell";
import { saitDayKey, useSaitCeremonyList } from "@vedic-patro/features/sait";
import type {
  BratabandhaNakshatraMode,
  SaitDetailDay,
  SaitPersonalizeDay,
  SaitSuitability,
} from "@/lib/api";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";

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
  const list = useSaitCeremonyList({ days, count, year, emptyLabel, countLabel });
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
        <div className={saitClasses.nakshatraRow}>
          <span className={saitClasses.nakshatraLabel}>
            {list.nakshatra.label}
          </span>
          <div
            className={cn(saitClasses.nakshatraGroup, "inline-flex")}
            role="radiogroup"
            aria-label={list.nakshatra.label}
          >
            {list.nakshatra.modes.map(({ id, label }) => {
              const active = nakshatraMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onNakshatraModeChange(id)}
                  className={cn(
                    saitClasses.nakshatraBtn,
                    saitClasses.nakshatraBtnText,
                    "transition-colors",
                    active
                      ? cn(saitClasses.nakshatraBtnActive, saitClasses.nakshatraBtnTextActive)
                      : cn(saitClasses.nakshatraBtnTextIdle, "hover:bg-surface-muted hover:text-foreground"),
                  )}
                >
                  {label}
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

      {!loading && list.displayCount > 0 ? (
        <p className={cn("m-0", saitClasses.countText)}>
          {list.countText}
        </p>
      ) : null}

      {profileControl ? (
        <div className={saitClasses.profileBox}>
          {profileControl}
        </div>
      ) : null}

      {notice}

      <section aria-busy={loading} className={saitClasses.body}>
        {children ? (
          children
        ) : loading ? (
          <div className={cn("grid sm:grid-cols-2 lg:grid-cols-3", saitClasses.dayGrid)}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={cn("animate-pulse", saitClasses.skeletonCard)}
              />
            ))}
          </div>
        ) : days.length > 0 ? (
          list.months.map((m) => (
            <div key={m.month} className={saitClasses.monthBlock}>
              <div className={saitClasses.monthHeader}>
                <h2 className={cn("m-0", saitClasses.monthTitle)}>{m.label}</h2>
                <span className={saitClasses.monthCount}>{m.count}</span>
              </div>
              <div className={cn("grid sm:grid-cols-2 lg:grid-cols-3", saitClasses.dayGrid)}>
                {m.days.map((d) => {
                  const i = cardIndex++;
                  return (
                    <SaitDayCard
                      key={`${saitDayKey(d)}-${d.window_start}`}
                      d={d}
                      index={i}
                      suitability={suitabilityByDay?.get(saitDayKey(d))}
                      personalize={personalizeByDay?.get(saitDayKey(d))}
                    />
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <p className={cn("m-0", saitClasses.emptyText)}>
            {list.empty}
          </p>
        )}
      </section>

      {footer}

      <PanchangaDetailsBackLink labelKey="sait.all_ceremonies" variant="inline" />
    </PageShell>
  );
}

export default SaitCeremonyLayout;
