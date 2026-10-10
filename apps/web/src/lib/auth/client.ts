/**
 * Auth API client + token storage.
 *
 * Tokens live in localStorage so the web app and a future mobile app use the
 * exact same bearer-token flow against the same API. `authFetch` transparently
 * refreshes an expired access token once on a 401, then retries the request.
 */

import { API_BASE } from "@/lib/api";
import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from "@/lib/browser";

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

// ─── Token storage ──────────────────────────────────────────────────────────────

export const tokenStore = {
  get access() {
    return getLocalStorageItem(ACCESS_KEY);
  },
  get refresh() {
    return getLocalStorageItem(REFRESH_KEY);
  },
  set(tokens: TokenPair) {
    setLocalStorageItem(ACCESS_KEY, tokens.access_token);
    setLocalStorageItem(REFRESH_KEY, tokens.refresh_token);
  },
  clear() {
    removeLocalStorageItem(ACCESS_KEY);
    removeLocalStorageItem(REFRESH_KEY);
  },
};

/** True as soon as a token is on disk, synchronously — before `apiMe()` has
 * had a chance to confirm it's still valid. Lets a page start a request that
 * needs "probably signed in" (e.g. warming the profile list) in parallel with
 * the auth check instead of waiting on it, without changing what happens once
 * that check resolves. */
export function hasStoredSession(): boolean {
  return Boolean(tokenStore.access || tokenStore.refresh);
}

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

async function tryRefresh(): Promise<boolean> {
  const refresh_token = tokenStore.refresh;
  if (!refresh_token) return false;
  const res = await raw("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  });
  if (!res.ok) {
    tokenStore.clear();
    return false;
  }
  tokenStore.set((await res.json()) as TokenPair);
  return true;
}

/** Authenticated fetch with one-shot refresh-on-401 retry. Returns parsed JSON. */
export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const withAuth = (): RequestInit => ({
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(tokenStore.access ? { Authorization: `Bearer ${tokenStore.access}` } : {}),
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

// ─── Auth endpoints ─────────────────────────────────────────────────────────────

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

export async function apiGoogle(idToken: string): Promise<TokenPair> {
  const res = await raw("/auth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res.json();
}

export async function apiFacebook(accessToken: string): Promise<TokenPair> {
  const res = await raw("/auth/facebook", {
    method: "POST",
    body: JSON.stringify({ access_token: accessToken }),
  });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res.json();
}

export async function apiLogout(): Promise<void> {
  const refresh_token = tokenStore.refresh;
  // Clear locally first so the UI and in-flight requests see a signed-out session.
  tokenStore.clear();
  if (refresh_token) {
    await raw("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    }).catch(() => undefined);
  }
}

export const apiMe = () => authFetch<AuthUser>("/auth/me");

export async function apiDeleteAccount(): Promise<void> {
  await authFetch<void>("/auth/me", { method: "DELETE" });
  tokenStore.clear();
}

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

// ─── Profile endpoints ──────────────────────────────────────────────────────────

export const listProfiles = () => authFetch<Profile[]>("/profiles");

export const createProfile = (data: ProfileInput) =>
  authFetch<Profile>("/profiles", { method: "POST", body: JSON.stringify(data) });

export const updateProfile = (id: string, data: Partial<ProfileInput>) =>
  authFetch<Profile>(`/profiles/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteProfile = (id: string) =>
  authFetch<void>(`/profiles/${id}`, { method: "DELETE" });
