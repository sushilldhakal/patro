/**
 * The two pages a link in an account email opens — set a new password and
 * confirm the email address — shared by the website and the app. Each app
 * reads the `token` from its own URL and passes it in.
 */
import { useEffect, useRef, useState } from "react";
import { apiResetPassword, apiVerifyEmail } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";

export const MIN_PASSWORD_LENGTH = 8;

/** Why a new password cannot be sent yet (catalogue key), or null when it can. */
export function resetPasswordProblem(password: string, confirm: string, token: string | null | undefined): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "auth.password_min";
  if (password !== confirm) return "auth.passwords_mismatch";
  if (!token) return "auth.reset_invalid_link";
  return null;
}

export function useResetPasswordPage(token: string | null | undefined, onDone: () => void) {
  const { t } = useLocale();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Leave the confirmation up for a moment, then go home — unless the page was
  // left first (a stray timer used to navigate away from wherever the user was).
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => onDoneRef.current(), 2000);
    return () => clearTimeout(timer);
  }, [done]);

  async function submit() {
    setError(null);
    const problem = resetPasswordProblem(password, confirm, token);
    if (problem) {
      setError(t(problem));
      return;
    }
    setBusy(true);
    try {
      await apiResetPassword(token!, password);
      setDone(true);
    } catch {
      setError(t("auth.reset_failed"));
    } finally {
      setBusy(false);
    }
  }

  return {
    copy: {
      title: t("auth.reset_page_title"),
      description: t("auth.reset_page_desc"),
      newPassword: t("auth.new_password"),
      passwordHint: t("auth.password_hint"),
      confirmPassword: t("auth.confirm_password"),
      submit: busy ? t("auth.updating") : t("auth.update_password"),
      doneTitle: t("auth.reset_done_title"),
      doneBody: t("auth.reset_done_body"),
      backHome: t("common.back_home"),
      loading: t("common.loading"),
    },
    password,
    setPassword,
    confirm,
    setConfirm,
    busy,
    error,
    done,
    submit,
  };
}

export function useVerifyEmailPage(token: string | null | undefined, refreshUser: () => unknown) {
  const { t } = useLocale();
  const [status, setStatus] = useState<"loading" | "ok" | "error">(() => (token ? "loading" : "error"));
  const [messageKey, setMessageKey] = useState(token ? "" : "auth.verify_missing_token");

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiVerifyEmail(token)
      .then(() => {
        if (!active) return;
        setStatus("ok");
        // The email is verified at this point; a failed profile refresh must not turn that into an error.
        void Promise.resolve(refreshUser()).catch(() => {});
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
        setMessageKey("auth.verify_failed");
      });
    return () => {
      active = false;
    };
  }, [refreshUser, token]);

  return {
    status,
    copy: {
      okTitle: t("auth.verify_ok_title"),
      okBody: t("auth.verify_ok_body"),
      goToAccount: t("auth.go_to_account"),
      failTitle: t("auth.verify_fail_title"),
      failBody: messageKey ? t(messageKey) : "",
      backToAccount: t("auth.back_to_account"),
    },
  };
}
