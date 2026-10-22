/**
 * Account and profile requests, shared by the website and the mobile app.
 *
 * The bearer-token flow is the same on both: `authFetch` sends the access
 * token and, on a 401, refreshes it once and retries. Where the tokens are
 * kept is the app's business and stays there — localStorage on the website,
 * the Keychain/Keystore (SecureStore) in the app — passed in once through
 * `configureAuth({ tokens })`.
 *
 * Paths are under the unversioned API base (`…/api/auth`, `…/api/profiles`),
 * the `baseUrl` each app gives `configureApiClient`.
 */
import { apiBaseUrl } from "./client";
import { ApiError, errorDetail, fetchWithTimeout } from "./http";
import type { AuthUser, Profile, ProfileInput, TokenPair } from "./types";

/** Where the app keeps the session's tokens. `access`/`refresh` are read synchronously. */
export interface TokenStore {
  readonly access: string | null;
  readonly refresh: string | null;
  /** Store a fresh pair. May settle later (durable storage); the getters update at once. */
  set(tokens: TokenPair): void | Promise<void>;
  clear(): void;
  /**
   * Run a token refresh exclusively across everything that shares this store —
   * on the website, every open tab (they share localStorage). Optional: a store
   * used by one process only needs no lock.
   */
  withRefreshLock?<T>(run: () => Promise<T>): Promise<T>;
}

let tokens: TokenStore | null = null;

/** Call once at start-up, after `configureApiClient`, with the app's token storage. */
export function configureAuth(config: { tokens: TokenStore }): void {
  tokens = config.tokens;
}

function store(): TokenStore {
  if (!tokens) throw new Error("configureAuth() must run before any account request");
  return tokens;
}

/** A failed account request. The message is the backend's explanation, shown to the user. */
export class AuthError extends ApiError {
  constructor(status: number, detail: string | undefined, path: string) {
    super(status, detail, path, detail ?? `Request failed (${status})`);
    this.name = "AuthError";
  }
}

async function authErrorFrom(res: Response, path: string): Promise<AuthError> {
  return new AuthError(res.status, await errorDetail(res), path);
}

