import { useState } from "react";
import { Trans } from "@vedic-patro/i18n/react";
import { ChevronDown, CircleAlert, Info, Loader2, RefreshCw, ScrollText } from "lucide-react";
import type { LocationParams, ReportConfidence, ReportItem, ReportSection } from "@/lib/api";
import type { InstantQuery } from "@vedic-patro/domain/instant-query";
import { PanchangaSection } from "@/components/panchanga/PanchangaLayout";
import { cn } from "@vedic-patro/domain/utils";
import { REPORT_CONFIDENCE_LEVELS, useKundaliReport, useReportLabels, type ReportMetaCell } from "@vedic-patro/features/kundali";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const r = kundaliDetailClasses.report;

const CONFIDENCE_CLS: Record<ReportConfidence, string> = {
  strong: cn(r.strongBox, r.strongText),
  moderate: cn(r.moderateBox, r.moderateText),
  mixed: cn(r.mixedBox, r.mixedText),
  tentative: r.tentativeBox,
};

function ConfidenceBadge({ level, className }: { level: ReportConfidence; className?: string }) {
  const labels = useReportLabels();
  return (
    <span className={cn(r.badge, r.badgeText, "inline-flex", CONFIDENCE_CLS[level], className)} title={labels.confidenceTitle(level)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {labels.confidence(level)}
    </span>
  );
}

function FactorList({ factors }: { factors?: string[] }) {
  const labels = useReportLabels();
  const [open, setOpen] = useState(false);
  if (!factors || factors.length === 0) return null;
  return (
    <div className={r.factorWrap}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(r.factorToggle, r.factorToggleText, "inline-flex hover:text-foreground transition-colors")}
      >
        <Info className="h-3 w-3" />
        {labels.factors(factors.length)}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className={cn(r.factorList, "space-y-1")}>
          {factors.map((f, i) => (
            <li key={i} className={r.factorItem}>
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemCard({ item }: { item: ReportItem }) {
  const labels = useReportLabels();
  return (
    <div className={r.itemCard}>
      <div className={cn(r.itemHead, "flex")}>
        <p className={r.itemLabel}>{labels.itemLabel(item)}</p>
        <ConfidenceBadge level={item.confidence} />
      </div>
      <p className={r.itemText}>{item.text}</p>
      <FactorList factors={item.factors} />
    </div>
  );
}

function SectionCard({ section }: { section: ReportSection }) {
  const head = useReportLabels().section(section);
  return (
    <div className={cn(r.sectionCard, section.optional && "border-dashed")}>
      <div className={cn(r.sectionHead, "flex")}>
        <h3 className={r.sectionTitle}>{head.title}</h3>
        {head.titleEn && <span className={r.sectionTitleEn}>{head.titleEn}</span>}
        {section.confidence && <ConfidenceBadge level={section.confidence} className="ml-auto" />}
      </div>

      {section.body.length > 0 && (
        <div className="space-y-2">
          {section.body.map((p, i) => (
            <p key={i} className={r.sectionParagraph}>
              {p}
            </p>
          ))}
        </div>
      )}

      {section.confidence && <FactorList factors={section.factors} />}

      {section.items && section.items.length > 0 && (
        <div className={cn("mt-3 grid gap-2.5", head.grid ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
          {section.items.map((it, i) => (
            <ItemCard key={i} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetaStrip({ cells }: { cells: ReportMetaCell[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className={r.metaCell}>
          <p className={r.metaLabel}>{c.label}</p>
          <p className={r.metaValue}>{c.value}</p>
          {c.sub && <p className={r.metaSub}>{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export function KundaliReport({
  moment,
  location,
  ayanamsha,
  disabled,
}: {
  moment: InstantQuery;
  location?: LocationParams;
  ayanamsha?: string;
  disabled?: boolean;
}) {
  const report = useKundaliReport({ moment, location, ayanamsha, disabled });

  return (
    <PanchangaSection titleKey="kundali.report.title">
      <div className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={cn(r.intro, "max-w-2xl")}>
            <Trans
              i18nKey={report.copy.introKey}
              components={{
                1: <span className="text-base text-foreground" />,
                2: <span className="text-base text-foreground" />,
              }}
            />
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {report.showRegenerate && (
              <button
                type="button"
                onClick={report.regenerate}
                disabled={disabled}
                className={cn(r.statusPill, r.statusText, "inline-flex text-foreground transition-colors hover:bg-muted disabled:opacity-50")}
              >
                <RefreshCw className="h-4 w-4" />
                {report.copy.regenerate}
              </button>
            )}
            {report.busyLabel && (
              <span className={cn(r.statusPill, r.statusText, "inline-flex")}>
                <Loader2 className="h-4 w-4 animate-spin" />
                {report.busyLabel}
              </span>
            )}
          </div>
        </div>

        {report.showConfidenceLegend && (
          <div className={cn(r.confidenceRow, "flex text-sm")}>
            <span className={r.confidenceLabel}>{report.copy.confidenceLabel}</span>
            {REPORT_CONFIDENCE_LEVELS.map((lvl) => (
              <ConfidenceBadge key={lvl} level={lvl} />
            ))}
          </div>
        )}

        {report.error && (
          <div className={cn(r.errorBox, r.errorText, "flex")}>
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{report.error}</span>
          </div>
        )}

        {report.metaCells && <MetaStrip cells={report.metaCells} />}

        {report.sections.length > 0 && (
          <div className="space-y-3">
            {report.sections.map((s) => (
              <SectionCard key={s.id} section={s} />
            ))}
          </div>
        )}

        {report.cacheNote && <p className={r.cacheNote}>{report.cacheNote}</p>}

        {report.idleHint && (
          <div className={cn(r.idleBox, r.idleText, "flex")}>
            <ScrollText className="h-5 w-5 shrink-0" />
            {report.idleHint}
          </div>
        )}

        {report.disclaimer && <p className={r.disclaimer}>{report.disclaimer}</p>}
      </div>
    </PanchangaSection>
  );
}

export default KundaliReport;
