/**
 * The sign-in dialog, shared by the website's and the app's
 * `components/auth/AuthDialog.tsx`: the three modes (sign in, create an
 * account, reset the password), the form fields and their checks, the
 * social sign-in handlers, and copy. Each app passes in its own auth
 * context and draws the dialog (a website dialog, an app modal sheet).
 */
import { useState } from "react";
import { apiForgotPassword } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";
import { MIN_PASSWORD_LENGTH } from "./use-account-email-pages";

export type AuthDialogMode = "login" | "signup" | "forgot";

export type AuthDialogActions = {
  login: (email: string, password: string) => Promise<unknown>;
  signup: (email: string, password: string) => Promise<unknown>;
  loginWithGoogle: (idToken: string) => Promise<unknown>;
  loginWithFacebook: (accessToken: string) => Promise<unknown>;
  /** The app's Sign in with Apple; the website has none. */
  loginWithApple?: (identityToken: string, email?: string | null) => Promise<unknown>;
};

/** How long the "check your inbox" notice stays up after signing up. */
const SIGNUP_CLOSE_DELAY_MS = 1200;

export function useAuthDialog({
  open,
  onOpenChange,
  initialMode = "login",
  auth,
  onClose,
  resetBetweenOpens = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthDialogMode;
  auth: AuthDialogActions;
  /** Platform follow-up when the dialog closes (the app hides the keyboard). */
  onClose?: () => void;
  /** Start every opening afresh in `initialMode` with empty fields (the app's modal stays mounted). */
  resetBetweenOpens?: boolean;
}) {
  const { t } = useLocale();
  const [mode, setMode] = useState<AuthDialogMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && resetBetweenOpens) setMode(initialMode);
  }

  function switchMode(next: AuthDialogMode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirm("");
  }

  function close() {
    onClose?.();
    onOpenChange(false);
    if (resetBetweenOpens) {
      setTimeout(() => switchMode("login"), 200);
      setEmail("");
    }
  }

  async function submit() {
    setError(null);
    setNotice(null);

    if (mode === "signup" && password !== confirm) {
      setError(t("auth.passwords_mismatch"));
      return;
    }
    if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
      setError(t("auth.password_min"));
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        await auth.login(email.trim(), password);
        close();
      } else if (mode === "signup") {
        await auth.signup(email.trim(), password);
        setNotice(t("auth.signup_notice"));
        // Close shortly after so the notice is seen.
        setTimeout(close, SIGNUP_CLOSE_DELAY_MS);
      } else {
        await apiForgotPassword(email.trim());
        setNotice(t("auth.forgot_notice"));
      }
    } catch {
      setError(t("auth.generic_error"));
    } finally {
      setBusy(false);
    }
  }

  async function social(run: () => Promise<unknown>, errorKey: string) {
    setError(null);
    setBusy(true);
    try {
      await run();
      close();
    } catch {
      setError(t(errorKey));
    } finally {
      setBusy(false);
    }
  }

  const onGoogle = (idToken: string) => social(() => auth.loginWithGoogle(idToken), "auth.google_error");
  const onFacebook = (accessToken: string) => social(() => auth.loginWithFacebook(accessToken), "auth.facebook_error");
  const loginWithApple = auth.loginWithApple;
  const onApple = (identityToken: string, appleEmail?: string | null) =>
    loginWithApple ? social(() => loginWithApple(identityToken, appleEmail), "ui.auth.apple_sign_in_failed") : Promise.resolve();

  const signIn = t("auth.sign_in");
  const createAccount = t("auth.create_account");
  const title = mode === "login" ? signIn : mode === "signup" ? createAccount : t("auth.reset_password");
  const description =
    mode === "login" ? t("auth.sign_in_desc") : mode === "signup" ? t("auth.signup_desc") : t("auth.forgot_desc");
  const submitLabel = busy ? t("auth.please_wait") : mode === "login" ? signIn : mode === "signup" ? createAccount : t("auth.send_reset");

  return {
    mode,
    /** Social buttons and the legal note are hidden while resetting a password. */
    showSocial: mode !== "forgot",
    showPassword: mode !== "forgot",
    showConfirm: mode === "signup",
    showLegal: mode !== "forgot",
    email,
    setEmail,
    password,
    setPassword,
    confirm,
    setConfirm,
    busy,
    error,
    setError,
    notice,
    submit,
    close,
    switchMode,
    onGoogle,
    onFacebook,
    onApple,
    /** Autocomplete hint for the password field. */
    passwordAutoComplete: mode === "login" ? ("current-password" as const) : ("new-password" as const),
    copy: {
      title,
      description,
      submit: submitLabel,
      or: t("auth.or"),
      email: t("auth.email"),
      emailPlaceholder: t("auth.email_placeholder"),
      password: t("auth.password"),
      /* Dots in an empty field read as a password already filled in. */
      passwordPlaceholder: mode === "signup" ? t("auth.password_hint") : undefined,
      confirmPassword: t("auth.confirm_password"),
      forgotPassword: t("auth.forgot_password"),
      newHere: t("auth.new_here"),
      createAccount,
      alreadyHave: t("auth.already_have"),
      signIn,
      backToSignIn: t("auth.back_to_sign_in"),
      legalAgree: t("auth.legal_agree"),
      privacy: t("auth.privacy"),
      terms: t("auth.terms"),
      cancel: t("common.cancel"),
      done: t("common.done"),
    },
  };
}
