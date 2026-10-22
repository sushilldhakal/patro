import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { __iconNode as ScanFaceNode } from "lucide-react/dist/esm/icons/scan-face";
import { __iconNode as FingerprintNode } from "lucide-react/dist/esm/icons/fingerprint";
import { __iconNode as CheckNode } from "lucide-react/dist/esm/icons/check";
import { LucideNative } from "@/components/icons/LucideNative";
import { Text } from "@/components/ui/Text";
import type { BiometricKind } from "@/lib/auth/biometrics";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

/** The phone sheet / tablet card's widest. */
const CARD_MAX_WIDTH = 420;

/**
 * "Use Face ID?" — offered once after signing in. A bottom sheet on a phone, a
 * centred card on a tablet: the Face ID glyph, what it does, one clear
 * "turn on" and a quiet "not now".
 */
export function BiometricOfferSheet({
  open,
  kind,
  label,
  onAccept,
  onDecline,
}: {
  open: boolean;
  kind: BiometricKind;
  label: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useBreakpoint();
  const glyph = kind === "fingerprint" ? FingerprintNode : ScanFaceNode;
  const points = [t("ui.auth.biometric_point_open", { label }), t("ui.auth.biometric_point_signin", { label }), t("ui.auth.biometric_point_private")];

  return (
    <Modal visible={open} transparent animationType={isTablet ? "fade" : "slide"} onRequestClose={onDecline} statusBarTranslucent>
      <View className={isTablet ? "flex-1 items-center justify-center bg-black/40 px-6" : "flex-1 justify-end bg-black/40"}>
        <Pressable className="absolute inset-0" onPress={onDecline} accessibilityLabel={t("ui.auth.not_now")} />
        <View
          accessibilityViewIsModal
          className={isTablet ? "w-full rounded-3xl bg-card px-8 pb-8 pt-10" : "w-full rounded-t-3xl bg-card px-6 pt-8"}
          style={{ maxWidth: isTablet ? CARD_MAX_WIDTH : undefined, paddingBottom: isTablet ? undefined : Math.max(insets.bottom, 16) + 8 }}
        >
          {isTablet ? null : <View className="mb-6 h-1 w-10 self-center rounded-full bg-border" />}

          <View className="size-20 items-center justify-center self-center rounded-3xl bg-secondary/10">
            <LucideNative node={glyph} size={44} color={colors.secondary} strokeWidth={1.5} />
          </View>

          <Text className="mt-6 text-center text-xl font-bold text-foreground" style={nepaliTextStyle()}>
            {t("ui.auth.biometric_title", { label })}
          </Text>
          <Text className="mt-2 text-center text-sm leading-relaxed text-muted-foreground" style={nepaliTextStyle()}>
            {t("ui.auth.biometric_body", { label })}
          </Text>

          <View className="mt-6 gap-3">
            {points.map((point) => (
              <View key={point} className="flex-row items-start gap-3">
                <View className="mt-0.5 size-5 items-center justify-center rounded-full bg-secondary/15">
                  <LucideNative node={CheckNode} size={12} color={colors.secondary} strokeWidth={2.5} />
                </View>
                <Text className="flex-1 text-sm leading-relaxed text-foreground" style={nepaliTextStyle()}>
                  {point}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={onAccept}
            accessibilityRole="button"
            className="mt-8 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-secondary active:opacity-85"
          >
            <LucideNative node={glyph} size={20} color={inkOn(colors.secondary)} />
            <Text className="text-base font-semibold text-secondary-foreground" style={nepaliTextStyle()}>
              {t("ui.auth.biometric_turn_on", { label })}
            </Text>
          </Pressable>
          <Pressable onPress={onDecline} accessibilityRole="button" className="mt-2 h-12 items-center justify-center active:opacity-60">
            <Text className="text-base font-medium text-muted-foreground" style={nepaliTextStyle()}>
              {t("ui.auth.not_now")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
