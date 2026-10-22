import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAccountMenu } from "@vedic-patro/features/account";
import { AccountMenu as AccountMenuView } from "@vedic-patro/ui/kit/shell";
import { AuthDialog } from "./AuthDialog";

/** Header account control. The menu is shared; this file opens the account screen and the sign-in dialog. */
export function AccountMenu() {
  const router = useRouter();
  const menu = useAccountMenu(useAuth());
  return (
    <AccountMenuView
      status={menu.status}
      initial={menu.initial}
      email={menu.email}
      verified={menu.verified}
      statusLabel={menu.statusLabel}
      menuOpen={menu.menuOpen}
      onOpenMenu={menu.openMenu}
      onCloseMenu={menu.closeMenu}
      onSignIn={menu.openAuth}
      onProfiles={() => {
        menu.closeMenu();
        router.push("/account" as never);
      }}
      onSettings={() => {
        menu.closeMenu();
        router.push("/account/settings" as never);
      }}
      onSignOut={menu.signOut}
      copy={menu.copy}
      auth={<AuthDialog open={menu.authOpen} onOpenChange={menu.setAuthOpen} initialMode="login" />}
    />
  );
}
