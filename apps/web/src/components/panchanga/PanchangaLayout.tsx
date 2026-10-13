import { useTranslation } from "react-i18next";
import { cn } from "@vedic-patro/domain/utils";
import { useLocale, bilingualText } from "@/i18n/locale";
import { patroNavataraToneBg } from "@/lib/patro-classes";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { rowLabel } from "@vedic-patro/domain/panchanga-layout";
import {
  panchangaCardBase,
  panchangaCardGrid,
  panchangaCardSubtitle,
  panchangaCardTitle,
  panchangaFieldLabel,
  panchangaFieldValue,
  panchangaFieldValueNowrap,
  panchangaGroupLabel,
  panchangaSection,
  panchangaSectionHeader,
  panchangaSectionTitle,
} from "@vedic-patro/design-tokens";

export function PanchangaSection({
  titleKey,
  titleNe,
  titleEn,
  children,
  className,
}: {
  titleKey?: string;
  titleNe?: string;
  titleEn?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const title = titleKey
    ? t(titleKey)
    : bilingualText(lang, titleNe ?? titleEn ?? "", titleEn ?? titleNe ?? "");

  return (
    <section className={cn(panchangaSection, className)}>
      <header className={panchangaSectionHeader}>
        <h2 className={panchangaSectionTitle}>{title}</h2>
      </header>
      {children}
    </section>
  );
}

function QuadLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        panchangaFieldLabel,
        className,
      )}
    >
      {children}
    </div>
  );
}

function QuadValue({
  children,
  className,
  nowrap,
}: {
  children: React.ReactNode;
  className?: string;
  nowrap?: boolean;
}) {
  return (
    <div
      className={cn(
        nowrap ? panchangaFieldValueNowrap : panchangaFieldValue,
        // Half-width cards on phones can't honour nowrap without spilling out of
        // the card, so let values wrap there and hold the single line from `sm`.
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Full-width subgroup label inside a card grid (forces a new row). */
export function PanchangaGroupLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        panchangaGroupLabel,
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Navatara balam card: name + time on top, tara/quality below, tone background. */
export function PanchangaBalamCard({
  titleLine,
  subtitleLine,
  tone = "neutral",
  isCurrent,
  className,
  icon,
}: {
  titleLine: React.ReactNode;
  subtitleLine?: React.ReactNode;
  tone?: "best" | "good" | "neutral" | "bad" | "worst";
  isCurrent?: boolean;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        panchangaCardBase,
        panchangaPageClasses.layout.balamCard,
        patroNavataraToneBg(tone),
        isCurrent &&
          "shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_65%,transparent)] ring-2 ring-accent/80",
        className,
      )}
    >
      <span className={cn("flex items-start gap-2", panchangaCardTitle)}>
        {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
        <span className="min-w-0 whitespace-normal sm:whitespace-nowrap">{titleLine}</span>
      </span>
      {subtitleLine ? (
        <span className={panchangaCardSubtitle}>{subtitleLine}</span>
      ) : null}
    </div>
  );
}

/** Udaya lagna card: rashi + time on top, optional pushkara line below. */
export function PanchangaLagnaCard({
  titleLine,
  footerLine,
  isCurrent,
  className,
}: {
  titleLine: React.ReactNode;
  footerLine?: React.ReactNode;
  isCurrent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        panchangaCardBase,
        panchangaPageClasses.layout.lagnaCard,
        patroNavataraToneBg("neutral"),
        isCurrent &&
          "shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_65%,transparent)] ring-2 ring-accent/80",
        className,
      )}
    >
      <span className={panchangaCardTitle}>{titleLine}</span>
      {footerLine ? (
        <span className={panchangaCardSubtitle}>
          {footerLine}
        </span>
      ) : null}
    </div>
  );
}

/** Compact label + time card for muhurta / panchaka / lagna rows. */
export function PanchangaTimingCard({
  label,
  time,
  note,
  highlight,
  className,
}: {
  label: React.ReactNode;
  time?: React.ReactNode;
  note?: React.ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        panchangaCardBase,
        panchangaPageClasses.layout.timingCard,
        highlight && panchangaPageClasses.layout.timingHighlight,
        className,
      )}
    >
      <span
        className={cn(
          panchangaPageClasses.layout.timingLabel,
          highlight
            ? panchangaPageClasses.layout.timingLabelGood
            : panchangaPageClasses.layout.timingLabelIdle,
        )}
      >
        {label}
      </span>
      {time ? (
        <span className={panchangaPageClasses.layout.timingTime}>
          {time}
        </span>
      ) : null}
      {note ? (
        <span className={panchangaPageClasses.layout.timingNote}>{note}</span>
      ) : null}
    </div>
  );
}

