import { useEffect, useRef, useState } from "react";
import { Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAuthDialog, type AuthDialogMode } from "@vedic-patro/features/account";
import { AuthDialog as AuthDialogView } from "@vedic-patro/ui/kit/shell";
import { SocialSignInButtons } from "./SocialSignInButtons";

/** Sign-in dialog. Social sign-in stays here; the sheet is `@vedic-patro/ui/kit/shell`. */
export function AuthDialog({
  open,
  onOpenChange,
  initialMode = "login",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthDialogMode;
}) {
  const router = useRouter();
  const auth = useAuth();
  // Signed out with Face ID on: tapping sign in asks for Face ID first, and the
  // password form only shows if the reader cancels it.
  const [tryingBiometric, setTryingBiometric] = useState(false);
  const triedThisOpen = useRef(false);
  useEffect(() => {
    if (!open) {
      triedThisOpen.current = false;
      return;
    }
    if (triedThisOpen.current || initialMode !== "login") return;
    triedThisOpen.current = true;
    setTryingBiometric(true);
    void auth
      .resumeWithBiometrics()
      .then((ok) => {
        if (ok) onOpenChange(false);
      })
      .finally(() => setTryingBiometric(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const d = useAuthDialog({
    open,
    onOpenChange,
    initialMode,
    auth,
    onClose: Keyboard.dismiss,
    resetBetweenOpens: true,
  });
  const openLegal = (path: string) => {
    d.close();
    router.push(path as never);
  };
  return (
    <AuthDialogView
      open={open && !tryingBiometric}
      onClose={d.close}
      title={d.copy.title}
      description={d.copy.description}
      closeLabel={d.copy.cancel}
      social={
        d.showSocial ? (
          <SocialSignInButtons onGoogle={d.onGoogle} onFacebook={d.onFacebook} onApple={d.onApple} onError={d.setError} disabled={d.busy} />
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
      onPrivacy={() => openLegal("/privacy")}
      onTerms={() => openLegal("/terms")}
    />
  );
}
