import { Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { LearnMoreCard } from "@/components/learn/LearnMoreCard";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { colorWithAlpha, inkOn } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { haptics, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useBrahmaManaPage, type BrahmaManaPage } from "@vedic-patro/features/brahma-mana";

type Ladder = BrahmaManaPage["ladder"];

/** A small red italic label where a new measure (māna) begins. */
function Mana({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <Text className="text-xs italic text-danger" style={nepaliTextStyle(12)}>
      {`${text}:`}
    </Text>
  );
}

/** The way down from Brahmā's life to the level in view: one rail, no indentation. */
function Trail({ ladder, onFocus }: { ladder: Ladder; onFocus: (key: string) => void }) {
  if (!ladder.trail.length) return null;
  return (
    <View>
      {ladder.trail.map((step) => (
        <Pressable key={step.key} onPress={() => onFocus(step.key)} accessibilityRole="button" className="flex-row gap-3 active:opacity-70">
          <View className="w-3 items-center">
            <View className={cn("w-px flex-1", step.current ? "bg-secondary" : "bg-border")} />
            <View className={cn("size-2.5 rounded-full", step.current ? "bg-secondary" : "border border-border bg-card")} />
            <View className={cn("w-px flex-1", step.current ? "bg-secondary" : "bg-border")} />
          </View>
          <View className="min-w-0 flex-1 py-1">
            <Mana text={step.mana} />
            <Text className="leading-snug" style={nepaliTextStyle(14)}>
              <Text className={cn("font-semibold", step.current ? "text-secondary" : "text-foreground")}>{step.name}</Text>
              <Text className="font-num text-xs text-muted-foreground">{`  ${step.divya}`}</Text>
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/** The parts of the level in view, drawn to scale: Kṛta 4, Tretā 3, Dvāpara 2, Kali 1. */
function ProportionBar({ parts }: { parts: Ladder["parts"] }) {
  const { colors } = useTheme();
  if (parts.length < 2) return null;
  return (
    <View className="h-3 flex-row gap-px overflow-hidden rounded-full" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {parts.map((p) => (
        <View
          key={p.key}
          style={{
            flexGrow: p.share,
            flexBasis: 0,
            minWidth: 2,
            backgroundColor: p.current ? colors.secondary : p.pause ? colors.muted : colorWithAlpha(colors.secondary, 0.28),
          }}
        />
      ))}
    </View>
  );
}

function PartRow({ part, nowLabel, onFocus }: { part: Ladder["parts"][number]; nowLabel: string; onFocus: (key: string) => void }) {
  const { colors } = useTheme();
  const tint = colorWithAlpha(colors.secondary, 0.1);
  const body = (
    <View
      className={cn(
        "flex-row items-center gap-3 rounded-xl px-3 py-2.5",
        part.current ? "border-2 border-secondary" : part.pause ? "border border-dashed border-border" : "border border-border bg-card",
      )}
      style={part.current ? { backgroundColor: tint } : part.pause ? { backgroundColor: colorWithAlpha(colors.muted, 0.5) } : undefined}
    >
      <View className="min-w-0 flex-1">
        <Text
          className={cn("font-semibold", part.current ? "text-secondary" : part.pause ? "italic text-muted-foreground" : "text-foreground")}
          style={nepaliTextStyle(15)}
        >
          {part.name}
        </Text>
        <Text className="font-num text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
          {part.divya}
        </Text>
        <Text className="font-num text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
          {part.solar}
        </Text>
      </View>
      {part.current ? (
        <View className="rounded-full bg-secondary px-2 py-0.5">
          <Text className="text-xs font-bold" style={[nepaliTextStyle(11), { color: inkOn(colors.secondary) }]}>
            {nowLabel}
          </Text>
        </View>
      ) : null}
      {part.hasChildren ? <Ionicons name="chevron-forward" size={18} color={part.current ? colors.secondary : colors.mutedForeground} /> : null}
    </View>
  );
  return (
    <View className="gap-1">
      <Mana text={part.mana} />
      {part.hasChildren ? (
        <Pressable onPress={() => onFocus(part.key)} accessibilityRole="button" pressRetentionOffset={16} className="active:opacity-70">
          {body}
        </Pressable>
      ) : (
        body
      )}
    </View>
  );
}

/** One level of Brahmā's time at a time: the way down, the level itself, and what it is made of. */
function LadderCard({ page }: { page: BrahmaManaPage }) {
  const { colors } = useTheme();
  const reduced = useReducedMotionPref();
  const ladder = page.ladder;
  const focus = (key: string) => {
    haptics.tick();
    ladder.focusOn(key);
  };
  const enter = reduced ? undefined : FadeIn.duration(180);

  return (
    <Card className="gap-3 p-4">
      <Text className="text-lg font-bold text-foreground" style={nepaliTextStyle(17)}>
        {page.tree.title}
      </Text>
      <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
        {ladder.hint}
      </Text>
      <Text className="font-num text-sm font-semibold text-foreground" style={nepaliTextStyle(13)}>
        {page.tree.unit}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {ladder.up ? (
          <Pressable
            onPress={() => {
              haptics.tick();
              ladder.up?.();
            }}
            accessibilityRole="button"
            className="flex-row items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 active:opacity-70"
          >
            <Ionicons name="arrow-up" size={14} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(13)}>
              {ladder.upLabel}
            </Text>
          </Pressable>
        ) : null}
        {ladder.atNow ? null : (
          <Pressable
            onPress={() => {
              haptics.tick();
              ladder.toNow();
            }}
            accessibilityRole="button"
            className="flex-row items-center gap-1 rounded-full bg-secondary px-3 py-1.5 active:opacity-70"
          >
            <Ionicons name="locate-outline" size={14} color={inkOn(colors.secondary)} />
            <Text className="text-sm font-semibold" style={[nepaliTextStyle(13), { color: inkOn(colors.secondary) }]}>
              {ladder.toNowLabel}
            </Text>
          </Pressable>
        )}
      </View>

      <Trail ladder={ladder} onFocus={focus} />

      <Animated.View key={ladder.focus.key} entering={enter} className="gap-3">
        <View
          className={cn("gap-1 rounded-2xl p-4", ladder.focus.current ? "border-2 border-secondary" : "border border-border")}
          style={{
            backgroundColor: ladder.focus.current ? colorWithAlpha(colors.secondary, 0.1) : colorWithAlpha(colors.muted, 0.5),
          }}
        >
          <Mana text={ladder.focus.mana} />
          <View className="flex-row items-start gap-2">
            <Text
              className={cn("min-w-0 flex-1 text-xl font-bold", ladder.focus.current ? "text-secondary" : "text-foreground")}
              style={nepaliTextStyle(20)}
            >
              {ladder.focus.name}
            </Text>
            {ladder.focus.current ? (
              <View className="mt-1 rounded-full bg-secondary px-2 py-0.5">
                <Text className="text-xs font-bold" style={[nepaliTextStyle(11), { color: inkOn(colors.secondary) }]}>
                  {ladder.nowLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="font-num text-base font-semibold text-foreground" style={nepaliTextStyle(15)}>
            {ladder.focus.divya}
          </Text>
          <Text className="font-num text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
            {ladder.focus.solar}
          </Text>
        </View>

        {ladder.parts.length ? (
          <>
            <Text className="text-sm font-semibold text-muted-foreground" style={nepaliTextStyle(13)}>
              {ladder.partsLabel}
            </Text>
            <ProportionBar parts={ladder.parts} />
            <View className="gap-2">
              {ladder.parts.map((part) => (
                <PartRow key={part.key} part={part} nowLabel={ladder.nowLabel} onFocus={focus} />
              ))}
            </View>
          </>
        ) : (
          <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
            {ladder.endLabel}
          </Text>
        )}
      </Animated.View>
    </Card>
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
  return labels.map((label, i) => ({
    key: String(i),
    ne: label,
    en: label,
    width: widths[i] ?? 100,
  }));
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
        <LadderCard page={page} />

        <SectionCard title={page.now.title}>
          {page.now.lines.map((line, i) => (
            <View key={line} className="flex-row items-start gap-2">
              <View
                className="mt-1.5 size-2 rounded-full bg-secondary"
                style={{
                  opacity: 0.45 + (0.55 * (i + 1)) / page.now.lines.length,
                }}
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
            rows={page.years.rows.map((r) => ({
              key: r.key,
              cells: [cell(r.unit), cell(r.divya), cell(r.years), cell(r.rough)],
            }))}
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
