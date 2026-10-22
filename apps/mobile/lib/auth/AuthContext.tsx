import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { useAuthSession } from "@vedic-patro/features/account";
import {
  apiApple,
  apiDeleteAccount,
  apiFacebook,
  apiGoogle,
  apiLogin,
  apiLogout,
  apiMe,
  apiSignup,
  ApiError,
  tokenStore,
  type AuthUser,
} from "./client";
import { deviceStore } from "@/lib/device-store";
import { tFor } from "@vedic-patro/i18n/runtime";
import {
  BIOMETRIC_ENABLED_KEY,
  forgetParkedSession,
  hasParkedSession,
  parkSession,
  revokeParkedSession,
  takeParkedSession,
} from "./parked-session";

/** Sign-out: with the Face ID lock on, the session waits behind Face ID instead of ending. */
async function signOutOrPark(): Promise<void> {
  const refresh = tokenStore.refresh;
  if (refresh && (await deviceStore.get<boolean>(BIOMETRIC_ENABLED_KEY))) {
    if (await parkSession(refresh, tFor(undefined, "ui.auth.face_id_prompt"))) {
      tokenStore.clear();
      return;
    }
  }
  await apiLogout();
}

/** A fresh sign-in replaces any session parked behind Face ID. */
async function startSession(issue: () => Promise<void>): Promise<void> {
  await issue();
  if (await hasParkedSession()) void revokeParkedSession(tFor(undefined, "ui.auth.face_id_prompt"));
}

const USER_CACHE_KEY = "device:auth_user";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, email?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  /** Sign back in with Face ID to the session parked at sign-out. False when cancelled or none is parked. */
  resumeWithBiometrics: () => Promise<boolean>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useAuthSession<AuthUser>({
    initialLoading: true,
    fetchMe: apiMe,
    hasSession: () => Boolean(tokenStore.access || tokenStore.refresh),
    login: (email, password) => startSession(async () => tokenStore.set(await apiLogin(email, password))),
    signup: (email, password) => startSession(async () => tokenStore.set(await apiSignup(email, password))),
    google: (idToken) => startSession(async () => tokenStore.set(await apiGoogle(idToken))),
    facebook: (accessToken) => startSession(async () => tokenStore.set(await apiFacebook(accessToken))),
    apple: (identityToken, email) => startSession(async () => tokenStore.set(await apiApple(identityToken, email))),
    signOut: signOutOrPark,
    deleteAccount: apiDeleteAccount,
    // Remember the signed-in user on this device for offline launches.
    onUser: (me) => {
      void (me ? deviceStore.set(USER_CACHE_KEY, me) : deviceStore.remove(USER_CACHE_KEY));
    },
    // Signed out only when the server (or a failed refresh) says the session is
    // over. Offline / server errors keep the remembered user.
    keepUserOnRefreshError: (err) => {
      const rejected = err instanceof ApiError && (err.status === 401 || err.status === 403);
      return !(rejected && !tokenStore.refresh);
    },
  });
  const { refreshUser, applyUser, setLoading } = session;

  // Bootstrap from any stored session on first mount: load persisted tokens
  // into the in-memory cache, then hydrate the user.
  useEffect(() => {
    let active = true;
    (async () => {
      await tokenStore.load();
      if (!active) return;
      // Open instantly as the remembered user; verify with the server in the background.
      if (tokenStore.refresh || tokenStore.access) {
        const cached = await deviceStore.get<AuthUser>(USER_CACHE_KEY);
        if (!active) return;
        if (cached) {
          applyUser(cached);
          setLoading(false);
          await refreshUser();
          return;
        }
      }
      await refreshUser();
    })().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [refreshUser, applyUser, setLoading]);

  const resumeWithBiometrics = useCallback(async () => {
    if (!(await hasParkedSession())) return false;
    if (!(await deviceStore.get<boolean>(BIOMETRIC_ENABLED_KEY))) {
      await forgetParkedSession();
      return false;
    }
    const refresh = await takeParkedSession(tFor(undefined, "ui.auth.face_id_prompt"));
    if (!refresh) return false;
    // No access token yet: the first request refreshes with the parked token.
    await tokenStore.set({ access_token: "", refresh_token: refresh } as Parameters<typeof tokenStore.set>[0]);
    await refreshUser();
    return Boolean(tokenStore.access || tokenStore.refresh);
  }, [refreshUser]);

  const value: AuthContextValue = {
    user: session.user,
    loading: session.loading,
    isAuthenticated: session.isAuthenticated,
    login: session.login,
    signup: session.signup,
    loginWithGoogle: session.loginWithGoogle,
    loginWithFacebook: session.loginWithFacebook,
    loginWithApple: session.loginWithApple,
    logout: session.logout,
    resumeWithBiometrics,
    deleteAccount: session.deleteAccount,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
