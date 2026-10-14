import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/Text";
import {
  dashaExpandKeys,
  fetchDashaChildren,
  type DashaSystem,
  type DashaTreeNode,
} from "@/lib/api";
import { formatDashaMoment } from "@vedic-patro/domain/bs-calendar";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import {
  DASHA_LORD_EN,
  DASHA_LORD_NE,
  breakdownDashaDuration,
  dashaMahadashaGrahaKey,
  formatDashaDuration,
  formatDashaDurationParts,
  type DashaLord,
  type DashaSpan,
} from "@vedic-patro/domain/dasha";
import { useLocale } from "@/lib/i18n";
import { kundaliLabel } from "@/lib/kundali/kundali-i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { type SpanWithChildren, toSpan } from "@vedic-patro/domain/kundali/dasha-tree";

import { illustration, nativeShadow, space } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { tFor } from "@vedic-patro/i18n/runtime";
const LEVEL_LABELS: { ne: string; en: string }[] = [
  { get ne() { return tFor("ne", "kundali.maha_dasha"); }, get en() { return tFor("en", "kundali.maha_dasha"); } },
  { get ne() { return tFor("ne", "kundali.x.dasha_level_antar"); }, get en() { return tFor("en", "kundali.x.dasha_level_antar"); } },
  { get ne() { return tFor("ne", "kundali.x.dasha_level_pratyantar"); }, get en() { return tFor("en", "kundali.x.dasha_level_pratyantar"); } },
  { get ne() { return tFor("ne", "kundali.x.dasha_level_sukshma"); }, get en() { return tFor("en", "kundali.x.dasha_level_sukshma"); } },
  { get ne() { return tFor("ne", "kundali.x.dasha_level_prana"); }, get en() { return tFor("en", "kundali.x.dasha_level_prana"); } },
];

const MAX_LEVEL = LEVEL_LABELS.length - 1;

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

const DURATION_COLS = [
  { get ne() { return tFor("ne", "kundali.x.duration_bs"); }, get en() { return tFor("en", "kundali.x.duration_bs"); } },
  { get ne() { return tFor("ne", "kundali.x.duration_years"); }, get en() { return tFor("en", "kundali.x.duration_years"); } },
  { get ne() { return tFor("ne", "kundali.x.duration_months"); }, get en() { return tFor("en", "kundali.x.duration_months"); } },
  { get ne() { return tFor("ne", "holidays.col_days"); }, get en() { return tFor("en", "holidays.col_days"); } },
  { get ne() { return tFor("ne", "kundali.yoga"); }, get en() { return tFor("en", "kundali.yoga"); } },
] as const;

function lordBorderColor(lord: string, system: DashaSystem): string {
  if (system === "yogini") return YOGINI_BORDER[lord] ?? illustration.gray45;
  return LORD_BORDER[(lord as DashaLord) in LORD_BORDER ? (lord as DashaLord) : "ketu"];
}

function lordDotColor(lord: string, system: DashaSystem): string {
  return lordBorderColor(lord, system);
}

function displayLordName(span: SpanWithChildren, lang: "ne" | "en", system: DashaSystem): string {
  if (system === "yogini") return span.lordNe;
  const lord = span.lord as DashaLord;
  return lang === "en" ? DASHA_LORD_EN[lord] ?? span.lordNe : DASHA_LORD_NE[lord] ?? span.lordNe;
}

function isRunning(span: SpanWithChildren | undefined, now: number): boolean {
  return span != null && span.start.getTime() <= now && now < span.end.getTime();
}

function findRunning(spans: SpanWithChildren[] | undefined, now: number): SpanWithChildren | undefined {
  return spans?.find((s) => isRunning(s, now));
}

/** Every period at one level under `parent` — fetched only when the API
 * didn't already embed them (pratyantar and deeper come from a lazy
 * /kundali/dasha/expand call, cached by React Query once fetched). A fixed
 * 4-call chain (see `DashaTree`) keeps every render calling the same number
 * of hooks regardless of how deep this chart's `maxLevel` goes — React's
 * rules of hooks forbid a variable-length loop of `useQuery`. */
