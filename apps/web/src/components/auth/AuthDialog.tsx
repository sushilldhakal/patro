import { Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiForgotPassword } from "@/lib/auth/client";
import { GoogleSignInButton, googleSignInEnabled } from "./GoogleSignInButton";
import { FacebookSignInButton, facebookSignInEnabled } from "./FacebookSignInButton";

type Mode = "login" | "signup" | "forgot";

const labelClass = "text-sm text-base text-foreground";
const fieldWrap = "flex flex-col gap-1.5";

export function AuthDialog({
  open,
  onOpenChange,
  initialMode = "login",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: Mode;
}) {
  const { t } = useTranslation();
  const { login, signup, loginWithGoogle, loginWithFacebook } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function reset(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirm("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "signup" && password !== confirm) {
      setError(t("auth.passwords_mismatch"));
      return;
    }
    if ((mode === "signup" || mode === "login") && password.length < 8 && mode === "signup") {
      setError(t("auth.password_min"));
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
        onOpenChange(false);
      } else if (mode === "signup") {
        await signup(email.trim(), password);
        setNotice(t("auth.signup_notice"));
        // Close shortly after so the notice is seen.
        setTimeout(() => onOpenChange(false), 1200);
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

  const onGoogle = useCallback(
    async (idToken: string) => {
      setError(null);
      setBusy(true);
      try {
        await loginWithGoogle(idToken);
        onOpenChange(false);
      } catch {
        setError(t("auth.google_error"));
      } finally {
        setBusy(false);
      }
    },
    [loginWithGoogle, onOpenChange, t],
  );

  const onFacebook = useCallback(
    async (accessToken: string) => {
      setError(null);
      setBusy(true);
      try {
        await loginWithFacebook(accessToken);
        onOpenChange(false);
      } catch {
        setError(t("auth.facebook_error"));
      } finally {
        setBusy(false);
      }
    },
    [loginWithFacebook, onOpenChange, t],
  );

  const socialEnabled = googleSignInEnabled || facebookSignInEnabled;

  const title =
    mode === "login" ? t("auth.sign_in") : mode === "signup" ? t("auth.create_account") : t("auth.reset_password");
  const desc =
    mode === "login"
      ? t("auth.sign_in_desc")
      : mode === "signup"
        ? t("auth.signup_desc")
        : t("auth.forgot_desc");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>

        {mode !== "forgot" && socialEnabled && (
          <div className="flex flex-col items-center gap-3">
            {googleSignInEnabled && (
              <GoogleSignInButton onCredential={onGoogle} onError={setError} />
            )}
            {facebookSignInEnabled && (
              <FacebookSignInButton
                onAccessToken={onFacebook}
                onError={setError}
                disabled={busy}
              />
            )}
            <div className="flex w-full items-center gap-3 text-xs">
              <span className="h-px flex-1 bg-border" />
              {t("auth.or")}
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="auth-email">
              {t("auth.email")}
            </label>
            <Input
              id="auth-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.email_placeholder")}
            />
          </div>

          {mode !== "forgot" && (
            <div className={fieldWrap}>
              <label className={labelClass} htmlFor="auth-password">
                {t("auth.password")}
              </label>
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? t("auth.password_hint") : "••••••••"}
              />
            </div>
          )}

          {mode === "signup" && (
            <div className={fieldWrap}>
              <label className={labelClass} htmlFor="auth-confirm">
                {t("auth.confirm_password")}
              </label>
              <Input
                id="auth-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {notice && <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}

          <Button type="submit" size="lg" disabled={busy} className="mt-1">
            {busy
              ? t("auth.please_wait")
              : mode === "login"
                ? t("auth.sign_in")
                : mode === "signup"
                  ? t("auth.create_account")
                  : t("auth.send_reset")}
          </Button>
        </form>

        <div className="flex flex-col gap-1 text-center text-sm">
          {mode === "login" && (
            <>
              <button type="button" className="hover:text-foreground" onClick={() => reset("forgot")}>
                {t("auth.forgot_password")}
              </button>
              <span>
                {t("auth.new_here")}{" "}
                <button
                  type="button"
                  className="text-base text-secondary hover:underline"
                  onClick={() => reset("signup")}
                >
                  {t("auth.create_account")}
                </button>
              </span>
            </>
          )}
          {mode === "signup" && (
            <span>
              {t("auth.already_have")}{" "}
              <button
                type="button"
                className="text-base text-secondary hover:underline"
                onClick={() => reset("login")}
              >
                {t("auth.sign_in")}
              </button>
            </span>
          )}
          {mode === "forgot" && (
            <button type="button" className="hover:text-foreground" onClick={() => reset("login")}>
              {t("auth.back_to_sign_in")}
            </button>
          )}
        </div>

        {mode !== "forgot" ? (
          <p className="text-center text-xs text-muted-foreground">
            {t("auth.legal_agree")}{" "}
            <Link to="/privacy" className="text-secondary hover:underline" onClick={() => onOpenChange(false)}>
              {t("auth.privacy")}
            </Link>
            {" · "}
            <Link to="/terms" className="text-secondary hover:underline" onClick={() => onOpenChange(false)}>
              {t("auth.terms")}
            </Link>
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
