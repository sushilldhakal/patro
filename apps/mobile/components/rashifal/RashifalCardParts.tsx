import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import type { NavataraTone } from "@/lib/api";
import type { useRashifalSignCard } from "@vedic-patro/features/rashifal";
import { RASHIFAL_DOMAIN_ICON, RASHIFAL_LUCKY_ICON, rashifalToneBar, rashifalToneText } from "@/lib/rashifal-ui";
import { RashifalGocharChips } from "@/components/rashifal/RashifalGocharChips";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

type Card = Pick<
  ReturnType<typeof useRashifalSignCard>,
  "open" | "toggle" | "stars" | "tone" | "percent" | "percentLabel" | "domains" | "whyLabel" | "components" | "gochar" | "lucky"
>;

function StarMeter({ stars, tone }: { stars: number; tone?: NavataraTone }) {
  return (
    <View className={cn("flex-row", rashifalClasses.stars)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View key={n} className={cn(rashifalClasses.star, n <= stars ? rashifalToneBar(tone) : rashifalClasses.starOff)} />
      ))}
    </View>
  );
}

export function RashifalMeter({ card }: { card: Card }) {
  return (
    <View className={cn("flex-row", rashifalClasses.meter)}>
      <StarMeter stars={card.stars} tone={card.tone} />
      <View className={rashifalClasses.meterTrack}>
        <View className={cn(rashifalClasses.meterFill, rashifalToneBar(card.tone))} style={{ width: `${card.percent}%` }} />
      </View>
      <Text className={cn(rashifalClasses.percent, rashifalToneText(card.tone))} style={nepaliTextStyle()}>
        {card.percentLabel}%
      </Text>
    </View>
  );
}

export function RashifalDomains({ card }: { card: Card }) {
  const colors = useThemeColors();
  if (!card.domains.length) return null;
  return (
    <View className={cn("flex-row flex-wrap", rashifalClasses.domains)}>
      {card.domains.map((domain) => (
        <View key={domain.key} className={cn("mb-2 w-1/3 px-1", rashifalClasses.domain)}>
          <View className={cn("flex-row", rashifalClasses.domainHead)}>
            <Ionicons name={RASHIFAL_DOMAIN_ICON[domain.key]} size={14} color={colors.mutedForeground} />
            <Text className={cn("flex-1", rashifalClasses.domainLabel)} numberOfLines={1} style={nepaliTextStyle()}>
              {domain.label}
            </Text>
          </View>
          <View className={rashifalClasses.domainTrack}>
            <View className={cn(rashifalClasses.meterFill, rashifalToneBar(domain.tone))} style={{ width: `${domain.percent}%` }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function RashifalLucky({ card, cellClassName }: { card: Card; cellClassName: string }) {
  const colors = useThemeColors();
  return (
    <View className={cn("flex-row flex-wrap justify-between", rashifalClasses.lucky)}>
      {card.lucky.map(({ key, label, value }) => (
        <View key={key} accessibilityLabel={`${label}: ${value}`} className={cn(cellClassName, "flex-row", rashifalClasses.luckyCell)}>
          <Ionicons name={RASHIFAL_LUCKY_ICON[key]} size={14} color={colors.mutedForeground} />
          <Text className={cn("min-w-0 flex-1", rashifalClasses.luckyValue)} numberOfLines={1} style={nepaliTextStyle()}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function RashifalWhyButton({ card }: { card: Card }) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={card.toggle} className={cn("flex-row active:opacity-80", rashifalClasses.whyButton)}>
      <Text className={rashifalClasses.whyLabel} style={nepaliTextStyle()}>
        {card.whyLabel}
      </Text>
      <Ionicons name={card.open ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export function RashifalComponents({ card }: { card: Card }) {
  return (
    <>
      {card.components.length ? (
        <View className={rashifalClasses.componentList}>
          {card.components.map((c) => (
            <View key={c.key} className={cn("flex-row", rashifalClasses.componentRow)}>
              <Text className={rashifalClasses.componentLabel} style={nepaliTextStyle()}>
                {c.label}
              </Text>
              <Text className={rashifalClasses.componentNote} style={nepaliTextStyle()}>
                {c.note}
              </Text>
              <Text className={cn(rashifalClasses.componentValue, rashifalToneText(c.tone))} style={nepaliTextStyle()}>
                {c.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {card.gochar.length ? <RashifalGocharChips rows={card.gochar} /> : null}
    </>
  );
}
