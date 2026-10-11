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
import { ApiError, errorDetail, fetchWithTimeout, NetworkError } from "./http";
import type { AuthUser, Profile, ProfileInput, TokenPair } from "./types";

/** Where the app keeps the session's tokens. `access`/`refresh` are read synchronously. */
export interface TokenStore {
  readonly access: string | null;
  readonly refresh: string | null;
  /** Store a fresh pair. May settle later (durable storage); the getters update at once. */
  set(tokens: TokenPair): void | Promise<void>;
  clear(): void;
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

/**
 * The server rotates refresh tokens (each is single-use), so requests that
 * 401 together must share ONE refresh — a second would present a token the
 * first already revoked and sign the user out.
 */
let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function doRefresh(): Promise<boolean> {
  const t = store();
  const refresh_token = t.refresh;
  if (!refresh_token) return false;
  let res: Response;
  try {
    res = await raw("/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token }) });
  } catch (error) {
    // Offline / DNS / timeout: the session is fine, the server just can't be reached.
    if (error instanceof NetworkError) return false;
    throw error;
  }
  // Only a definitive rejection ends the session; a 5xx or gateway hiccup must not.
  if (res.status === 401 || res.status === 403) {
    t.clear();
    return false;
  }
  if (!res.ok) return false;
  // Await durable storage: the old token is already revoked, so losing the new one signs the user out.
  await t.set((await res.json()) as TokenPair);
  return true;
}

/** Authenticated request with one refresh-and-retry on a 401. Returns the parsed JSON. */
export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const withAuth = (): RequestInit => {
    const access = store().access;
    return {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
    };
  };

  let res = await raw(path, withAuth());
  if (res.status === 401 && (await tryRefresh())) {
    res = await raw(path, withAuth());
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
