/**
 * The header's account menu, shared by the website's and the app's
 * `components/auth/AccountMenu.tsx`: signed out it offers sign-in (opening
 * the auth dialog), signed in an avatar with the email, its verification
 * status, a link to the account page and sign-out. Each app draws it as a
 * popover or a bottom sheet.
 */
import { useState } from "react";
import { useLocale } from "@vedic-patro/i18n/react";

export function useAccountMenu(auth: {
  user: { email: string; is_verified: boolean } | null | undefined;
  loading: boolean;
  logout: () => Promise<unknown>;
}) {
  const { t } = useLocale();
  const { user } = auth;
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return {
    status: auth.loading ? ("loading" as const) : user ? ("signed-in" as const) : ("signed-out" as const),
    authOpen,
    setAuthOpen,
    openAuth: () => setAuthOpen(true),
    menuOpen,
    setMenuOpen,
    openMenu: () => setMenuOpen(true),
    closeMenu: () => setMenuOpen(false),
    signOut: () => {
      setMenuOpen(false);
      void auth.logout();
    },
    email: user?.email ?? "",
    /** The avatar's letter. */
    initial: user ? user.email.charAt(0).toUpperCase() : "",
    verified: Boolean(user?.is_verified),
    statusLabel: user?.is_verified ? t("account_page.verified") : t("account_page.email_unverified"),
    copy: {
      signIn: t("auth.sign_in"),
      menuAria: t("account_page.menu_aria"),
      myProfiles: t("account_page.my_profiles"),
      signOut: t("account_page.sign_out"),
    },
  };
}
