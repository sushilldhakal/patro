import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space } from "@vedic-patro/design-tokens";
import { __iconNode as ChevronLeftNode } from "lucide-react/dist/esm/icons/chevron-left";
import { LucideNative } from "@/components/icons/LucideNative";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { useNavBottomPadding } from "@/lib/mobile-nav";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

/** How far (points) the large title scrolls before the bar's own title has fully faded in. */
const TITLE_FADE: [number, number] = [28, 64];

/**
 * A page with a large title that hands over to the bar as it scrolls away, as on iOS: back (and an
 * optional button) stay in a bar at the top; the title fades and rises into the bar while the large
 * one scrolls off, and the bar gains a hairline. The scroll keeps clear of the keyboard, so a search
 * on the page never hides its own results.
 */
export function LargeTitlePage({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navBottom = useNavBottomPadding(false);
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.set(e.contentOffset.y);
  });
  const barTitle = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), TITLE_FADE, [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(y.get(), TITLE_FADE, [8, 0], Extrapolation.CLAMP) }],
  }));
  const hairline = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), TITLE_FADE, [0, 1], Extrapolation.CLAMP),
  }));
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const ne = nepaliTextStyle();

  return (
    <View className="flex-1 bg-background">
      <View className="bg-background px-4 pb-2" style={{ paddingTop: insets.top + 4 }}>
        <View className="min-h-11 flex-row items-center justify-center">
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel={t("market.back")}
            hitSlop={10}
            className="absolute left-0 size-11 items-center justify-center rounded-full border border-border bg-card active:opacity-70"
          >
            <LucideNative node={ChevronLeftNode} size={26} color={colors.foreground} strokeWidth={2.2} />
          </Pressable>
          <Animated.View style={barTitle} pointerEvents="none">
            <Text className="px-14 text-center text-lg font-bold text-foreground" style={ne} numberOfLines={1}>
              {title}
            </Text>
          </Animated.View>
          {right ? <View className="absolute right-0">{right}</View> : null}
        </View>
        <Animated.View className="absolute inset-x-0 bottom-0 h-px bg-border" style={hairline} />
      </View>
      {/* iOS insets the scroll by itself (automaticallyAdjustKeyboardInsets); Android, drawn edge to
          edge, never resizes the window, so the scroll is shortened by the keyboard's height here. */}
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "android" ? "height" : undefined}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: navBottom + space["2xl"], gap: space.lg }}
      >
        <View className="gap-1">
          <Text className="text-4xl font-extrabold text-foreground" style={ne}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-sm leading-relaxed text-muted-foreground" style={ne}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
