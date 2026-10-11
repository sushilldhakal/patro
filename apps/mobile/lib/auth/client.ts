/**
 * Accounts and profiles in the app.
 *
 * The requests (bearer-token flow, refresh-on-401, profile CRUD) are shared
 * with the website — see packages/api-client/src/auth.ts. What stays here is
 * where the app keeps the tokens: an in-memory cache for synchronous access,
 * backed by SecureStore (Keychain / Keystore) on native and localStorage on
 * the web build.
 */
// Configures the shared client's base URL before any account request.
import "@/lib/api";
import { configureAuth, type TokenPair } from "@vedic-patro/api-client";
import { storageGet, storageRemove, storageSet } from "./storage";

export type { AuthUser, Profile, ProfileInput, TokenPair } from "@vedic-patro/api-client";

const ACCESS_KEY = "dhakalPatroAccessToken";
const REFRESH_KEY = "dhakalPatroRefreshToken";

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

configureAuth({ tokens: tokenStore });

export {
  AuthError as ApiError,
  authFetch,
  hasStoredSession,
  apiSignup,
  apiLogin,
  apiGoogle,
  apiFacebook,
  apiApple,
  apiLogout,
  apiMe,
  apiDeleteAccount,
  apiForgotPassword,
  apiResetPassword,
  apiVerifyEmail,
  apiResendVerification,
  listProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
} from "@vedic-patro/api-client";
