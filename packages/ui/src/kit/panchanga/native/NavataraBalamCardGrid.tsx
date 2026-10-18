import type { ReactNode } from "react";
import { View } from "react-native";
import type { BalamCardItem } from "@vedic-patro/read-models/balam-cards";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useNavataraBalamCards } from "@vedic-patro/features/panchanga";
import { Box, Text } from "@vedic-patro/ui";
import {
  panchangaCardBase,
  panchangaCardGrid,
  panchangaCardSubtitle,
  panchangaCardTitle,
} from "@vedic-patro/design-tokens";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { patroNavataraToneBg } from "@vedic-patro/design-tokens/classes/patro-classes";
import { NakshatraGlyphIcon, RashiGlyphIcon } from "./ElementGlyphIcon";

export type NavataraBalamCardGridProps = {
  cards: BalamCardItem[];
  clock?: string;
  formatName: (card: BalamCardItem) => string;
  lang?: string;
  variant?: "chandrabala" | "tarabala";
};

function BalamCard({
  titleLine,
  subtitleLine,
  tone = "neutral",
  isCurrent,
  icon,
}: {
  titleLine: ReactNode;
  subtitleLine?: ReactNode;
  tone?: "best" | "good" | "neutral" | "bad" | "worst";
  isCurrent?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Box
      className={cn(
        panchangaCardBase,
        panchangaPageClasses.layout.balamCard,
        patroNavataraToneBg(tone),
        isCurrent && "shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_65%,transparent)] ring-2 ring-accent/80",
      )}
    >
      <Box className={cn("flex-row items-start gap-2", panchangaCardTitle)}>
        {icon ? <Box className="mt-0.5 shrink-0">{icon}</Box> : null}
        <Box className="min-w-0">{titleLine}</Box>
      </Box>
      {subtitleLine ? <Text className={panchangaCardSubtitle}>{subtitleLine}</Text> : null}
    </Box>
  );
}

export function NavataraBalamCardGrid({ cards, clock, formatName, lang, variant = "chandrabala" }: NavataraBalamCardGridProps) {
  const items = useNavataraBalamCards({ cards, clock, formatName, lang });
  if (!items.length) return null;
  return (
    <View className={panchangaCardGrid}>
      {items.map((card) => (
        <BalamCard
          key={card.key}
          titleLine={
            <Text className={panchangaCardTitle}>
              {card.name}
              {card.timeRange ? <Text className={panchangaPageClasses.sections.monoTabular}> {card.timeRange}</Text> : null}
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
