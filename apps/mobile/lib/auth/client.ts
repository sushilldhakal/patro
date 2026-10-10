/**
 * Auth API client + token storage — the mobile twin of the web
 * `src/lib/auth/client.ts`. Same bearer-token flow against the same API, so a
 * user's account works identically on web and mobile.
 *
 * Tokens live in an in-memory cache for synchronous access, backed by
 * SecureStore (native) / localStorage (web). `authFetch` transparently
 * refreshes an expired access token once on a 401, then retries.
 */
import { API_BASE } from "@/lib/api";
import { storageGet, storageRemove, storageSet } from "./storage";

const ACCESS_KEY = "dhakalPatroAccessToken";
const REFRESH_KEY = "dhakalPatroRefreshToken";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthUser {
  id: string;
  email: string;
  is_verified: boolean;
  created_at: string;
}

// ─── Token store (in-memory cache + durable backing) ────────────────────────

let accessToken: string | null = null;
let refreshToken: string | null = null;

export const tokenStore = {
  get access() {
    return accessToken;
  },
  get refresh() {
    return refreshToken;
  },
  /** Read persisted tokens into the in-memory cache. Call once at app boot. */
  async load() {
    [accessToken, refreshToken] = await Promise.all([
      storageGet(ACCESS_KEY),
      storageGet(REFRESH_KEY),
    ]);
  },
  /** Updates the in-memory cache at once; the returned promise settles when both tokens are durable. */
  set(tokens: TokenPair): Promise<void> {
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;
    return Promise.all([
      storageSet(ACCESS_KEY, tokens.access_token),
      storageSet(REFRESH_KEY, tokens.refresh_token),
    ]).then(() => undefined);
  },
  clear() {
    accessToken = null;
    refreshToken = null;
    void storageRemove(ACCESS_KEY);
    void storageRemove(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail) && body.detail[0]?.msg) return body.detail[0].msg;
  } catch {
    /* fall through */
  }
  return `Request failed (${res.status})`;
}

async function raw(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

/**
 * The server rotates refresh tokens (each is single-use), so two requests that
 * 401 together must share ONE refresh — the second would present a token the
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
  if (!refreshToken) return false;
  let res: Response;
  try {
    res = await raw("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    // Offline / DNS / timeout: the session is fine, we just can't reach the server.
    return false;
  }
  // Only a definitive rejection ends the session. A 5xx or gateway hiccup must not.
  if (res.status === 401 || res.status === 403) {
    tokenStore.clear();
    return false;
  }
  if (!res.ok) return false;
  // Await persistence: the old token is already revoked, so losing the new one logs the user out.
  await tokenStore.set((await res.json()) as TokenPair);
  return true;
}

/** Authenticated fetch with one-shot refresh-on-401 retry. Returns parsed JSON. */
export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const withAuth = (): RequestInit => ({
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  let res = await raw(path, withAuth());
  if (res.status === 401 && (await tryRefresh())) {
    res = await raw(path, withAuth());
  }
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth endpoints ─────────────────────────────────────────────────────────

export async function apiSignup(email: string, password: string): Promise<TokenPair> {
  const res = await raw("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res.json();
}

export async function apiLogin(email: string, password: string): Promise<TokenPair> {
  const res = await raw("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res.json();
}

/** Exchange a Google ID token (from native/web OAuth) for our session tokens. */
export async function apiGoogle(idToken: string): Promise<TokenPair> {
  const res = await raw("/auth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res.json();
}

/** Exchange a Facebook access token (from native/web OAuth) for our session tokens. */
export async function apiFacebook(accessToken: string): Promise<TokenPair> {
  const res = await raw("/auth/facebook", {
    method: "POST",
    body: JSON.stringify({ access_token: accessToken }),
  });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res.json();
}

/** Exchange a Sign in with Apple identity token for our session tokens. */
export async function apiApple(identityToken: string, email?: string | null): Promise<TokenPair> {
  const res = await raw("/auth/apple", {
    method: "POST",
    body: JSON.stringify({ identity_token: identityToken, email: email || undefined }),
  });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res.json();
}

export async function apiDeleteAccount(): Promise<void> {
  await authFetch<void>("/auth/me", { method: "DELETE" });
  tokenStore.clear();
}

export async function apiLogout(): Promise<void> {
  const token = refreshToken;
  // Clear locally first so the UI and in-flight requests see a signed-out session.
  tokenStore.clear();
  if (token) {
    await raw("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: token }),
    }).catch(() => undefined);
  }
}

export const apiMe = () => authFetch<AuthUser>("/auth/me");

export async function apiForgotPassword(email: string): Promise<string> {
  const res = await raw("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  const body = await res.json().catch(() => ({}));
  return body.message ?? "If that email exists, a reset link has been sent";
}

export async function apiResetPassword(token: string, password: string): Promise<void> {
  const res = await raw("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
}

export async function apiVerifyEmail(token: string): Promise<void> {
  const res = await raw("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
}

export const apiResendVerification = () =>
  authFetch<{ message: string }>("/auth/resend-verification", { method: "POST" });

// ─── Profile endpoints ────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  country: string | null;
  city: string | null;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_era: string | null;
  notes: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type ProfileInput = Partial<Omit<Profile, "id" | "created_at" | "updated_at">> & {
  full_name: string;
};

export const listProfiles = () => authFetch<Profile[]>("/profiles");

export const createProfile = (data: ProfileInput) =>
  authFetch<Profile>("/profiles", { method: "POST", body: JSON.stringify(data) });

export const updateProfile = (id: string, data: Partial<ProfileInput>) =>
  authFetch<Profile>(`/profiles/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteProfile = (id: string) =>
  authFetch<void>(`/profiles/${id}`, { method: "DELETE" });
