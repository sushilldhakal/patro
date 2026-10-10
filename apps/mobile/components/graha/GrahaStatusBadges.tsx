import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocale } from "@/lib/i18n";
import { showAsta, showVakri } from "@/lib/graha-status";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

type Props = {
  planetKey?: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
  className?: string;
  size?: number;
};

/** वक्री / अस्त icon markers — same rules as web {@link GrahaStatusBadges}. */
export function GrahaStatusBadges({
  planetKey,
  isRetrograde,
  isCombust,
  className,
  size = 14,
}: Props) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const vakri = showVakri(planetKey, isRetrograde);
  const asta = showAsta(planetKey, isCombust);
  if (!vakri && !asta) return null;

  return (
    <View className={cn("flex-row items-center gap-1", className)}>
      {vakri ? (
        <Ionicons
          name="refresh"
          size={size}
          color={colors.secondary}
          accessibilityLabel={pick("वक्री", "Retrograde")}
        />
      ) : null}
      {asta ? (
        <Ionicons
          name="flame"
          size={size}
          color={colors.danger}
          accessibilityLabel={pick("अस्त", "Combust")}
        />
      ) : null}
    </View>
  );
}
