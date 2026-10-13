import { Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
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
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";

type Mode = "login" | "signup" | "forgot";

const labelClass = accountClasses.label;
const fieldWrap = cn("flex flex-col", accountClasses.field);

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
          <div className={cn("flex flex-col items-center", accountClasses.socialStack)}>
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
            <div className={cn("flex", accountClasses.socialDividerRow)}>
              <span className={accountClasses.socialDividerLine} />
              {t("auth.or")}
              <span className={accountClasses.socialDividerLine} />
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className={cn("flex flex-col", accountClasses.dialogForm)}>
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

          {error && <p className={accountClasses.formError}>{error}</p>}
          {notice && <p className={accountClasses.formNotice}>{notice}</p>}

          <Button type="submit" size="lg" disabled={busy} className={accountClasses.submit}>
            {busy
              ? t("auth.please_wait")
              : mode === "login"
                ? t("auth.sign_in")
                : mode === "signup"
                  ? t("auth.create_account")
                  : t("auth.send_reset")}
          </Button>
        </form>

        <div className={cn("flex flex-col", accountClasses.switchStack)}>
          {mode === "login" && (
            <>
              <button type="button" className="hover:text-foreground" onClick={() => reset("forgot")}>
                {t("auth.forgot_password")}
              </button>
              <span>
                {t("auth.new_here")}{" "}
                <button
                  type="button"
                  className={cn("hover:underline", accountClasses.switchLink)}
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
                className={cn("hover:underline", accountClasses.switchLink)}
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
          <p className={accountClasses.legal}>
            {t("auth.legal_agree")}{" "}
            <Link to="/privacy" className={cn("hover:underline", accountClasses.legalLink)} onClick={() => onOpenChange(false)}>
              {t("auth.privacy")}
            </Link>
            {" · "}
            <Link to="/terms" className={cn("hover:underline", accountClasses.legalLink)} onClick={() => onOpenChange(false)}>
              {t("auth.terms")}
            </Link>
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
