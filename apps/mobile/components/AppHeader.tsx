import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { Icon } from "@vedic-patro/ui";
import { shellIcons, topBarControlSize } from "@vedic-patro/ui/kit/shell";
import { Animated as RNAnimated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { Easing as REasing, FadeIn, FadeOut, LinearTransition, ReduceMotion, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DURATION, haptics, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { neutral, withAlpha } from "@vedic-patro/design-tokens";
import { TABLET_SIDEBAR_WIDTH, useTabletUi } from "@/lib/tablet-ui";
import { useNavPress } from "@/lib/use-nav-press";
import { Ionicons } from "@/components/icons/Ionicons";
import { useAuth } from "@/lib/auth/AuthContext";
import { MenuPreferences } from "@/components/navigation/MenuPreferences";
import { MobileNavMenu } from "@/components/navigation/MobileNavMenu";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { useLocale } from "@/lib/i18n";
import { IS_IPHONE_DUO } from "@/lib/iphone-duo";
import { requestAddReminder, requestLocationPicker, requestOpenMenu, requestSearch, useOpenMenuRequest } from "@/lib/menu-request";
import { useTopBarElement } from "@/components/navigation/TopBarSlot";
import { ThemeScope, useThemeColors } from "@/lib/theme-context";
import { usePageViewSections, type PageViewSection } from "@/lib/page-view-menu";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/design-tokens/cn";

/**
 * The side menu and its open/close/navigate flow. It opens on `requestOpenMenu()`, so the header's
 * menu button, the home edge swipe and the iPhone Duo's native toolbar all reach the same menu. It
 * rises as the same sheet as "+" and search: the system page sheet on iOS (the page behind scales
 * back, a drag down closes it), the app's spring bottom sheet on Android.
 */
export function NavDrawerHost() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navPress = useNavPress();
  const tablet = useTabletUi();
  const insets = useSafeAreaInsets();
  useOpenMenuRequest(useCallback(() => setMenuOpen(true), []));

  /* Navigate once the sheet has gone: pushing under a sheet still on screen made iOS drop it in one
     frame and hold the push until the new page had rendered. */
  const pendingHref = useRef<string | null>(null);
  const go = (href: string) => {
    pendingHref.current = href;
    setMenuOpen(false);
  };
  const onDismissed = useCallback(() => {
    const href = pendingHref.current;
    pendingHref.current = null;
    if (href) navPress(href);
  }, [navPress]);

  const content = (
    <View className="gap-2 pb-4 pt-1">
      {/* A close button as well as the drag down, which not everyone finds — on the tabs' row. */}
      <MobileNavMenu onNavigate={go} trailing={<CloseButton onPress={() => setMenuOpen(false)} />} />
      <View className="mx-4 mt-2 border-t border-border pt-4">
        <MenuPreferences onNavigate={go} />
      </View>
    </View>
  );

  if (tablet) {
    return (
      <SidebarDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} onDismissed={onDismissed}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top }}>
          {content}
        </ScrollView>
      </SidebarDrawer>
    );
  }

  return (
    <BottomSheetModal
      variant="page"
      visible={menuOpen}
      onClose={() => setMenuOpen(false)}
      onDismissed={onDismissed}
      maxHeight="92%"
    >
      {/* The iOS page sheet scrolls its content itself; the Android sheet is sized to content, so it scrolls here. */}
      {Platform.OS === "ios" ? content : <ScrollView style={{ flexShrink: 1 }}>{content}</ScrollView>}
    </BottomSheetModal>
  );
}

/**
 * Tablet: the side menu as a sidebar sliding in from the left edge, like iPad Calendar's
 * calendars list, with the page dimmed beside it. A tap beside it or the close button closes it.
 */
function SidebarDrawer({
  visible,
  onClose,
  onDismissed,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  onDismissed: () => void;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();
  const reduced = useReducedMotionPref();
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const shown = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (!mounted) return;
    const anim = RNAnimated.timing(shown, {
      toValue: visible ? 1 : 0,
      duration: reduced ? 0 : visible ? DURATION.standard : DURATION.fast,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
        onDismissed();
      }
    });
    return () => anim.stop();
  }, [visible, mounted, reduced, shown, onDismissed]);
  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <ThemeScope style={{ flex: 1 }}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <RNAnimated.View
          style={{
            width: TABLET_SIDEBAR_WIDTH,
            height: "100%",
            backgroundColor: colors.card,
            borderRightWidth: StyleSheet.hairlineWidth,
            borderRightColor: colors.border,
            transform: [{ translateX: shown.interpolate({ inputRange: [0, 1], outputRange: [-TABLET_SIDEBAR_WIDTH, 0] }) }],
          }}
        >
          {children}
        </RNAnimated.View>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
          <RNAnimated.View style={{ flex: 1, backgroundColor: neutral.black, opacity: shown.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }) }} />
        </Pressable>
      </View>
      </ThemeScope>
    </Modal>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => {
        haptics.tick();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={t("ui.search.cancel")}
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-60 dark:bg-foreground/10"
    >
      <Ionicons name="close" size={22} color={colors.foreground} />
    </Pressable>
  );
}

