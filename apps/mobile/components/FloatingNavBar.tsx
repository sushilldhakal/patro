import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActionSheetIOS, Animated as RNAnimated, Easing, Pressable, Share, View } from "react-native";
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
import { nativeShadow, radius, withAlpha } from "@vedic-patro/design-tokens";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
import { CSS_EASE_OUT, DURATION, PRESS_SCALE, haptics, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { requestAddReminder, requestLocationPicker, requestSearch } from "@/lib/menu-request";
import { useAuth } from "@/lib/auth/AuthContext";
import { pageLink } from "@/components/navigation/DuoToolbar";
import { resetNavCompact, useNavCompact } from "@/lib/nav-compact";

/** The tabs the bar keeps (home, panchanga, daily transit; the profile follows); the side menu reaches the rest. */
const BAR_TABS: ReadonlySet<string> = new Set(["/", "/panchanga", "/dainikkranti"]);

const ScalePressable = cssInterop(Animated.createAnimatedComponent(Pressable), { className: "style" });

/** Full bar → icons only (lib/nav-compact.ts). */
/** Height of the row of tabs inside the pill (the pill adds 6pt above and below: 64pt full, 50pt folded). */
const TABS_HEIGHT = 52;
const TABS_HEIGHT_COMPACT = 38;
/** How far in from each side the tab pill draws when folded, so it reads as a slimmer capsule. */
const GROUP_INSET_COMPACT = 18;
const LABEL_MAX_HEIGHT = 24;

/**
 * The bottom bar, the same on every phone, tablet and Android, and on the iPhone Duo in portrait:
 * the tabs across the bottom (a highlight slides to the current one), with search and place as round buttons
 * stacked on the right just above it ("+" and "…" too on the Duo; elsewhere "+" is at the header's top right); home, panchanga, daily transit and the profile; place on
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
  const reduced = useReducedMotionPref();

  // Scrolling a page down folds the bar to its icons, Revolut-style; back up (or a new page) unfolds it.
  // Every bit of layout is on plain Views; only the moving values ride on React Native's Animated
  // (Reanimated's views dropped their layout styles on iOS: the pill went narrow, tabs stacked).
  useEffect(() => {
    resetNavCompact();
  }, [pathname]);
  const compact = useNavCompact();
  const fold = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const anim = RNAnimated.timing(fold, {
      toValue: compact ? 1 : 0,
      duration: reduced ? 0 : DURATION.standard,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // height and margins are layout
    });
    anim.start();
    return () => anim.stop();
  }, [compact, fold, reduced]);
  const inset = fold.interpolate({ inputRange: [0, 1], outputRange: [0, GROUP_INSET_COMPACT] });
  const tabsHeight = fold.interpolate({ inputRange: [0, 1], outputRange: [TABS_HEIGHT, TABS_HEIGHT_COMPACT] });

  // The highlight behind the current tab slides (springs) from tab to tab, like the system tab bar's.
  const tabs = FLOATING_NAV.filter((item) => BAR_TABS.has(item.href));
  const tabCount = tabs.length + 1; // + profile
  const activeIndex = pathname.startsWith("/account")
    ? tabs.length
    : tabs.findIndex((item) => isNavActive(pathname, item.href));
  const [rowWidth, setRowWidth] = useState(0);
  const slot = rowWidth / tabCount;
  const slide = useRef(new RNAnimated.Value(0)).current;
  const placed = useRef(false);
  useEffect(() => {
    if (activeIndex < 0 || slot === 0) return;
    const to = activeIndex * slot;
    // First placement (and Reduce Motion) jumps; later tab changes spring across.
    if (!placed.current || reduced) {
      placed.current = true;
      slide.setValue(to);
      return;
    }
    const anim = RNAnimated.spring(slide, { toValue: to, damping: 18, stiffness: 220, mass: 0.8, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [activeIndex, slot, reduced, slide]);

  /* Web MobileBottomNav: size-5 icons, max-w-lg bar, px-2 gutter at every width. */
  const iconSize = 20;

  return (
    <View
      pointerEvents="box-none"
      style={{ paddingBottom: Math.max(insets.bottom, isTablet ? 10 : 6) }}
      className={cn("absolute bottom-0 left-0 right-0", shellClasses.navOuter)}
    >
      {/* Search and place: round buttons stacked on the right, floating above the bar. */}
      <FloatingActions />
      <View pointerEvents="box-none">
      {/* No blur on native: fade the page out under the bar instead, so text
          never shows through the gap below it or around its corners. Only behind the bar, not the buttons. */}
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(colors.background, 0), colors.background]}
        locations={[0, 0.45]}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: -16 }}
      />
      <View className={shellClasses.navRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
      <RNAnimated.View style={{ marginHorizontal: inset }}>
      <View style={nativeShadow("md")} className={cn(shellClasses.navGroup, "h-auto py-1.5")}>
      <View style={{ flex: 1, minWidth: 0 }} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
      <RNAnimated.View style={{ height: tabsHeight }}>
        {activeIndex >= 0 && slot > 0 ? (
          <RNAnimated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: slot,
              borderRadius: radius.pill,
              backgroundColor: withAlpha(colors.secondary, 0.12),
              transform: [{ translateX: slide }],
            }}
          />
        ) : null}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "stretch" }}>
        {tabs.map((item) => {
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
              <NavLabel fold={fold} active={active}>
                {pick(item.ne, item.en)}
              </NavLabel>
            </NavItem>
          );
        })}
        <ProfileNavItem iconSize={iconSize} fold={fold} />
        </View>
      </RNAnimated.View>
      </View>
      </View>
      </RNAnimated.View>
      </View>
      </View>
      </View>
    </View>
  );
}

