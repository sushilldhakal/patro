import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import type { RashifalPeriod, RashifalSignBlock } from "@/lib/api";
import { useRashifalSignCard } from "@vedic-patro/features/rashifal";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { patroNavataraToneBg } from "@vedic-patro/design-tokens/classes/patro-classes";
import { RashifalComponents, RashifalDomains, RashifalLucky, RashifalMeter, RashifalWhyButton } from "@/components/rashifal/RashifalCardParts";

type Props = {
  sign: RashifalSignBlock;
  period: RashifalPeriod;
  /** Today's tara / its quality (daily and weekly only), as on the website. */
  taraLine?: string;
};

export function RashifalSignCard({ sign, period, taraLine }: Props) {
  const card = useRashifalSignCard({ sign, period });

  return (
    <View className={rashifalClasses.card}>
      <View className={cn("flex-row", rashifalClasses.header)}>
        <RashiGlyphIcon name={card.glyph.name} number={card.glyph.number} size={36} />
        <View className={rashifalClasses.headerBody}>
          <Text className={rashifalClasses.name} style={nepaliTextStyle()}>
            {card.name}
          </Text>
          <Text className={rashifalClasses.nameSub} style={nepaliTextStyle()}>
            {card.sub}
          </Text>
        </View>
        {taraLine && card.tone ? (
          <View className={cn(rashifalClasses.taraBadge, patroNavataraToneBg(card.tone))}>
            <Text className={rashifalClasses.taraBadgeText} style={nepaliTextStyle()}>
              {taraLine}
            </Text>
          </View>
        ) : null}
      </View>

      <RashifalMeter card={card} />
      {card.grade ? (
        <Text className={rashifalClasses.grade} style={nepaliTextStyle()}>
          {card.grade}
        </Text>
      ) : null}
      <RashifalDomains card={card} />
      <Text className={rashifalClasses.prediction} style={nepaliTextStyle()}>
        {card.prediction}
      </Text>
      <RashifalLucky card={card} cellClassName="w-[48%]" />
      <RashifalWhyButton card={card} />

      {card.open ? (
        <View className={rashifalClasses.details}>
          <RashifalComponents card={card} />
          {card.lordLine ? <Text className={rashifalClasses.lordLine}>{card.lordLine}</Text> : null}
          {card.windowDays ? <Text className={rashifalClasses.footNote}>{card.windowDays}</Text> : null}
          {card.remedy ? <Text className={rashifalClasses.remedy}>{card.remedy}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
