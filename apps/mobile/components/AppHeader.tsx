import { useCallback, useRef, useState, type ComponentRef } from "react";
import { Modal, Platform, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "@vedic-patro/ui/motion";
import { useNavPress } from "@/lib/use-nav-press";
import { Ionicons } from "@/components/icons/Ionicons";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { MenuPreferences } from "@/components/navigation/MenuPreferences";
import { MobileNavMenu } from "@/components/navigation/MobileNavMenu";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { useLocale } from "@/lib/i18n";
import { IS_IPHONE_DUO } from "@/lib/iphone-duo";
import { requestAddReminder, requestLocationPicker, requestOpenMenu, requestSearch, useOpenMenuRequest } from "@/lib/menu-request";
import { useThemeColors } from "@/lib/theme-context";
import { usePatroViewOptions } from "@/lib/patro-view";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";

/**
 * The side menu and its open/close/navigate flow. It opens on `requestOpenMenu()`, so the header's
 * menu button, the home edge swipe and the iPhone Duo's native toolbar all reach the same menu. It
 * rises as the same sheet as "+" and search: the system page sheet on iOS (the page behind scales
 * back, a drag down closes it), the app's spring bottom sheet on Android.
 */
export function NavDrawerHost() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navPress = useNavPress();
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
      {/* A close button as well as the drag down, which not everyone finds. */}
      <View className="flex-row justify-end px-4">
        <CloseButton onPress={() => setMenuOpen(false)} />
      </View>
      <MobileNavMenu onNavigate={go} />
      <View className="border-t border-border p-4">
        <MenuPreferences onNavigate={go} />
      </View>
    </View>
  );

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
      className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-60"
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
  icon: "grid-outline" | "search-outline" | "add" | "location-outline" | "list";
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

/** Where the view menu's button sits on screen, so the menu opens from under it. */
type Anchor = { top: number; right: number };

/**
 * The view menu: monthly BS, monthly panchanga or daily panchanga, the current one ticked, opening
 * from its button like Apple Calendar's Single Day / Multi Day / List menu. (The iPhone Duo uses the
 * native toolbar menu instead.)
 */
function ViewMenuButton() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const options = usePatroViewOptions();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const open = () =>
    ref.current?.measureInWindow((x, y, w, h) => setAnchor({ top: y + h + 8, right: Math.max(8, width - (x + w)) }));
  const close = () => setAnchor(null);

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
                {options.map((option) => (
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
                    <Ionicons name={option.ion} size={20} color={colors.foreground} />
                    <Text className="text-body text-foreground" style={nepaliTextStyle(17)}>
                      {option.label}
                    </Text>
                  </Pressable>
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
 * No title bar: the side-menu button at the top left; view, place, search, new reminder and the
 * account at the top right. The menu, place, search and reminder sheets live at the root (AppOverlays), so these
 * only send requests.
 */
function AppHeaderView() {
  const { t } = useLocale();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }} className="bg-background">
      <View className="min-h-14 w-full flex-row items-center justify-between px-4 py-2">
        {/* Four rounded squares (the Duo toolbar's square.grid.2x2), so it is not mistaken for the view menu's list icon. */}
        <HeaderButton icon="grid-outline" label={t("menu_open")} onPress={requestOpenMenu} />
        <View className="flex-row items-center gap-2">
          <ViewMenuButton />
          <HeaderButton icon="location-outline" label={t("ui.search.location")} onPress={requestLocationPicker} />
          <HeaderButton icon="search-outline" label={t("ui.search.search")} onPress={requestSearch} />
          <HeaderButton icon="add" label={t("ui.reminders.new_reminder")} onPress={requestAddReminder} />
          <AccountMenu />
        </View>
      </View>
    </View>
  );
}
