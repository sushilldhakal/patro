import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { Icon } from "@vedic-patro/ui";
import { Animated as RNAnimated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DURATION, haptics, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { neutral } from "@vedic-patro/design-tokens";
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
import { useThemeColors } from "@/lib/theme-context";
import { usePageViewSections } from "@/lib/page-view-menu";
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

/** A round icon button on the page background, the shape of the toolbar buttons iOS draws. */
function HeaderButton({
  icon,
  label,
  onPress,
}: {
  icon: "grid-outline" | "list" | "add" | "search-outline" | "location-outline";
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
      className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card active:opacity-60"
    >
      <Ionicons name={icon} size={22} color={colors.foreground} />
    </Pressable>
  );
}

/**
 * Tablet: the page's view choices as a segmented switch in the top bar, like iPad Calendar's
 * Day | Week | Month | Year. One set of up to four choices fits; anything more (several sets, or
 * a long list like the rashifal profiles) keeps the menu.
 */
function ViewSegmentedSwitch() {
  const sections = usePageViewSections();
  if (!sections) return null;
  if (sections.length !== 1 || sections[0]!.options.length > 4) return <ViewMenuButton />;
  const { options } = sections[0]!;
  return (
    <View accessibilityRole="tablist" className="h-10 flex-row items-center rounded-full border border-border bg-card p-1">
      {options.map((option) => (
        <Pressable
          key={option.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: option.active }}
          onPress={() => {
            if (option.active) return;
            haptics.tick();
            option.onPress();
          }}
          className={cn("h-full justify-center rounded-full px-4", option.active ? "bg-secondary" : "active:bg-muted")}
        >
          <Text
            className={cn("text-body font-medium", option.active ? "text-secondary-foreground" : "text-foreground")}
            style={nepaliTextStyle(15)}
            numberOfLines={1}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Where the view menu's button sits on screen, so the menu opens from under it. */
type Anchor = { top: number; right: number };

/**
 * The view menu: the focused page's own choices (वि.सं. | पञ्चाङ्ग on home, अहोरात्र | दिन-रात on the
 * panchanga, the profiles on rashifal and साइत…), the current one ticked, opening from its button like
 * Apple Calendar's view menu. Pages without choices get no button. (The iPhone Duo uses the native
 * toolbar menu instead.)
 */
export function ViewMenuButton() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const sections = usePageViewSections();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const open = () =>
    ref.current?.measureInWindow((x, y, w, h) => setAnchor({ top: y + h + 8, right: Math.max(8, width - (x + w)) }));
  const close = () => setAnchor(null);

  if (!sections) return null;

  return (
    <View ref={ref} collapsable={false}>
      <HeaderButton icon="list" label={t("ui.view_menu.label")} onPress={open} />
      <Modal visible={anchor != null} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel={t("ui.search.cancel")}>
          {anchor ? (
            <Animated.View
              entering={ZoomIn.duration(180)}
              style={{ position: "absolute", top: anchor.top, right: anchor.right, minWidth: 240 }}
            >
              <Animated.View entering={FadeIn.duration(120)} className="overflow-hidden rounded-3xl border border-border bg-card py-2 shadow-lg">
                {sections.map((section, index) => (
                  <View key={section.key} className={index > 0 ? "border-t border-border pt-1" : undefined}>
                    {section.title ? (
                      <Text className="px-4 pb-1 pt-2 text-caption text-muted-foreground" style={nepaliTextStyle(13)}>
                        {section.title}
                      </Text>
                    ) : null}
                    {section.options.map((option) => (
                      <Pressable
                        key={option.key}
                        accessibilityRole="menuitem"
                        accessibilityState={{ selected: option.active }}
                        onPress={() => {
                          haptics.tick();
                          close();
                          option.onPress();
                        }}
                        className="min-h-12 flex-row items-center gap-3 px-4 py-3 active:bg-muted"
                      >
                        <View className="w-5 items-center">
                          {option.active ? <Ionicons name="checkmark" size={18} color={colors.foreground} /> : null}
                        </View>
                        {option.icon ? <Icon node={option.icon} size={20} tone={option.active ? "secondary" : "muted"} /> : null}
                        <Text className="text-body text-foreground" style={nepaliTextStyle(17)}>
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ))}
              </Animated.View>
            </Animated.View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

/**
 * The top bar: the side-menu button, the page's date controls, its view menu and, top right, "+" (a new
 * reminder; its sheet closes with an X, like search). Search, the tabs with the profile, place and settings sit at the bottom (FloatingNavBar). The sheets they open live
 * at the root (AppOverlays), so the buttons only send requests.
 */
function AppHeaderView() {
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const dateControls = useTopBarElement();
  const tablet = useTabletUi();
  // Creating events, tasks and appointments is for signed-in users.
  const { isAuthenticated } = useAuth();

  return (
    <View style={{ paddingTop: insets.top }} className="bg-background">
      <View className="min-h-14 w-full flex-row items-center gap-2 px-3 py-2">
        <HeaderButton icon="grid-outline" label={t("menu_open")} onPress={requestOpenMenu} />
        {/* The page's date controls (TopBarSlot), in a fixed-height band: their own bottom margins would
            otherwise make the bar grow. */}
        <View className="h-10 min-w-0 flex-1 justify-start overflow-hidden">{dateControls}</View>
        {/* Tablet, like iPad Calendar's toolbar: the view choice as a segmented switch, then search,
            place and "+" at the top right (the floating buttons above the tab bar are phone-only). */}
        {tablet ? <ViewSegmentedSwitch /> : <ViewMenuButton />}
        {tablet ? <HeaderButton icon="search-outline" label={t("ui.search.search")} onPress={requestSearch} /> : null}
        {tablet ? <HeaderButton icon="location-outline" label={t("ui.search.location")} onPress={requestLocationPicker} /> : null}
        {isAuthenticated ? <HeaderButton icon="add" label={t("events.create")} onPress={requestAddReminder} /> : null}
      </View>
    </View>
  );
}
