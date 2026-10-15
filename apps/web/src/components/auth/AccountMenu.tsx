import { lazy, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { User, LogOut, UserCircle, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAccountMenu } from "@vedic-patro/features/account";
import { importWithRetry } from "@/lib/lazy-route";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";

const LazyAuthDialog = lazy(() =>
  importWithRetry(() => import("./AuthDialog")).then((m) => ({ default: m.AuthDialog })),
);

export function AccountMenu() {
  const menu = useAccountMenu(useAuth());
  const { copy } = menu;

  if (menu.status === "loading") {
    return <div className={cn("animate-pulse", accountClasses.avatarSkeleton)} aria-hidden />;
  }

  if (menu.status === "signed-out") {
    return (
      <>
        <Button variant="outline" size="sm" onClick={menu.openAuth}>
          <User className="size-3.5" />
          {copy.signIn}
        </Button>
        {menu.authOpen ? (
          <Suspense fallback={null}>
            <LazyAuthDialog open={menu.authOpen} onOpenChange={menu.setAuthOpen} initialMode="login" />
          </Suspense>
        ) : null}
      </>
    );
  }

  return (
    <Popover open={menu.menuOpen} onOpenChange={menu.setMenuOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("flex transition-colors hover:bg-secondary/25", accountClasses.avatar, accountClasses.avatarText)}
          aria-label={copy.menuAria}
        >
          {menu.initial}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-1.5">
        <div className="flex items-center gap-2 px-2.5 py-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-secondary/15 text-secondary">
            <UserCircle className="size-5" />
          </div>
          <div className="min-w-0">
            <p className={cn("truncate", accountClasses.menuEmail)}>{menu.email}</p>
            <p className={cn("flex items-center gap-1", accountClasses.menuStatus)}>
              {menu.verified ? (
                <>
                  <BadgeCheck className="size-3 text-emerald-500" /> {menu.statusLabel}
                </>
              ) : (
                menu.statusLabel
              )}
            </p>
          </div>
        </div>
        <div className="my-1 h-px bg-border" />
        <Link
          to="/account"
          onClick={menu.closeMenu}
          className={cn("flex transition-colors hover:bg-muted hover:text-foreground", accountClasses.menuItem)}
        >
          <UserCircle className="size-4" />
          {copy.myProfiles}
        </Link>
        <button
          type="button"
          onClick={menu.signOut}
          className={cn("flex w-full transition-colors hover:bg-muted hover:text-foreground", accountClasses.menuItem)}
        >
          <LogOut className="size-4" />
          {copy.signOut}
        </button>
      </PopoverContent>
    </Popover>
  );
}
