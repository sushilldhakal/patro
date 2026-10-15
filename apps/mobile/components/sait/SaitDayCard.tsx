import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { SuitabilityBadge } from "@/components/sait/SaitSuitability";
import { Text } from "@/components/ui/Text";
import type { SaitDetailDay, SaitPersonalizeDay, SaitSuitability } from "@/lib/api";
import { useSaitDayCard } from "@vedic-patro/features/sait";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";

/**
 * One qualifying muhūrta day: the representative clean window plus the
 * panchāṅga that made the day survive the rules. When a profile is selected the
 * card also carries the native verdict and the reason behind it.
 */
export function SaitDayCard({
  d,
  width,
  suitability,
  personalize,
}: {
  d: SaitDetailDay;
  width: string;
  suitability?: SaitSuitability;
  personalize?: SaitPersonalizeDay;
}) {
  const colors = useThemeColors();
  const { width: screenWidth } = useBreakpoint();
  const card = useSaitDayCard({ d, personalize });

  return (
    <View style={{ width: width as never }} className={cn(saitClasses.card, suitability ? saitClasses.suitability[suitability].frame : null)}>
      {suitability ? (
        <View className={saitClasses.cardBadgeRow}>
          <SuitabilityBadge suitability={suitability} />
        </View>
      ) : null}

      <View className={saitClasses.cardHead}>
        <View className={saitClasses.dateBox}>
          <Text className={saitClasses.dateMonth} style={nepaliTextStyle()}>
            {card.month}
          </Text>
          <Text className={saitClasses.dateDay} style={nepaliTextStyle()}>
            {card.day}
          </Text>
        </View>

        <View className={saitClasses.headBody}>
          <View className={saitClasses.titleRow}>
            <Text className={saitClasses.weekday} style={nepaliTextStyle()}>
              {card.weekday}
            </Text>
            <Text className={saitClasses.gregorian}>{card.gregorian}</Text>
          </View>

          <View className={cn(saitClasses.windowChip, "self-start")}>
            <Ionicons name="time-outline" size={14} color={colors.secondary} style={{ opacity: 0.8 }} />
            <Text className={cn(saitClasses.windowText, saitClasses.windowTime)} style={nepaliTextStyle()}>
              {card.window}
            </Text>
            {screenWidth >= 640 ? (
              <Text className={saitClasses.windowNote} style={nepaliTextStyle()}>
                {card.windowNote}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View className={cn("flex-row flex-wrap", saitClasses.facts)}>
        {card.facts.map((r) => (
          <View key={r.label} style={{ width: screenWidth >= 640 ? "33.333%" : "50%" }} className={cn(saitClasses.factItem, "pb-2 pr-4")}>
            <Text className={saitClasses.factLabel} style={nepaliTextStyle()}>
              {r.label}
            </Text>
            <Text numberOfLines={1} className={saitClasses.factValue} style={nepaliTextStyle()}>
              {r.value}
            </Text>
          </View>
        ))}
      </View>

      {card.shuddhi ? (
        <View className={saitClasses.block}>
          <View className={saitClasses.blockRow}>
            <Text className={saitClasses.blockLabel} style={nepaliTextStyle()}>
              {card.shuddhi.label}
            </Text>
            {card.shuddhi.planets.map((p) => (
              <View key={p.key} className={cn(saitClasses.chip, saitClasses.chipGap, saitClasses.toneChip[p.tone])}>
                <Text style={nepaliTextStyle()} className={cn(saitClasses.chipText, saitClasses.toneChipText[p.tone])}>
                  {p.name}
                </Text>
                <Text className={cn(saitClasses.chipText, saitClasses.chipNum, saitClasses.toneChipText[p.tone])}>{p.house}</Text>
              </View>
            ))}
          </View>
          <Text style={nepaliTextStyle()} className={cn(saitClasses.summary, saitClasses.toneText[card.shuddhi.tone])}>
            {card.shuddhi.summary}
            <Text className={saitClasses.summaryNote}> {card.shuddhi.note}</Text>
          </Text>
        </View>
      ) : null}

      {card.kumbha ? (
        <View className={saitClasses.block}>
          <View className={saitClasses.blockRowLoose}>
            <View className={saitClasses.blockIconLabel}>
              <Ionicons name="compass-outline" size={13} color={colors.mutedForeground} />
              <Text className={saitClasses.blockLabel} style={nepaliTextStyle()}>
                {card.kumbha.label}
              </Text>
            </View>
            <View className={cn(saitClasses.chip, saitClasses.toneChip[card.kumbha.tone])}>
              <Text style={nepaliTextStyle()} className={cn(saitClasses.chipText, saitClasses.toneChipText[card.kumbha.tone])}>
                {card.kumbha.zone}
              </Text>
            </View>
          </View>
          <Text style={nepaliTextStyle()} className={cn(saitClasses.summary, saitClasses.toneText[card.kumbha.tone])}>
            {card.kumbha.effect}
            <Text className={saitClasses.summaryNote}> {card.kumbha.note}</Text>
          </Text>
        </View>
      ) : null}

      {card.anna ? (
        <View className={saitClasses.block}>
          <View className={saitClasses.blockRowLoose}>
            <View className={saitClasses.blockIconLabel}>
              <Ionicons name="happy-outline" size={13} color={colors.mutedForeground} />
              <Text className={saitClasses.blockLabel} style={nepaliTextStyle()}>
                {card.anna.label}
              </Text>
            </View>
            <View className={cn(saitClasses.chip, saitClasses.toneChip[card.anna.tone])}>
              <Text className={cn(saitClasses.chipText, saitClasses.chipNum, saitClasses.toneChipText[card.anna.tone])}>{card.anna.month}</Text>
            </View>
          </View>
          <Text style={nepaliTextStyle()} className={cn(saitClasses.summary, saitClasses.toneText[card.anna.tone])}>
            {card.anna.summary}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default SaitDayCard;
