import { useEffect, useRef, useState, type ComponentRef, type RefObject } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@vedic-patro/design-tokens/cn";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { useThemeColors } from "@/lib/theme-context";
import { useLocale } from "@/lib/i18n";
import { useTabsStuck } from "@/lib/home-sticky";
import { Text } from "@/components/ui/Text";

/** The home aside's three tabs, as on the web: panchanga, sait, daily muhurta. */
export type AsideTabId = "panchanga" | "sait" | "muhurta";

const TABS: { id: AsideTabId; labelKey: string }[] = [
  { id: "panchanga", labelKey: "panchanga.tabs.panchanga" },
  { id: "sait", labelKey: "panchanga.tabs.sait" },
  { id: "muhurta", labelKey: "panchanga.tabs.muhurta" },
];

type Props = {
  tab: AsideTabId;
  onTabChange: (tab: AsideTabId) => void;
  /** The in-page bar reports its layout so the sticky copy knows where it sits. */
  tabBarRef?: RefObject<ComponentRef<typeof View> | null>;
  onTabBarLayout?: () => void;
  /**
   * Pinned at the top of the screen (the sticky copy, rendered outside the
   * scroll by index.tsx when the page is scrolled to the tabs). A plain view,
   * not an animated one — see lib/home-sticky.ts for why.
   */
  fixed?: boolean;
  /** Only for the pinned copy: whether it is showing right now. It stays
      mounted and fades in and out, so it takes over without a pop. */
  visible?: boolean;
};

/**
 * The three tabs under the day's card: panchanga, sait, daily muhurta. The
 * active tab keeps the web's design — a light background with a teal underline.
 *
 * It is rendered twice on a phone, with the same tab and handler: once in the
 * aside, under the day's card and the add button, and once pinned at the top
 * of the screen (`fixed`) when the page is scrolled to the tabs
 * (lib/home-sticky.ts). The pinned copy fades in and out on `visible`; it
 * never slides, so it lands exactly where the in-page tabs sit.
 */
export function HomeAsideTabBar({ tab, onTabChange, tabBarRef, onTabBarLayout, fixed, visible: visibleProp }: Props) {
  // The pinned copy follows the sticky flag itself, so a flip re-renders this bar, not the home page.
  const tabsStuck = useTabsStuck();
  const visible = visibleProp ?? (fixed ? tabsStuck : true);
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  // 0 hidden, 1 shown. Only the pinned copy fades; the in-page tabs are
  // always fully there. The pinned copy is unmounted while hidden, so it is
  // never in the view hierarchy at the top of the page: it cannot cover the
  // pull-to-refresh spinner or take the pull-down gesture. It mounts, then
  // fades in fast (120ms), so the handoff stays snappy instead of smearing
  // over the moving page.
  const [mounted, setMounted] = useState(fixed ? visible : true);
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    if (!fixed) return;
    if (visible) {
      setMounted(true);
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [fixed, visible, anim]);
  useEffect(() => {
    if (!fixed || !mounted || !visible) return;
    Animated.timing(anim, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fixed, mounted, visible, anim]);
  const bar = (
    <View
      ref={tabBarRef}
      onLayout={onTabBarLayout}
      className={cn("flex-row", homeClasses.asideTabBar)}
      role="tablist"
      accessibilityRole="tablist"
      aria-label={t("panchanga.tabs_label")}
    >
      {TABS.map((item) => {
        const active = item.id === tab;
        return (
          <Pressable
            key={item.id}
            role="tab"
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onTabChange?.(item.id)}
            className={cn(homeClasses.asideTab, active && homeClasses.asideTabActive)}
          >
            <Text
              className={cn(
                homeClasses.asideTabLabel,
                active ? homeClasses.asideTabLabelActive : homeClasses.asideTabLabelIdle,
              )}
            >
              {t(item.labelKey)}
            </Text>
            {active ? <View className={homeClasses.asideTabIndicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
  if (!fixed) return bar;
  if (!mounted) return null;
  return (
    // Background and border sit in plain styles, not classes: NativeWind
    // classes on an animated view are dropped, which would leave the pinned
    // tabs see-through over the scrolling page.
    <Animated.View
      style={[
        { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingTop: insets.top, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
        { opacity: anim },
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      {bar}
    </Animated.View>
  );
}
