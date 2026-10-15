import { type ReactNode } from "react";
import { Pressable, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { Ionicons } from "@/components/icons/Ionicons";
import type { DainikDayRow, useDainikKrantiPage } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { DayPatroExpandPanel } from "@vedic-patro/ui/kit/panchanga";

type PageCopy = ReturnType<typeof useDainikKrantiPage>["copy"];

function CardField({
  label,
  value,
  sub,
  wide,
}: {
  label: string;
  value: ReactNode;
  sub?: string | null;
  /** Spans both columns (web `col-span-2`). */
  wide?: boolean;
}) {
  return (
    <View className={dainikKrantiClasses.field} style={{ width: wide ? "100%" : "48%" }}>
      <Text className={dainikKrantiClasses.fieldLabel} style={nepaliTextStyle()}>{label}</Text>
      <View>{typeof value === "string" ? <Text className={dainikKrantiClasses.fieldValue} style={nepaliTextStyle()}>{value}</Text> : value}</View>
      {sub ? <Text className={dainikKrantiClasses.fieldSub} style={nepaliTextStyle()}>{sub}</Text> : null}
    </View>
  );
}

/** One day of the dainik kranti month as a card (compact layouts). */
export function DayPatroCard({ row, copy }: { row: DainikDayRow; copy: PageCopy }) {
  const colors = useThemeColors();
  const dayColor = row.holiday ? "text-rose-600 dark:text-rose-400" : "text-foreground";

  return (
    <View
      className={cn(
        dainikKrantiClasses.dayCard,
        row.isToday
          ? dainikKrantiClasses.dayCardToday
          : row.hasFestival
            ? dainikKrantiClasses.dayCardFestival
            : dainikKrantiClasses.dayCardPlain,
      )}
    >
      <View className={dainikKrantiClasses.cardHead}>
        <View>
          <View className="flex-row items-baseline gap-1">
            <Text className={cn(dainikKrantiClasses.dayNumBs, dayColor)} style={nepaliTextStyle()}>
              {row.dayNumber}
            </Text>
            {row.adDay != null ? (
              <Text className={cn(dainikKrantiClasses.dayNumAdSmall, "leading-none")} style={nepaliTextStyle()}>
                {row.adDay}
              </Text>
            ) : null}
          </View>
          <Text
            className={cn(dainikKrantiClasses.weekday, "leading-tight", row.isSaturday && dainikKrantiClasses.saturday)}
            style={nepaliTextStyle()}
          >
            {row.weekday}
          </Text>
        </View>
        {row.isToday ? (
          <View className={dainikKrantiClasses.todayBadge}>
            <Text className={dainikKrantiClasses.todayBadgeText} style={nepaliTextStyle()}>
              {copy.today}
            </Text>
          </View>
        ) : null}
      </View>

      {row.festivals ? (
        <View className={cn(dainikKrantiClasses.festivalBox, "flex-row items-start gap-2")}>
          <View className={dainikKrantiClasses.festivalDot} />
          <Text numberOfLines={3} className={cn(dainikKrantiClasses.festivalText, "flex-1")} style={nepaliTextStyle()}>
            {row.festivals}
          </Text>
        </View>
      ) : null}

      <View className={cn(dainikKrantiClasses.fieldGrid, "flex-row flex-wrap")}>
        <CardField label={copy.tithi} value={row.tithi.value} sub={row.tithi.until} />
        <CardField label={copy.nakshatra} value={row.nakshatra.value} sub={row.nakshatra.until} />
        <CardField label={copy.yoga} value={row.yoga.value} sub={row.yoga.until} />
        <CardField label={copy.karana} value={row.karana.value} sub={row.karana.until} />
      </View>

      <View className={cn(dainikKrantiClasses.fieldGridMuted, "flex-row flex-wrap")}>
        <CardField
          wide
          label={copy.sunRiseSetSign}
          value={
            <View className={dainikKrantiClasses.field}>
              <Text className={cn(dainikKrantiClasses.sunRiseSetTimes, "font-num leading-snug")} style={nepaliTextStyle()}>
                {row.sun.times}
              </Text>
              <Text className={dainikKrantiClasses.subLine} style={nepaliTextStyle()}>
                {row.sun.sign}
              </Text>
            </View>
          }
        />
        <CardField label={copy.moonSign} value={row.moon.value} sub={row.moon.until} />
      </View>

      {row.transits.length > 0 ? (
        <View className={dainikKrantiClasses.transitsBlock}>
          <Text className={dainikKrantiClasses.fieldLabel} style={nepaliTextStyle()}>
            {copy.transits}
          </Text>
          <View className={cn(dainikKrantiClasses.transitsList, "gap-0.5")}>
            {row.transits.map((ev, i) => (
              <Text key={i} className={dainikKrantiClasses.transitRow} style={nepaliTextStyle()}>
                <Text className={cn(dainikKrantiClasses.cellText, dainikKrantiClasses.transitName)}>{ev.label} </Text>
                <Text className={cn(dainikKrantiClasses.cellText, dainikKrantiClasses.transitPlanet)}>{ev.planet}</Text>
                {ev.time ? <Text className={dainikKrantiClasses.cellText}> {ev.time}</Text> : null}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {row.hasExtra ? (
        <View className={dainikKrantiClasses.expandWrap}>
          <Pressable
            onPress={row.toggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: row.expanded }}
            className={cn(dainikKrantiClasses.expandBtn, "flex-row active:bg-muted/60")}
          >
            <Text className={dainikKrantiClasses.expandBtnText} style={nepaliTextStyle()}>
              {row.expanded ? copy.hideDetails : copy.showDetails}
            </Text>
            <Ionicons
              name={row.expanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.secondary}
            />
          </Pressable>
          {row.expanded ? (
            <View className={dainikKrantiClasses.expandBody}>
              <DayPatroExpandPanel lagna={row.lagna} graha={row.graha} notes={row.notes} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
