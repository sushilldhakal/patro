import { cn } from "@vedic-patro/domain/utils";
import { accountClasses as account } from "@vedic-patro/design-tokens/classes/account-classes";
import { Box, Button, Pressable, Text } from "@vedic-patro/ui";
import type { AccountMenuProps } from "../contract";

/** Header account control. Signed out it opens sign-in; signed in it drops a menu under the avatar. */
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
  if (status === "loading") return <Box className={cn("animate-pulse", account.avatarSkeleton)} />;
  if (status === "signed-out") {
    return (
      <>
        <Button label={copy.signIn} variant="outline" size="sm" onPress={onSignIn} />
        {auth}
      </>
    );
  }
  return (
    <Box className="relative">
      {menuOpen ? <Pressable label={copy.menuAria} onPress={onCloseMenu} className="fixed inset-0 z-20" /> : null}
      <Pressable label={copy.menuAria} onPress={onOpenMenu} className={cn(account.avatar, "flex")} webClassName="transition-colors hover:bg-secondary/25">
        <Text className={account.avatarText}>{initial}</Text>
      </Pressable>
      {menuOpen ? (
        <Box className={account.menuPanel}>
          <Box className="flex flex-row items-center gap-2 px-2.5 py-2">
            <Box className="min-w-0">
              <Text numberOfLines={1} className={account.menuEmail}>
                {email}
              </Text>
              <Text className={account.menuStatus}>{verified ? statusLabel : statusLabel}</Text>
            </Box>
          </Box>
          <Box className="my-1 h-px bg-border" />
          <Pressable label={copy.myProfiles} onPress={onProfiles} className={cn("flex w-full flex-row", account.menuItem)} webClassName="hover:bg-muted">
            <Text className={account.menuItemText}>{copy.myProfiles}</Text>
          </Pressable>
          <Pressable label={copy.signOut} onPress={onSignOut} className={cn("flex w-full flex-row", account.menuItem)} webClassName="hover:bg-muted">
            <Text className={account.menuItemText}>{copy.signOut}</Text>
          </Pressable>
        </Box>
      ) : null}
    </Box>
  );
}
