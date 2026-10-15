import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import type { DashaSystem, DashaTreeNode } from "@/lib/api";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { dashaMahadashaGrahaKey, type DashaLord } from "@vedic-patro/domain/dasha";
import type { SpanWithChildren } from "@vedic-patro/domain/kundali/dasha-tree";
import { DASHA_MAX_LEVEL, useDashaNode, useDashaTree, type DashaChainRow } from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { illustration, nativeShadow, space } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Copy = ReturnType<typeof useDashaTree>["copy"];

const LORD_BORDER: Record<DashaLord, string> = {
  sun: illustration.orange50,
  moon: illustration.sky65,
  mars: illustration.red60,
  mercury: illustration.teal39,
  jupiter: illustration.amber40,
  venus: illustration.pink60,
  saturn: illustration.violet66,
  rahu: illustration.gray45,
  ketu: illustration.orange48,
};

const YOGINI_BORDER: Record<string, string> = {
  mangala: illustration.red60b,
  pingala: illustration.orange53c,
  dhanya: illustration.orange50,
  bhramari: illustration.amber40,
  bhadrika: illustration.lime44,
  ulka: illustration.teal43,
  siddha: illustration.teal48,
  sankata: illustration.violet66,
};

function lordBorderColor(lord: string, system: DashaSystem): string {
  if (system === "yogini") return YOGINI_BORDER[lord] ?? illustration.gray45;
  return LORD_BORDER[(lord as DashaLord) in LORD_BORDER ? (lord as DashaLord) : "ketu"];
}

function lordDotColor(lord: string, system: DashaSystem): string {
  return lordBorderColor(lord, system);
}

function DashaLordIcon({ lord, system, size = 18 }: { lord: string; system: DashaSystem; size?: number }) {
  const grahaKey = dashaMahadashaGrahaKey(system, lord);
  if (!grahaKey) return null;
  return <GrahaPlanetIcon graha={grahaKey} size={size} />;
}

function MomentLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row flex-wrap gap-x-2">
      <Text className={kundaliDetailClasses.dashaTree.momentLabel} style={nepaliTextStyle(11)}>
        {label}
      </Text>
      <Text className={cn(kundaliDetailClasses.dashaTree.momentValue, "min-w-0 flex-1")} style={nepaliTextStyle(13)}>
        {value}
      </Text>
    </View>
  );
}

