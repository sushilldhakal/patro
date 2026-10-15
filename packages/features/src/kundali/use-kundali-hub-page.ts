/**
 * Kundali hub page logic, shared by the website (`apps/web/src/pages/Kundali.tsx`)
 * and the app (`apps/mobile/app/(tabs)/kundali/index.tsx`): what the page
 * shows while auth resolves, the sign-in prompt and its auth dialog, and copy.
 * The profile picker itself stays in each app.
 */
import { useState } from "react";
import { useLocale } from "@vedic-patro/i18n/react";

export type AuthDialogMode = "login" | "signup";

/** The sign-in/sign-up dialog a page opens from its login prompt. */
export function useAuthDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthDialogMode>("login");
  const openAs = (next: AuthDialogMode) => {
    setMode(next);
    setOpen(true);
  };
  return {
    open,
    mode,
    setOpen,
    openLogin: () => openAs("login"),
    openSignup: () => openAs("signup"),
  };
}

export type KundaliHubStatus = "loading" | "login" | "ready";

export function useKundaliHubPage({ isAuthenticated, authLoading }: { isAuthenticated: boolean; authLoading: boolean }) {
  const { t } = useLocale();
  const authDialog = useAuthDialog();
  const status: KundaliHubStatus = authLoading ? "loading" : isAuthenticated ? "ready" : "login";

  return {
    status,
    authDialog,
    /** The "add profile" button shows once the reader is signed in. */
    canAddProfile: isAuthenticated,
    copy: {
      eyebrow: t("kundali.eyebrow"),
      title: t("kundali.title"),
      subtitle: isAuthenticated ? t("kundali.subtitle_auth") : t("kundali.login_required"),
      addProfile: t("kundali.add_profile"),
      loading: t("common.loading"),
      loginTitle: t("kundali.login_prompt_title"),
      loginBody: t("kundali.login_prompt_body"),
      login: t("kundali.login"),
      signup: t("kundali.signup"),
      profileHint: t("kundali.profile_hint"),
    },
  };
}
