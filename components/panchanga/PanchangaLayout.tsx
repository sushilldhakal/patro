import type { ReactNode } from "react";
import { View } from "react-native"
import { Text } from "@/components/ui/Text"
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import {
  PANCHANGA_FIELD_CARD_BG,
  PANCHANGA_FIELD_CARD_BG_DARK,
  PANCHANGA_TONE_BG,
  PANCHANGA_TONE_BG_DARK,
  PANCHANGA_TIMING_HIGHLIGHT_BG,
  PANCHANGA_TIMING_HIGHLIGHT_BORDER,
} from "@/lib/panchanga-card-colors";
import { TableHeader, TableRow } from "@/components/ui/DataTable";

/** Paired label|value columns — always on native (phones fit compact 2×2 rows). */
export function usePanchangaLayoutWide(): boolean {
  return true;
}

export function SectionSplitPanel({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <View className="flex-row">
      <View className="min-w-0 flex-1 border-r border-border px-3 py-2">{left}</View>
      <View className="min-w-0 flex-1 px-3 py-2">{right}</View>
    </View>
  );
}

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
  const { pick } = useLocale();
  const title = titleKey
    ? t(titleKey)
    : pick(titleNe ?? titleEn ?? "", titleEn ?? titleNe ?? "");

  return (
    <View
      className={cn(
        "rounded-xl overflow-hidden bg-card shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]",
        className,
      )}
    >
      <View className="flex flex-row items-baseline justify-center gap-2.5 border-b border-border bg-secondary/[0.09] px-3 py-2 dark:bg-secondary/20">
        <Text className="text-body m-0 font-bold text-foreground">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function rowLabel(labelKey?: string, label?: string, t?: (k: string) => string) {
  if (labelKey && t) return t(labelKey);
  return label ?? "";
}

function QuadLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={cn("text-body pt-0.5 font-semibold", className)} style={nepaliTextStyle(12)}>
      {children}
    </Text>
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
    <View
      className={cn(
        "text-body min-w-0 flex flex-row items-baseline gap-x-1.5 gap-y-0.5",
        nowrap ? "flex-nowrap" : "flex-wrap",
        className,
      )}
    >
      {children}
    </View>
  );
}

/** Flex wrap — content-sized cards, multiple per row, each row centered. */
export const panchangaCardGrid =
  "flex w-full flex-row flex-wrap justify-center gap-2 p-4";

/** Content-sized card shell — bg via inline style for native reliability. */
export const panchangaCardShellClass =
  "shrink-0 grow-0 flex-col gap-1 self-start rounded-xl border border-border/80 px-3.5 py-2.5";

