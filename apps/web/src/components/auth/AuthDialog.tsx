import { Link } from "@tanstack/react-router";
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
import { useAuthDialog, type AuthDialogMode } from "@vedic-patro/features/account";
import { GoogleSignInButton, googleSignInEnabled } from "./GoogleSignInButton";
import { FacebookSignInButton, facebookSignInEnabled } from "./FacebookSignInButton";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";

const labelClass = accountClasses.label;
const fieldWrap = cn("flex flex-col", accountClasses.field);

export function AuthDialog({
  open,
  onOpenChange,
  initialMode = "login",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthDialogMode;
}) {
  const auth = useAuth();
  const d = useAuthDialog({ open, onOpenChange, initialMode, auth });
  const { copy, mode } = d;

  const socialEnabled = googleSignInEnabled || facebookSignInEnabled;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {d.showSocial && socialEnabled && (
          <div className={cn("flex flex-col items-center", accountClasses.socialStack)}>
            {googleSignInEnabled && (
              <GoogleSignInButton onCredential={d.onGoogle} onError={d.setError} />
            )}
            {facebookSignInEnabled && (
              <FacebookSignInButton
                onAccessToken={d.onFacebook}
                onError={d.setError}
                disabled={d.busy}
              />
            )}
            <div className={cn("flex", accountClasses.socialDividerRow)}>
              <span className={accountClasses.socialDividerLine} />
              {copy.or}
              <span className={accountClasses.socialDividerLine} />
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void d.submit();
          }}
          className={cn("flex flex-col", accountClasses.dialogForm)}
        >
          <div className={fieldWrap}>
            <label className={labelClass} htmlFor="auth-email">
              {copy.email}
            </label>
            <Input
              id="auth-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={d.email}
              onChange={(e) => d.setEmail(e.target.value)}
              placeholder={copy.emailPlaceholder}
            />
          </div>

          {d.showPassword && (
            <div className={fieldWrap}>
              <label className={labelClass} htmlFor="auth-password">
                {copy.password}
              </label>
              <Input
                id="auth-password"
                type="password"
                autoComplete={d.passwordAutoComplete}
                required
                value={d.password}
                onChange={(e) => d.setPassword(e.target.value)}
                placeholder={copy.passwordPlaceholder}
              />
            </div>
          )}

          {d.showConfirm && (
            <div className={fieldWrap}>
              <label className={labelClass} htmlFor="auth-confirm">
                {copy.confirmPassword}
              </label>
              <Input
                id="auth-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={d.confirm}
                onChange={(e) => d.setConfirm(e.target.value)}
              />
            </div>
          )}

          {d.error && <p className={accountClasses.formError}>{d.error}</p>}
          {d.notice && <p className={accountClasses.formNotice}>{d.notice}</p>}

          <Button type="submit" size="lg" disabled={d.busy} className={accountClasses.submit}>
            {copy.submit}
          </Button>
        </form>

        <div className={cn("flex flex-col", accountClasses.switchStack)}>
          {mode === "login" && (
            <>
              <button type="button" className="hover:text-foreground" onClick={() => d.switchMode("forgot")}>
                {copy.forgotPassword}
              </button>
              <span>
                {copy.newHere}{" "}
                <button
                  type="button"
                  className={cn("hover:underline", accountClasses.switchLink)}
                  onClick={() => d.switchMode("signup")}
                >
                  {copy.createAccount}
                </button>
              </span>
            </>
          )}
          {mode === "signup" && (
            <span>
              {copy.alreadyHave}{" "}
              <button
                type="button"
                className={cn("hover:underline", accountClasses.switchLink)}
                onClick={() => d.switchMode("login")}
              >
                {copy.signIn}
              </button>
            </span>
          )}
          {mode === "forgot" && (
            <button type="button" className="hover:text-foreground" onClick={() => d.switchMode("login")}>
              {copy.backToSignIn}
            </button>
          )}
        </div>

        {d.showLegal ? (
          <p className={accountClasses.legal}>
            {copy.legalAgree}{" "}
            <Link to="/privacy" className={cn("hover:underline", accountClasses.legalLink)} onClick={() => onOpenChange(false)}>
              {copy.privacy}
            </Link>
            {" · "}
            <Link to="/terms" className={cn("hover:underline", accountClasses.legalLink)} onClick={() => onOpenChange(false)}>
              {copy.terms}
            </Link>
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
