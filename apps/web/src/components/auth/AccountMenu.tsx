import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { User, LogOut, UserCircle, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth/AuthContext";
import { importWithRetry } from "@/lib/lazy-route";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";

const LazyAuthDialog = lazy(() =>
  importWithRetry(() => import("./AuthDialog")).then((m) => ({ default: m.AuthDialog })),
);

export function AccountMenu() {
  const { t } = useTranslation();
  const { user, loading, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return <div className={cn("animate-pulse", accountClasses.avatarSkeleton)} aria-hidden />;
  }

  if (!user) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)}>
          <User className="size-3.5" />
          {t("auth.sign_in")}
        </Button>
        {authOpen ? (
          <Suspense fallback={null}>
            <LazyAuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
          </Suspense>
        ) : null}
      </>
    );
  }

  const initial = user.email.charAt(0).toUpperCase();

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("flex transition-colors hover:bg-secondary/25", accountClasses.avatar, accountClasses.avatarText)}
          aria-label={t("account_page.menu_aria")}
        >
          {initial}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-1.5">
        <div className="flex items-center gap-2 px-2.5 py-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-secondary/15 text-secondary">
            <UserCircle className="size-5" />
          </div>
          <div className="min-w-0">
            <p className={cn("truncate", accountClasses.menuEmail)}>{user.email}</p>
            <p className={cn("flex items-center gap-1", accountClasses.menuStatus)}>
              {user.is_verified ? (
                <>
                  <BadgeCheck className="size-3 text-emerald-500" /> {t("account_page.verified")}
                </>
              ) : (
                t("account_page.email_unverified")
              )}
            </p>
          </div>
        </div>
        <div className="my-1 h-px bg-border" />
        <Link
          to="/account"
          onClick={() => setMenuOpen(false)}
          className={cn("flex transition-colors hover:bg-muted hover:text-foreground", accountClasses.menuItem)}
        >
          <UserCircle className="size-4" />
          {t("account_page.my_profiles")}
        </Link>
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            void logout();
          }}
          className={cn("flex w-full transition-colors hover:bg-muted hover:text-foreground", accountClasses.menuItem)}
        >
          <LogOut className="size-4" />
          {t("account_page.sign_out")}
        </button>
      </PopoverContent>
    </Popover>
  );
}