function usePanchangaCardBg(tone?: keyof typeof PANCHANGA_TONE_BG) {
  const { isDark } = useTheme();
  if (tone) {
    return isDark ? PANCHANGA_TONE_BG_DARK[tone] : PANCHANGA_TONE_BG[tone];
  }
  return isDark ? PANCHANGA_FIELD_CARD_BG_DARK : PANCHANGA_FIELD_CARD_BG;
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
    <Text
      className={cn(
        "text-body m-0 w-full basis-full pt-1 text-center font-semibold text-muted-foreground first:pt-0",
        className,
      )}
      style={nepaliTextStyle(14)}
    >
      {children}
    </Text>
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
  const bg = usePanchangaCardBg(tone);
  return (
    <View
      className={cn(
        panchangaCardShellClass,
        "min-w-[8.5rem] gap-1 border-transparent",
        isCurrent && "border-2 border-accent",
        className,
      )}
      style={{ backgroundColor: bg }}
    >
      <View className="flex-row items-start gap-2">
        {icon ? <View className="shrink-0 pt-0.5">{icon}</View> : null}
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-body font-bold text-foreground">{titleLine}</Text>
          {subtitleLine ? (
            <Text className="text-caption font-semibold text-muted-foreground">{subtitleLine}</Text>
          ) : null}
        </View>
      </View>
    </View>
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
  const bg = usePanchangaCardBg("neutral");
  return (
    <View
      className={cn(
        panchangaCardShellClass,
        "min-w-[8.5rem] gap-1",
        isCurrent && "border-2 border-accent",
        className,
      )}
      style={{ backgroundColor: bg }}
    >
      <Text className="text-body font-bold text-foreground">{titleLine}</Text>
      {footerLine ? (
        <Text className="text-caption font-semibold text-muted-foreground">{footerLine}</Text>
      ) : null}
    </View>
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
  const bg = usePanchangaCardBg(highlight ? undefined : "neutral");
  return (
    <View
      className={cn(panchangaCardShellClass, "gap-1.5", className)}
      style={{
        backgroundColor: highlight ? PANCHANGA_TIMING_HIGHLIGHT_BG : bg,
        borderColor: highlight ? PANCHANGA_TIMING_HIGHLIGHT_BORDER : undefined,
      }}
    >
      <Text
        className={cn(
          "text-body font-semibold",
          highlight ? "text-success" : "text-muted-foreground",
        )}
      >
        {label}
      </Text>
      {time ? (
        <Text className="text-body font-mono font-semibold tabular-nums text-foreground">{time}</Text>
      ) : null}
      {note ? (
        <Text className="text-caption font-mono text-muted-foreground">{note}</Text>
      ) : null}
    </View>
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
  const bg = usePanchangaCardBg();

  return (
    <View className={cn(panchangaCardShellClass, className)} style={{ backgroundColor: bg }}>
      <QuadLabel className="shrink-0 text-muted-foreground">
        {rowLabel(labelKey, label, t)}
      </QuadLabel>
      <QuadValue nowrap={nowrap}>{children}</QuadValue>
    </View>
  );
}

export function PanchangaQuadRow({
  left,
  right,
  className,
}: {
  left: { labelKey?: string; label?: string; children: React.ReactNode };
  right?: { labelKey?: string; label?: string; children: React.ReactNode };
  className?: string;
}) {
  return (
    <>
      <PanchangaFieldCell
        labelKey={left.labelKey}
        label={left.label}
        className={className}
        nowrap
      >
        {left.children}
      </PanchangaFieldCell>
      {right ? (
        <PanchangaFieldCell labelKey={right.labelKey} label={right.label} nowrap>
          {right.children}
        </PanchangaFieldCell>
      ) : null}
    </>
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
  return <View className={cn(panchangaCardGrid, className)}>{children}</View>;
}

/** @deprecated use PanchangaQuadRow */
export function PanchangaRows({
  children,
}: {
  children: React.ReactNode;
  /** @deprecated ignored — use PanchangaQuadRow */
  twoCol?: boolean;
}) {
  return <PanchangaTableBody>{children}</PanchangaTableBody>;
}

/** @deprecated use PanchangaQuadRow or PanchangaFullRow */
export function PanchangaRow({
  labelKey,
  label,
  children,
  oddBorder: _oddBorder,
  className,
}: {
  labelKey?: string;
  label?: string;
  children: React.ReactNode;
  oddBorder?: boolean;
  className?: string;
}) {
  return (
    <PanchangaFullRow labelKey={labelKey} label={label} className={className}>
      {children}
    </PanchangaFullRow>
  );
}

export function UptoValue({
  name,
  sym,
  endTime,
  badge,
  compact = true,
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
    <View
      className={cn(
        "min-w-0 flex-row items-baseline gap-1.5",
        compact ? "justify-between gap-2" : "flex-wrap",
      )}
    >
      <Text className="min-w-0 shrink flex-row flex-wrap items-baseline gap-1">
        {sym ? <Text className="text-body shrink-0 text-foreground">{sym}</Text> : null}
        <Text className="font-semibold" style={nepaliTextStyle(14)}>
          {name}
        </Text>
        {badge ? (
          <Text className="text-caption rounded-full bg-secondary/15 px-1.5 py-0.5 font-semibold text-secondary dark:text-accent">
            {badge}
          </Text>
        ) : null}
      </Text>
      {endTime ? (
        <Text className="text-caption shrink-0 font-mono font-semibold text-foreground">
          {endTime} {t("sections.until")}
        </Text>
      ) : null}
    </View>
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
      <Text className="text-caption text-muted-foreground">
        {t("sections.dash")} {t("sections.not_available")}
      </Text>
    );
  }
  return (
    <Text
      className={cn(
        "text-body font-mono font-semibold",
        variant === "good" && "text-[var(--color-success)]",
        variant === "bad" && "text-destructive",
        variant === "neutral" && "text-foreground",
      )}
    >
      {start} → {end}
    </Text>
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
    <View className={cn("divide-y divide-border/80 rounded-md border border-border/80", className)}>
      {children}
    </View>
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
    <View
      className={cn(
        "text-body px-2 py-1",
        highlight && "font-semibold text-success",
        className,
      )}
    >
      <View className="flex-row items-baseline justify-between gap-x-2">
        <Text className="min-w-0 flex-1 text-foreground">{label}</Text>
        <Text className="text-body shrink-0 font-mono font-semibold tabular-nums text-foreground">
          {time ?? "—"}
        </Text>
      </View>
      {note ? (
        <Text className="text-caption mt-0.5 text-foreground/90">{note}</Text>
      ) : null}
    </View>
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
    <View className={cn("border-b border-border px-3 py-1.5 last:border-b-0", className)}>
      <Text className="text-body m-0 mb-1 font-semibold text-foreground">{title}</Text>
      {children}
    </View>
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
    <View>
      <TableHeader className="px-2 py-1">
        <Text className="text-body min-w-0 flex-1 font-semibold text-foreground">{leftTitle}</Text>
        <Text className="text-body min-w-0 flex-1 border-l border-border/60 pl-2 font-semibold text-foreground">
          {rightTitle}
        </Text>
      </TableHeader>
      <View className="divide-y divide-border/80">
        {rows.map((row, i) => (
          <TableRow key={i} rowIndex={i} highlight={row.left?.highlight} borderTop={false} className="items-start px-2 py-1">
            <PairedTimingCell
              label={row.left?.label}
              time={row.left?.time}
              note={row.left?.note}
              highlight={row.left?.highlight}
            />
            <PairedTimingCell
              label={row.right?.label}
              time={row.right?.time}
              note={row.right?.note}
              bordered
            />
          </TableRow>
        ))}
      </View>
    </View>
  );
}

function PairedTimingCell({
  label,
  time,
  note,
  highlight,
  bordered,
}: {
  label?: React.ReactNode;
  time?: React.ReactNode;
  note?: React.ReactNode;
  highlight?: boolean;
  bordered?: boolean;
}) {
  if (!label && !time && !note) {
    return <View className={cn("min-w-0 flex-1", bordered && "border-l border-border/60 pl-2")} />;
  }

  return (
    <View className={cn("min-w-0 flex-1", bordered && "border-l border-border/60 pl-2")}>
      <View className="flex-row items-start justify-between gap-1">
        <Text
          className={cn(
            "text-body min-w-0 flex-1 text-foreground",
            highlight && "font-semibold text-success",
          )}
          numberOfLines={2}
        >
          {label}
        </Text>
        <Text className="text-caption shrink-0 font-mono font-semibold tabular-nums text-foreground">
          {time}
        </Text>
      </View>
      {note ? (
        <Text className="text-caption mt-0.5 text-foreground/90" numberOfLines={2}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}
