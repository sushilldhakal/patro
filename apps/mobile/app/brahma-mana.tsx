import { Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
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

/** Indent per level, in points. Nine levels deep still leaves a phone most of its width. */
const STEP = 14;
/** Rows settle into place on open and close; Reduce Motion drops it. */
const ROW_LAYOUT = LinearTransition.duration(200);

/** One level of the ladder: the rails of its ancestors, its own elbow, then the card. */
function TreeRow({ row, tree }: { row: BrahmaTreeRow; tree: BrahmaManaPage["tree"] }) {
  const { colors } = useTheme();
  const reduced = useReducedMotionPref();
  const open = tree.isOpen(row);
  const here = row.current && !row.hasChildren;
  const rail = row.current ? colors.secondary : colors.border;

  const body = (
    <View
      className={cn(
        "min-w-0 flex-1 gap-0.5 rounded-lg border px-3 py-2",
        row.current ? "border-secondary/40 bg-secondary/10" : "border-border bg-card",
      )}
    >
      <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
        <Text className="font-bold text-foreground" style={nepaliTextStyle(15)}>
          {row.name}
        </Text>
        {row.count ? (
          <View className="rounded-full bg-muted px-2 py-px">
            <Text className="font-num text-xs font-semibold text-muted-foreground" style={nepaliTextStyle(11)}>
              {row.count}
            </Text>
          </View>
        ) : null}
        {here ? (
          <View className="rounded-full bg-secondary px-2 py-px">
            <Text className="text-xs font-bold text-white" style={nepaliTextStyle(11)}>
              {tree.nowLabel}
            </Text>
          </View>
        ) : null}
        {row.hasChildren ? (
          <View className="ml-auto" style={{ transform: [{ rotate: open ? "0deg" : "-90deg" }] }}>
            <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
          </View>
        ) : null}
      </View>
      <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
        {row.holds}
      </Text>
      <Text className="font-num text-sm font-semibold text-foreground" style={nepaliTextStyle(13)}>
        {row.years}
        <Text className="font-normal text-muted-foreground">{` · ${row.rough}`}</Text>
      </Text>
      {row.split ? (
        <Text className="font-num text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
          {row.split}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(160)}
      exiting={reduced ? undefined : FadeOut.duration(120)}
      layout={reduced ? undefined : ROW_LAYOUT}
      style={{ flexDirection: "row", alignItems: "stretch" }}
    >
      {/* Rails of the levels above: each runs on while that level has children still to come. */}
      {row.ancestors.map((id, i) => {
        const nearest = i === row.ancestors.length - 1;
        return (
          <View key={id} style={{ width: STEP }}>
            {nearest ? (
              <>
                <View style={{ position: "absolute", left: 6, top: 0, width: 1, height: row.last ? 20 : "100%", backgroundColor: rail }} />
                <View style={{ position: "absolute", left: 6, top: 20, width: 8, height: 1, backgroundColor: rail }} />
              </>
            ) : row.rails[i] ? (
              <View style={{ position: "absolute", left: 6, top: 0, bottom: 0, width: 1, backgroundColor: colors.border }} />
            ) : null}
          </View>
        );
      })}
      <View className="min-w-0 flex-1 py-1">
        {row.hasChildren ? (
          <Pressable
            onPress={() => {
              haptics.tick();
              tree.toggle(row.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            pressRetentionOffset={16}
            className="rounded-lg active:opacity-80"
          >
            {body}
          </Pressable>
        ) : (
          body
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
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Text className="min-w-0 flex-1 text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
              {page.tree.hint}
            </Text>
            <Pressable onPress={page.tree.toggleAll} hitSlop={10} accessibilityRole="button">
              <Text className="text-sm font-semibold text-secondary" style={nepaliTextStyle(13)}>
                {page.tree.toggleAllLabel}
              </Text>
            </Pressable>
          </View>
          <View>
            {page.tree.rows.map((row) => (
              <TreeRow key={row.id} row={row} tree={page.tree} />
            ))}
          </View>
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
            columns={columnsOf(page.years.cols, [150, 190, 170])}
            rows={page.years.rows.map((r) => ({ key: r.key, cells: [cell(r.unit), cell(r.years), cell(r.rough)] }))}
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
