import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { usePathname } from "expo-router";
import { useNavPress } from "@/lib/use-nav-press";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale } from "@/lib/i18n";
import { FLOATING_NAV, isNavActive } from "@/lib/mobile-nav";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/design-tokens/cn";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { brand, nativeShadow } from "@vedic-patro/design-tokens";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";

export function FloatingNavBar() {
  const navPress = useNavPress();
  const pathname = usePathname();
  const { pick } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useBreakpoint();

  /* Web MobileBottomNav: size-5 icons, max-w-lg bar, px-2 gutter at every width. */
  const iconSize = 20;

  return (
    <View
      pointerEvents="box-none"
      style={{ paddingBottom: Math.max(insets.bottom, isTablet ? 10 : 6) }}
      className={cn("absolute bottom-0 left-0 right-0", shellClasses.navOuter)}
    >
      <View
        style={nativeShadow("lg")}
        className={cn("w-full flex-row self-center", shellClasses.navBar)}
      >
        {FLOATING_NAV.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Pressable
              key={item.href}
              onPress={() => navPress(item.href)}
              className={cn(
                "min-w-0 justify-center",
                shellClasses.navItem,
                active && shellClasses.navItemActive,
              )}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <AppNavIcon
                name={item.icon}
                size={iconSize}
                color={active ? colors.secondary : colors.mutedForeground}
              />
              <Text
                numberOfLines={1}
                className={cn(
                  "text-center",
                  shellClasses.navLabel,
                  active ? shellClasses.navLabelActive : shellClasses.navLabelIdle,
                )}
                style={nepaliTextStyle()}
              >
                {pick(item.ne, item.en)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
