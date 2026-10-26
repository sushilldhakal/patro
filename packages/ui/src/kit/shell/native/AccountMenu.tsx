import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Modal, Pressable as RNPressable, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { brand, neutral } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/design-tokens/cn";
import { accountClasses as account } from "@vedic-patro/design-tokens/classes/account-classes";
import { Box, Button, Pressable, Text } from "@vedic-patro/ui";
import { CSS_EASE_OUT, DURATION, ENTER_SCALE, useReducedMotionPref } from "@vedic-patro/ui/motion";
import type { AccountMenuProps } from "../contract";

/** Lucide `badge-check`, filled: the verified tick beside the email. */
const BADGE_PATH =
  "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z";
const BADGE_TICK = "m9 12 2 2 4-4";

function VerifiedBadge({ label }: { label: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" accessibilityLabel={label}>
      <Path d={BADGE_PATH} fill={brand.verified} />
      <Path d={BADGE_TICK} stroke={neutral.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** Gap between the avatar and the top of the menu, and the menu's distance from the screen edge. */
const MENU_GAP = 8;
const SCREEN_EDGE = 12;
/** The menu opens out of the avatar's corner over this long; it closes over `DURATION.fast`. */
const OPEN_MS = 180;

/**
 * Keeps the menu mounted while it plays its exit. `shown` flips a frame after the modal mounts (so the
 * enter has something to move from) and straight away on close; `mounted` follows once the exit is done.
 */
function usePresence(open: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(timer);
  }, [open, exitMs]);
  useEffect(() => {
    if (!open || !mounted) return;
    let inner: number | undefined;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setShown(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner !== undefined) cancelAnimationFrame(inner);
    };
  }, [open, mounted]);
  return { mounted, shown };
}

/**
 * Header account control. Signed out it opens sign-in; signed in it drops a menu under the avatar.
 *
 * The menu is drawn in a transparent `Modal` placed under the avatar's measured position. Drawn
 * inside the header, as on the website, it sat under the page below it — React Native paints a
 * later sibling over an earlier one whatever its zIndex, and has no `fixed` backdrop to catch the
 * outside tap — so tapping the avatar showed only a sliver of the card.
 */
export function AccountMenu({
  status,
  initial,
  email,
  verified,
  statusLabel,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  onSignIn,
  onProfiles,
  onSettings,
  onSignOut,
  copy,
  auth,
}: AccountMenuProps) {
  const anchorRef = useRef<ComponentRef<typeof View>>(null);
  const { width } = useWindowDimensions();
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const reduced = useReducedMotionPref();
  const { mounted, shown } = usePresence(menuOpen, DURATION.fast);

  if (status === "loading") return <Box className={cn("animate-pulse", account.avatarSkeleton)} />;
  if (status === "signed-out") {
    return (
      <>
        <Button label={copy.signIn} variant="outline" size="sm" onPress={onSignIn} />
        {auth}
      </>
    );
  }

  const open = () => {
    const node = anchorRef.current;
    if (!node) {
      onOpenMenu();
      return;
    }
    node.measureInWindow((x, y, w, h) => {
      setAnchor({ top: y + h + MENU_GAP, right: Math.max(SCREEN_EDGE, width - (x + w)) });
      onOpenMenu();
    });
  };

  return (
    <View ref={anchorRef} collapsable={false}>
      <Pressable label={copy.menuAria} onPress={open} className={cn(account.avatar, "flex")}>
        <Text className={account.avatarText}>{initial}</Text>
      </Pressable>
      <Modal visible={mounted} transparent animationType="none" onRequestClose={onCloseMenu} statusBarTranslucent>
        <RNPressable accessibilityLabel={copy.menuAria} onPress={onCloseMenu} style={{ flex: 1 }}>
          {/* Reanimated draws the motion: from the avatar's top-right corner, scale + fade (fade only under Reduce Motion). */}
          <Animated.View
            style={{
              position: "absolute",
              top: anchor?.top ?? 64,
              right: anchor?.right ?? SCREEN_EDGE,
              transformOrigin: "top right",
              opacity: shown ? 1 : 0,
              transform: [{ scale: shown || reduced ? 1 : ENTER_SCALE }],
              transitionProperty: ["opacity", "transform"],
              transitionDuration: shown ? OPEN_MS : DURATION.fast,
              transitionTimingFunction: CSS_EASE_OUT,
            }}
          >
          <View
            className="w-60 rounded-xl border border-border bg-card p-1.5 shadow-lg"
            /* Taps inside the card stay with its items rather than closing it. */
            onStartShouldSetResponder={() => true}
          >
            <Box className="flex flex-row items-center gap-2 px-2.5 py-2">
              <Box className="min-w-0 shrink">
                <Box className="flex flex-row items-center gap-1">
                  <Text numberOfLines={1} className={cn("shrink", account.menuEmail)}>
                    {email}
                  </Text>
                  {verified ? <VerifiedBadge label={statusLabel} /> : null}
                </Box>
                {verified ? null : <Text className={account.menuStatus}>{statusLabel}</Text>}
              </Box>
            </Box>
            <Box className="my-1 h-px bg-border" />
            <Pressable label={copy.myProfiles} onPress={onProfiles} className={cn("flex w-full flex-row", account.menuItem)}>
              <Text className={account.menuItemText}>{copy.myProfiles}</Text>
            </Pressable>
            {onSettings ? (
              <Pressable label={copy.settings} onPress={onSettings} className={cn("flex w-full flex-row", account.menuItem)}>
                <Text className={account.menuItemText}>{copy.settings}</Text>
              </Pressable>
            ) : null}
            <Pressable label={copy.signOut} onPress={onSignOut} className={cn("flex w-full flex-row", account.menuItem)}>
              <Text className={account.menuItemText}>{copy.signOut}</Text>
            </Pressable>
          </View>
          </Animated.View>
        </RNPressable>
      </Modal>
    </View>
  );
}
