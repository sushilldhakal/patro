import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { haptics } from "@vedic-patro/ui/motion";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { AppShell } from "@/components/AppShell";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

type IconName = keyof typeof Ionicons.glyphMap;

/** A titled group of rows on one rounded card, like a section of iOS Settings. */
export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View className="gap-2">
      {title ? (
        <Text className={accountClasses.groupTitle} style={nepaliTextStyle(13)}>
          {title}
        </Text>
      ) : null}
      <View className={accountClasses.groupCard}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 ? <View className={accountClasses.groupDivider} /> : null}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

/** One row: a tinted icon, the title (and an optional line under it), then a value and a chevron or a trailing control. */
export function ListRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  trailing,
  tone,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  tone?: string;
}) {
  const colors = useThemeColors();
  const body = (
    <>
      <View className={accountClasses.rowIcon} style={{ backgroundColor: tone ?? colors.secondary }}>
        <Ionicons name={icon} size={17} color={colors.card} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className={accountClasses.rowTitle} numberOfLines={1} style={nepaliTextStyle(16)}>
          {title}
        </Text>
        {subtitle ? (
          <Text className={accountClasses.rowSubtitle} numberOfLines={1} style={nepaliTextStyle(13)}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text className={accountClasses.rowValue} numberOfLines={1} style={nepaliTextStyle(15)}>
          {value}
        </Text>
      ) : null}
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /> : null)}
    </>
  );
  if (!onPress) return <View className={accountClasses.row}>{body}</View>;
  return (
    <Pressable
      onPress={() => {
        haptics.tick();
        onPress();
      }}
      accessibilityRole="button"
      className={cn(accountClasses.row, "active:bg-muted")}
    >
      {body}
    </Pressable>
  );
}

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
