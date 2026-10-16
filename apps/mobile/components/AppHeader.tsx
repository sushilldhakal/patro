import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useNavPress } from "@/lib/use-nav-press";
import { Ionicons } from "@/components/icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VedicPatroMark } from "@/components/branding/VedicPatroMark";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { MenuPreferences } from "@/components/navigation/MenuPreferences";
import { MobileNavMenu } from "@/components/navigation/MobileNavMenu";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { nepaliTextStyle } from "@/lib/nepali-text";

import { neutral, withAlpha } from "@vedic-patro/design-tokens";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
function BrandMark({ onPress, centered }: { onPress: () => void; centered?: boolean }) {
  const { t, pick } = useLocale();
  return (
    <Pressable
      onPress={onPress}
      className={cn(shellClasses.brand, "flex-row active:opacity-80", centered && "justify-center")}
    >
      <VedicPatroMark size={42} />
      <Text className={cn("py-0.5", shellClasses.brandName)} numberOfLines={1} style={nepaliTextStyle()}>
        <Text className={cn(shellClasses.brandName, shellClasses.brandVedic)}>{t("brand_vedic")}</Text>
        <Text className={cn(shellClasses.brandName, shellClasses.brandPatro)}> {t("brand_patro")}</Text>
      </Text>
    </Pressable>
  );
}

export function AppHeader() {
  const { t, pick } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const navPress = useNavPress();

  const go = (href: string) => {
    setMenuOpen(false);
    navPress(href);
  };

  return (
    <View
      style={{ paddingTop: insets.top }}
      className={shellClasses.header}
    >
      <View className={cn("min-h-16 w-full flex-row py-2", shellClasses.headerInner)}>
        <View className="flex-1 flex-row justify-start">
          <Pressable
            onPress={() => setMenuOpen(true)}
            className="h-9 w-9 items-center justify-center rounded-lg active:bg-muted"
            accessibilityLabel={t("menu_open")}
          >
            <Ionicons name="menu-outline" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        <View className="shrink-0">
          <BrandMark onPress={() => go("/")} centered />
        </View>

        <View className="flex-1 flex-row items-center justify-end gap-2">
          <AccountMenu />
        </View>
      </View>

      <NavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={go}
      />
    </View>
  );
}

function NavDrawer({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
}) {
  const { t, pick } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const slide = useRef(new Animated.Value(0)).current;
  /* Match web drawer: `w-[min(85vw,400px)]`. */
  const drawerWidth = Math.min(windowWidth * 0.85, 400);

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.timing(slide, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(slide, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [open, mounted, slide]);

  if (!mounted) return null;

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [-drawerWidth, 0] });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, opacity: slide, backgroundColor: withAlpha(neutral.black, 0.4) }}>
        <Pressable className="flex-1" onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: drawerWidth,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          transform: [{ translateX }],
          backgroundColor: colors.card,
        }}
        className="border-r border-border"
      >
        <View className={cn("flex-row p-4", shellClasses.drawerBrandRow, shellClasses.drawerHeader)}>
          <VedicPatroMark size={36} />
          <View className="min-w-0 flex-1 gap-1.5">
            <Text className={shellClasses.drawerTitle}>
              <Text className={cn(shellClasses.drawerTitle, shellClasses.drawerTitleVedic)}>{t("brand_vedic")}</Text>
              <Text className={cn(shellClasses.drawerTitle, shellClasses.drawerTitlePatro)}> {t("brand_patro")}</Text>
            </Text>
            <Text className="text-sm text-muted-foreground">
              {t("ui.app_header.nepali_calendar_and_panchanga")}
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <MobileNavMenu onNavigate={onNavigate} />
          <View className="border-t border-border p-4">
            <MenuPreferences onNavigate={onNavigate} />
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