function useLevelChildren(
  parent: SpanWithChildren | undefined,
  system: DashaSystem,
  parentLevel: number,
  maxLevel: number,
): SpanWithChildren[] | undefined {
  const enabled = parent != null && parentLevel < maxLevel && parent.childNodes == null;
  const startIso = parent?.start.toISOString() ?? "";
  const endIso = parent?.end.toISOString() ?? "";
  const q = useQuery({
    queryKey: dashaExpandKeys.span(parent?.lord ?? "", startIso, endIso, system),
    queryFn: () => fetchDashaChildren(parent!.lord, startIso, endIso, system),
    enabled,
    staleTime: Infinity,
  });
  if (parent == null || parentLevel >= maxLevel) return undefined;
  return (parent.childNodes ?? q.data?.children)?.map(toSpan);
}

function DashaLordIcon({
  lord,
  system,
  size = 18,
}: {
  lord: string;
  system: DashaSystem;
  size?: number;
}) {
  const grahaKey = dashaMahadashaGrahaKey(system, lord);
  if (!grahaKey) return null;
  return <GrahaPlanetIcon graha={grahaKey} size={size} />;
}

function MomentLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row flex-wrap gap-x-2">
      <Text
        className={kundaliDetailClasses.dashaTree.momentLabel}
        style={nepaliTextStyle(11)}
      >
        {label}
      </Text>
      <Text className={cn(kundaliDetailClasses.dashaTree.momentValue, "min-w-0 flex-1")} style={nepaliTextStyle(13)}>
        {value}
      </Text>
    </View>
  );
}

function SpanProgress({
  start,
  end,
  now,
  running,
}: {
  start: Date;
  end: Date;
  now: number;
  running: boolean;
}) {
  if (!running) return null;
  const total = end.getTime() - start.getTime();
  const pct = total > 0 ? Math.min(100, Math.max(0, ((now - start.getTime()) / total) * 100)) : 0;
  return (
    <View className={kundaliDetailClasses.dashaTree.progressTrack}>
      <View
        style={{ width: `${pct}%` }}
        className={kundaliDetailClasses.dashaTree.progressFill}
      />
    </View>
  );
}

