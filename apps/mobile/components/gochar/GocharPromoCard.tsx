import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

/** Panchanga footer cross-link to the full Gochar page — web `GocharPromoCard`. */
export function GocharPromoCard() {
  const { t, pick } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => router.push("/gochar" as never)}
      accessibilityRole="button"
      className="overflow-hidden rounded-2xl border border-border bg-card p-5 active:opacity-90"
    >
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-secondary/15">
          <Ionicons name="planet-outline" size={24} color={colors.secondary} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(16)}>
            {t("gochar.promo_title")}
          </Text>
          <Text className="text-body mt-1.5 leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick(
              "आजको पञ्चाङ्ग हेर्नुभयो? अब ग्रहहरू कहाँ गति गर्दैछन् र आजको गोचरले तपाईंको राशिमा कस्तो असर पार्छ हेर्नुहोस्।",
              "Seen the day's panchang? Now check where the planets are moving and how today's transits affect your sign.",
            )}
          </Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-center gap-1.5 self-start rounded-xl bg-secondary px-4 py-2">
        <Text className="text-body font-semibold text-secondary-foreground" style={nepaliTextStyle(14)}>
          {t("gochar.promo_cta")}
        </Text>
        <Ionicons name="arrow-forward" size={16} color="#ffffff" />
      </View>
    </Pressable>
  );
}
