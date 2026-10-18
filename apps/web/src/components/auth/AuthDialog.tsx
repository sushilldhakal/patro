import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAuthDialog, type AuthDialogMode } from "@vedic-patro/features/account";
import { Box, Text } from "@vedic-patro/ui";
import { AuthDialog as AuthDialogView } from "@vedic-patro/ui/kit/shell";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { GoogleSignInButton, googleSignInEnabled } from "./GoogleSignInButton";
import { FacebookSignInButton, facebookSignInEnabled } from "./FacebookSignInButton";

/** Sign-in dialog. Social buttons stay here; the sheet is `@vedic-patro/ui/kit/shell`. */
export function AuthDialog({
  open,
  onOpenChange,
  initialMode = "login",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthDialogMode;
}) {
  const navigate = useNavigate();
  const d = useAuthDialog({ open, onOpenChange, initialMode, auth: useAuth() });
  const socialOn = d.showSocial && (googleSignInEnabled || facebookSignInEnabled);
  const closeLegal = (path: "/privacy" | "/terms") => {
    onOpenChange(false);
    navigate({ to: path });
  };
  return (
    <AuthDialogView
      open={open}
      onClose={() => onOpenChange(false)}
      title={d.copy.title}
      description={d.copy.description}
      closeLabel={d.copy.cancel}
      social={
        socialOn ? (
          <Box className={cn("mb-3 flex flex-col items-center", accountClasses.socialStack)}>
            {googleSignInEnabled ? <GoogleSignInButton onCredential={d.onGoogle} onError={d.setError} /> : null}
            {facebookSignInEnabled ? <FacebookSignInButton onAccessToken={d.onFacebook} onError={d.setError} disabled={d.busy} /> : null}
            <Box className={cn("flex flex-row", accountClasses.socialDividerRow)}>
              <Box className={accountClasses.socialDividerLine} />
              <Text className={accountClasses.socialDividerText}>{d.copy.or}</Text>
              <Box className={accountClasses.socialDividerLine} />
            </Box>
          </Box>
        ) : null
      }
      email={d.email}
      onEmail={d.setEmail}
      emailLabel={d.copy.email}
      emailPlaceholder={d.copy.emailPlaceholder}
      showPassword={d.showPassword}
      password={d.password}
      onPassword={d.setPassword}
      passwordLabel={d.copy.password}
      passwordPlaceholder={d.copy.passwordPlaceholder}
      showConfirm={d.showConfirm}
      confirm={d.confirm}
      onConfirm={d.setConfirm}
      confirmLabel={d.copy.confirmPassword}
      error={d.error}
      notice={d.notice}
      busy={d.busy}
      submitLabel={d.copy.submit}
      onSubmit={() => void d.submit()}
      mode={d.mode}
      onSwitch={d.switchMode}
      switchCopy={{
        forgot: d.copy.forgotPassword,
        newHere: d.copy.newHere,
        create: d.copy.createAccount,
        already: d.copy.alreadyHave,
        signIn: d.copy.signIn,
        back: d.copy.backToSignIn,
      }}
      showLegal={d.showLegal}
      legalAgree={d.copy.legalAgree}
      privacyLabel={d.copy.privacy}
      termsLabel={d.copy.terms}
      onPrivacy={() => closeLegal("/privacy")}
      onTerms={() => closeLegal("/terms")}
    />
  );
}
