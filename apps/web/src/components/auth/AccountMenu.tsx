import { lazy, Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAccountMenu } from "@vedic-patro/features/account";
import { AccountMenu as AccountMenuView } from "@vedic-patro/ui/kit/shell";
import { importWithRetry } from "@/lib/lazy-route";

const LazyAuthDialog = lazy(() =>
  importWithRetry(() => import("./AuthDialog")).then((m) => ({ default: m.AuthDialog })),
);

/** Header account control: the avatar goes to the profile page; signed out it opens the sign-in dialog. */
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
      // No dropdown: the avatar opens the profile page, where profile, events, settings and sign out live.
      menuOpen={false}
      onOpenMenu={() => void navigate({ to: "/account" })}
      onCloseMenu={menu.closeMenu}
      onSignIn={menu.openAuth}
      onProfiles={() => void navigate({ to: "/account" })}
      onSettings={() => void navigate({ to: "/account/settings" })}
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