function SpanProgress({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  return (
    <View className={kundaliDetailClasses.dashaTree.progressTrack}>
      <View style={{ width: `${pct}%` }} className={kundaliDetailClasses.dashaTree.progressFill} />
    </View>
  );
}

function DashaDurationGrid({ grid }: { grid: NonNullable<DashaChainRow["grid"]> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator className="mt-2 pl-5.5">
      <View className="min-w-[280px] overflow-hidden rounded-md border border-border/50">
        <View className="flex-row border-b border-border/50 bg-muted/30">
          {grid.columns.map((col) => (
            <View key={col} className={cn(kundaliDetailClasses.dashaTree.durationCell, "min-w-[56px] flex-1 border-r last:border-r-0")}>
              <Text numberOfLines={2} className={kundaliDetailClasses.dashaTree.durationLabel} style={nepaliTextStyle(10)}>
                {col}
              </Text>
            </View>
          ))}
        </View>
        <View className="flex-row">
          {grid.values.map((value, i) => (
            <View key={grid.columns[i]} className={cn(kundaliDetailClasses.dashaTree.durationCell, "min-w-[56px] flex-1 border-r last:border-r-0")}>
              <Text className={kundaliDetailClasses.dashaTree.durationValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function TimelineDot({
  running,
  level,
  lord,
  system,
  colors,
}: {
  running: boolean;
  level: number;
  lord: string;
  system: DashaSystem;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const size = level === 0 ? 14 : level === 1 ? 10 : 8;
  const left = level === 0 ? -7 : level === 1 ? -5 : -4;
  return (
    <View style={{ position: "absolute", top: 18, left, width: size, height: size }}>
      {running ? (
        <View
          style={{
            position: "absolute",
            top: -2,
            left: -2,
            width: size + 4,
            height: size + 4,
            borderRadius: (size + 4) / 2,
            backgroundColor: colorWithAlpha(colors.secondary, 0.35),
          }}
        />
      ) : null}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: colors.background,
          backgroundColor: running ? colors.secondary : lordDotColor(lord, system),
          ...nativeShadow("sm"),
        }}
      />
    </View>
  );
}

function DashaNode({
  span,
  level,
  now,
  timeZone,
  isLast,
  system,
  maxLevel,
  copy,
}: {
  span: SpanWithChildren;
  level: number;
  now: number;
  timeZone?: string;
  isLast?: boolean;
  system: DashaSystem;
  maxLevel: number;
  copy: Copy;
}) {
  const colors = useThemeColors();
  const node = useDashaNode({ span, level, now, timeZone, system, maxLevel });
  const { open, expandable, running, children } = node;
  const border = lordBorderColor(span.lord, system);

  return (
    <View className={level === 0 ? "pb-4" : "pb-2"} style={level > 0 ? { marginLeft: space.xs } : undefined}>
      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: isLast && !open ? 18 : 0,
          left: level === 0 ? -1 : 0,
          width: 2,
          backgroundColor: colorWithAlpha(colors.border, level === 0 ? 0.8 : 0.5),
        }}
      />
      <TimelineDot running={running} level={level} lord={span.lord} system={system} colors={colors} />

      <View
        className="ml-5 overflow-hidden rounded-xl border"
        style={{
          borderColor: running ? colorWithAlpha(colors.secondary, 0.4) : colorWithAlpha(border, 0.35),
          backgroundColor: colorWithAlpha(border, 0.08),
          ...(running ? { borderWidth: 1 } : {}),
        }}
      >
        <Pressable disabled={!expandable} onPress={node.toggle} className="px-3 py-2.5 active:opacity-90">
          <View className={kundaliDetailClasses.dashaTree.spanHead}>
            {expandable ? (
              <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={14} color={colors.mutedForeground} />
            ) : (
              <View style={{ width: 14 }} />
            )}
            <DashaLordIcon lord={span.lord} system={system} size={18} />
            <Text className={kundaliDetailClasses.dashaTree.spanLord} style={nepaliTextStyle(14)}>
              {node.name}
            </Text>
            <Text className={kundaliDetailClasses.dashaTree.spanMeta} style={nepaliTextStyle(13)}>
              {node.level} · {node.duration}
            </Text>
            {running ? (
              <View className={kundaliDetailClasses.dashaTree.runningBadge}>
                <Text className={kundaliDetailClasses.dashaTree.runningBadgeText}>{copy.running}</Text>
              </View>
            ) : null}
          </View>

          <View className="mt-2 gap-0.5 pl-5.5">
            <MomentLine label={copy.begin} value={node.start} />
            <MomentLine label={copy.end} value={node.end} />
          </View>

          <SpanProgress pct={node.progress} />
        </Pressable>

        {node.loading ? (
          <View className="border-t border-border/50 py-3">
            <ActivityIndicator color={colors.secondary} />
          </View>
        ) : null}

        {children ? (
          <View className={kundaliDetailClasses.dashaTree.childrenBox}>
            {children.map((child, i) => (
              <DashaNode
                key={`${child.lord}-${child.start.getTime()}-${i}`}
                span={child}
                level={level + 1}
                now={now}
                timeZone={timeZone}
                isLast={i === children.length - 1}
                system={system}
                maxLevel={maxLevel}
                copy={copy}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ChainStackRow({ row, system, copy, colors }: { row: DashaChainRow; system: DashaSystem; copy: Copy; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <View className={kundaliDetailClasses.dashaTree.detail}>
      <View className={cn(kundaliDetailClasses.dashaTree.detailHead, "flex-wrap")}>
        <DashaLordIcon lord={row.lord} system={system} size={26} />
        <Text className={cn(kundaliDetailClasses.dashaTree.detailTitle, "flex-1")} style={nepaliTextStyle(15)}>
          {row.name}
          <Text className={kundaliDetailClasses.dashaTree.detailLevel}> — {row.level}</Text>
        </Text>
        {row.running && (
          <View className={cn(kundaliDetailClasses.dashaTree.runningBadge, "shrink-0")}>
            <Text className={kundaliDetailClasses.dashaTree.runningBadgeText}>{copy.running}</Text>
          </View>
        )}
      </View>
      <View className={kundaliDetailClasses.dashaTree.detailFlow}>
        <View className={kundaliDetailClasses.dashaTree.detailFlowRow}>
          <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
          <Text className={kundaliDetailClasses.dashaTree.detailFlowText} style={nepaliTextStyle(13)}>{row.start}</Text>
        </View>
        <View className={kundaliDetailClasses.dashaTree.detailFlowRow}>
          <Ionicons name="arrow-forward" size={14} color={colors.foreground} />
          <Text className={kundaliDetailClasses.dashaTree.detailFlowText} style={nepaliTextStyle(13)}>{row.end}</Text>
        </View>
      </View>
      <View className={kundaliDetailClasses.dashaTree.detailTotals}>
        <Text className={kundaliDetailClasses.dashaTree.detailTotalText} style={nepaliTextStyle(13)}>
          {copy.total} — <Text className={kundaliDetailClasses.dashaTree.detailStrong}>{row.total}</Text>
        </Text>
        {row.left ? (
          <Text className={kundaliDetailClasses.dashaTree.detailTotalText} style={nepaliTextStyle(13)}>
            {copy.left} — <Text className={kundaliDetailClasses.dashaTree.detailStrong}>{row.left}</Text>
          </Text>
        ) : null}
      </View>
      <SpanProgress pct={row.progress} />
      {row.grid ? <DashaDurationGrid grid={row.grid} /> : null}
    </View>
  );
}

export type DashaTreeProps = {
  tree: DashaTreeNode[];
  timeZone?: string;
  system?: DashaSystem;
  maxLevel?: number;
  cycleYears?: number;
};

/** Dasha timeline: the live chain, always visible, then the full explorer. */
export function DashaTree({ tree, timeZone, system = "vimshottari", maxLevel = DASHA_MAX_LEVEL, cycleYears }: DashaTreeProps) {
  const colors = useThemeColors();
  const dasha = useDashaTree({ tree, timeZone, system, maxLevel, cycleYears });
  const { copy, chain, range } = dasha;

  return (
    <View className={kundaliDetailClasses.dashaTree.root}>
      {chain.length > 0 && (
        <View className={kundaliDetailClasses.dashaTree.runningGroup}>
          <View className={kundaliDetailClasses.dashaTree.runningHead}>
            <Text className={kundaliDetailClasses.dashaTree.runningTitle} style={nepaliTextStyle(13)}>
              {copy.runningDasha}
            </Text>
            {dasha.cycle ? (
              <View className={kundaliDetailClasses.dashaTree.cycleChip}>
                <Text className={kundaliDetailClasses.dashaTree.cycleChipText} style={nepaliTextStyle(12)}>{dasha.cycle}</Text>
              </View>
            ) : null}
          </View>
          {/* The full active chain as one stack, each level joined by a down-arrow. */}
          <View
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: colorWithAlpha(colors.border, 0.7), backgroundColor: colorWithAlpha(colors.muted, 0.4) }}
          >
            {chain.map((row, i) => (
              <View key={row.key} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colorWithAlpha(colors.border, 0.5) } : undefined}>
                {i > 0 && (
                  <View className="items-center py-0.5">
                    <Ionicons name="arrow-down" size={16} color={colors.mutedForeground} />
                  </View>
                )}
                <ChainStackRow row={row} system={system} copy={copy} colors={colors} />
              </View>
            ))}
          </View>
        </View>
      )}

      {range ? (
        <View className={kundaliDetailClasses.dashaTree.range}>
          <View className="flex-row flex-wrap items-center gap-x-1">
            <Text className={kundaliDetailClasses.dashaTree.rangeLabel} style={nepaliTextStyle(11)}>{copy.from}</Text>
            <Text className={kundaliDetailClasses.dashaTree.rangeValue} style={nepaliTextStyle(13)}>{range.from}</Text>
          </View>
          <View className="flex-row flex-wrap items-center gap-x-1">
            <Text className={kundaliDetailClasses.dashaTree.rangeLabel} style={nepaliTextStyle(11)}>{copy.to}</Text>
            <Text className={kundaliDetailClasses.dashaTree.rangeValue} style={nepaliTextStyle(13)}>{range.to}</Text>
          </View>
        </View>
      ) : null}

      <View>
        <Text className={kundaliDetailClasses.dashaTree.timelineLabel} style={nepaliTextStyle(12)}>{copy.fullTimeline}</Text>
        <View className="pl-3">
          {dasha.mahadashas.map((span, i) => (
            <DashaNode
              key={`${span.lord}-${span.start.getTime()}-${i}`}
              span={span}
              level={0}
              now={dasha.now}
              timeZone={timeZone}
              isLast={i === dasha.mahadashas.length - 1}
              system={system}
              maxLevel={maxLevel}
              copy={copy}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
