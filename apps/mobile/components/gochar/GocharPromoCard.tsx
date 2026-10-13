import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

import { neutral } from "@vedic-patro/design-tokens";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { cn } from "@vedic-patro/domain/utils";
/** Panchanga footer cross-link to the full Gochar page — web `GocharPromoCard`. */
export function GocharPromoCard() {
  const { t } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => router.push("/gochar" as never)}
      accessibilityRole="button"
      className={cn(gocharClasses.promoCard, "bg-card active:opacity-90 sm:flex-row sm:items-center sm:justify-between sm:gap-3")}
    >
      <View className="min-w-0 flex-1 flex-row items-start gap-3">
        <View className={gocharClasses.promoIcon}>
          <Ionicons name="planet-outline" size={24} color={colors.secondary} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className={gocharClasses.promoTitle} style={nepaliTextStyle()}>
            {t("gochar.promo_title")}
          </Text>
          <Text className={gocharClasses.promoBody} style={nepaliTextStyle()}>
            {t("ui.gochar.seen_the_day_s_panchang_now")}
          </Text>
        </View>
      </View>
      <View className={cn(gocharClasses.promoCta, "mt-3 flex-row sm:mt-0")}>
        <Text className={gocharClasses.promoCtaText} style={nepaliTextStyle()}>
          {t("gochar.promo_cta")}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={neutral.white} />
      </View>
    </Pressable>
  );
}
