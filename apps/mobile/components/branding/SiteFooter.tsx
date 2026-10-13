import { Linking, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { LEGAL_CONTACT_EMAIL, LEGAL_SITE } from "@vedic-patro/domain/legal-copy";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
import { cn } from "@vedic-patro/domain/utils";

/** The links row that closes every page on web (`SiteFooter`): Privacy · Terms · Support · site. */
export function SiteFooter() {
  const { t } = useLocale();
  const router = useRouter();
  const link = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={6} className="active:opacity-70">
      <Text className={shellClasses.footerLink} style={nepaliTextStyle()}>
        {label}
      </Text>
    </Pressable>
  );
  return (
    <View className={shellClasses.footer}>
      <View className={cn("w-full flex-row flex-wrap", shellClasses.footerRow)}>
        {link(t("footer.privacy"), () => router.push("/privacy" as never))}
        {link(t("footer.terms"), () => router.push("/terms" as never))}
        {link(t("footer.support"), () => void Linking.openURL(`mailto:${LEGAL_CONTACT_EMAIL}`))}
        {link("vedicpatro.com", () => void Linking.openURL(LEGAL_SITE))}
      </View>
    </View>
  );
}
