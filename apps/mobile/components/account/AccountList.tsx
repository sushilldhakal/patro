import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { AppShell } from "@/components/AppShell";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

export { ListGroup, ListRow } from "@vedic-patro/ui/kit/account";

/** An inner page of the profile page: a back row with its title, then its content. */
export function InnerPage({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <AppShell title={title} showHeader={false}>
      <View className={cn("w-full gap-5", accountClasses.column)}>
        <View className="gap-1">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/account" as never))}
            accessibilityRole="button"
            accessibilityLabel={t("ui.account.back")}
            hitSlop={8}
            className={accountClasses.innerBackLink}
          >
            <Ionicons name="chevron-back" size={20} color={colors.secondary} />
            <Text className="text-body text-secondary" style={nepaliTextStyle(15)}>
              {t("ui.nav.profile")}
            </Text>
          </Pressable>
          <Text className={accountClasses.title} style={nepaliTextStyle()}>
            {title}
          </Text>
        </View>
        {children}
      </View>
    </AppShell>
  );
}
