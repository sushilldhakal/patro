import { useRef, useState } from "react";
import { Modal, Pressable as RNPressable, View, useWindowDimensions } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import { accountClasses as account } from "@vedic-patro/design-tokens/classes/account-classes";
import { Box, Button, Pressable, Text } from "@vedic-patro/ui";
import type { AccountMenuProps } from "../contract";

/** Gap between the avatar and the top of the menu, and the menu's distance from the screen edge. */
const MENU_GAP = 8;
const SCREEN_EDGE = 12;

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
  onSignOut,
  copy,
  auth,
}: AccountMenuProps) {
  const anchorRef = useRef<View>(null);
  const { width } = useWindowDimensions();
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);

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
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={onCloseMenu} statusBarTranslucent>
        <RNPressable accessibilityLabel={copy.menuAria} onPress={onCloseMenu} style={{ flex: 1 }}>
          <View
            className="w-60 rounded-xl border border-border bg-card p-1.5 shadow-lg"
            style={{ position: "absolute", top: anchor?.top ?? 64, right: anchor?.right ?? SCREEN_EDGE }}
            /* Taps inside the card stay with its items rather than closing it. */
            onStartShouldSetResponder={() => true}
          >
            <Box className="flex flex-row items-center gap-2 px-2.5 py-2">
              <Box className="min-w-0">
                <Text numberOfLines={1} className={account.menuEmail}>
                  {email}
                </Text>
                <Text className={account.menuStatus}>{verified ? statusLabel : statusLabel}</Text>
              </Box>
            </Box>
            <Box className="my-1 h-px bg-border" />
            <Pressable label={copy.myProfiles} onPress={onProfiles} className={cn("flex w-full flex-row", account.menuItem)}>
              <Text className={account.menuItemText}>{copy.myProfiles}</Text>
            </Pressable>
            <Pressable label={copy.signOut} onPress={onSignOut} className={cn("flex w-full flex-row", account.menuItem)}>
              <Text className={account.menuItemText}>{copy.signOut}</Text>
            </Pressable>
          </View>
        </RNPressable>
      </Modal>
    </View>
  );
}
