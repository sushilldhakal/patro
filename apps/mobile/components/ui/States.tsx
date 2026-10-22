import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { cssInterop } from "nativewind";
import Animated, { FadeIn } from "react-native-reanimated";
import { DURATION, EASE_OUT } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { useNetworkStatus } from "@/lib/offline/network-status";
import { useThemeColors } from "@/lib/theme-context";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { useBreakpoint } from "@/lib/responsive";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";

const MotionView = cssInterop(Animated.View, { className: "style" });
/** An error that replaces the loader fades in over a standard step; it does not move. */
const FADE_IN = FadeIn.duration(DURATION.standard).easing(EASE_OUT);

/** Smallest height a loading block keeps, so it never collapses to nothing in a scroll view. */
const LOADING_MIN_HEIGHT = 200;
/** A section's loader: big enough to read as "loading" at a glance, larger again on a tablet. */
export const INLINE_LOADER_SIZE = 88;
export const INLINE_LOADER_SIZE_TABLET = 112;

/**
 * The page-level "loading" block: the animated Vedic Patro mark, centred. It
 * keeps a fixed minimum height, so the cards below sit where they will be once
 * the data arrives instead of sliding up under (or over) it.
 */
export function LoadingState({ label }: { label?: string | null }) {
  const { t } = useLocale();
  const { isTablet } = useBreakpoint();
  return (
    <View className="flex-1 items-center justify-center py-10" style={{ minHeight: LOADING_MIN_HEIGHT }}>
      <VedicPatroLoader label={label === undefined ? t("rashifal.profile.loading") : label} size={isTablet ? INLINE_LOADER_SIZE_TABLET : INLINE_LOADER_SIZE} />
    </View>
  );
}

/**
 * The page-level error box. Offline, it says so plainly — "no internet connection", and how to
 * get it back — instead of a bare "could not load", and it retries by itself the moment the
 * connection returns. A screen's own message (e.g. "this year is not downloaded") still shows
 * under the offline title.
 */
export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const { isOnline } = useNetworkStatus();

  /* Back online after being offline here: try again without waiting for a tap. */
  const wasOffline = useRef(false);
  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      onRetry?.();
    }
  }, [isOnline, onRetry]);

  if (!isOnline) {
    return (
      <MotionView entering={FADE_IN} className="items-center gap-2 rounded-xl border border-border bg-card px-4 py-6">
        <Ionicons name="cloud-offline-outline" size={32} color={colors.mutedForeground} />
        <Text className="text-body text-center font-bold text-foreground">{t("ui.common.no_internet_title")}</Text>
        <Text className="text-caption text-center text-muted-foreground">
          {message ?? t("ui.common.no_internet_body")}
        </Text>
        {onRetry ? (
          <Pressable onPress={onRetry} className="mt-2 rounded-lg bg-primary px-4 py-2">
            <Text className="text-body font-semibold text-primary-foreground">{t("ui.common.retry")}</Text>
          </Pressable>
        ) : null}
      </MotionView>
    );
  }

  return (
    <MotionView entering={FADE_IN} className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <Text className="text-body text-destructive">
        {message ?? t("ui.ui.could_not_load_data")}
      </Text>
      {onRetry ? (
        <Pressable onPress={onRetry} className="mt-3 self-start rounded-lg bg-primary px-4 py-2">
          <Text className="text-body font-semibold text-primary-foreground">
            {t("ui.common.retry")}
          </Text>
        </Pressable>
      ) : null}
    </MotionView>
  );
}
