import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Text } from "@/components/ui/Text";
import { useNavPress } from "@/lib/use-nav-press";
import { Ionicons } from "@/components/icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VedicPatroMark } from "@/components/branding/VedicPatroMark";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { MenuPreferences } from "@/components/navigation/MenuPreferences";
import { MobileNavMenu } from "@/components/navigation/MobileNavMenu";
import { useLocale } from "@/lib/i18n";
import { useOpenMenuRequest } from "@/lib/menu-request";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/design-tokens/cn";
import { nepaliTextStyle } from "@/lib/nepali-text";

import { neutral, withAlpha } from "@vedic-patro/design-tokens";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
import { EASE_OUT, SPRING_SHEET, haptics, useReducedMotionPref } from "@vedic-patro/ui/motion";

/** The dim behind the drawer. */
const SCRIM_COLOR = withAlpha(neutral.black, 0.4);

/** The drawer's own slide, as it has always been: 220 ms in, 180 ms out. */
const OPEN_MS = 220;
const CLOSE_MS = 180;
/** Let go past this fraction of the drawer's width, or flick faster than this (px/s), and it closes. */
const DISMISS_FRACTION = 0.35;
const FLICK_VELOCITY = 800;
/** The screen's left edge is a hard edge: a bounce past it would open a gap beside the drawer. */
const DRAWER_SPRING = { ...SPRING_SHEET, overshootClamping: true };

/** The further past the edge, the less the drawer follows the finger. */
function rubberband(overshoot: number, dimension: number) {
  "worklet";
  if (dimension <= 0) return 0;
  const constant = 0.55;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
function BrandMark({ onPress, centered }: { onPress: () => void; centered?: boolean }) {
  const { t, pick } = useLocale();
  return (
    <Pressable
      onPress={onPress}
      className={cn(shellClasses.brand, "flex-row active:opacity-80", centered && "justify-center")}
    >
      <VedicPatroMark size={42} />
      {/* Two texts side by side, not spans inside one line: Android measured the nested line in
          the outer font, so the bold words overflowed it and "वैदिक पात्रो" was cut to "वैदिक पा…". */}
      <View className="flex-row items-baseline">
        <Text className={cn("py-0.5", shellClasses.brandName, shellClasses.brandVedic)} style={nepaliTextStyle()}>
          {t("brand_vedic")}
        </Text>
        <Text className={cn("py-0.5", shellClasses.brandName, shellClasses.brandPatro)} style={nepaliTextStyle()}>
          {/* On Android the first word already ends on a no-break space (components/ui/Text). */}
          {Platform.OS === "android" ? "" : " "}
          {t("brand_patro")}
        </Text>
      </View>
    </Pressable>
  );
}

export function AppHeader() {
  const { t, pick } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const navPress = useNavPress();
  useOpenMenuRequest(useCallback(() => setMenuOpen(true), []));

  /* From the drawer, navigate once it has slid away: pushing while its Modal is still on screen
     made iOS drop the drawer in one frame and hold the push until the new page had rendered. */
  const pendingHref = useRef<string | null>(null);
  const go = (href: string) => {
    if (!menuOpen) {
      navPress(href);
      return;
    }
    pendingHref.current = href;
    setMenuOpen(false);
  };
  const onDrawerClosed = useCallback(() => {
    const href = pendingHref.current;
    pendingHref.current = null;
    if (href) navPress(href);
  }, [navPress]);

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
        onClosed={onDrawerClosed}
        onNavigate={go}
      />
    </View>
  );
}

