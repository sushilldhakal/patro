import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { askForReviewIfDue, rateLater, rateNow } from "@/lib/review/review-prompt";
import { useThemeColors } from "@/lib/theme-context";

/** Seconds on Home before asking, so it never greets the user at launch. */
const DELAY_MS = 20_000;

/**
 * Asks for a store review once the app has earned it (see lib/review/review-prompt.ts). With the
 * system sheet available it only triggers that and draws nothing; otherwise, on Android, a quiet card
 * with "rate" and "later". Gone for good after "rate", for two months after "later".
 */
export function RateAppCard() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const [show, setShow] = useState(false);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void askForReviewIfDue().then((how) => {
        if (active && how === "card") setShow(true);
      });
    }, DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);
  if (!show) return null;
  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-start gap-3">
        <Ionicons name="star" size={20} color={colors.secondary} />
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle()}>
            {t("ui.review.title")}
          </Text>
          <Text className="text-xs text-muted-foreground" style={nepaliTextStyle()}>
            {t("ui.review.body")}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("ui.review.later")}
          hitSlop={10}
          onPress={() => {
            setShow(false);
            void rateLater();
          }}
        >
          <Ionicons name="close" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          className="rounded-full bg-primary px-4 py-2"
          onPress={() => {
            setShow(false);
            void rateNow();
          }}
        >
          <Text className="text-sm font-semibold text-primary-foreground" style={nepaliTextStyle()}>
            {t("ui.review.rate")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          className="rounded-full px-4 py-2"
          onPress={() => {
            setShow(false);
            void rateLater();
          }}
        >
          <Text className="text-sm text-muted-foreground" style={nepaliTextStyle()}>
            {t("ui.review.later")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
