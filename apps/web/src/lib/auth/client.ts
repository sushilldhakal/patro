/**
 * Accounts and profiles on the website.
 *
 * The requests (bearer-token flow, refresh-on-401, profile CRUD) are shared
 * with the app — see packages/api-client/src/auth.ts. What stays here is
 * where the website keeps the tokens: localStorage.
 */
// Configures the shared client's base URL before any account request.
import "@/lib/api";
import { configureAuth, type TokenPair } from "@vedic-patro/api-client";
import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from "@/lib/browser";

const ACCESS_KEY = "dhakalPatroAccessToken";
const REFRESH_KEY = "dhakalPatroRefreshToken";

export type { AuthUser, Profile, ProfileInput, TokenPair } from "@vedic-patro/api-client";

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

configureAuth({ tokens: tokenStore });

export {
  AuthError as ApiError,
  authFetch,
  hasStoredSession,
  apiSignup,
  apiLogin,
  apiGoogle,
  apiFacebook,
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
