import type { ReactNode } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { withAlpha } from "@vedic-patro/design-tokens";
import { Icon } from "@vedic-patro/ui";
import { ACCOUNT_ICONS, ACCOUNT_TINTS, type AccountIconName, type AccountTint } from "@vedic-patro/ui/kit/account";
import { UiIcon } from "@vedic-patro/ui/kit/weather";
import { PressScale } from "@/components/weather/WeatherPlacesScreen";
import { AppShell } from "@/components/AppShell";
import { TopBarSlot } from "@/components/navigation/TopBarSlot";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";

export { ListGroup, ListRow } from "@vedic-patro/ui/kit/account";

/**
 * An inner page of the profile page. Its back arrow and title sit in the app's top bar, on the search
 * button's row (TopBarSlot), drawn like the Location screen's; a line under it opens the page.
 */
export function InnerPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <AppShell title={title} showHeader={false}>
      <TopBarSlot>
        <View className="h-full flex-row items-center gap-1">
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={t("ui.account.back")}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/account" as never))}
            hitSlop={8}
            className="-ml-2 size-11 items-center justify-center"
          >
            <UiIcon name="arrow-left" size={24} tone="foreground" />
          </PressScale>
          <Text className={accountClasses.barTitle} numberOfLines={1} accessibilityRole="header" style={nepaliTextStyle()}>
            {title}
          </Text>
        </View>
      </TopBarSlot>
      <View className={cn("w-full gap-5", accountClasses.column)}>
        {subtitle ? (
          <Text className={accountClasses.heroSubtitle} style={nepaliTextStyle(15)}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </View>
    </AppShell>
  );
}

/** The profile tab's own title, in the top bar's row (no back arrow: it is a tab). */
export function BarTitle({ title }: { title: string }) {
  return (
    <TopBarSlot>
      <View className="h-full justify-center">
        <Text className={accountClasses.barTitle} numberOfLines={1} accessibilityRole="header" style={nepaliTextStyle()}>
          {title}
        </Text>
      </View>
    </TopBarSlot>
  );
}

/** A section of an inner page: a tinted icon and title, a line under it, then the controls. */
export function SettingsCard({
  icon,
  tint = "teal",
  title,
  caption,
  children,
}: {
  icon: AccountIconName;
  tint?: AccountTint;
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  const color = ACCOUNT_TINTS[tint];
  return (
    <View className={accountClasses.sectionCard}>
      <View className="flex-row items-center gap-3">
        <View className={accountClasses.rowIcon} style={{ backgroundColor: withAlpha(color, 0.16) }}>
          <Icon node={ACCOUNT_ICONS[icon]} size={20} color={color} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-bold text-foreground" style={nepaliTextStyle(17)}>
            {title}
          </Text>
          {caption ? (
            <Text className="text-sm leading-snug text-muted-foreground" style={nepaliTextStyle(13)}>
              {caption}
            </Text>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
}
