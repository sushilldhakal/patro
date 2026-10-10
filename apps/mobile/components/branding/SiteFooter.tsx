import { Linking, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { LEGAL_CONTACT_EMAIL, LEGAL_SITE } from "@vedic-patro/domain/legal-copy";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";

/** The links row that closes every page on web (`SiteFooter`): Privacy · Terms · Support · site. */
export function SiteFooter() {
  const { t } = useLocale();
  const router = useRouter();
  const link = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={6} className="active:opacity-70">
      <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
        {label}
      </Text>
    </Pressable>
  );
  return (
    <View className="mt-12 border-t border-border">
      <View className="flex-row flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-6">
        {link(t("footer.privacy"), () => router.push("/privacy" as never))}
        {link(t("footer.terms"), () => router.push("/terms" as never))}
        {link(t("footer.support"), () => void Linking.openURL(`mailto:${LEGAL_CONTACT_EMAIL}`))}
        {link("vedicpatro.com", () => void Linking.openURL(LEGAL_SITE))}
      </View>
    </View>
  );
}