/** The iPhone Duo draws its header natively (components/navigation/DuoToolbar.tsx). */
export function AppHeader() {
  return IS_IPHONE_DUO ? null : <AppHeaderView />;
}

/**
 * A top-bar key: the same size, corner and border as the page's date arrows next to it
 * (`topBarControlSize`, `calendarHeaderClasses.iconButton`), so the whole bar is one row of keys.
 */
function HeaderButton({
  icon,
  label,
  onPress,
}: {
  icon: "sidebar" | "list" | "add" | "search-outline" | "location-outline";
  label: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const size = topBarControlSize(width);
  const glyph = Math.round(size * 0.58);
  return (
    <View style={{ width: size, height: size }}>
      <Pressable
        onPress={() => {
          haptics.tick();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={6}
        className="h-full w-full items-center justify-center rounded-xl border border-border bg-card active:opacity-60"
        style={{ borderCurve: "continuous" }}
      >
        {icon === "sidebar" || icon === "list" ? (
          <Icon node={shellIcons[icon]} size={glyph} tone="secondary" />
        ) : (
          <Ionicons name={icon} size={glyph} color={colors.secondary} />
        )}
      </Pressable>
    </View>
  );
}

/** The switch's reflow: strong ease-out, short, and dropped under Reduce Motion. */
const SEGMENT_EASE = REasing.bezier(0.23, 1, 0.32, 1);
const SEGMENT_LAYOUT = LinearTransition.duration(220).easing(SEGMENT_EASE).reduceMotion(ReduceMotion.System);
const SEGMENT_LABEL_IN = FadeIn.duration(160).delay(60).reduceMotion(ReduceMotion.System);
const SEGMENT_LABEL_OUT = FadeOut.duration(100).reduceMotion(ReduceMotion.System);

/**
 * Tablet: the page's view choices as a segmented switch in the top bar, like iPad Calendar's
 * Day | Week | Month. When every choice has an icon (the home calendar) only the chosen one shows its
 * name, in a pill; the others are icons. A press folds the old pill and opens the new one.
 * One set of up to four choices fits; anything more (several sets, or a long list like the rashifal
 * profiles) keeps the menu.
 */
function ViewSegmentedSwitch() {
  const sections = usePageViewSections();
  if (!sections) return null;
  if (sections.length !== 1 || sections[0]!.options.length > 4) return <ViewMenuButton />;
  const { options } = sections[0]!;
  const iconic = options.every((option) => option.icon);
  return (
    <Animated.View
      layout={SEGMENT_LAYOUT}
      accessibilityRole="tablist"
      className="h-12 flex-row items-center gap-1 rounded-2xl bg-muted p-1.5"
      style={{ borderCurve: "continuous" }}
    >
      {options.map((option) => {
        const showLabel = !iconic || option.active;
        return (
          <Animated.View key={option.key} layout={SEGMENT_LAYOUT} className="h-full">
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: option.active }}
              hitSlop={4}
              onPress={() => {
                if (option.active) return;
                haptics.tick();
                option.onPress();
              }}
              className={cn(
                "h-full flex-row items-center justify-center gap-2 rounded-xl",
                showLabel ? "px-4" : "w-12",
                option.active ? "bg-background" : "active:opacity-60",
              )}
              style={{ borderCurve: "continuous" }}
            >
              {option.icon ? <Icon node={option.icon} size={20} tone={option.active ? "foreground" : "muted"} /> : null}
              {showLabel ? (
                <Animated.View entering={iconic ? SEGMENT_LABEL_IN : undefined} exiting={iconic ? SEGMENT_LABEL_OUT : undefined}>
                  <Text
                    className={cn("text-body font-medium", option.active ? "text-foreground" : "text-muted-foreground")}
                    style={nepaliTextStyle(15)}
                    numberOfLines={1}
                  >
                    {option.label}
                  </Text>
                </Animated.View>
              ) : null}
            </Pressable>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

/** Where the view menu's button sits on screen, so the menu opens from under it. */
type Anchor = { top: number; right: number };

/** A short set of plain choices (दैनिक | साप्ताहिक | मासिक | वार्षिक) fits one row as a segmented switch. */
function isSegmentSection(section: PageViewSection): boolean {
  return (
    section.options.length >= 2 &&
    section.options.length <= 4 &&
    section.options.every((o) => !o.icon && o.label.length <= 12)
  );
}

/** The avatar letter for a row with no icon: the first character of the name, capitalised. */
function initialOf(label: string): string {
  return (Array.from(label.trim())[0] ?? "•").toLocaleUpperCase();
}

/**
 * The view menu: the focused page's own choices (वि.सं. | पञ्चाङ्ग on home, अहोरात्र | दिन-रात on the
 * panchanga, the period and profiles on rashifal, साइत…), opening from its button like Apple
 * Calendar's view menu. Pages without choices get no button. (The iPhone Duo uses the native
 * toolbar menu instead.)
 *
 * Short plain sets sit at the top as segmented switches and stay put; the rest (a long profile list)
 * scrolls beneath its own fixed heading. The card never grows past about two thirds of the screen.
 */
export function ViewMenuButton() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sections = usePageViewSections();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const open = () =>
    ref.current?.measureInWindow((x, y, w, h) => setAnchor({ top: y + h + 8, right: Math.max(12, width - (x + w)) }));
  const close = () => setAnchor(null);

  if (!sections) return null;

  const choose = (onPress: () => void) => {
    haptics.tick();
    close();
    onPress();
  };

  // The leading short sets become the fixed head; everything after them scrolls.
  let split = 0;
  while (split < sections.length && isSegmentSection(sections[split]!)) split++;
  const head = sections.slice(0, split);
  const body = sections.slice(split);
  // One list below the head: its heading stays fixed above the scroll.
  const fixedTitle = body.length === 1 && head.length > 0 ? body[0]!.title : undefined;

  const panelWidth = Math.min(320, width - 24);
  const maxHeight = anchor
    ? Math.max(200, Math.min(height * 0.66, height - anchor.top - insets.bottom - 16))
    : 0;

  const sectionTitle = (title: string) => (
    <Text className="px-4 pb-1.5 pt-3 text-caption font-semibold text-muted-foreground" style={nepaliTextStyle(13)}>
      {title}
    </Text>
  );

  return (
    <View ref={ref} collapsable={false}>
      <HeaderButton icon="list" label={t("ui.view_menu.label")} onPress={open} />
      <Modal visible={anchor != null} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
        <ThemeScope style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(140)} style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(neutral.black, 0.18) }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t("ui.search.cancel")} />
        </Animated.View>
        {anchor ? (
          <Animated.View
            entering={ZoomIn.duration(180)}
            style={{ position: "absolute", top: anchor.top, right: anchor.right, width: panelWidth, maxHeight }}
          >
            <View
              className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg"
              style={{ maxHeight, borderCurve: "continuous" }}
            >
              {head.map((section, index) => (
                <View key={section.key} className={cn("px-3", index === 0 ? "pt-3" : "pt-2")}>
                  {section.title ? (
                    <Text className="px-1 pb-1.5 text-caption font-semibold text-muted-foreground" style={nepaliTextStyle(13)}>
                      {section.title}
                    </Text>
                  ) : null}
                  <View accessibilityRole="tablist" className="flex-row rounded-2xl bg-muted p-1" style={{ borderCurve: "continuous" }}>
                    {section.options.map((option) => (
                      <Pressable
                        key={option.key}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: option.active }}
                        onPress={() => (option.active ? close() : choose(option.onPress))}
                        className={cn(
                          "h-10 flex-1 items-center justify-center rounded-xl px-1",
                          option.active ? "bg-background shadow-sm" : "active:opacity-60",
                        )}
                        style={{ borderCurve: "continuous" }}
                      >
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          className={cn("text-body", option.active ? "font-semibold text-foreground" : "text-muted-foreground")}
                          style={nepaliTextStyle(14)}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
              {head.length > 0 && body.length > 0 ? <View className="mt-3 h-px bg-border" /> : null}
              {body.length === 0 && head.length > 0 ? <View className="h-3" /> : null}
              {fixedTitle ? sectionTitle(fixedTitle) : null}
              {body.length > 0 ? (
                <ScrollView
                  style={{ flexGrow: 0, flexShrink: 1 }}
                  bounces={false}
                  showsVerticalScrollIndicator
                  contentContainerClassName={cn("pb-2", !fixedTitle && "pt-1")}
                >
                  {body.map((section, index) => (
                    <View key={section.key} className={index > 0 ? "mt-1 border-t border-border" : undefined}>
                      {section.title && !fixedTitle ? sectionTitle(section.title) : null}
                      {section.options.map((option) => (
                        <Pressable
                          key={option.key}
                          accessibilityRole="menuitem"
                          accessibilityState={{ selected: option.active }}
                          onPress={() => choose(option.onPress)}
                          className={cn(
                            "mx-2 min-h-12 flex-row items-center gap-3 rounded-2xl px-2 py-1.5",
                            option.active ? "bg-muted" : "active:bg-muted",
                          )}
                          style={{ borderCurve: "continuous" }}
                        >
                          {option.icon ? (
                            <View className="h-8 w-8 items-center justify-center">
                              <Icon node={option.icon} size={20} tone={option.active ? "secondary" : "muted"} />
                            </View>
                          ) : (
                            <View
                              className={cn("h-8 w-8 items-center justify-center rounded-full", option.active ? "bg-secondary" : "bg-muted")}
                              style={option.active ? undefined : { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}
                            >
                              <Text
                                className={cn("text-caption font-semibold", option.active ? "text-white" : "text-muted-foreground")}
                                style={nepaliTextStyle(13)}
                              >
                                {initialOf(option.label)}
                              </Text>
                            </View>
                          )}
                          <Text
                            numberOfLines={1}
                            className={cn("min-w-0 flex-1 text-body text-foreground", option.active && "font-semibold")}
                            style={nepaliTextStyle(16)}
                          >
                            {option.label}
                          </Text>
                          {option.active ? <Ionicons name="checkmark" size={18} color={colors.secondary} /> : null}
                        </Pressable>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
        </ThemeScope>
      </Modal>
    </View>
  );
}

/**
 * The top bar: the side-menu button, the page's date controls, its view menu and, top right, search
 * (a tablet adds place and "+"). The tabs and place sit at the bottom (FloatingNavBar); log-in and
 * settings are at the foot of the side menu. The sheets they open live at the root (AppOverlays), so
 * the buttons only send requests.
 */
function AppHeaderView() {
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const dateControls = useTopBarElement();
  // The date controls' band is exactly one key tall, so they line up with the buttons either side.
  const controlSize = topBarControlSize(useWindowDimensions().width);
  const tablet = useTabletUi();
  // Creating events, tasks and appointments is for signed-in users.
  const { isAuthenticated } = useAuth();

  return (
    <View style={{ paddingTop: insets.top }} className="bg-background">
      <View className="min-h-14 w-full flex-row items-center gap-2 px-3 py-2">
        {/* Tablet, as iPad Calendar's toolbar: menu and date on the left, the Day | Week | Month switch in
            the middle of the bar, search, place and "+" on the right. The two sides share the leftover
            width equally, so the switch stays centred however wide the date controls are. */}
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <HeaderButton icon="sidebar" label={t("menu_open")} onPress={requestOpenMenu} />
          {/* The page's date controls (TopBarSlot), in a fixed-height band: their own bottom margins would
              otherwise make the bar grow. */}
          <View className="min-w-0 flex-1 justify-start overflow-hidden" style={{ height: controlSize }}>{dateControls}</View>
        </View>
        {tablet ? <ViewSegmentedSwitch /> : null}
        <View className={cn("flex-row items-center justify-end gap-2", tablet && "min-w-0 flex-1")}>
          {tablet ? null : <ViewMenuButton />}
          <HeaderButton icon="search-outline" label={t("ui.search.search")} onPress={requestSearch} />
          {tablet ? <HeaderButton icon="location-outline" label={t("ui.search.location")} onPress={requestLocationPicker} /> : null}
          {/* "+" only on a tablet. On a phone a new event starts from the day it is for: today's card on
              home ("add to this day"), a long-press on a calendar day, a planner slot, or My events. */}
          {tablet && isAuthenticated ? <HeaderButton icon="add" label={t("events.create")} onPress={requestAddReminder} /> : null}
        </View>
      </View>
    </View>
  );
}