function raw(path: string, init: RequestInit = {}): Promise<Response> {
  return fetchWithTimeout(`${apiBaseUrl()}${path}`, path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await raw(path, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw await authErrorFrom(res, path);
  return res.json() as Promise<T>;
}

async function postNoContent(path: string, body: unknown): Promise<void> {
  const res = await raw(path, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw await authErrorFrom(res, path);
}

// ─── Session refresh ──────────────────────────────────────────────────────────
//
// Access tokens are short-lived JWTs; refresh tokens are single-use and rotated
// by every /auth/refresh (apps/api/app/routers/auth.py). The rules below follow
// from that:
//
// - One refresh at a time. Requests that 401 together share one refresh, and
//   on the website tabs take turns through `withRefreshLock` — a second refresh
//   would present a token the first already revoked.
// - A request that 401s after someone else already refreshed (another request,
//   another tab) just retries with the new access token.
// - Only the server saying the refresh token is no good (401/403) ends the
//   session, and only if the store still holds that token. No connection or a
//   server error leaves the session alone and reaches the caller as such
//   (NetworkError / AuthError 5xx), not as "signed out".
// - A refresh that completes after the session was cleared or replaced (sign
//   out during the request) is discarded and its new token revoked, so it
//   cannot bring the old session back.

type RefreshOutcome = "refreshed" | "rejected";

let refreshInFlight: Promise<RefreshOutcome> | null = null;

/** Refresh the session once for everyone who saw `staleAccess` rejected. */
function refreshSession(staleAccess: string | null): Promise<RefreshOutcome> {
  refreshInFlight ??= (async () => {
    const t = store();
    const run = () => doRefresh(t, staleAccess);
    return t.withRefreshLock ? t.withRefreshLock(run) : run();
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function doRefresh(t: TokenStore, staleAccess: string | null): Promise<RefreshOutcome> {
  // Someone refreshed while this request was in the air (or while we waited for the lock).
  if (t.access && t.access !== staleAccess) return "refreshed";
  const sent = t.refresh;
  if (!sent) return "rejected";

  // A NetworkError (offline, DNS, timeout) propagates: the session is untouched.
  const res = await raw("/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token: sent }) });

  if (res.status === 401 || res.status === 403) {
    // Another tab rotated the token while ours was being rejected: use theirs.
    if (t.refresh && t.refresh !== sent) return "refreshed";
    // The server rejected the token we hold: the session is over.
    if (t.refresh === sent) t.clear();
    return "rejected";
  }
  // A 5xx or gateway hiccup: keep the session, report the server error.
  if (!res.ok) throw await authErrorFrom(res, "/auth/refresh");

  const pair = (await res.json()) as TokenPair;
  if (t.refresh !== sent) {
    // Signed out (or into another account) while this refresh was in the air.
    void raw("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: pair.refresh_token }) }).catch(
      () => undefined,
    );
    return "rejected";
  }
  // Await durable storage: the old token is already revoked, so losing the new one signs the user out.
  await t.set(pair);
  return "refreshed";
}

/** Authenticated request with one refresh-and-retry on a 401. Returns the parsed JSON. */
export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = (access: string | null) =>
    raw(path, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
    });

  const sentAccess = store().access;
  let res = await send(sentAccess);
  if (res.status === 401 && (await refreshSession(sentAccess)) === "refreshed") {
    res = await send(store().access);
  }
  if (!res.ok) throw await authErrorFrom(res, path);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** True as soon as a token is stored, before `apiMe()` has confirmed it is still valid. */
export function hasStoredSession(): boolean {
  const t = store();
  return Boolean(t.access || t.refresh);
}

// ─── Account ──────────────────────────────────────────────────────────────────

export const apiSignup = (email: string, password: string) =>
  postJson<TokenPair>("/auth/signup", { email, password });

export const apiLogin = (email: string, password: string) =>
  postJson<TokenPair>("/auth/login", { email, password });

/** Exchange a Google ID token for session tokens. */
export const apiGoogle = (idToken: string) => postJson<TokenPair>("/auth/google", { id_token: idToken });

/** Exchange a Facebook access token for session tokens. */
export const apiFacebook = (accessToken: string) =>
  postJson<TokenPair>("/auth/facebook", { access_token: accessToken });

/** Exchange a Sign in with Apple identity token for session tokens. */
export const apiApple = (identityToken: string, email?: string | null) =>
  postJson<TokenPair>("/auth/apple", { identity_token: identityToken, email: email || undefined });

export async function apiLogout(): Promise<void> {
  const t = store();
  const refresh_token = t.refresh;
  // Clear locally first so the UI and in-flight requests see a signed-out session.
  t.clear();
  if (refresh_token) {
    await raw("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token }) }).catch(() => undefined);
  }
}

/** End a session by its refresh token, leaving the current one alone (a parked Face ID session). */
export async function apiRevokeRefreshToken(refresh_token: string): Promise<void> {
  await raw("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token }) }).catch(() => undefined);
}

export const apiMe = () => authFetch<AuthUser>("/auth/me");

export async function apiDeleteAccount(): Promise<void> {
  await authFetch<void>("/auth/me", { method: "DELETE" });
  store().clear();
}

/** Always answers with a message (the server does not reveal whether the address exists). */
export async function apiForgotPassword(email: string): Promise<string> {
  const res = await raw("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  return body.message ?? "If that email exists, a reset link has been sent";
}

export const apiResetPassword = (token: string, password: string) =>
  postNoContent("/auth/reset-password", { token, password });

export const apiVerifyEmail = (token: string) => postNoContent("/auth/verify-email", { token });

export const apiResendVerification = () =>
  authFetch<{ message: string }>("/auth/resend-verification", { method: "POST" });

// ─── Profiles ─────────────────────────────────────────────────────────────────

export const listProfiles = () => authFetch<Profile[]>("/profiles");

export const createProfile = (data: ProfileInput) =>
  authFetch<Profile>("/profiles", { method: "POST", body: JSON.stringify(data) });

export const updateProfile = (id: string, data: Partial<ProfileInput>) =>
  authFetch<Profile>(`/profiles/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteProfile = (id: string) => authFetch<void>(`/profiles/${id}`, { method: "DELETE" });

/** React Query key for the signed-in user's profile list (both apps share the cache shape). */
export const PROFILES_QUERY_KEY = ["profiles"] as const;

// ─── Sky favourites (3D sky bookmarks) ────────────────────────────────────────

const SKY_FAVOURITES = "/profiles/sky-favourites";

/** The signed-in account's starred sky objects. */
export const fetchSkyFavourites = () => authFetch<{ ids?: string[] }>(SKY_FAVOURITES);

/** Replace the signed-in account's starred sky objects. */
export const putSkyFavourites = (ids: string[]) =>
  authFetch<unknown>(SKY_FAVOURITES, { method: "PUT", body: JSON.stringify({ ids }) });