function DashaDurationGrid({
  start,
  end,
  lang,
  digits,
}: {
  start: Date;
  end: Date;
  lang: "ne" | "en";
  digits: (v: string | number) => string;
}) {
  const ms = end.getTime() - start.getTime();
  const parts = breakdownDashaDuration(ms);
  const avadhi = formatDashaDurationParts(parts, lang);
  const values = [avadhi, parts.years, parts.months, parts.days, parts.yogas] as const;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator className="mt-2 pl-5.5">
      <View className="min-w-[280px] overflow-hidden rounded-md border border-border/50">
        <View className="flex-row border-b border-border/50 bg-muted/30">
          {DURATION_COLS.map((col) => (
            <View key={col.ne} className={cn(kundaliDetailClasses.dashaTree.durationCell, "min-w-[56px] flex-1 border-r last:border-r-0")}>
              <Text
                numberOfLines={2}
                className={kundaliDetailClasses.dashaTree.durationLabel}
                style={nepaliTextStyle(10)}
              >
                {lang === "en" ? col.en : col.ne}
              </Text>
            </View>
          ))}
        </View>
        <View className="flex-row">
          {values.map((value, i) => (
            <View key={DURATION_COLS[i]!.ne} className={cn(kundaliDetailClasses.dashaTree.durationCell, "min-w-[56px] flex-1 border-r last:border-r-0")}>
              <Text className={kundaliDetailClasses.dashaTree.durationValue}>{digits(value)}</Text>
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
}: {
  span: SpanWithChildren;
  level: number;
  now: number;
  timeZone?: string;
  isLast?: boolean;
  system: DashaSystem;
  maxLevel: number;
}) {
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);

  const running = span.start.getTime() <= now && now < span.end.getTime();
  const expandable = level < maxLevel;

  const needsFetch = open && expandable && !span.childNodes;
  const startIso = span.start.toISOString();
  const endIso = span.end.toISOString();
  const childQ = useQuery({
    queryKey: dashaExpandKeys.span(span.lord, startIso, endIso, system),
    queryFn: () => fetchDashaChildren(span.lord, startIso, endIso, system),
    enabled: needsFetch,
    staleTime: Infinity,
  });

  const children = useMemo<SpanWithChildren[] | null>(() => {
    if (!open || !expandable) return null;
    const nodes = span.childNodes ?? childQ.data?.children;
    return nodes ? nodes.map(toSpan) : null;
  }, [open, expandable, span.childNodes, childQ.data]);

  const duration = formatDashaDuration(span.end.getTime() - span.start.getTime(), lang);
  const levelLabel = pick(LEVEL_LABELS[level]!.ne, LEVEL_LABELS[level]!.en);
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
        <Pressable
          disabled={!expandable}
          onPress={() => expandable && setOpen((v) => !v)}
          className="px-3 py-2.5 active:opacity-90"
        >
          <View className={kundaliDetailClasses.dashaTree.spanHead}>
            {expandable ? (
              <Ionicons
                name={open ? "chevron-down" : "chevron-forward"}
                size={14}
                color={colors.mutedForeground}
              />
            ) : (
              <View style={{ width: 14 }} />
            )}
            <DashaLordIcon lord={span.lord} system={system} size={18} />
            <Text className={kundaliDetailClasses.dashaTree.spanLord} style={nepaliTextStyle(14)}>
              {displayLordName(span, lang, system)}
            </Text>
            <Text className={kundaliDetailClasses.dashaTree.spanMeta} style={nepaliTextStyle(13)}>
              {levelLabel} · {digits(duration)}
            </Text>
            {running ? (
              <View className={kundaliDetailClasses.dashaTree.runningBadge}>
                <Text className={kundaliDetailClasses.dashaTree.runningBadgeText}>
                  {kundaliLabel("dasha_running", lang)}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="mt-2 gap-0.5 pl-5.5">
            <MomentLine
              label={kundaliLabel("dasha_begin", lang)}
              value={formatDashaMoment(span.start, lang, timeZone, digits)}
            />
            <MomentLine
              label={kundaliLabel("dasha_end", lang)}
              value={formatDashaMoment(span.end, lang, timeZone, digits)}
            />
          </View>

          <DashaDurationGrid start={span.start} end={span.end} lang={lang} digits={digits} />
          <SpanProgress
            start={span.start}
            end={span.end}
            now={now}
            running={running}
          />
        </Pressable>

        {needsFetch && childQ.isLoading ? (
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
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ChainStackRow({
  span,
  level,
  system,
  lang,
  pick,
  digits,
  timeZone,
  now,
  isLast,
  colors,
}: {
  span: SpanWithChildren;
  level: number;
  system: DashaSystem;
  lang: "ne" | "en";
  pick: (ne: string, en: string) => string;
  digits: (v: string | number) => string;
  timeZone?: string;
  now: number;
  isLast: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const running = isRunning(span, now);

  return (
    <View className={kundaliDetailClasses.dashaTree.detail}>
      <View className={cn(kundaliDetailClasses.dashaTree.detailHead, "flex-wrap")}>
        <DashaLordIcon lord={span.lord} system={system} size={26} />
        <Text className={cn(kundaliDetailClasses.dashaTree.detailTitle, "flex-1")} style={nepaliTextStyle(15)}>
          {displayLordName(span, lang, system)}
          <Text className={kundaliDetailClasses.dashaTree.detailLevel}> — {pick(LEVEL_LABELS[level]!.ne, LEVEL_LABELS[level]!.en)}</Text>
        </Text>
        {running && (
          <View className={cn(kundaliDetailClasses.dashaTree.runningBadge, "shrink-0")}>
            <Text className={kundaliDetailClasses.dashaTree.runningBadgeText}>
              {pick(tFor("ne", "kundali.dasha_running"), tFor("en", "kundali.dasha_running"))}
            </Text>
          </View>
        )}
      </View>
      <View className={kundaliDetailClasses.dashaTree.detailFlow}>
        <View className={kundaliDetailClasses.dashaTree.detailFlowRow}>
          <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
          <Text className={kundaliDetailClasses.dashaTree.detailFlowText} style={nepaliTextStyle(13)}>
            {formatDashaMoment(span.start, lang, timeZone, digits)}
          </Text>
        </View>
        <View className={kundaliDetailClasses.dashaTree.detailFlowRow}>
          <Ionicons name="arrow-forward" size={14} color={colors.foreground} />
          <Text className={kundaliDetailClasses.dashaTree.detailFlowText} style={nepaliTextStyle(13)}>
            {formatDashaMoment(span.end, lang, timeZone, digits)}
          </Text>
        </View>
      </View>
      <View className={kundaliDetailClasses.dashaTree.detailTotals}>
        <Text className={kundaliDetailClasses.dashaTree.detailTotalText} style={nepaliTextStyle(13)}>
          {pick(tFor("ne", "kundali.total"), tFor("en", "kundali.total"))} —{" "}
          <Text className={kundaliDetailClasses.dashaTree.detailStrong}>
            {digits(formatDashaDuration(span.end.getTime() - span.start.getTime(), lang))}
          </Text>
        </Text>
        {running && (
          <Text className={kundaliDetailClasses.dashaTree.detailTotalText} style={nepaliTextStyle(13)}>
            {pick(tFor("ne", "kundali.left"), tFor("en", "kundali.left"))} —{" "}
            <Text className={kundaliDetailClasses.dashaTree.detailStrong}>
              {digits(formatDashaDuration(span.end.getTime() - now, lang))}
            </Text>
          </Text>
        )}
      </View>
      <SpanProgress start={span.start} end={span.end} now={now} running={running} />
      {isLast ? <DashaDurationGrid start={span.start} end={span.end} lang={lang} digits={digits} /> : null}
    </View>
  );
}

/**
 * The full active chain — Mahadasha down to whatever level is known — as one
 * unified stack, each level a plain row connected by a down-arrow. Nothing
 * here is collapsed or click-gated: every level's begin/end/total/left is
 * visible the instant the page loads, so "what's running right now" needs
 * no expanding and no scrolling to find.
 */
function ChainStack({
  path,
  system,
  now,
  timeZone,
  lang,
  pick,
  digits,
  colors,
}: {
  path: SpanWithChildren[];
  system: DashaSystem;
  now: number;
  timeZone?: string;
  lang: "ne" | "en";
  pick: (ne: string, en: string) => string;
  digits: (v: string | number) => string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  if (path.length === 0) return null;
  return (
    <View
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: colorWithAlpha(colors.border, 0.7), backgroundColor: colorWithAlpha(colors.muted, 0.4) }}
    >
      {path.map((span, i) => (
        <View key={`${span.lord}-${i}`} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colorWithAlpha(colors.border, 0.5) } : undefined}>
          {i > 0 && (
            <View className="items-center py-0.5">
              <Ionicons name="arrow-down" size={16} color={colors.mutedForeground} />
            </View>
          )}
          <ChainStackRow
            span={span}
            level={i}
            system={system}
            lang={lang}
            pick={pick}
            digits={digits}
            timeZone={timeZone}
            now={now}
            isLast={i === path.length - 1}
            colors={colors}
          />
        </View>
      ))}
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

export function DashaTree({
  tree,
  timeZone,
  system = "vimshottari",
  maxLevel = MAX_LEVEL,
  cycleYears,
}: DashaTreeProps) {
  const { t, lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const [now] = useState(() => Date.now());
  const mahadashas = useMemo(() => tree.map(toSpan), [tree]);

  const p0 = findRunning(mahadashas, now);
  const list1 = useLevelChildren(p0, system, 0, maxLevel);
  const p1 = findRunning(list1, now);
  const list2 = useLevelChildren(p1, system, 1, maxLevel);
  const p2 = findRunning(list2, now);
  const list3 = useLevelChildren(p2, system, 2, maxLevel);
  const p3 = findRunning(list3, now);
  const list4 = useLevelChildren(p3, system, 3, maxLevel);
  const p4 = findRunning(list4, now);

  const knownPath = [p0, p1, p2, p3, p4].filter((s): s is SpanWithChildren => s != null);

  const timelineStart = mahadashas[0]?.start;
  const timelineEnd = mahadashas[mahadashas.length - 1]?.end;
  const yoginiCycle =
    p0 && cycleYears
      ? Math.floor(
          (p0.start.getTime() - (timelineStart?.getTime() ?? p0.start.getTime())) /
            (cycleYears * 365.2425 * 86400000),
        ) + 1
      : null;

  return (
    <View className={kundaliDetailClasses.dashaTree.root}>
      {knownPath.length > 0 && (
        <View className={kundaliDetailClasses.dashaTree.runningGroup}>
          <View className={kundaliDetailClasses.dashaTree.runningHead}>
            <Text className={kundaliDetailClasses.dashaTree.runningTitle} style={nepaliTextStyle(13)}>
              {kundaliLabel("dasha_running_now", lang)}
            </Text>
            {yoginiCycle ? (
              <View className={kundaliDetailClasses.dashaTree.cycleChip}>
                <Text className={kundaliDetailClasses.dashaTree.cycleChipText} style={nepaliTextStyle(12)}>
                  {t("ui.kundali.cycle_yoginicycle", { yoginiCycle: digits(yoginiCycle) })}
                </Text>
              </View>
            ) : null}
          </View>
          <ChainStack
            path={knownPath}
            system={system}
            now={now}
            timeZone={timeZone}
            lang={lang}
            pick={pick}
            digits={digits}
            colors={colors}
          />
        </View>
      )}

      {timelineStart && timelineEnd ? (
        <View className={kundaliDetailClasses.dashaTree.range}>
          <View className="flex-row flex-wrap items-center gap-x-1">
            <Text className={kundaliDetailClasses.dashaTree.rangeLabel} style={nepaliTextStyle(11)}>
              {kundaliLabel("dasha_from", lang)}
            </Text>
            <Text className={kundaliDetailClasses.dashaTree.rangeValue} style={nepaliTextStyle(13)}>
              {formatDashaMoment(timelineStart, lang, timeZone, digits)}
            </Text>
          </View>
          <View className="flex-row flex-wrap items-center gap-x-1">
            <Text className={kundaliDetailClasses.dashaTree.rangeLabel} style={nepaliTextStyle(11)}>
              {kundaliLabel("dasha_to", lang)}
            </Text>
            <Text className={kundaliDetailClasses.dashaTree.rangeValue} style={nepaliTextStyle(13)}>
              {formatDashaMoment(timelineEnd, lang, timeZone, digits)}
            </Text>
          </View>
        </View>
      ) : null}

      <View>
        <Text className={kundaliDetailClasses.dashaTree.timelineLabel} style={nepaliTextStyle(12)}>
          {kundaliLabel("dasha_full_timeline", lang)}
        </Text>
        <View className="pl-3">
          {mahadashas.map((span, i) => (
            <DashaNode
              key={`${span.lord}-${span.start.getTime()}-${i}`}
              span={span}
              level={0}
              now={now}
              timeZone={timeZone}
              isLast={i === mahadashas.length - 1}
              system={system}
              maxLevel={maxLevel}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
