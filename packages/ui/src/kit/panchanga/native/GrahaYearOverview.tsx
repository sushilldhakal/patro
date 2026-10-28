import { View } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import type { YearOverview } from "@vedic-patro/features/graha";
import { Text } from "@vedic-patro/ui";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";

export type GrahaYearOverviewProps = { overview: YearOverview; tone: "asta" | "vakri" | "eclipse" };

const MARK: Record<GrahaYearOverviewProps["tone"], string> = { asta: "bg-warning", vakri: "bg-danger", eclipse: "bg-primary" };
const INK: Record<GrahaYearOverviewProps["tone"], string> = { asta: "text-warning", vakri: "text-danger", eclipse: "text-primary" };

/** A strip per graha across the year: its stretches marked, today a line through all of them. */
export function GrahaYearOverview({ overview, tone }: GrahaYearOverviewProps) {
  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <View className="mb-3 gap-1.5">
        <Text as="h2" className="text-base font-bold text-foreground">
          {overview.title}
        </Text>
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1.5">
            <View className={cn("h-2.5 w-4 rounded-sm", MARK[tone])} />
            <Text className="text-xs text-muted-foreground">{overview.legend}</Text>
          </View>
          {overview.today != null ? (
            <View className="flex-row items-center gap-1.5">
              <View className="h-3 w-0.5 rounded-full bg-foreground" />
              <Text className="text-xs text-muted-foreground">{overview.todayLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View className="gap-3">
        {overview.rows.map((row) => (
          <View key={row.graha} className="gap-1">
            <View className="flex-row items-center gap-2">
              <GrahaPlanetIcon graha={row.graha as GrahaKey} size={24} />
              <Text className="text-sm font-bold text-foreground">{row.name}</Text>
              <Text className={cn("flex-1 text-right text-xs", row.on ? cn("font-bold", INK[tone]) : "text-muted-foreground")}>{row.status}</Text>
            </View>
            <View className="relative h-3 overflow-hidden rounded-full bg-surface-inset">
              {row.segments.map((s, i) => (
                <View
                  key={i}
                  className={cn("absolute bottom-0 top-0 rounded-full", MARK[tone])}
                  style={{ left: `${s.from * 100}%`, width: `${Math.max(0.6, (s.to - s.from) * 100)}%` }}
                />
              ))}
              {overview.today != null ? (
                <View className="absolute bottom-0 top-0 w-0.5 bg-foreground" style={{ left: `${overview.today * 100}%` }} />
              ) : null}
            </View>
          </View>
        ))}
      </View>
      <View className="mt-2 flex-row">
        {overview.months.map((m, i) => (
          <Text key={m} numberOfLines={1} className={cn("flex-1 text-center text-diagram-2xs text-muted-foreground", i % 2 === 1 && "opacity-0")}>
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
}
