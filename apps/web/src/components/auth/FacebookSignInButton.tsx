import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  facebookAccessToken,
  facebookLogin,
  facebookSignInEnabled,
  getFacebookLoginStatus,
  setFacebookLoginStatusHandler,
  shouldSkipFacebookAutoLogin,
  type FacebookAuthResponse,
} from "@/lib/auth/facebook-sdk";
import { socialSignInButtonClass } from "./social-sign-in-styles";
import { cn } from "@/lib/utils";

export { facebookSignInEnabled };

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.027 4.41 11.02 10.172 11.91v-8.41H7.078v-3.5h3.094V9.413c0-3.058 1.822-4.745 4.607-4.745 1.334 0 2.73.238 2.73.238v3h-1.538c-1.515 0-1.988.94-1.988 1.905v2.272h3.384l-.541 3.5h-2.843v8.41C19.59 23.093 24 18.1 24 12.073z"
      />
    </svg>
  );
}

/**
 * Theme-aware Facebook sign-in. Uses FB.login + getLoginStatus (not the white XFBML widget).
 */
export function FacebookSignInButton({
  onAccessToken,
  onError,
  disabled,
  checkStatus = true,
}: {
  onAccessToken: (accessToken: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  checkStatus?: boolean;
}) {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(
    () => checkStatus && facebookSignInEnabled && !shouldSkipFacebookAutoLogin(),
  );
  const [ready, setReady] = useState(
    () => !checkStatus || !facebookSignInEnabled || shouldSkipFacebookAutoLogin(),
  );
  const onAccessTokenRef = useRef(onAccessToken);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onAccessTokenRef.current = onAccessToken;
    onErrorRef.current = onError;
  });

  const handleStatus = useCallback((response: FacebookAuthResponse) => {
    const token = facebookAccessToken(response);
    if (token) {
      onAccessTokenRef.current(token);
      return true;
    }
    if (response.status === "not_authorized") {
      onErrorRef.current?.(t("auth.facebook_not_authorized"));
    }
    return false;
  }, [t]);

  useEffect(() => {
    if (!facebookSignInEnabled) return;

    setFacebookLoginStatusHandler((response) => {
      handleStatus(response);
    });

    return () => setFacebookLoginStatusHandler(null);
  }, [handleStatus]);

  useEffect(() => {
    if (!facebookSignInEnabled || !checkStatus) return;
    if (shouldSkipFacebookAutoLogin()) return;

    let cancelled = false;
    getFacebookLoginStatus()
      .then((response) => {
        if (cancelled) return;
        if (!handleStatus(response)) setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          onErrorRef.current?.(t("auth.facebook_load_error"));
          setReady(true);
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [checkStatus, handleStatus, t]);

  const onClick = useCallback(() => {
    setChecking(true);
    facebookLogin()
      .then((response) => {
        if (!handleStatus(response) && response.status === "unknown") {
          onErrorRef.current?.(t("auth.facebook_cancelled"));
        }
      })
      .catch(() => onErrorRef.current?.(t("auth.facebook_load_error")))
      .finally(() => {
        setChecking(false);
        setReady(true);
      });
  }, [handleStatus, t]);

  if (!facebookSignInEnabled) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={disabled || checking || !ready}
      onClick={onClick}
      className={cn(socialSignInButtonClass, disabled && "pointer-events-none opacity-50")}
    >
      <FacebookIcon className="size-4 text-[#1877F2]" />
      {checking ? t("auth.facebook_checking") : t("auth.continue_with_facebook")}
    </Button>
  );
}
