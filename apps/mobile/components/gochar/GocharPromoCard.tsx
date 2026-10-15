import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useGocharPromoCard } from "@vedic-patro/features/gochar";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useTheme, useThemeColors } from "@/lib/theme-context";
import { brand, neutral } from "@vedic-patro/design-tokens";

import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { cn } from "@vedic-patro/domain/utils";
/** Panchanga footer cross-link to the full Gochar page — web `GocharPromoCard`. */
export function GocharPromoCard() {
  const copy = useGocharPromoCard();
  const router = useRouter();
  const colors = useThemeColors();
  const { isDark } = useTheme();
  return (
    <Pressable
      onPress={() => router.push("/gochar" as never)}
      accessibilityRole="button"
      className={cn(gocharClasses.promoCard, "bg-card active:opacity-90 sm:flex-row sm:items-center sm:justify-between sm:gap-3")}
    >
      {/* flex-1 only side by side: in the stacked phone layout RN's flex-1 starts
          from zero height, collapsing the title and body under the button. */}
      <View className="min-w-0 flex-row items-start gap-3 sm:flex-1">
        <View className={gocharClasses.promoIcon}>
          <Ionicons name="planet-outline" size={24} color={colors.secondary} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className={gocharClasses.promoTitle} style={nepaliTextStyle()}>
            {copy.title}
          </Text>
          <Text className={gocharClasses.promoBody} style={nepaliTextStyle()}>
            {copy.body}
          </Text>
        </View>
      </View>
      <View className={cn(gocharClasses.promoCta, "mt-3 flex-row sm:mt-0")}>
        <Text className={gocharClasses.promoCtaText} style={nepaliTextStyle()}>
          {copy.cta}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={isDark ? brand.ink : neutral.white /* secondary-foreground */} />
      </View>
    </Pressable>
  );
}
