import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActionSheetIOS, Animated as RNAnimated, Easing, Pressable, Share, View, useWindowDimensions } from "react-native";
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
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { nativeShadow, radius, space, withAlpha } from "@vedic-patro/design-tokens";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
import { CSS_EASE_OUT, DURATION, PRESS_SCALE, haptics, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { requestLocationPicker, requestSearch } from "@/lib/menu-request";
import { useAuth } from "@/lib/auth/AuthContext";
import { pageLink } from "@/components/navigation/DuoToolbar";
import { resetNavCompact, useNavCompact } from "@/lib/nav-compact";
import { useBarAccessoryHeight } from "@/lib/bar-accessory";
import { useTabletUi } from "@/lib/tablet-ui";

/** The tabs the bar keeps on a narrow phone (home, panchanga, daily transit; the profile follows); the side menu
 *  reaches the rest. */
const BAR_TABS: ReadonlySet<string> = new Set(["/", "/panchanga", "/dainikkranti"]);
/** With room for six (Plus / Pro Max phones, tablets): kundali and vastu join them. */
const BAR_TABS_WIDE: ReadonlySet<string> = new Set(["/", "/panchanga", "/kundali", "/dainikkranti", "/vastu"]);
/** Window width (pt) from which the bar shows six tabs: the Plus and Pro Max iPhones are 428–440. */
const WIDE_BAR_MIN_WIDTH = 420;

const ScalePressable = cssInterop(Animated.createAnimatedComponent(Pressable), { className: "style" });

/** Full bar → icons only (lib/nav-compact.ts). */
/** Height of the row of tabs inside the pill (the pill adds 4pt above and below: 60pt full, 46pt folded, like the
 *  reference bar). */
const TABS_HEIGHT = 52;
const TABS_HEIGHT_COMPACT = 38;
/** How far in from each side the tab pill draws when folded, so it reads as a shorter capsule (about 80% wide). */
const GROUP_INSET_COMPACT = 40;
const LABEL_MAX_HEIGHT = 16;
/** iOS 26+ draws the bar as Liquid Glass (the page shows through, blurred); elsewhere it is the solid card. */
const GLASS = isGlassEffectAPIAvailable();

/**
 * The bottom bar, the same on every phone, tablet and Android, and on the iPhone Duo in portrait:
 * the tabs across the bottom (a highlight slides to the current one), with search and place as round buttons
 * stacked on the right just above it ("…" too on the Duo; "+" is at the header's top right everywhere); home, panchanga, daily transit and the profile; place on
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
  const tablet = useTabletUi();
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
  const { width: windowWidth } = useWindowDimensions();
  const barTabs = windowWidth >= WIDE_BAR_MIN_WIDTH ? BAR_TABS_WIDE : BAR_TABS;
  const tabs = FLOATING_NAV.filter((item) => barTabs.has(item.href));
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

  /* The reference bar's icon size. */
  const iconSize = 22;

  return (
    <View
      pointerEvents="box-none"
      style={{ paddingBottom: Math.max(insets.bottom, isTablet ? 10 : 6) }}
      className={cn("absolute bottom-0 left-0 right-0", shellClasses.navOuter, "px-4")}
    >
      {/* Search and place: round buttons stacked on the right, floating above the bar. On a tablet
          they sit in the top bar instead (AppHeader), like iPad Calendar's toolbar. */}
      {tablet ? null : <FloatingActions />}
      <View pointerEvents="box-none">
      <View className={shellClasses.navRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
      <RNAnimated.View style={{ marginHorizontal: inset }}>
      <View
        style={nativeShadow("md")}
        className={cn(shellClasses.navGroup, "h-auto overflow-hidden px-1 py-1", GLASS && "bg-transparent")}
      >
      {GLASS ? (
        <GlassView
          pointerEvents="none"
          glassEffectStyle="regular"
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius.pill }}
        />
      ) : null}
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
              backgroundColor: withAlpha(colors.foreground, 0.08),
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
                color={active ? colors.foreground : colors.mutedForeground}
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
        className={cn(
          "text-center",
          shellClasses.navLabel,
          "text-caption font-semibold",
          active ? "text-foreground" : shellClasses.navLabelIdle,
        )}
        style={nepaliTextStyle()}
      >
        {children}
      </Text>
    </RNAnimated.View>
  );
}

/** Search and place as round buttons stacked on the right, just above the bar (like a mail app's compose
 *  button); on the iPhone Duo also "…" (share, reminders, rashifal), which its portrait top bar has no
 *  room for beside the status bar ("+" is in the top bar, as on every phone). Settings are in the profile page. */
function FloatingActions() {
  const { t, lang } = useLocale();
  const accessory = useBarAccessoryHeight();
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
    // Above the audio player when one is docked over the bar, so neither crowds the other.
    <View pointerEvents="box-none" className={shellClasses.navFabStack} style={accessory > 0 ? { marginBottom: space.sm + accessory + space.md } : undefined}>
      <ActionButton icon="search-outline" label={t("ui.search.search")} onPress={requestSearch} />
      <ActionButton icon="location-outline" label={t("ui.search.location")} onPress={requestLocationPicker} />
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
        color={active ? colors.foreground : colors.mutedForeground}
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
