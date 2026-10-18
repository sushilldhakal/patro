import { View, useWindowDimensions } from "react-native";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useGocharSkyCards } from "@vedic-patro/features/gochar";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import { breakpoints, illustration } from "@vedic-patro/design-tokens";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";
import { GrahaStatusBadges } from "./GrahaStatusBadges";

/** Left stripe colour per graha — the same palette as the website stripe classes. */
const PLANET_STRIPE: Record<GrahaKey, string> = {
  sun: illustration.orange50,
  moon: illustration.sky65,
  mars: illustration.red60,
  mercury: illustration.teal39,
  jupiter: illustration.orange53c,
  venus: illustration.teal48,
  saturn: illustration.blue67,
  rahu: illustration.violet66,
  ketu: illustration.red50,
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Text className={gocharClasses.metaRow}>
      <Text className={gocharClasses.metaLabel}>{label}</Text> <Text className={gocharClasses.metaValue}>{value}</Text>
    </Text>
  );
}

export function GocharSkySection({
  gochar,
  dateLabel,
  onSelectPlanet,
  selectedPlanet,
}: {
  gochar: Parameters<typeof useGocharSkyCards>[0];
  dateLabel: string;
  onSelectPlanet?: (key: GrahaKey) => void;
  selectedPlanet?: GrahaKey | null;
}) {
  const { cards, copy } = useGocharSkyCards(gochar);
  const { width } = useWindowDimensions();
  const cols = width >= breakpoints.lg ? 3 : width >= breakpoints.sm ? 2 : 1;
  const cardWidth = cols === 1 ? "100%" : `${(100 / cols - 1.5).toFixed(2)}%`;

  return (
    <Box className={cn(gocharClasses.skyCard, "border border-border")}>
      <Box className={gocharClasses.skyHead}>
        <Text className={gocharClasses.skyEyebrow}>{copy.eyebrow}</Text>
        <Text className={gocharClasses.skyTitle}>{copy.title}</Text>
        <Text className={gocharClasses.skyDate}>{dateLabel}</Text>
      </Box>

      <Box className={cn("flex-row flex-wrap", gocharClasses.skyGrid)}>
        {cards.map((card) => {
          const key = card.key;
          const selected = selectedPlanet === key;
          return (
            <View key={key} style={{ width: cardWidth as never }}>
              <Pressable
                onPress={() => onSelectPlanet?.(key)}
                selected={selectedPlanet != null ? selected : undefined}
                className={cn(
                  gocharClasses.planetCard,
                  "active:opacity-90",
                  selected ? "border-2 border-secondary" : "border border-border",
                )}
              >
                <View style={{ backgroundColor: PLANET_STRIPE[key] }} className={gocharClasses.planetStripe} />
                <Box className={cn("flex-row", gocharClasses.planetHead)}>
                  <GrahaPlanetIcon graha={key} size={32} />
                  <Box className={cn("min-w-0 flex-1 flex-row", gocharClasses.planetTitleWrap)}>
                    <Text className={cn("font-num", gocharClasses.planetTitle)}>{card.name}</Text>
                    <Text className={cn("font-num", gocharClasses.planetTitle)}>{card.rashi}</Text>
                    <Text className={cn("font-num", gocharClasses.planetTitle)}>{card.deg}</Text>
                    <GrahaStatusBadges planetKey={key} isRetrograde={card.isRetrograde} isCombust={card.isCombust} size={13} />
                  </Box>
                  {card.exalted ? (
                    <Box className={gocharClasses.exaltedBadge}>
                      <Text className={gocharClasses.exaltedBadgeText}>{copy.exalted}</Text>
                    </Box>
                  ) : null}
                </Box>
                <Box className={gocharClasses.planetBody}>
                  <MetaRow label={copy.nakshatra} value={card.nakshatra} />
                  <MetaRow label={copy.motion} value={card.motion} />
                </Box>
                {card.footer ? (
                  <Box className={gocharClasses.planetFooter}>
                    <Text className={gocharClasses.planetFooterText}>{card.footer}</Text>
                  </Box>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </Box>
    </Box>
  );
}
