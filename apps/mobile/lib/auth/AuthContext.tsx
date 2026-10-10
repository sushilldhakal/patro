import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  /** Bumped on logout so late apiMe() responses cannot restore a stale session. */
  const authEpoch = useRef(0);

  /** Set the signed-in user and remember them on this device for offline launches. */
  const applyUser = useCallback((me: AuthUser | null) => {
    setUser(me);
    void (me ? deviceStore.set(USER_CACHE_KEY, me) : deviceStore.remove(USER_CACHE_KEY));
  }, []);

  const refreshUser = useCallback(async () => {
    const epoch = authEpoch.current;
    if (!tokenStore.access && !tokenStore.refresh) {
      applyUser(null);
      return;
    }
    try {
      const me = await apiMe();
      if (epoch !== authEpoch.current) return;
      applyUser(me);
    } catch (err) {
      if (epoch !== authEpoch.current) return;
      // Signed out only when the server (or a failed refresh) says the session is
      // over. Offline / server errors keep the remembered user.
      const rejected = err instanceof ApiError && (err.status === 401 || err.status === 403);
      if (rejected && !tokenStore.refresh) applyUser(null);
    }
  }, [applyUser]);

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
          setUser(cached);
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
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    authEpoch.current += 1;
    const epoch = authEpoch.current;
    await tokenStore.set(await apiLogin(email, password));
    const me = await apiMe();
    if (epoch !== authEpoch.current) return;
    applyUser(me);
  }, [applyUser]);

  const signup = useCallback(async (email: string, password: string) => {
    authEpoch.current += 1;
    const epoch = authEpoch.current;
    await tokenStore.set(await apiSignup(email, password));
    const me = await apiMe();
    if (epoch !== authEpoch.current) return;
    applyUser(me);
  }, [applyUser]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    authEpoch.current += 1;
    const epoch = authEpoch.current;
    await tokenStore.set(await apiGoogle(idToken));
    const me = await apiMe();
    if (epoch !== authEpoch.current) return;
    applyUser(me);
  }, [applyUser]);

  const loginWithFacebook = useCallback(async (accessToken: string) => {
    authEpoch.current += 1;
    const epoch = authEpoch.current;
    await tokenStore.set(await apiFacebook(accessToken));
    const me = await apiMe();
    if (epoch !== authEpoch.current) return;
    applyUser(me);
  }, [applyUser]);

  const loginWithApple = useCallback(async (identityToken: string, email?: string | null) => {
    authEpoch.current += 1;
    const epoch = authEpoch.current;
    await tokenStore.set(await apiApple(identityToken, email));
    const me = await apiMe();
    if (epoch !== authEpoch.current) return;
    applyUser(me);
  }, [applyUser]);

  const logout = useCallback(async () => {
    authEpoch.current += 1;
    applyUser(null);
    await apiLogout();
  }, [applyUser]);

  const deleteAccount = useCallback(async () => {
    // Only sign out locally once the server confirmed the deletion. On failure
    // the user stays signed in (tokens are untouched) and can retry.
    await apiDeleteAccount();
    authEpoch.current += 1;
    applyUser(null);
  }, [applyUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      login,
      signup,
      loginWithGoogle,
      loginWithFacebook,
      loginWithApple,
      logout,
      deleteAccount,
      refreshUser,
    }),
    [
      user,
      loading,
      login,
      signup,
      loginWithGoogle,
      loginWithFacebook,
      loginWithApple,
      logout,
      deleteAccount,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
