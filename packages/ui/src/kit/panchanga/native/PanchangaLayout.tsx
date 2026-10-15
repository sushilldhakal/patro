import type { ReactNode } from "react";
import { View } from "react-native";
import { useColorScheme } from "nativewind";
import { Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
import { mobileRoles, withAlpha } from "@vedic-patro/design-tokens";
import { patroNavataraToneBg } from "@vedic-patro/design-tokens/classes/patro-classes";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

function useRoles() {
  const { colorScheme } = useColorScheme();
  return mobileRoles(colorScheme === "dark" ? "dark" : "light");
}
import { usePanchangaLayoutCopy } from "@vedic-patro/features/panchanga-drawing";
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
  panchangaSectionNote,
  panchangaSectionTitle,
} from "@vedic-patro/design-tokens";

/** Website current-card ring is `accent`. RN does not paint `ring-*`, so the border carries it. */
function currentCardStyle(accent: string, on: boolean | undefined) {
  if (!on) return undefined;
  return { borderWidth: 2, borderColor: accent };
}

export { panchangaCardBase, panchangaCardGrid, panchangaSectionNote };

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
  const title = usePanchangaLayoutCopy().sectionTitle(titleKey, titleNe, titleEn);

  return (
    <View className={cn(panchangaSection, className)}>
      <View className={panchangaSectionHeader}>
        <Text className={panchangaSectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function QuadLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={cn(panchangaFieldLabel, className)}>
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
        nowrap ? panchangaFieldValueNowrap : panchangaFieldValue,
        className,
      )}
    >
      {children}
    </View>
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
    <Text
      className={cn(
        panchangaGroupLabel,
        className,
      )}
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
  const colors = useRoles();
  return (
    <View
      className={cn(
        panchangaCardBase,
        panchangaPageClasses.layout.balamCard,
        patroNavataraToneBg(tone),
        isCurrent && "border-2 border-accent",
        className,
      )}
      // Background comes from patroNavataraToneBg. An inline CSS color-mix() string here
      // is invalid on native: it painted nothing and overrode the class.
      style={currentCardStyle(colors.accent, isCurrent)}
    >
      <View className="flex-row items-start gap-2">
        {icon ? <View className="shrink-0 pt-0.5">{icon}</View> : null}
        <View className="min-w-0 flex-1 gap-1">
          <Text className={panchangaCardTitle}>{titleLine}</Text>
          {subtitleLine ? (
            <Text className={panchangaCardSubtitle}>{subtitleLine}</Text>
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
  const colors = useRoles();
  return (
    <View
      className={cn(
        panchangaCardBase,
        panchangaPageClasses.layout.lagnaCard,
        patroNavataraToneBg("neutral"),
        isCurrent && "border-2 border-accent",
        className,
      )}
      style={currentCardStyle(colors.accent, isCurrent)}
    >
      <Text className={panchangaCardTitle}>{titleLine}</Text>
      {footerLine ? (
        <Text className={panchangaCardSubtitle}>{footerLine}</Text>
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
  const colors = useRoles();
  return (
    <View
      className={cn(
        panchangaCardBase,
        panchangaPageClasses.layout.timingCard,
        highlight && panchangaPageClasses.layout.timingHighlight,
        className,
      )}
      style={
        highlight
          ? {
              // Web: color-mix(success 45% / 6%, transparent) — native needs plain rgba.
              borderColor: withAlpha(colors.success, 0.45),
              backgroundColor: withAlpha(colors.success, 0.06),
            }
          : undefined
      }
    >
      <Text
        className={cn(
          panchangaPageClasses.layout.timingLabel,
          highlight
            ? panchangaPageClasses.layout.timingLabelGood
            : panchangaPageClasses.layout.timingLabelIdle,
        )}
      >
        {label}
      </Text>
      {time ? (
        <Text className={cn(panchangaPageClasses.layout.timingTime, "text-foreground")}>{time}</Text>
      ) : null}
      {note ? (
        <Text className={panchangaPageClasses.layout.timingNote}>{note}</Text>
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
  const copy = usePanchangaLayoutCopy();

  return (
    <View className={cn(panchangaCardBase, className)}>
      <QuadLabel className="shrink-0 text-muted-foreground">
        {copy.fieldLabel(labelKey, label)}
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
  compact = false,
}: {
  name?: string;
  sym?: string;
  endTime?: string;
  badge?: string;
  compact?: boolean;
}) {
  const copy = usePanchangaLayoutCopy();
  if (!name) return null;
  return (
    <View
      className={cn(
        "flex-row",
        panchangaPageClasses.layout.uptoRow,
        compact ? panchangaPageClasses.layout.uptoRowCompact : panchangaPageClasses.layout.uptoRowWrap,
      )}
    >
      <View className={cn("flex-row flex-wrap", panchangaPageClasses.layout.uptoName)}>
        {sym ? <Text className={cn(panchangaPageClasses.layout.uptoSymbol, "text-foreground")}>{sym}</Text> : null}
        <Text className={panchangaPageClasses.layout.uptoText}>{name}</Text>
        {badge ? (
          <Text className={panchangaPageClasses.layout.uptoBadge}>
            {badge}
          </Text>
        ) : null}
      </View>
      {endTime ? (
        <Text className={panchangaPageClasses.layout.uptoEnd}>
          {copy.until(endTime)}
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
  const copy = usePanchangaLayoutCopy();
  if (!start || !end) {
    return (
      <Text className={panchangaPageClasses.layout.rangeNa}>
        {copy.notAvailable}
      </Text>
    );
  }
  return (
    <Text
      className={cn(
        panchangaPageClasses.layout.range,
        variant === "good" && panchangaPageClasses.layout.rangeGood,
        variant === "bad" && panchangaPageClasses.layout.rangeBad,
        variant === "neutral" && panchangaPageClasses.layout.rangeNeutral,
      )}
    >
      {copy.range(start, end)}
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
    <View className={cn(panchangaPageClasses.layout.denseTable, className)}>
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
        panchangaPageClasses.layout.denseRow,
        highlight && panchangaPageClasses.layout.denseRowHighlight,
        className,
      )}
    >
      <View className="flex-row items-baseline justify-between gap-x-2">
        <Text className="min-w-0 flex-1 text-sm leading-snug text-foreground">{label}</Text>
        <Text className={panchangaPageClasses.layout.denseTime}>
          {time ?? "—"}
        </Text>
      </View>
      {note ? (
        <Text className={panchangaPageClasses.layout.denseNote}>{note}</Text>
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
    <View className={cn(panchangaPageClasses.layout.subBlock, className)}>
      <Text className={cn(panchangaPageClasses.layout.subBlockTitle, "text-foreground")}>{title}</Text>
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
      <View className="w-full flex-row border-b border-border bg-muted px-3 py-1.5">
        <Text className={cn("min-w-0 flex-1 text-foreground", panchangaPageClasses.layout.pairedTitle)}>{leftTitle}</Text>
        <Text className={cn("min-w-0 flex-1 text-foreground", panchangaPageClasses.layout.pairedBorder, panchangaPageClasses.layout.pairedTitle)}>
          {rightTitle}
        </Text>
      </View>
      <View className="divide-y divide-border/80">
        {rows.map((row, i) => (
          <View key={i} className={cn("w-full flex-row items-start px-3 py-1.5", row.left?.highlight && "bg-secondary/10")}>
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
          </View>
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
    return <View className={cn("min-w-0 flex-1", bordered && panchangaPageClasses.layout.pairedBorder)} />;
  }

  return (
    <View className={cn("min-w-0 flex-1", bordered && panchangaPageClasses.layout.pairedBorder)}>
      <View className="flex-row items-start justify-between gap-1">
        <Text
          className={cn(
            "flex-1 text-foreground",
            panchangaPageClasses.layout.pairedLabel,
            highlight && panchangaPageClasses.layout.pairedLabelHighlight,
          )}
          numberOfLines={2}
        >
          {label}
        </Text>
        <Text className={cn("shrink-0", panchangaPageClasses.layout.pairedTime)}>
          {time}
        </Text>
      </View>
      {note ? (
        <Text className={panchangaPageClasses.layout.pairedNote} numberOfLines={2}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}
