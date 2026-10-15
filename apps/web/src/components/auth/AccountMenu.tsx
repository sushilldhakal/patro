import { lazy, Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAccountMenu } from "@vedic-patro/features/account";
import { AccountMenu as AccountMenuView } from "@vedic-patro/ui/kit/shell";
import { importWithRetry } from "@/lib/lazy-route";

const LazyAuthDialog = lazy(() =>
  importWithRetry(() => import("./AuthDialog")).then((m) => ({ default: m.AuthDialog })),
);

/** Header account control. The menu is shared; this file opens the account page and the sign-in dialog. */
export function AccountMenu() {
  const menu = useAccountMenu(useAuth());
  const navigate = useNavigate();
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
        navigate({ to: "/account" });
      }}
      onSignOut={menu.signOut}
      copy={menu.copy}
      auth={
        menu.authOpen ? (
          <Suspense fallback={null}>
            <LazyAuthDialog open={menu.authOpen} onOpenChange={menu.setAuthOpen} initialMode="login" />
          </Suspense>
        ) : null
      }
    />
  );
}
