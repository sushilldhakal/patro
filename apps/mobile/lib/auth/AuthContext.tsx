import { createContext, useContext, useEffect, type ReactNode } from "react";
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
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useAuthSession<AuthUser>({
    initialLoading: true,
    fetchMe: apiMe,
    hasSession: () => Boolean(tokenStore.access || tokenStore.refresh),
    login: async (email, password) => tokenStore.set(await apiLogin(email, password)),
    signup: async (email, password) => tokenStore.set(await apiSignup(email, password)),
    google: async (idToken) => tokenStore.set(await apiGoogle(idToken)),
    facebook: async (accessToken) => tokenStore.set(await apiFacebook(accessToken)),
    apple: async (identityToken, email) => tokenStore.set(await apiApple(identityToken, email)),
    signOut: apiLogout,
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
