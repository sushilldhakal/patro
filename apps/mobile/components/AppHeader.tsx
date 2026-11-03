import { useCallback, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
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
  icon: "menu-outline" | "search-outline" | "add" | "location-outline";
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
 * No title bar: the side-menu button at the top left; place, search, new reminder and the account at
 * the top right. The menu, place, search and reminder sheets live at the root (AppOverlays), so these
 * only send requests.
 */
function AppHeaderView() {
  const { t } = useLocale();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }} className="bg-background">
      <View className="min-h-14 w-full flex-row items-center justify-between px-4 py-2">
        <HeaderButton icon="menu-outline" label={t("menu_open")} onPress={requestOpenMenu} />
        <View className="flex-row items-center gap-2">
          <HeaderButton icon="location-outline" label={t("ui.search.location")} onPress={requestLocationPicker} />
          <HeaderButton icon="search-outline" label={t("ui.search.search")} onPress={requestSearch} />
          <HeaderButton icon="add" label={t("ui.reminders.new_reminder")} onPress={requestAddReminder} />
          <AccountMenu />
        </View>
      </View>
    </View>
  );
}
