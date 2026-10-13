import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

import { neutral } from "@vedic-patro/design-tokens";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";
import { cn } from "@vedic-patro/domain/utils";
type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  titleNe: string;
  titleEn: string;
  bodyNe: string;
  bodyEn: string;
  onLogin: () => void;
  onSignup: () => void;
};

export function KundaliLoginPrompt({
  icon = "sparkles-outline",
  titleNe,
  titleEn,
  bodyNe,
  bodyEn,
  onLogin,
  onSignup,
}: Props) {
  const { pick, t } = useLocale();
  const colors = useThemeColors();

  return (
    <View className={cn(kundaliClasses.loginCard, "items-center")}>
      <View className={kundaliClasses.loginIcon}>
        <Ionicons name={icon} size={28} color={colors.secondary} />
      </View>
      <Text className={kundaliClasses.loginTitle} style={nepaliTextStyle(20)}>
        {pick(titleNe, titleEn)}
      </Text>
      <Text
        className={kundaliClasses.loginBody}
        style={nepaliTextStyle(14)}
      >
        {pick(bodyNe, bodyEn)}
      </Text>
      <View className={kundaliClasses.loginActions}>
        <Button
          label={t("kundali.login")}
          size="lg"
          onPress={onLogin}
          icon={<AppNavIcon name="log-in" size={16} color={neutral.white} />}
        />
        <Button
          label={t("kundali.signup")}
          size="lg"
          variant="outline"
          onPress={onSignup}
          icon={<AppNavIcon name="user-plus" size={16} color={colors.foreground} />}
        />
      </View>
    </View>
  );
}