/** A tab's label: folds away (height and opacity) while the bar is compact. */
function NavLabel({ fold, active, children }: { fold: RNAnimated.Value; active: boolean; children: ReactNode }) {
  return (
    <RNAnimated.View
      style={{
        overflow: "hidden",
        maxHeight: fold.interpolate({ inputRange: [0, 1], outputRange: [LABEL_MAX_HEIGHT, 0] }),
        opacity: fold.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0, 0] }),
      }}
    >
      <Text
        numberOfLines={1}
        className={cn("text-center", shellClasses.navLabel, active ? shellClasses.navLabelActive : shellClasses.navLabelIdle)}
        style={nepaliTextStyle()}
      >
        {children}
      </Text>
    </RNAnimated.View>
  );
}

/** Search and place as round buttons stacked on the right, just above the bar (like a mail app's compose
 *  button); on the iPhone Duo also "+" and "…" (share, reminders, rashifal), which its portrait top bar has no
 *  room for beside the status bar. Settings are in the profile page. */
function FloatingActions() {
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
    <View pointerEvents="box-none" className={shellClasses.navFabStack}>
      <ActionButton icon="search-outline" label={t("ui.search.search")} onPress={requestSearch} />
      <ActionButton icon="location-outline" label={t("ui.search.location")} onPress={requestLocationPicker} />
      {IS_IPHONE_DUO ? <ActionButton icon="add" label={t("ui.reminders.new_reminder")} onPress={requestAddReminder} /> : null}
      {IS_IPHONE_DUO ? <ActionButton icon="ellipsis-horizontal" label={t("menu_open")} onPress={more} /> : null}
    </View>
  );
}

/** The fourth item: the profile page, which holds the account (or sign-in) and the settings. */
function ProfileNavItem({ iconSize, fold }: { iconSize: number; fold: RNAnimated.Value }) {
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
      <NavLabel fold={fold} active={active}>
        {isAuthenticated ? t("ui.nav.profile") : t("ui.nav.log_in")}
      </NavLabel>
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
    <View style={nativeShadow("md")} className="rounded-full">
      <Pressable
        onPress={() => {
          haptics.tick();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={4}
        className={shellClasses.navFab}
      >
        <Ionicons name={icon} size={22} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

/** Press scale; the highlight behind the current tab is drawn (and slid) by the bar. */
function NavItem({ active, onPress, children }: { active: boolean; onPress: () => void; children: ReactNode }) {
  const reduced = useReducedMotionPref();
  const [pressed, setPressed] = useState(false);
  return (
    <ScalePressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      // Fills the row of tabs' height, so the active pill shrinks with the bar when it folds.
      className={cn(shellClasses.navTab, "h-full")}
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
