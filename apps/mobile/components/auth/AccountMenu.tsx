import { Modal, Pressable, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAccountMenu } from "@vedic-patro/features/account";
import { useThemeColors } from "@/lib/theme-context";
import { AuthDialog } from "./AuthDialog";

import { neutral, withAlpha } from "@vedic-patro/design-tokens";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";
/** Signed-out → लग-इन button; signed-in → avatar + account sheet. Mirrors web AccountMenu. */
export function AccountMenu() {
  const colors = useThemeColors();
  const router = useRouter();
  const menu = useAccountMenu(useAuth());
  const { copy } = menu;

  if (menu.status === "loading") {
    return <View className={accountClasses.avatarSkeleton} />;
  }

  if (menu.status === "signed-out") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          label={copy.signIn}
          onPress={menu.openAuth}
          className="gap-1.5"
          icon={<Ionicons name="person-outline" size={14} color={colors.foreground} />}
        />
        <AuthDialog open={menu.authOpen} onOpenChange={menu.setAuthOpen} initialMode="login" />
      </>
    );
  }

  return (
    <>
      <Pressable
        onPress={menu.openMenu}
        className={cn(accountClasses.avatar, "active:opacity-80")}
        accessibilityLabel={copy.menuAria}
      >
        <Text className={accountClasses.avatarText}>{menu.initial}</Text>
      </Pressable>

      <Modal visible={menu.menuOpen} transparent animationType="fade" onRequestClose={menu.closeMenu}>
        <Pressable
          className="flex-1"
          style={{ backgroundColor: withAlpha(neutral.black, 0.4) }}
          onPress={menu.closeMenu}
        />
        <View
          className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border pb-8"
          style={{ backgroundColor: colors.card }}
        >
          <View className="items-center pt-2.5">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: colors.border }} />
          </View>
          <View className="flex-row items-center gap-3 px-4 py-4">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-secondary/15">
              <Ionicons name="person-circle-outline" size={28} color={colors.secondary} />
            </View>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className={accountClasses.menuEmail}>
                {menu.email}
              </Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                {menu.verified ? (
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                ) : null}
                <Text className={accountClasses.menuStatus}>
                  {menu.statusLabel}
                </Text>
              </View>
            </View>
          </View>
          <View className="mx-4 h-px bg-border" />
          <Pressable
            onPress={() => {
              menu.closeMenu();
              router.push("/account" as never);
            }}
            className={cn(accountClasses.menuItem, "mx-2 mt-2 flex-row py-3 active:bg-muted")}
          >
            <Ionicons name="person-outline" size={16} color={colors.foreground} />
            <Text className={accountClasses.menuItemText}>
              {copy.myProfiles}
            </Text>
          </Pressable>
          <Pressable
            onPress={menu.signOut}
            className={cn(accountClasses.menuItem, "mx-2 flex-row py-3 active:bg-muted")}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.foreground} />
            <Text className={accountClasses.menuItemText}>{copy.signOut}</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
