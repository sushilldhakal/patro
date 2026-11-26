import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActionSheetIOS, Animated as RNAnimated, Platform, Pressable, Share, View, useWindowDimensions } from "react-native";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";
import { cssInterop } from "nativewind";
import { Text } from "@/components/ui/Text";
import { usePathname, useRouter } from "expo-router";
import { useNavPress } from "@/lib/use-nav-press";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale } from "@/lib/i18n";
import { FLOATING_NAV, FLOATING_NAV_FOLD_SHRINK, isNavActive, normalizeMobilePathname } from "@/lib/mobile-nav";
import { resolveNavIcon, type NavIconName } from "@vedic-patro/icons";
import { getPanchangaSidebarSections } from "@vedic-patro/features/panchanga";
import { KUNDALI_NAV_GROUPS, defaultChildForGroup, isKundaliNavGroupActive, type KundaliSectionId } from "@vedic-patro/features/kundali";
import { useKundaliSection } from "@/lib/kundali/use-kundali-section";
import { IS_IPHONE_DUO } from "@/lib/iphone-duo";
import { useDuoRail } from "@/lib/duo-rail";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/design-tokens/cn";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { requireOptionalNativeModule } from "expo";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { nativeShadow, radius, space, withAlpha } from "@vedic-patro/design-tokens";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
import { CSS_EASE_OUT, DURATION, PRESS_SCALE, haptics, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { requestOpenMenu } from "@/lib/menu-request";
import { pageLink } from "@/components/navigation/DuoToolbar";
import { sidebarHref } from "@/components/panchanga/PanchangaSidebarNav";
import { navFold, resetNavCompact } from "@/lib/nav-compact";
import { useBarAccessoryHeight } from "@/lib/bar-accessory";
import { useTabletUi } from "@/lib/tablet-ui";

/** The tabs the bar keeps on a narrow phone (home, panchanga, daily transit, sait); the side menu reaches the
 *  rest, and its foot holds log-in / settings (there is no profile tab). */
const BAR_TABS: ReadonlySet<string> = new Set(["/", "/panchanga", "/dainikkranti", "/sait"]);
/** With room for six (Plus / Pro Max phones, tablets): kundali and weather join them. */
const BAR_TABS_WIDE: ReadonlySet<string> = new Set(["/", "/panchanga", "/kundali", "/dainikkranti", "/sait", "/weather"]);
/** Window width (pt) from which the bar shows six tabs: the Plus and Pro Max iPhones are 428–440. */
const WIDE_BAR_MIN_WIDTH = 420;

/** One tab of the bar: the main tabs, or a section's own set (see {@link useBarItems}). */
type BarItem = { key: string; label: string; icon: NavIconName; active: boolean; onPress: () => void };

/** The kundali profile's sections (KUNDALI_NAV_GROUPS) and the icon each shows in the bar. */
const KUNDALI_SECTION_ICONS: Record<string, NavIconName> = {
  "kundali-overview": "sparkles",
  "kundali-graha": "orbit",
  "kundali-yoga": "infinity",
  "kundali-dasha": "hourglass",
  "kundali-bala": "gauge",
  "kundali-report": "file-text",
};

/**
 * What the bar shows. Inside kundali it switches to that section's own tabs: kundali, milan,
 * rashifal and aakash gochar on the jyotish pages; the chart's sections on a profile's kundali;
 * panchanga, dainik kranti, year wheel and aakash gochar on the panchanga pages.
 * Sait shows its ceremonies. Everywhere else, the main tabs. A section set keeps as many tabs as
 * the width fits (the current one always among them); the side menu ("More") reaches the rest.
 */
function useBarItems(rawPathname: string, windowWidth: number): BarItem[] {
  const navPress = useNavPress();
  const { t, pick } = useLocale();
  const { section, setSection } = useKundaliSection();
  const pathname = normalizeMobilePathname(rawPathname);
  const route = (key: string, href: string, label: string, icon: NavIconName, active: boolean): BarItem => ({
    key,
    label,
    icon,
    active,
    onPress: () => navPress(href),
  });

  let set: BarItem[] | null = null;
  if (pathname.startsWith("/kundali/")) {
    set = KUNDALI_NAV_GROUPS.map((group) => ({
      key: group.id,
      // Short labels: "कुण्डली" (not "जन्म कुण्डली"), "विश्लेषण" (not "ज्योतिष विश्लेषण").
      label:
        group.id === "kundali-overview"
          ? t("ui.floating_nav.kundali")
          : group.id === "kundali-report"
            ? t("ui.floating_nav.analysis")
            : t(group.labelKey),
      icon: KUNDALI_SECTION_ICONS[group.id] ?? "sparkles",
      active: isKundaliNavGroupActive(group.id, section),
      onPress: () => {
        if (isKundaliNavGroupActive(group.id, section)) return;
        setSection(defaultChildForGroup(group.id) ?? (group.id as KundaliSectionId));
      },
    }));
  } else if (KUNDALI_HUB_PATHS.has(pathname)) {
    set = [
      route("kundali", "/kundali", t("nav.jyotish_kundali"), "sparkles", pathname === "/kundali"),
      route("milan", "/kundali-milan", t("ui.floating_nav.milan"), "heart", pathname.endsWith("/kundali-milan")),
      route("rashifal", "/rashifal", t("nav.jyotish_rashifal"), "sun", pathname.endsWith("/rashifal")),
      route("aakash", "/aakash-gochar", t("ui.floating_nav.sky_gochar"), "orbit", pathname === "/aakash-gochar"),
    ];
  } else if (PANCHANGA_HUB_PATHS.has(pathname)) {
    set = [
      route("panchanga", "/panchanga", t("ui.floating_nav.panchanga"), "scroll-text", pathname === "/panchanga"),
      route("dainikkranti", "/dainikkranti", t("ui.mobile_nav.transit"), "moon", pathname === "/dainikkranti"),
      route("year", "/panchanga/year", t("ui.floating_nav.year_wheel"), "chart-pie", pathname === "/panchanga/year"),
      route("aakash", "/aakash-gochar", t("ui.floating_nav.sky_gochar"), "orbit", pathname === "/aakash-gochar"),
    ];
  } else {
    // Any page listed in the side menu shows its menu section's peers (sait's ceremonies, the
    // calendar tools, the graha pages, the tables…); /sait itself opens on its ceremonies.
    const sections = getPanchangaSidebarSections();
    const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const section =
      pathname === "/sait"
        ? sections.find((s) => s.id === "sait")
        : sections.find((s) => s.items.some((item) => matches(sidebarHref(item))));
    set =
      section?.items.map((item) => {
        const href = sidebarHref(item);
        return route(item.id, href, t(item.labelKey), resolveNavIcon(section.id, item.id), matches(href));
      }) ?? null;
  }

  if (!set) {
    const barTabs = windowWidth >= WIDE_BAR_MIN_WIDTH ? BAR_TABS_WIDE : BAR_TABS;
    return FLOATING_NAV.filter((item) => barTabs.has(item.href)).map((item) =>
      route(item.href, item.href, pick(item.ne, item.en), item.icon, isNavActive(rawPathname, item.href)),
    );
  }
  // A section's bar always starts with Home, so every page is one tap from home, and keeps only as
  // many of the section's pages as the main bar has tabs (the current one always among them, its
  // neighbours either side); "More" (the side menu) reaches the rest. No sideways scrolling.
  const fit = (windowWidth >= WIDE_BAR_MIN_WIDTH ? BAR_TABS_WIDE.size : BAR_TABS.size) - 1;
  const at = set.findIndex((item) => item.active);
  const start = Math.min(Math.max(0, at - Math.floor((fit - 1) / 2)), Math.max(0, set.length - fit));
  const home = FLOATING_NAV[0];
  return [route(HOME_KEY, home.href, pick(home.ne, home.en), home.icon, false), ...set.slice(start, start + fit)];
}

/** Key of the Home tab that leads a section's bar. */
const HOME_KEY = "home";

/** The pages that share the panchanga bar. */
const PANCHANGA_HUB_PATHS: ReadonlySet<string> = new Set(["/panchanga", "/dainikkranti", "/panchanga/year"]);

/** The jyotish pages that share the kundali bar (milan and rashifal have two addresses each). */
const KUNDALI_HUB_PATHS: ReadonlySet<string> = new Set([
  "/kundali",
  "/kundali-milan",
  "/jyotish/kundali-milan",
  "/rashifal",
  "/jyotish/rashifal",
  "/aakash-gochar",
]);

const ScalePressable = cssInterop(Animated.createAnimatedComponent(Pressable), { className: "style" });

/** Full bar → icons only (lib/nav-compact.ts). */
/** Height of the row of tabs inside the pill (the pill adds 4pt above and below: 60pt full, 46pt folded, like the
 *  reference bar). */
const TABS_HEIGHT = 56;
const TABS_HEIGHT_COMPACT = TABS_HEIGHT - FLOATING_NAV_FOLD_SHRINK;
/** How far in from each side the tab pill draws when folded, so it reads as a shorter capsule (about 80% wide). */
const GROUP_INSET_COMPACT = 40;
const LABEL_MAX_HEIGHT = 16;
/** iOS 26+ draws the bar as Liquid Glass (the page shows through, blurred); elsewhere it is the solid card. */
// Checked only when the build has the glass module: the check throws in a build made before it was added.
const GLASS = Platform.OS === "ios" && requireOptionalNativeModule("ExpoGlassEffect") != null && isGlassEffectAPIAvailable();

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
  const pathname = usePathname();
  const { t } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useBreakpoint();
  const tablet = useTabletUi();
  const reduced = useReducedMotionPref();

  // Scrolling a page down folds the bar to its icons, Revolut-style; back up (or a new page) unfolds it.
  // The fold runs on the UI thread (navFold, lib/nav-compact.ts): driven from JS it stalled whenever
  // JS was busy (scrolling, a page mounting). Every bit of layout stays on plain Views with classes;
  // the Reanimated views carry only the animated style (with classes on them, iOS dropped the layout).
  useEffect(() => {
    resetNavCompact();
  }, [pathname]);
  const insetStyle = useAnimatedStyle(() => ({ marginHorizontal: navFold.value * GROUP_INSET_COMPACT }));
  const tabsHeightStyle = useAnimatedStyle(() => ({
    height: interpolate(navFold.value, [0, 1], [TABS_HEIGHT, TABS_HEIGHT_COMPACT]),
  }));

  // The highlight behind the current tab slides (springs) from tab to tab, like the system tab bar's.
  const { width: windowWidth } = useWindowDimensions();
  const tabs = useBarItems(pathname, windowWidth);
  // "More" sits in the middle of the bar and opens the side menu — the home header
  // has no menu button of its own, so this is how the menu is reached from home.
  type BarEntry = { kind: "tab"; item: BarItem } | { kind: "more" };
  const moreAt = Math.floor(tabs.length / 2);
  const entries: BarEntry[] = [
    ...tabs.slice(0, moreAt).map((item) => ({ kind: "tab" as const, item })),
    { kind: "more" as const },
    ...tabs.slice(moreAt).map((item) => ({ kind: "tab" as const, item })),
  ];
  const tabCount = entries.length;
  const [rowWidth, setRowWidth] = useState(0);
  const activeIndex = entries.findIndex((entry) => entry.kind === "tab" && entry.item.active);
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

  /* The bar's icon size; the current tab's icon is a touch bigger, and its
     highlight rises a few points above the row with a curved top, so the tab
     in use reads as the one that is raised. */
  const iconSize = 24;
  const activeIconSize = 26;
  const renderMore = () => (
    <NavItem
      key="more"
      active={false}
      onPress={() => {
        haptics.tick();
        requestOpenMenu();
      }}
    >
      <Ionicons name="grid-outline" size={iconSize} color={colors.mutedForeground} />
      <NavLabel active={false}>
        {t("ui.more.more")}
      </NavLabel>
    </NavItem>
  );

  const renderTab = (item: BarItem) => (
    <NavItem
      key={item.key}
      active={item.active}
      onPress={item.onPress}
    >
      <AppNavIcon
        name={item.icon}
        size={item.active ? activeIconSize : iconSize}
        color={item.active ? colors.foreground : colors.mutedForeground}
      />
      <NavLabel active={item.active}>
        {item.label}
      </NavLabel>
    </NavItem>
  );

  return (
    <View
      pointerEvents="box-none"
      style={{ paddingBottom: Math.max(insets.bottom, isTablet ? 10 : 6) }}
      className={cn("absolute bottom-0 left-0 right-0", shellClasses.navOuter, "px-4")}
    >
      {/* On the iPhone Duo only, a "…" button floats above the bar (share, reminders, rashifal).
          On a tablet the same actions sit in the top bar instead (AppHeader). The place button
          used to float here too; it lives in the header now. */}
      {!tablet && IS_IPHONE_DUO ? <FloatingActions /> : null}
      <View pointerEvents="box-none">
      <View className={shellClasses.navRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
      <Animated.View style={insetStyle}>
      <View
        style={nativeShadow("md")}
        className={cn(shellClasses.navGroup, "h-auto overflow-hidden px-1 py-1.5", GLASS && "bg-transparent")}
      >
      {GLASS ? (
        <GlassView
          pointerEvents="none"
          glassEffectStyle="regular"
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius.pill }}
        />
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={tabsHeightStyle}>
        {activeIndex >= 0 && slot > 0 ? (
          <RNAnimated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              top: -4,
              bottom: -2,
              width: slot,
              borderRadius: radius.pill,
              backgroundColor: withAlpha(colors.foreground, 0.08),
              transform: [{ translateX: slide }],
            }}
          />
        ) : null}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "stretch" }}>
        {entries.map((entry) => (entry.kind === "more" ? renderMore() : renderTab(entry.item)))}
        </View>
      </Animated.View>
      </View>
      </View>
      </Animated.View>
      </View>
      </View>
      </View>
    </View>
  );
}

/** A tab's label: folds away (height and opacity) while the bar is compact. */
function NavLabel({ active, children }: { active: boolean; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({
    overflow: "hidden",
    maxHeight: interpolate(navFold.value, [0, 1], [LABEL_MAX_HEIGHT, 0]),
    opacity: interpolate(navFold.value, [0, 0.6, 1], [1, 0, 0]),
  }));
  return (
    <Animated.View style={style}>
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
    </Animated.View>
  );
}

/** On the iPhone Duo also "…" (share, reminders, rashifal), which its portrait top bar has no room
 *  for beside the status bar. The place button used to float here too; it lives in the header now. */
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
      {IS_IPHONE_DUO ? <ActionButton icon="ellipsis-horizontal" label={t("menu_open")} onPress={more} /> : null}
    </View>
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
function NavItem({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
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
