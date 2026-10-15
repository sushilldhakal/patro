import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { Text } from "@/components/ui/Text";
import type { GocharGraha } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useGocharSkyCards } from "@vedic-patro/features/gochar";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";

import { illustration } from "@vedic-patro/design-tokens";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { cn } from "@vedic-patro/domain/utils";
/** Left stripe colour per graha — matches the web PLANET_STRIPE palette. */
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
    <Text className={gocharClasses.metaRow} style={nepaliTextStyle()}>
      <Text className={gocharClasses.metaLabel}>{label}</Text>{" "}
      <Text className={gocharClasses.metaValue}>{value}</Text>
    </Text>
  );
}

export function GocharSkySection({
  gochar,
  dateLabel,
  onSelectPlanet,
}: {
  gochar: Record<string, GocharGraha>;
  dateLabel: string;
  onSelectPlanet?: (key: GrahaKey) => void;
}) {
  const { cards, copy } = useGocharSkyCards(gochar);
  const { width } = useBreakpoint();
  const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const cardWidth = cols === 1 ? "100%" : `${(100 / cols - 1.5).toFixed(2)}%`;

  return (
    <View className={cn(gocharClasses.skyCard, "border border-border")}>
      <View className={gocharClasses.skyHead}>
        <Text className={gocharClasses.skyEyebrow} style={nepaliTextStyle()}>
          {copy.eyebrow}
        </Text>
        <Text className={gocharClasses.skyTitle} style={nepaliTextStyle()}>
          {copy.title}
        </Text>
        <Text className={gocharClasses.skyDate} style={nepaliTextStyle()}>
          {dateLabel}
        </Text>
      </View>

      <View className={cn("flex-row flex-wrap", gocharClasses.skyGrid)}>
        {cards.map((card) => {
          const key = card.key;
          return (
            <Pressable
              key={key}
              onPress={() => onSelectPlanet?.(key)}
              style={{ width: cardWidth as never }}
              className={cn(gocharClasses.planetCard, "border border-border active:opacity-90")}
            >
              <View
                style={{ backgroundColor: PLANET_STRIPE[key] }}
                className={gocharClasses.planetStripe}
              />

              <View className={cn("flex-row", gocharClasses.planetHead)}>
                <GrahaPlanetIcon graha={key} size={32} />
                <View className={cn("min-w-0 flex-1 flex-row", gocharClasses.planetTitleWrap)}>
                  <Text className={cn("font-num", gocharClasses.planetTitle)} style={nepaliTextStyle()}>
                    {card.name}
                  </Text>
                  <Text className={cn("font-num", gocharClasses.planetTitle)} style={nepaliTextStyle()}>
                    {card.rashi}
                  </Text>
                  <Text className={cn("font-num", gocharClasses.planetTitle)} style={nepaliTextStyle()}>{card.deg}</Text>
                  <GrahaStatusBadges
                    planetKey={key}
                    isRetrograde={card.isRetrograde}
                    isCombust={card.isCombust}
                    size={13}
                  />
                </View>
                {card.exalted ? (
                  <View className={gocharClasses.exaltedBadge}>
                    <Text
                      className={gocharClasses.exaltedBadgeText}
                      style={nepaliTextStyle()}
                    >
                      {copy.exalted}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className={gocharClasses.planetBody}>
                <MetaRow label={copy.nakshatra} value={card.nakshatra} />
                <MetaRow label={copy.motion} value={card.motion} />
              </View>

              {card.footer ? (
                <View className={gocharClasses.planetFooter}>
                  <Text className={gocharClasses.planetFooterText} style={nepaliTextStyle()}>
                    {card.footer}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function GocharSectionIcon() {
  const colors = useThemeColors();
  return <Ionicons name="planet-outline" size={26} color={colors.secondary} />;
}
