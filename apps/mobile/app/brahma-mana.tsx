import { Pressable, View } from "react-native";
import Animated, { FadeIn, LayoutAnimationConfig } from "react-native-reanimated";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { LearnMoreCard } from "@/components/learn/LearnMoreCard";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useTheme } from "@/lib/theme-context";
import { haptics, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useBrahmaManaPage, type BrahmaManaPage, type BrahmaTreeRow } from "@vedic-patro/features/brahma-mana";

/** Indent per level, in points: eleven levels deep still leaves the names most of a phone's width. */
const STEP = 14;

/** One stretch of time: rails of the levels above, a triangle if it opens, name, [divya varṣa]. */
function TreeRow({ row, tree }: { row: BrahmaTreeRow; tree: BrahmaManaPage["tree"] }) {
  const { colors } = useTheme();
  const reduced = useReducedMotionPref();
  const line = row.current ? colors.secondary : colors.border;
  const rails = row.rails.map((on, i) => (
    <View key={i} style={{ width: STEP }}>
      {on ? <View style={{ position: "absolute", left: 6, top: 0, bottom: 0, width: 1, backgroundColor: colors.border }} /> : null}
    </View>
  ));

  const label = (
    <View className="min-w-0 flex-1 flex-row items-start gap-1.5 py-0.5">
      {row.hasChildren ? (
        <View className="mt-0.5" style={{ transform: [{ rotate: row.open ? "0deg" : "-90deg" }] }}>
          <Ionicons name="chevron-down" size={14} color={colors.foreground} />
        </View>
      ) : (
        <View style={{ width: 14 }} />
      )}
      <Text className="min-w-0 flex-1 leading-snug" style={nepaliTextStyle(14)}>
        <Text
          className={cn("font-semibold", row.current ? "text-secondary underline" : "text-foreground")}
          style={row.current ? { textDecorationStyle: "dashed" } : undefined}
        >
          {row.name}
        </Text>
        <Text className="font-num text-sm text-muted-foreground">{` [${row.divya}] `}</Text>
        <Text className="font-num text-xs text-muted-foreground">{row.solar}</Text>
      </Text>
    </View>
  );

  return (
    <Animated.View entering={reduced ? undefined : FadeIn.duration(160)}>
      {row.mana ? (
        <View style={{ flexDirection: "row" }}>
          {rails}
          {row.depth > 0 ? (
            <View style={{ width: STEP }}>
              <View style={{ position: "absolute", left: 6, top: 0, bottom: 0, width: 1, backgroundColor: line }} />
            </View>
          ) : null}
          <Text className="pl-5 text-sm italic text-danger" style={nepaliTextStyle(13)}>
            {`${row.mana}:`}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "stretch" }}>
        {rails}
        {row.depth > 0 ? (
          <View style={{ width: STEP }}>
            <View style={{ position: "absolute", left: 6, top: 0, width: 1, height: row.last ? 13 : "100%", backgroundColor: line }} />
            <View style={{ position: "absolute", left: 6, top: 13, width: 8, height: 1, backgroundColor: line }} />
          </View>
        ) : null}
        {row.hasChildren ? (
          <Pressable
            onPress={() => {
              haptics.tick();
              tree.toggle(row.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ expanded: row.open }}
            pressRetentionOffset={16}
            hitSlop={{ top: 4, bottom: 4 }}
            className="min-w-0 flex-1 rounded px-1 active:bg-muted/50"
          >
            {label}
          </Pressable>
        ) : (
          <View className="min-w-0 flex-1 px-1">{label}</View>
        )}
      </View>
    </Animated.View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-2 p-4">
      <Text className="text-lg font-bold text-foreground" style={nepaliTextStyle(17)}>
        {title}
      </Text>
      {children}
    </Card>
  );
}

const cell = (text: string, strong?: boolean) => (
  <Text className={cn("font-num text-sm text-foreground", strong && "font-bold")} style={nepaliTextStyle(13)}>
    {text}
  </Text>
);

function columnsOf(labels: readonly string[], widths: number[]): TableColumn[] {
  return labels.map((label, i) => ({ key: String(i), ne: label, en: label, width: widths[i] ?? 100 }));
}

export default function BrahmaManaScreen() {
  const { colors, isDark } = useTheme();
  const page = useBrahmaManaPage();

  return (
    <AppShell title="" showHeader={false}>
      <PatroPageHeader
        className="mb-4"
        icon={<AppNavIcon name="hourglass" size={28} color={isDark ? colors.primary : colors.secondary} />}
        title={page.title}
        subtitle={page.subtitle}
      />

      <View className="gap-4">
        <SectionCard title={page.tree.title}>
          <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
            {page.tree.hint}
          </Text>
          <Text className="font-num text-sm font-semibold text-foreground" style={nepaliTextStyle(13)}>
            {page.tree.unit}
          </Text>
          <View className="flex-row gap-4">
            <Pressable onPress={page.tree.showNow} hitSlop={10} accessibilityRole="button">
              <Text className="text-sm font-semibold text-secondary" style={nepaliTextStyle(13)}>
                {page.tree.showNowLabel}
              </Text>
            </Pressable>
            <Pressable onPress={page.tree.collapseAll} hitSlop={10} accessibilityRole="button">
              <Text className="text-sm font-semibold text-secondary" style={nepaliTextStyle(13)}>
                {page.tree.collapseAllLabel}
              </Text>
            </Pressable>
          </View>
          <Text className="text-sm italic text-danger" style={nepaliTextStyle(13)}>
            {`${page.tree.rootMana}:`}
          </Text>
          {/* The ~220 rows of the opening view appear at once; only rows opened later fade in. */}
          <LayoutAnimationConfig skipEntering>
            <View>
              {page.tree.rows.map((row) => (
                <TreeRow key={row.key} row={row} tree={page.tree} />
              ))}
            </View>
          </LayoutAnimationConfig>
        </SectionCard>

        <SectionCard title={page.now.title}>
          {page.now.lines.map((line, i) => (
            <View key={line} className="flex-row items-start gap-2">
              <View
                className="mt-1.5 size-2 rounded-full bg-secondary"
                style={{ opacity: 0.45 + (0.55 * (i + 1)) / page.now.lines.length }}
              />
              <Text className="min-w-0 flex-1 font-num text-sm text-foreground" style={nepaliTextStyle(14)}>
                {line}
              </Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard title={page.pada.title}>
          <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
            {page.pada.caption}
          </Text>
          <DataTable
            columns={columnsOf(page.pada.cols, [130, 60, 120, 110])}
            rows={page.pada.rows.map((r) => ({
              key: r.key,
              highlight: r.total,
              cells: [cell(r.name, r.total), cell(r.padas, r.total), cell(r.calc, r.total), cell(r.years, r.total)],
            }))}
          />
          <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
            {page.pada.note}
          </Text>
        </SectionCard>

        <SectionCard title={page.years.title}>
          <DataTable
            columns={columnsOf(page.years.cols, [150, 160, 190, 170])}
            rows={page.years.rows.map((r) => ({ key: r.key, cells: [cell(r.unit), cell(r.divya), cell(r.years), cell(r.rough)] }))}
          />
          <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
            {page.source}
          </Text>
        </SectionCard>

        <SectionCard title={page.notes.title}>
          {page.notes.items.map((note) => (
            <View key={note} className="flex-row items-start gap-2">
              <Text className="text-sm text-muted-foreground">•</Text>
              <Text className="min-w-0 flex-1 font-num text-sm text-foreground" style={nepaliTextStyle(14)}>
                {note}
              </Text>
            </View>
          ))}
        </SectionCard>

        <LearnMoreCard slugs={page.learnSlugs} />
      </View>
    </AppShell>
  );
}