/** Title + chip list card for balam groups. */
export function PanchangaChipGroupCard({
  title,
  children,
  className,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(panchangaCardBase, panchangaPageClasses.layout.chipGroupCard, className)}>
      <h3 className={panchangaPageClasses.layout.chipGroupTitle}>{title}</h3>
      {children}
    </div>
  );
}

/** Wider card for panels (muhurta split, etc.). */
export function PanchangaPanelCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(panchangaCardBase, panchangaPageClasses.layout.panelCard, className)}>
      {children}
    </div>
  );
}

/** Single label|value card inside a PanchangaTableBody grid. */
export function PanchangaFieldCell({
  labelKey,
  label,
  children,
  className,
  nowrap,
}: {
  labelKey?: string;
  label?: string;
  children: React.ReactNode;
  className?: string;
  nowrap?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn(panchangaCardBase, className)}>
      <QuadLabel>
        {rowLabel(labelKey, label, t)}
      </QuadLabel>
      <QuadValue nowrap={nowrap}>{children}</QuadValue>
    </div>
  );
}

/** Full-width label|value row (e.g. long lists). */
export function PanchangaFullRow({
  labelKey,
  label,
  children,
  className,
}: {
  labelKey?: string;
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <PanchangaFieldCell labelKey={labelKey} label={label} className={className}>
      {children}
    </PanchangaFieldCell>
  );
}

export function PanchangaTableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(panchangaCardGrid, className)}>{children}</div>;
}

export function UptoValue({
  name,
  sym,
  endTime,
  badge,
  compact,
}: {
  name?: string;
  sym?: string;
  endTime?: string;
  badge?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  if (!name) return null;
  return (
    <div
      className={cn(
        // `flex-wrap`, not nowrap: an English end time ("tomorrow 20:21 until")
        // is on its own wider than a half-width card, so forcing it to share a
        // line makes the name overflow its min-w-0 box and render on top of it.
        "flex",
        panchangaPageClasses.layout.uptoRow,
        compact ? panchangaPageClasses.layout.uptoRowCompact : panchangaPageClasses.layout.uptoRowWrap,
      )}
    >
      <span className={cn("inline-flex", panchangaPageClasses.layout.uptoName)}>
        {sym && <span className={panchangaPageClasses.layout.uptoSymbol}>{sym}</span>}
        {/* min-w-0 so a long name wraps inside the card instead of spilling. */}
        <span className={panchangaPageClasses.layout.uptoText}>{name}</span>
        {badge && (
          <span className={panchangaPageClasses.layout.uptoBadge}>
            {badge}
          </span>
        )}
      </span>
      {endTime && (
        // Wrappable at its spaces ("tomorrow 20:21 until" is wider than a
        // half-width card); the clock itself has none, so it never splits.
        <span className={panchangaPageClasses.layout.uptoEnd}>
          {endTime} {t("sections.until")}
        </span>
      )}
    </div>
  );
}

export function TimingRange({
  start,
  end,
  variant = "neutral",
}: {
  start?: string;
  end?: string;
  variant?: "good" | "bad" | "neutral";
}) {
  const { t } = useTranslation();
  if (!start || !end) {
    return (
      <span className={panchangaPageClasses.layout.rangeNa}>
        {t("sections.dash")} {t("sections.not_available")}
      </span>
    );
  }
  return (
    <span
      className={cn(
        panchangaPageClasses.layout.range,
        variant === "good" && panchangaPageClasses.layout.rangeGood,
        variant === "bad" && panchangaPageClasses.layout.rangeBad,
        variant === "neutral" && panchangaPageClasses.layout.rangeNeutral,
      )}
    >
      {start} → {end}
    </span>
  );
}

/** Tight name | time rows — label and time stay on one line. */
export function DenseListTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(panchangaPageClasses.layout.denseTable, className)}>
      {children}
    </div>
  );
}

