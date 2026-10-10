const APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;
const API_VERSION = "v25.0";

/** Whether Facebook sign-in is configured (app ID present). */
export const facebookSignInEnabled = Boolean(APP_ID);

export type FacebookLoginStatus = "connected" | "not_authorized" | "unknown";

export interface FacebookAuthResponse {
  status: FacebookLoginStatus;
  authResponse?: {
    accessToken?: string;
    expiresIn?: number;
    signedRequest?: string;
    userID?: string;
  };
}

type StatusHandler = (response: FacebookAuthResponse) => void;

interface FacebookSDK {
  init: (config: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
  getLoginStatus: (callback: (response: FacebookAuthResponse) => void) => void;
  login: (
    callback: (response: FacebookAuthResponse) => void,
    options?: { scope?: string },
  ) => void;
  logout: (callback?: () => void) => void;
  XFBML?: { parse: (node?: HTMLElement) => void };
}

declare global {
  interface Window {
    FB?: FacebookSDK;
    fbAsyncInit?: () => void;
    /** Called by the official Login Button via data-onlogin. */
    checkLoginState?: () => void;
  }
}

let fbPromise: Promise<void> | null = null;
let fbInitializedFor: string | null = null;
let loginStatusHandler: StatusHandler | null = null;

/** React components register here; the Login Button onlogin calls checkLoginState(). */
export function setFacebookLoginStatusHandler(handler: StatusHandler | null): void {
  loginStatusHandler = handler;
}

/** Process a getLoginStatus response (connected / not_authorized / unknown). */
export function handleFacebookStatusChange(response: FacebookAuthResponse): void {
  loginStatusHandler?.(response);
}

/**
 * Login Button onlogin callback — re-fetch the latest status from Facebook.
 * @see https://developers.facebook.com/docs/facebook-login/web/login-button
 */
export function checkLoginState(): void {
  void getFacebookLoginStatus().then(handleFacebookStatusChange);
}

if (typeof window !== "undefined") {
  window.checkLoginState = checkLoginState;
}

function ensureInitialized(): FacebookSDK {
  if (!APP_ID || !window.FB) {
    throw new Error("Facebook SDK unavailable");
  }
  if (fbInitializedFor !== APP_ID) {
    window.FB.init({
      appId: APP_ID,
      cookie: true,
      xfbml: true,
      version: API_VERSION,
    });
    fbInitializedFor = APP_ID;
  }
  return window.FB;
}

/** Load the Facebook JS SDK once (shared across the app). */
export function loadFacebookSdk(): Promise<void> {
  if (!APP_ID) return Promise.reject(new Error("Facebook app ID not configured"));
  if (fbPromise) return fbPromise;

  fbPromise = new Promise((resolve, reject) => {
    const finish = () => {
      try {
        ensureInitialized();
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    if (window.FB && fbInitializedFor === APP_ID) {
      resolve();
      return;
    }

    window.fbAsyncInit = finish;

    const existing = document.getElementById("facebook-jssdk");
    if (existing) {
      if (window.FB) finish();
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.FB) finish();
    };
    script.onerror = () => reject(new Error("Failed to load Facebook sign-in"));
    document.head.appendChild(script);
  });

  return fbPromise;
}

/** Ask Facebook whether the visitor is already logged into this app. */
export function getFacebookLoginStatus(): Promise<FacebookAuthResponse> {
  return loadFacebookSdk().then(
    () =>
      new Promise((resolve, reject) => {
        try {
          ensureInitialized().getLoginStatus(resolve);
        } catch (err) {
          reject(err);
        }
      }),
  );
}

/** Render the official Login Button markup inside `container`. */
export function parseFacebookLoginButton(container: HTMLElement): void {
  ensureInitialized().XFBML?.parse(container);
}

/** Open the Facebook Login dialog (not_authorized / unknown). */
export function facebookLogin(): Promise<FacebookAuthResponse> {
  return loadFacebookSdk().then(
    () =>
      new Promise((resolve, reject) => {
        try {
          ensureInitialized().login(resolve, { scope: "public_profile,email" });
        } catch (err) {
          reject(err);
        }
      }),
  );
}

export function facebookAccessToken(response: FacebookAuthResponse): string | undefined {
  if (response.status !== "connected") return undefined;
  return response.authResponse?.accessToken;
}

const SKIP_FB_AUTO_LOGIN_KEY = "dhakalPatroSkipFbAutoLogin";

/** Set after an explicit app logout so FB connected state does not re-sign-in. */
export function skipFacebookAutoLogin(): void {
  try {
    sessionStorage.setItem(SKIP_FB_AUTO_LOGIN_KEY, "1");
  } catch {
    /* private browsing */
  }
}

export function clearFacebookAutoLoginSkip(): void {
  try {
    sessionStorage.removeItem(SKIP_FB_AUTO_LOGIN_KEY);
  } catch {
    /* private browsing */
  }
}

export function shouldSkipFacebookAutoLogin(): boolean {
  try {
    return sessionStorage.getItem(SKIP_FB_AUTO_LOGIN_KEY) === "1";
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    }),
  ]);
}

/** Disconnect this app from the visitor's Facebook session in the browser. */
export function facebookLogout(): Promise<void> {
  if (!facebookSignInEnabled) return Promise.resolve();
  return withTimeout(
    loadFacebookSdk()
      .then(
        () =>
          new Promise<void>((resolve) => {
            try {
              ensureInitialized().logout(() => resolve());
            } catch {
              resolve();
            }
          }),
      )
      .catch(() => undefined),
    2_000,
  ).then(() => undefined);
}
