import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { nepaliTextStyle } from "@/lib/nepali-text";
import type { LocationParams } from "@/lib/api";
import { useSaitAside, type SaitAsideDay } from "@vedic-patro/features/home";
import { useThemeColors } from "@/lib/theme-context";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { cn } from "@vedic-patro/domain/utils";
import { fillGridCell, fillGridColumns } from "@/lib/fill-grid";

const SAIT_GAP = 8;
const SAIT_MIN_CARD = 132;
/* Bordered card on the inset surface, like the पञ्चाङ्ग tab tiles. */
const SAIT_CARD = "gap-1 rounded-lg border border-gold/25 bg-surface-inset px-2.5 py-2";

type Props = {
  year: number;
  month: number;
  highlightDay?: number;
  location?: LocationParams;
};

function SaitDays({ days, none }: { days: SaitAsideDay[]; none: string }) {
  if (!days.length) {
    return <Text className={cn(homeClasses.saitDaysNone, "text-left")}>{none}</Text>;
  }

  return (
    <Text className={cn(homeClasses.saitDays, "text-left")}>
      {days.map((d, i) => (
        <Text key={`${d.day}-${i}`} className={d.highlighted ? homeClasses.saitHighlight : undefined}>
          {i > 0 ? ", " : ""}
          {d.label}
        </Text>
      ))}
    </Text>
  );
}

export function SaitAsidePanel({ year, month, highlightDay, location }: Props) {
  const colors = useThemeColors();
  const router = useRouter();
  const sait = useSaitAside({ year, month, highlightDay, location });
  const [rowWidth, setRowWidth] = useState(0);
  const cell = fillGridCell(rowWidth, fillGridColumns(rowWidth, SAIT_MIN_CARD, SAIT_GAP), SAIT_GAP);

  if (sait.status === "loading") {
    return <View className={homeClasses.saitSkeleton} />;
  }

  if (sait.status === "error") {
    return (
      <View className="gap-2 py-4">
        <Text className="text-body text-center text-muted-foreground">{sait.copy.error}</Text>
        <Pressable onPress={sait.retry} className="self-center rounded-md bg-secondary px-3 py-1.5">
          <Text className="text-body font-semibold text-secondary-foreground">{sait.copy.retry}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className={homeClasses.saitStack}>
      <Text className={homeClasses.saitMonth}>{sait.monthName}</Text>
      {/* At least two cards per row, more when they fit; rows always filled. */}
      <View
        className="flex-row flex-wrap"
        style={{ gap: SAIT_GAP }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setRowWidth((prev) => (prev === w ? prev : w));
        }}
      >
        {sait.rows.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => router.push({ pathname: "/sait/[category]", params: { category: row.id } } as never)}
            accessibilityRole="link"
            className={cn(SAIT_CARD, "active:opacity-80")}
            style={cell}
          >
            <View className="flex-row items-center gap-1">
              <Text className={cn("min-w-0 flex-1", homeClasses.saitName)} style={nepaliTextStyle()}>
                {row.name}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
            </View>
            <SaitDays days={row.days} none={sait.copy.none} />
          </Pressable>
        ))}
      </View>
      {sait.empty ? (
        <Text className={homeClasses.saitEmpty} style={nepaliTextStyle()}>
          {sait.empty}
        </Text>
      ) : null}
    </View>
  );
}