export function DenseListRow({
  label,
  time,
  note,
  highlight,
  className,
}: {
  label: React.ReactNode;
  time?: React.ReactNode;
  note?: React.ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2",
        panchangaPageClasses.layout.denseRow,
        highlight && panchangaPageClasses.layout.denseRowHighlight,
        className,
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className={panchangaPageClasses.layout.denseTime}>
        {time ?? "—"}
      </span>
      {note ? (
        <span className={cn("col-span-2", panchangaPageClasses.layout.denseNote)}>
          {note}
        </span>
      ) : null}
    </div>
  );
}

/** Section sub-heading above a dense block. */
export function PanchangaSubBlock({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(panchangaPageClasses.layout.subBlock, className)}>
      <p className={panchangaPageClasses.layout.subBlockTitle}>{title}</p>
      {children}
    </div>
  );
}

/** Four-column paired timing table (two lists aligned row-by-row). */
export function PairedTimingTable({
  leftTitle,
  rightTitle,
  rows,
}: {
  leftTitle: string;
  rightTitle: string;
  rows: Array<{
    left?: { label: React.ReactNode; time?: React.ReactNode; note?: React.ReactNode; highlight?: boolean };
    right?: { label: React.ReactNode; time?: React.ReactNode; note?: React.ReactNode };
  }>;
}) {
  return (
    <div className="text-sm">
      <div className={cn("hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:gap-x-2", panchangaPageClasses.layout.pairedHead)}>
        <span className="col-span-2">{leftTitle}</span>
        <span className="col-span-2 border-l border-border/60 pl-2">{rightTitle}</span>
      </div>
      <div className="divide-y divide-border/80">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-1 gap-2 px-3 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:gap-x-2 sm:gap-y-0 sm:py-1 sm:items-start"
          >
            <PairedTimingCell
              title={leftTitle}
              showTitleOnMobile
              label={row.left?.label}
              time={row.left?.time}
              note={row.left?.note}
              highlight={row.left?.highlight}
            />
            <PairedTimingCell
              title={rightTitle}
              showTitleOnMobile
              label={row.right?.label}
              time={row.right?.time}
              note={row.right?.note}
              bordered
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function PairedTimingCell({
  title,
  label,
  time,
  note,
  highlight,
  showTitleOnMobile,
  bordered,
}: {
  title: string;
  label?: React.ReactNode;
  time?: React.ReactNode;
  note?: React.ReactNode;
  highlight?: boolean;
  showTitleOnMobile?: boolean;
  bordered?: boolean;
}) {
  if (!label && !time) {
    return <div className={cn("hidden sm:block sm:col-span-2", bordered && "sm:border-l sm:border-border/60")} />;
  }

  return (
    <div
      className={cn(
        "sm:col-span-2",
        bordered && "max-sm:pt-2 max-sm:border-t max-sm:border-border/60 sm:border-l sm:border-border/60 sm:pl-2",
      )}
    >
      {showTitleOnMobile ? (
        <span className={cn("mb-0.5 block sm:hidden", panchangaPageClasses.layout.pairedTitle)}>
          {title}
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <span className={cn(panchangaPageClasses.layout.pairedLabel, highlight && panchangaPageClasses.layout.pairedLabelHighlight)}>
          {label}
        </span>
        <div className="shrink-0 text-right">
          <div className={panchangaPageClasses.layout.pairedTime}>{time}</div>
          {note ? (
            <div className={cn("max-w-[9.5rem]", panchangaPageClasses.layout.pairedNote)}>
              {note}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
