/**
 * Redirect-based Google sign-in (OpenID Connect implicit flow).
 *
 * The GSI popup/One-Tap flow relies on the OAuth consent popup posting the
 * credential back to the opener. Mobile Chrome/Safari sever that channel
 * (third-party-cookie + ITP restrictions, and iOS Safari has no FedCM), so the
 * user is left stuck on the Google consent screen — sign-in never completes.
 *
 * A full-page redirect avoids popups entirely and works on every mobile
 * browser: we navigate the whole tab to Google's authorization endpoint asking
 * for an `id_token` in the return fragment, then read that token back on the
 * callback URL and hand it to the same `/auth/google` endpoint the button uses.
 * The backend verification is unchanged.
 *
 * Deployment note: the exact redirect URI (`<origin>/auth/google/callback`)
 * must be listed under "Authorized redirect URIs" for the OAuth client in the
 * Google Cloud console — this is separate from the "Authorized JavaScript
 * origins" the GSI button uses.
 */

import { isBrowser } from "@/lib/browser";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

/** Where Google returns the id_token. Registered as an Authorized redirect URI. */
export const GOOGLE_REDIRECT_PATH = "/auth/google/callback";

const STATE_KEY = "googleOauthState";
const NONCE_KEY = "googleOauthNonce";
const RETURN_KEY = "googleOauthReturnTo";

function session(): Storage | null {
  if (!isBrowser) return null;
  try {
    return window.sessionStorage;
  } catch {
    return null; // Safari private mode / storage disabled
  }
}

function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Decode a JWT payload without verifying the signature (the server does that). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/**
 * Popup-based flows (GSI button, One Tap) are unreliable on mobile browsers, so
 * prefer the redirect flow there. Desktop keeps the richer on-page GSI button.
 */
export function prefersRedirectSignIn(): boolean {
  if (!isBrowser || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini/i.test(ua)) {
    return true;
  }
  // iPadOS 13+ reports a desktop Safari UA but exposes touch points.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

/** Whether the redirect flow can run (client ID configured, in a browser). */
export function googleRedirectEnabled(): boolean {
  return isBrowser && Boolean(CLIENT_ID);
}

/** Kick off the full-page redirect to Google. Navigates away from the app. */
export function startGoogleRedirect(): void {
  if (!isBrowser || !CLIENT_ID) return;
  const state = randomToken();
  const nonce = randomToken();
  const store = session();
  store?.setItem(STATE_KEY, state);
  store?.setItem(NONCE_KEY, nonce);
  store?.setItem(RETURN_KEY, window.location.pathname + window.location.search);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: window.location.origin + GOOGLE_REDIRECT_PATH,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
    state,
    prompt: "select_account",
    response_mode: "fragment",
  });
  window.location.assign(`${AUTH_ENDPOINT}?${params.toString()}`);
}

export interface GoogleRedirectResult {
  /** Present on success — the Google ID token to POST to /auth/google. */
  idToken?: string;
  /** Present on failure (Google error, or a failed CSRF/nonce/audience check). */
  error?: string;
  /** Path the user started from, to return to once sign-in resolves. */
  returnTo: string;
}

/**
 * If the current page is the Google redirect callback, parse and validate the
 * returned id_token. Consumes the stored CSRF state either way. Returns null
 * when this isn't a callback load.
 */
export function consumeGoogleRedirect(): GoogleRedirectResult | null {
  if (!isBrowser || window.location.pathname !== GOOGLE_REDIRECT_PATH) return null;

  const store = session();
  const expectedState = store?.getItem(STATE_KEY) ?? null;
  const expectedNonce = store?.getItem(NONCE_KEY) ?? null;
  const returnTo = store?.getItem(RETURN_KEY) || "/";
  store?.removeItem(STATE_KEY);
  store?.removeItem(NONCE_KEY);
  store?.removeItem(RETURN_KEY);

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const error = params.get("error");
  if (error) return { error, returnTo };

  const idToken = params.get("id_token");
  if (!idToken) return { error: "missing_id_token", returnTo };

  // CSRF: the returned state must match the one we generated before leaving.
  if (!expectedState || params.get("state") !== expectedState) {
    return { error: "state_mismatch", returnTo };
  }

  // Replay protection + audience: bind the token to this sign-in attempt.
  const claims = decodeJwtPayload(idToken);
  if (!claims || claims.nonce !== expectedNonce) {
    return { error: "nonce_mismatch", returnTo };
  }
  if (CLIENT_ID && claims.aud !== CLIENT_ID) {
    return { error: "audience_mismatch", returnTo };
  }

  return { idToken, returnTo };
}
