import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { NakshatraGlyphIcon, RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import type { BalamCardItem } from "@vedic-patro/domain/balam-cards";
import { useNavataraBalamCards } from "@vedic-patro/features/panchanga";
import { PanchangaBalamCard, panchangaCardGrid } from "./PanchangaLayout";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

export function NavataraBalamCardGrid({
  cards,
  clock,
  formatName,
  lang,
  variant = "chandrabala",
}: {
  cards: BalamCardItem[];
  clock?: string;
  formatName: (card: BalamCardItem) => string;
  lang?: string;
  variant?: "chandrabala" | "tarabala";
}) {
  const items = useNavataraBalamCards({ cards, clock, formatName, lang });
  if (!items.length) return null;

  return (
    <View className={panchangaCardGrid}>
      {items.map((card) => (
        <PanchangaBalamCard
          key={card.key}
          titleLine={
            <Text>
              {card.name}
              {card.timeRange ? (
                <Text className={panchangaPageClasses.sections.monoTabular}> {card.timeRange}</Text>
              ) : null}
            </Text>
          }
          subtitleLine={card.subtitle}
          tone={card.tone}
          isCurrent={card.isCurrent}
          icon={
            variant === "tarabala" ? (
              <NakshatraGlyphIcon name={card.glyph.name} number={card.glyph.number} size={24} />
            ) : (
              <RashiGlyphIcon name={card.glyph.name} number={card.glyph.number} size={24} />
            )
          }
        />
      ))}
    </View>
  );
}
