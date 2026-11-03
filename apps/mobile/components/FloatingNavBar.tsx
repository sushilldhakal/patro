import { useState, type ReactNode } from "react";
import { ActionSheetIOS, Pressable, Share, View } from "react-native";
import Animated from "react-native-reanimated";
import { cssInterop } from "nativewind";
import { Text } from "@/components/ui/Text";
import { usePathname, useRouter } from "expo-router";
import { useNavPress } from "@/lib/use-nav-press";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale } from "@/lib/i18n";
import { FLOATING_NAV, isNavActive } from "@/lib/mobile-nav";
import { IS_IPHONE_DUO } from "@/lib/iphone-duo";
import { useDuoRail } from "@/lib/duo-rail";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/design-tokens/cn";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { LinearGradient } from "expo-linear-gradient";
import { nativeShadow, withAlpha } from "@vedic-patro/design-tokens";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
import { CSS_EASE_OUT, DURATION, PRESS_SCALE, haptics, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { requestAddReminder, requestLocationPicker, requestSearch } from "@/lib/menu-request";
import { useAuth } from "@/lib/auth/AuthContext";
import { pageLink } from "@/components/navigation/DuoToolbar";

/** The tabs the bar keeps (home, panchanga, daily transit; the profile follows); the side menu reaches the rest. */
const BAR_TABS: ReadonlySet<string> = new Set(["/", "/panchanga", "/dainikkranti"]);

const ScalePressable = cssInterop(Animated.createAnimatedComponent(Pressable), { className: "style" });

/**
 * The bottom bar, the same on every phone, tablet and Android, and on the iPhone Duo in portrait:
 * search and "+" on the left; home, panchanga, daily transit and the profile; place on
 * the right ("…" too on the Duo). Settings are inside the profile page. On the Duo in landscape and folded the side rail carries all of it.
 */
export function FloatingNavBar({ duoPortrait }: { duoPortrait?: boolean } = {}) {
  const { horizontal } = useDuoRail();
  if (IS_IPHONE_DUO && !(duoPortrait && horizontal)) return null;
  return <FloatingNavBarView />;
}

function FloatingNavBarView() {
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
      {/* No blur on native: fade the page out under the bar instead, so text
          never shows through the gap below it or around its corners. */}
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(colors.background, 0), colors.background]}
        locations={[0, 0.45]}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: -16 }}
      />
      <View className={shellClasses.navRow}>
      <LeftActions />
      <View
        style={nativeShadow("lg")}
        className={cn("min-w-0 flex-1 flex-row bg-background", shellClasses.navBar)}
      >
        {FLOATING_NAV.filter((item) => BAR_TABS.has(item.href)).map((item) => {
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
        <ProfileNavItem iconSize={iconSize} />
      </View>
      <RightActions />
      </View>
    </View>
  );
}

/** Search and "+", left of the tabs. */
function LeftActions() {
  const { t } = useLocale();
  return (
    <View style={nativeShadow("lg")} className={cn("flex-row items-center bg-background px-1", shellClasses.navBar)}>
      <ActionButton icon="search-outline" label={t("ui.search.search")} onPress={requestSearch} />
      <ActionButton icon="add" label={t("ui.reminders.new_reminder")} onPress={requestAddReminder} />
    </View>
  );
}

/** Place, right of the tabs; on the iPhone Duo also "…" (share, reminders, rashifal), which its portrait
 *  top bar has no room for beside the status bar. Settings are in the profile page. */
function RightActions() {
  const { t, lang } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const more = () => {
    const options = [t("ui.more.share_the_app"), t("ui.reminders.reminders"), t("nav.jyotish_rashifal"), t("common.cancel")];
    ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: options.length - 1 }, (index) => {
      if (index === 0) {
        void pageLink(pathname, lang).then((url) => Share.share({ message: url, url }).catch(() => {}));
      } else if (index === 1) router.push("/reminders" as never);
      else if (index === 2) router.push("/rashifal" as never);
    });
  };
  return (
    <View style={nativeShadow("lg")} className={cn("flex-row items-center bg-background px-1", shellClasses.navBar)}>
      <ActionButton icon="location-outline" label={t("ui.search.location")} onPress={requestLocationPicker} />
      {IS_IPHONE_DUO ? <ActionButton icon="ellipsis-horizontal" label={t("menu_open")} onPress={more} /> : null}
    </View>
  );
}

/** The fourth item: the profile page, which holds the account (or sign-in) and the settings. */
function ProfileNavItem({ iconSize }: { iconSize: number }) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const active = pathname.startsWith("/account");
  return (
    <NavItem active={active} onPress={() => router.push("/account" as never)}>
      <Ionicons
        name={isAuthenticated ? "person-circle" : "person-circle-outline"}
        size={iconSize + 2}
        color={active ? colors.secondary : colors.mutedForeground}
      />
      <Text
        numberOfLines={1}
        className={cn("text-center", shellClasses.navLabel, active ? shellClasses.navLabelActive : shellClasses.navLabelIdle)}
        style={nepaliTextStyle()}
      >
        {isAuthenticated ? t("ui.nav.profile") : t("ui.nav.log_in")}
      </Text>
    </NavItem>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: "search-outline" | "location-outline" | "add" | "ellipsis-horizontal";
  label: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => {
        haptics.tick();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      className={shellClasses.navActionButton}
    >
      <Ionicons name={icon} size={22} color={colors.foreground} />
    </Pressable>
  );
}

/** Press scale only. Tabs are peers, so the active item never slides. */
function NavItem({ active, onPress, children }: { active: boolean; onPress: () => void; children: ReactNode }) {
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
