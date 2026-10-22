import { cn } from "@vedic-patro/design-tokens/cn";
import { brand, neutral } from "@vedic-patro/design-tokens";
import { accountClasses as account } from "@vedic-patro/design-tokens/classes/account-classes";
import { Box, Button, Pressable, Text } from "@vedic-patro/ui";
import type { AccountMenuProps } from "../contract";

/** Lucide `badge-check`, filled: the verified tick beside the email. */
function VerifiedBadge({ label }: { label: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" role="img" aria-label={label} className="shrink-0">
      <path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill={brand.verified}
      />
      <path d="m9 12 2 2 4-4" stroke={neutral.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

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
  onSettings,
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
              <Box className="flex flex-row items-center gap-1">
                <Text numberOfLines={1} className={cn("min-w-0 truncate", account.menuEmail)}>
                  {email}
                </Text>
                {verified ? <VerifiedBadge label={statusLabel} /> : null}
              </Box>
              {verified ? null : <Text className={account.menuStatus}>{statusLabel}</Text>}
            </Box>
          </Box>
          <Box className="my-1 h-px bg-border" />
          <Pressable label={copy.myProfiles} onPress={onProfiles} className={cn("flex w-full flex-row", account.menuItem)} webClassName="hover:bg-muted">
            <Text className={account.menuItemText}>{copy.myProfiles}</Text>
          </Pressable>
          {onSettings ? (
            <Pressable label={copy.settings} onPress={onSettings} className={cn("flex w-full flex-row", account.menuItem)} webClassName="hover:bg-muted">
              <Text className={account.menuItemText}>{copy.settings}</Text>
            </Pressable>
          ) : null}
          <Pressable label={copy.signOut} onPress={onSignOut} className={cn("flex w-full flex-row", account.menuItem)} webClassName="hover:bg-muted">
            <Text className={account.menuItemText}>{copy.signOut}</Text>
          </Pressable>
        </Box>
      ) : null}
    </Box>
  );
}
