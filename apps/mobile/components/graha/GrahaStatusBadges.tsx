import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useGrahaStatusBadges } from "@vedic-patro/features/graha";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";

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
  const colors = useThemeColors();
  const { vakri, asta, any, labels } = useGrahaStatusBadges({ planetKey, isRetrograde, isCombust });
  if (!any) return null;

  return (
    <View className={cn("flex-row", grahaClasses.statusRow, className)}>
      {vakri ? (
        <Ionicons
          name="refresh"
          size={size}
          color={colors.secondary}
          accessibilityLabel={labels.retrograde}
        />
      ) : null}
      {asta ? (
        <Ionicons
          name="flame"
          size={size}
          color={colors.danger}
          accessibilityLabel={labels.combust}
        />
      ) : null}
    </View>
  );
}
