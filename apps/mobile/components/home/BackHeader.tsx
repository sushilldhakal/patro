import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { __iconNode as ChevronLeftNode } from "lucide-react/dist/esm/icons/chevron-left";
import { LucideNative } from "@/components/icons/LucideNative";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

/**
 * A page's top bar outside the scroll: back on the left (home when there is nothing to go back
 * to), the title centred, an optional line under it. Sits under the status bar, so nothing
 * scrolls behind it.
 */
export function BackHeader({
  title,
  subtitle,
  center,
}: {
  title: string;
  subtitle?: string;
  /** Drawn in the title's place (a page's date picker); the title stays the back button's label context. */
  center?: ReactNode;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  return (
    <View
      className="bg-background px-4 pb-2"
      style={{ paddingTop: insets.top + 4 }}
    >
      <View className="min-h-11 flex-row items-center justify-center">
        <Pressable
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel={t("market.back")}
          hitSlop={10}
          className="absolute left-0 size-11 items-center justify-center rounded-full border border-border bg-card active:opacity-70"
        >
          <LucideNative
            node={ChevronLeftNode}
            size={26}
            color={colors.foreground}
            strokeWidth={2.2}
          />
        </Pressable>
        {center ?? (
          <Text
            className="px-14 text-center text-xl font-bold text-foreground"
            style={nepaliTextStyle()}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
      </View>
      {subtitle ? (
        <Text
          className="mt-1 text-center text-sm text-muted-foreground"
          style={nepaliTextStyle()}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