function NavDrawer({
  open,
  onClose,
  onClosed,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  /** The drawer has finished sliding away and is unmounted. */
  onClosed: () => void;
  onNavigate: (href: string) => void;
}) {
  const { t, pick } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const reduced = useReducedMotionPref();
  const [mounted, setMounted] = useState(open);
  /* Match web drawer: `w-[min(85vw,400px)]`. */
  const drawerWidth = Math.min(windowWidth * 0.85, 400);
  /** Drawer offset: 0 open, -width closed. Under Reduce Motion it stays 0 and `fade` does the work. */
  const x = useSharedValue(-drawerWidth);
  const widthSv = useSharedValue(drawerWidth);
  const fade = useSharedValue(0);
  const dragFrom = useSharedValue(0);
  const dismissing = useSharedValue(false);
  const committed = useRef(false);
  const openRef = useRef(open);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    widthSv.set(drawerWidth);
  }, [widthSv, drawerWidth]);

  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);
  const finishClose = useCallback(() => {
    if (openRef.current) return;
    committed.current = false;
    setMounted(false);
    onClosedRef.current();
  }, []);

  /** A drag let go past the threshold: tell the parent now, the spring carries on off screen. */
  const commitDismiss = useCallback(() => {
    haptics.snap();
    committed.current = true;
    onCloseRef.current();
  }, []);

  const animateOpen = useCallback(() => {
    dismissing.set(false);
    committed.current = false;
    if (reduced) fade.set(withTiming(1, { duration: OPEN_MS, easing: EASE_OUT }));
    else x.set(withTiming(0, { duration: OPEN_MS, easing: EASE_OUT }));
  }, [dismissing, fade, reduced, x]);

  const animateClose = useCallback(() => {
    if (reduced) {
      fade.set(
        withTiming(0, { duration: CLOSE_MS, easing: EASE_OUT }, (finished) => {
          if (finished) scheduleOnRN(finishClose);
        }),
      );
    } else {
      x.set(
        withTiming(-widthSv.get(), { duration: CLOSE_MS, easing: EASE_OUT }, (finished) => {
          if (finished) scheduleOnRN(finishClose);
        }),
      );
    }
  }, [fade, finishClose, reduced, widthSv, x]);

  useEffect(() => {
    openRef.current = open;
    if (open) {
      if (!mounted) {
        // Opening from closed: start off screen, then slide in once mounted.
        x.set(-widthSv.get());
        fade.set(0);
        dismissing.set(false);
        committed.current = false;
        setMounted(true);
        return;
      }
      animateOpen();
      return;
    }
    if (!mounted || committed.current) return;
    animateClose();
  }, [open, mounted, animateOpen, animateClose, dismissing, fade, widthSv, x]);

  /* A drag on the drawer closes it. Only a leftward drag claims the touch, so the menu still scrolls. */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!reduced)
        .activeOffsetX(-10)
        .failOffsetY([-12, 12])
        .onStart(() => {
          // From where the eye last saw it, so grabbing mid-slide doesn't teleport the drawer.
          dragFrom.set(x.get());
        })
        .onUpdate((e) => {
          if (dismissing.get()) return;
          const next = dragFrom.get() + e.translationX;
          x.set(next <= 0 ? next : rubberband(next, widthSv.get()));
        })
        .onEnd((e) => {
          if (dismissing.get()) return;
          const w = widthSv.get();
          const far = x.get() < -w * DISMISS_FRACTION;
          const flick = e.velocityX < -FLICK_VELOCITY;
          if (far || flick) {
            dismissing.set(true);
            x.set(
              withSpring(-w, { ...DRAWER_SPRING, velocity: e.velocityX }, (finished) => {
                if (finished) scheduleOnRN(finishClose);
              }),
            );
            scheduleOnRN(commitDismiss);
          } else {
            x.set(withSpring(0, { ...DRAWER_SPRING, velocity: e.velocityX }));
          }
        }),
    [commitDismiss, dismissing, dragFrom, finishClose, reduced, widthSv, x],
  );

  /* The scrim follows the drawer, so a drag dims and undims it in step. */
  /* Everything the two views need is in their one animated style, with no plain style beside it:
     a `style={[plain, animated]}` array loses the plain part here, which left the drawer as a bare
     header in the corner and the scrim unpainted. */
  const scrimMotion = useAnimatedStyle(() => ({
    flex: 1,
    backgroundColor: SCRIM_COLOR,
    opacity: reduced ? fade.get() : interpolate(x.get(), [-widthSv.get(), 0], [0, 1], Extrapolation.CLAMP),
  }));
  const drawerPaddingTop = insets.top;
  const drawerPaddingBottom = insets.bottom;
  const drawerBackground = colors.card;
  const drawerBorder = colors.border;
  const drawerMotion = useAnimatedStyle(() => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: drawerWidth,
    paddingTop: drawerPaddingTop,
    paddingBottom: drawerPaddingBottom,
    backgroundColor: drawerBackground,
    borderRightWidth: 1,
    borderRightColor: drawerBorder,
    ...(reduced ? { opacity: fade.get() } : { transform: [{ translateX: x.get() }] }),
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/* A Modal is its own window on Android: gestures need their own root inside it. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View style={scrimMotion}>
        <Pressable className="flex-1" onPress={onClose} />
      </Animated.View>
      <GestureDetector gesture={pan}>
      <Animated.View style={drawerMotion}>
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
      </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}
