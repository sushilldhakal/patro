import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import type { RashifalPersonal } from "@/lib/api";
import { useRashifalPersonalCard } from "@vedic-patro/features/rashifal";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { RashifalComponents, RashifalDomains, RashifalLucky, RashifalMeter, RashifalWhyButton } from "@/components/rashifal/RashifalCardParts";

type Props = {
  name: string;
  personal: RashifalPersonal;
};

export function RashifalPersonalCard({ name, personal }: Props) {
  const colors = useThemeColors();
  const card = useRashifalPersonalCard({ personal });

  return (
    <View className={rashifalClasses.cardPersonal}>
      <View className={cn("flex-row", rashifalClasses.header)}>
        <RashiGlyphIcon name={card.glyph.name} number={card.glyph.number} size={36} />
        <View className={rashifalClasses.headerBody}>
          <Text className={rashifalClasses.name} style={nepaliTextStyle()}>
            {name}
          </Text>
          <Text className={rashifalClasses.nameSub} style={nepaliTextStyle()}>
            {card.sub}
          </Text>
        </View>
      </View>

      <RashifalMeter card={card} />

      {/* Running dasha — the layer only a birth chart can give. */}
      {card.dashaLine ? (
        <View className={cn("flex-row", rashifalClasses.dashaRow)}>
          <Ionicons name="time-outline" size={14} color={colors.secondary} />
          <Text numberOfLines={1} className={cn("flex-1", rashifalClasses.dashaText)} style={nepaliTextStyle()}>
            {card.dashaLine}
          </Text>
        </View>
      ) : null}

      <RashifalDomains card={card} />
      <Text className={rashifalClasses.prediction} style={nepaliTextStyle()}>
        {card.prediction}
      </Text>
      <RashifalLucky card={card} cellClassName="w-[48%] sm:w-[32%]" />
      <RashifalWhyButton card={card} />

      {card.open ? (
        <View className={rashifalClasses.details}>
          <RashifalComponents card={card} />
          {card.lordLine ? (
            <Text className={rashifalClasses.lordLine} style={nepaliTextStyle()}>
              {card.lordLine}
            </Text>
          ) : null}
          {card.dashaRange ? (
            <Text className={rashifalClasses.footNote} style={nepaliTextStyle()}>
              {card.dashaRange}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
