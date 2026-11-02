import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { cssInterop } from "nativewind";
import { Text } from "@/components/ui/Text";
import { usePathname } from "expo-router";
import { useNavPress } from "@/lib/use-nav-press";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale } from "@/lib/i18n";
import { FLOATING_NAV, isNavActive } from "@/lib/mobile-nav";
import { DUO_TOOLBAR_WIDTH, IS_IPHONE_DUO } from "@/lib/iphone-duo";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/design-tokens/cn";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { LinearGradient } from "expo-linear-gradient";
import { nativeShadow, withAlpha } from "@vedic-patro/design-tokens";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
import { CSS_EASE_OUT, DURATION, PRESS_SCALE, useReducedMotionPref } from "@vedic-patro/ui/motion";

/** Space below the status bar kept for the Duo toolbar pill before the rail starts. */
const DUO_RAIL_TOP = 120;

const ScalePressable = cssInterop(Animated.createAnimatedComponent(Pressable), { className: "style" });

export function FloatingNavBar() {
  const navPress = useNavPress();
  const pathname = usePathname();
  const { pick } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useBreakpoint();

  /* Web MobileBottomNav: size-5 icons, max-w-lg bar, px-2 gutter at every width. */
  const iconSize = 20;

  /* iPhone Duo: the column on the right (reserved in lib/iphone-duo.ts) holds the nav as a vertical
     rail below the system toolbar, instead of a bottom bar across the page. */
  if (IS_IPHONE_DUO) {
    return (
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: Math.max(insets.right, 4),
          top: insets.top + DUO_RAIL_TOP,
          bottom: Math.max(insets.bottom, 12),
          width: DUO_TOOLBAR_WIDTH - 8,
          justifyContent: "center",
        }}
      >
        <View style={nativeShadow("lg")} className={shellClasses.navRail}>
          {FLOATING_NAV.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <NavItem key={item.href} rail active={active} onPress={() => navPress(item.href)}>
                <AppNavIcon name={item.icon} size={iconSize} color={active ? colors.secondary : colors.mutedForeground} />
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
              </NavItem>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={{ paddingBottom: Math.max(insets.bottom, isTablet ? 10 : 6) }}
      className={cn("absolute bottom-0 left-0 right-0", shellClasses.navOuter)}
    >
      {/* No blur on native: fade the page out under the bar instead, so text
          never shows through the gap below it or around its corners. */}
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(colors.background, 0), colors.background]}
        locations={[0, 0.45]}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: -16 }}
      />
      <View
        style={nativeShadow("lg")}
        className={cn("w-full flex-row self-center bg-background", shellClasses.navBar)}
      >
        {FLOATING_NAV.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <NavItem
              key={item.href}
              active={active}
              onPress={() => navPress(item.href)}
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
            </NavItem>
          );
        })}
      </View>
    </View>
  );
}

/** Press scale only. Tabs are peers, so the active item never slides. */
function NavItem({ active, onPress, rail, children }: { active: boolean; onPress: () => void; rail?: boolean; children: ReactNode }) {
  const reduced = useReducedMotionPref();
  const [pressed, setPressed] = useState(false);
  return (
    <ScalePressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className={cn(
        "min-w-0 justify-center",
        shellClasses.navItem,
        rail && "flex-none self-stretch",
        active && shellClasses.navItemActive,
      )}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      pressRetentionOffset={16}
      style={{
        transform: [{ scale: !reduced && pressed ? PRESS_SCALE : 1 }],
        transitionProperty: "transform",
        transitionDuration: reduced ? 0 : DURATION.fast,
        transitionTimingFunction: CSS_EASE_OUT,
      }}
    >
      {children}
    </ScalePressable>
  );
}
