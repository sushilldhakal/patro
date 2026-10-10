import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prefersRedirectSignIn, startGoogleRedirect } from "@/lib/auth/google-redirect";
import { socialSignInButtonClass } from "./social-sign-in-styles";
import { useIsDarkTheme } from "./useIsDarkTheme";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/** Whether Google sign-in is configured (client ID present). */
export const googleSignInEnabled = Boolean(CLIENT_ID);

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (r: { credential?: string }) => void;
    locale?: string;
    /** Use the browser-native FedCM identity UI (no third-party cookies /
     * popups) — the reliable path on mobile Chrome. */
    use_fedcm_for_prompt?: boolean;
    /** Enable the Intelligent Tracking Prevention (Safari/iOS) popup upgrade
     * flow so the credential still returns under ITP. */
    itp_support?: boolean;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

const gsiPromises = new Map<string, Promise<void>>();
let gsiInitializedKey: string | null = null;

function loadGsi(locale: string): Promise<void> {
  const cached = gsiPromises.get(locale);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement("script");
    script.src = `https://accounts.google.com/gsi/client?hl=${locale}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in"));
    document.head.appendChild(script);
  });
  gsiPromises.set(locale, promise);
  return promise;
}

function ensureGsiInitialized(onCredential: (idToken: string) => void, locale: string) {
  const id = window.google?.accounts?.id;
  if (!id || !CLIENT_ID) return false;

  const key = `${CLIENT_ID}:${locale}`;
  if (gsiInitializedKey !== key) {
    id.initialize({
      client_id: CLIENT_ID,
      locale,
      // FedCM + ITP support are what make the flow complete on mobile: without
      // them the default popup posts the credential back through a channel that
      // mobile Chrome/Safari sever (third-party-cookie / ITP restrictions), so
      // the user is left stuck on the Google screen.
      use_fedcm_for_prompt: true,
      itp_support: true,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (res) => {
        if (res.credential) onCredential(res.credential);
      },
    });
    gsiInitializedKey = key;
  }
  return true;
}

/** GSI button width must be an integer ≤ 400; clamp to the available container width. */
function gsiButtonWidth(containerWidth: number): number {
  return Math.min(400, Math.max(200, Math.floor(containerWidth) || 300));
}

/** Google "G" logo for the redirect-flow button. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

/**
 * Full-page redirect sign-in for mobile browsers, where the GSI popup can't
 * return the credential and leaves the user stuck on Google's consent screen.
 */
function GoogleRedirectButton() {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={() => startGoogleRedirect()}
      className={cn(socialSignInButtonClass)}
    >
      <GoogleIcon className="size-4" />
      {t("auth.continue_with_google")}
    </Button>
  );
}

/**
 * Renders the real Google Identity Services button (theme- and locale-aware).
 *
 * The button is fully visible on purpose: GSI's anti-clickjacking checks silently
 * ignore taps on a button that is transparent or covered, which broke the previous
 * invisible-overlay approach on mobile browsers.
 */
function GsiButton({
  onCredential,
  onError,
}: {
  onCredential: (idToken: string) => void;
  onError?: (message: string) => void;
}) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const gsiLocale = lang === "en" ? "en" : "ne";
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const isDark = useIsDarkTheme();
  const [ready, setReady] = useState(false);
  const onCredentialRef = useRef(onCredential);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  });

  useEffect(() => {
    if (!CLIENT_ID || !buttonRef.current || isDark === undefined) return;
    let cancelled = false;

    loadGsi(gsiLocale)
      .then(() => {
        if (cancelled || !buttonRef.current) return;
        if (
          !ensureGsiInitialized((token) => {
            onCredentialRef.current(token);
          }, gsiLocale)
        ) {
          return;
        }
        const width = gsiButtonWidth(containerRef.current?.clientWidth ?? 300);
        buttonRef.current.innerHTML = "";
        window.google!.accounts!.id!.renderButton(buttonRef.current, {
          type: "standard",
          theme: isDark ? "filled_black" : "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width,
          locale: gsiLocale,
        });
        if (!cancelled) setReady(true);
      })
      .catch(() => onError?.(t("auth.google_error")));

    return () => {
      cancelled = true;
    };
  }, [gsiLocale, isDark, onError, t]);

  if (!CLIENT_ID) return null;

  return (
    <div
      ref={containerRef}
      className="flex h-10 w-[300px] max-w-full items-center justify-center"
    >
      {!ready && (
        <span className="text-sm text-base">
          {t("auth.continue_with_google")}
        </span>
      )}
      <div ref={buttonRef} className={ready ? "flex justify-center" : "hidden"} />
    </div>
  );
}

/**
 * Google sign-in entry point. On mobile browsers the GSI popup can't deliver the
 * credential back (third-party-cookie / ITP / no FedCM on iOS), so use a
 * full-page redirect there; desktop keeps the on-page GSI button + One Tap.
 *
 * The dialog is opened by user interaction (never server-rendered), so a lazy
 * initializer safely reads `navigator` on the client without a hydration risk.
 */
export function GoogleSignInButton({
  onCredential,
  onError,
}: {
  onCredential: (idToken: string) => void;
  onError?: (message: string) => void;
}) {
  const [useRedirect] = useState(() => prefersRedirectSignIn());

  if (!CLIENT_ID) return null;
  if (useRedirect) return <GoogleRedirectButton />;
  return <GsiButton onCredential={onCredential} onError={onError} />;
}
