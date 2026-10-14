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

type Props = {
  year: number;
  month: number;
  highlightDay?: number;
  location?: LocationParams;
};

function SaitDays({ days, none }: { days: SaitAsideDay[]; none: string }) {
  if (!days.length) {
    return <Text className={homeClasses.saitDaysNone}>{none}</Text>;
  }

  return (
    <Text className={homeClasses.saitDays}>
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
      <View className={homeClasses.saitList}>
        {sait.rows.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => router.push({ pathname: "/sait/[category]", params: { category: row.id } } as never)}
            accessibilityRole="link"
            className={cn(homeClasses.saitRow, "active:opacity-80")}
          >
            <Text className={homeClasses.saitName} style={nepaliTextStyle()}>
              {row.name}
            </Text>
            <View className="min-w-0 flex-1">
              <SaitDays days={row.days} none={sait.copy.none} />
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
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
