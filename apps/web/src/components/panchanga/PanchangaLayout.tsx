import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useLocale, bilingualText } from "@/i18n/locale";
import { patroNavataraToneBg } from "@/lib/patro-classes";

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
    <section
      className={cn(
        "rounded-xl overflow-hidden bg-card shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]",
        className,
      )}
    >
      <header className="flex items-baseline justify-center gap-2.5 px-4 py-2.5 border-b border-border bg-secondary/[0.09] dark:bg-secondary/20">
        <h2 className="text-sm font-bold m-0">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function rowLabel(labelKey?: string, label?: string, t?: (k: string) => string) {
  if (labelKey && t) return t(labelKey);
  return label ?? "";
}

function QuadLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "text-sm font-semibold leading-snug pt-0.5",
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
        "text-sm text-base leading-snug flex items-baseline gap-x-2 gap-y-1 min-w-0",
        // Half-width cards on phones can't honour nowrap without spilling out of
        // the card, so let values wrap there and hold the single line from `sm`.
        nowrap ? "flex-wrap whitespace-normal sm:flex-nowrap sm:whitespace-nowrap" : "flex-wrap",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Flex wrap — content-sized cards, multiple per row, each row centered. */
export const panchangaCardGrid =
  "flex w-full flex-wrap justify-center gap-2 p-4";

/**
 * Two-up on phones, content-sized from `sm` upward. Below 640px a content-sized
 * card whose label is long eats the whole row, so pin the basis to half the grid
 * (minus half the 0.5rem gap) and let the label wrap into it instead.
 */
export const panchangaCardBase =
  "inline-flex min-w-0 max-w-full basis-[calc(50%-0.25rem)] grow flex-col gap-1 rounded-xl border border-border/80 bg-background/60 px-3.5 py-2.5 shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_6%,transparent)] sm:w-max sm:max-w-full sm:shrink-0 sm:grow-0 sm:basis-auto";

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
        "m-0 w-full basis-full pt-1 text-center text-sm font-semibold text-muted-foreground first:pt-0",
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
        "min-w-[8.5rem] gap-1 border-transparent",
        patroNavataraToneBg(tone),
        isCurrent &&
          "shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_65%,transparent)] ring-2 ring-accent/80",
        className,
      )}
    >
      <span className="flex items-start gap-2 text-sm font-bold leading-snug text-foreground">
        {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
        <span className="min-w-0 whitespace-normal sm:whitespace-nowrap">{titleLine}</span>
      </span>
      {subtitleLine ? (
        <span className="text-xs font-semibold leading-snug text-muted-foreground whitespace-normal sm:whitespace-nowrap">
          {subtitleLine}
        </span>
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
        "min-w-[8.5rem] gap-1",
        patroNavataraToneBg("neutral"),
        isCurrent &&
          "shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_65%,transparent)] ring-2 ring-accent/80",
        className,
      )}
    >
      <span className="text-sm font-bold leading-snug text-foreground whitespace-normal sm:whitespace-nowrap">{titleLine}</span>
      {footerLine ? (
        <span className="text-xs font-semibold leading-snug text-muted-foreground whitespace-normal sm:whitespace-nowrap">
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
        "gap-1.5",
        highlight && "border-success/45 bg-success/[0.06]",
        className,
      )}
    >
      <span
        className={cn(
          "text-sm font-semibold whitespace-normal sm:whitespace-nowrap",
          highlight ? "text-success" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      {time ? (
        <span className="font-mono text-sm font-semibold tabular-nums whitespace-normal sm:whitespace-nowrap">
          {time}
        </span>
      ) : null}
      {note ? (
        <span className="text-xs font-mono text-muted-foreground whitespace-normal sm:whitespace-nowrap">{note}</span>
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
    <div className={cn(panchangaCardBase, "gap-2", className)}>
      <h3 className="m-0 text-sm font-semibold text-muted-foreground whitespace-normal sm:whitespace-nowrap">{title}</h3>
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
    <div className={cn(panchangaCardBase, "max-w-[min(100%,36rem)]", className)}>
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
      <QuadLabel className="shrink-0 whitespace-normal text-muted-foreground sm:whitespace-nowrap">
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
        "flex min-w-0 items-baseline gap-x-1.5 gap-y-0.5",
        compact ? "justify-between gap-2 w-full" : "flex-wrap",
      )}
    >
      <span className="inline-flex min-w-0 items-baseline gap-1.5">
        {sym && <span className="text-sm shrink-0">{sym}</span>}
        {/* min-w-0 so a long name wraps inside the card instead of spilling. */}
        <span className="min-w-0 font-semibold">{name}</span>
        {badge && (
          <span className="text-sm font-semibold px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary dark:text-accent">
            {badge}
          </span>
        )}
      </span>
      {endTime && (
        // Wrappable at its spaces ("tomorrow 20:21 until" is wider than a
        // half-width card); the clock itself has none, so it never splits.
        <span className="min-w-0 text-sm font-mono font-semibold text-foreground">
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
      <span className="text-xs">
        {t("sections.dash")} {t("sections.not_available")}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "font-mono text-sm font-semibold",
        variant === "good" && "text-[var(--color-success)]",
        variant === "bad" && "text-destructive",
        variant === "neutral" && "text-foreground",
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
    <div className={cn("divide-y divide-border/80 rounded-md border border-border/80", className)}>
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
        "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 px-2.5 py-1 text-sm leading-snug",
        highlight && "font-semibold text-success",
        className,
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 font-mono text-sm font-semibold text-foreground tabular-nums">
        {time ?? "—"}
      </span>
      {note ? (
        <span className="col-span-2 text-sm font-mono text-base text-foreground/90 -mt-0.5 pb-0.5">
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
    <div className={cn("border-b border-border px-4 py-2 last:border-b-0", className)}>
      <p className="m-0 mb-1.5 text-sm font-semibold">{title}</p>
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
      <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:gap-x-2 border-b border-border bg-secondary/[0.06] px-3 py-1.5 text-sm font-semibold">
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
        <span className="mb-0.5 block text-sm font-semibold sm:hidden">
          {title}
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <span className={cn("min-w-0 text-base leading-snug", highlight && "font-semibold text-success")}>
          {label}
        </span>
        <div className="shrink-0 text-right">
          <div className="font-mono text-sm font-semibold text-foreground tabular-nums leading-snug">{time}</div>
          {note ? (
            <div className="mt-0.5 max-w-[9.5rem] text-sm font-mono text-base text-foreground/90 leading-tight">
              {note}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
