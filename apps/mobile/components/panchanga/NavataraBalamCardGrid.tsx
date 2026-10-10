import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { NakshatraGlyphIcon, RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import type { BalamCardItem } from "@/lib/balam-cards";
import { findCurrentBalamCard } from "@/lib/balam-cards";
import { formatNavataraQuality, formatNavataraTara } from "@/lib/navatara-bala";
import { PanchangaBalamCard, panchangaCardGrid } from "./PanchangaLayout";

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
  const current = findCurrentBalamCard(cards, clock);
  if (!cards.length) return null;

  return (
    <View className={panchangaCardGrid}>
      {cards.map((card) => {
        const subtitle = `${formatNavataraTara(card.tara, lang)}/${formatNavataraQuality(card.quality, lang)}`;
        const name = formatName(card);
        const titleLine = (
          <Text>
            {name}
            {card.timeRange ? (
              <Text className="font-mono font-semibold tabular-nums"> {card.timeRange}</Text>
            ) : null}
          </Text>
        );
        const icon =
          variant === "tarabala" ? (
            <NakshatraGlyphIcon name={card.name} number={card.number} size={24} />
          ) : (
            <RashiGlyphIcon name={card.name} number={card.number} size={24} />
          );
        return (
          <PanchangaBalamCard
            key={card.key}
            titleLine={titleLine}
            subtitleLine={subtitle}
            tone={card.tone}
            isCurrent={current?.key === card.key}
            icon={icon}
          />
        );
      })}
    </View>
  );
}
