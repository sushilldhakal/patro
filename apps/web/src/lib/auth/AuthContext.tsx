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
  apiDeleteAccount,
  apiFacebook,
  apiGoogle,
  apiLogin,
  apiLogout,
  apiMe,
  apiSignup,
  tokenStore,
  type AuthUser,
} from "./client";
import { isBrowser } from "@/lib/browser";
import {
  clearFacebookAutoLoginSkip,
  facebookLogout,
  skipFacebookAutoLogin,
} from "./facebook-sdk";
import { consumeGoogleRedirect } from "./google-redirect";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, ssr = false }: { children: ReactNode; ssr?: boolean }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(!ssr && isBrowser);
  /** Bumped on logout so late apiMe() responses cannot restore a stale session. */
  const authEpoch = useRef(0);

  const refreshUser = useCallback(async () => {
    const epoch = authEpoch.current;
    if (!tokenStore.access && !tokenStore.refresh) {
      setUser(null);
      return;
    }
    try {
      const me = await apiMe();
      if (epoch !== authEpoch.current) return;
      setUser(me);
    } catch {
      if (epoch !== authEpoch.current) return;
      setUser(null);
    }
  }, []);

  // Bootstrap: complete a pending Google redirect sign-in, else restore any
  // stored session. Both run on first mount only.
  useEffect(() => {
    if (ssr) return;

    const result = consumeGoogleRedirect();
    if (result) {
      const finish = async () => {
        if (result.idToken) {
          try {
            tokenStore.set(await apiGoogle(result.idToken));
          } catch {
            /* fall through — user lands signed-out on the return page */
          }
        }
        // Full navigation back to where sign-in started; the reload re-bootstraps
        // from the freshly stored tokens (and keeps the router state consistent).
        window.location.replace(result.returnTo || "/");
      };
      void finish();
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshUser().finally(() => setLoading(false));
  }, [refreshUser, ssr]);

  // Keep tabs in sync when a session changes elsewhere.
  useEffect(() => {
    if (ssr) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "dhakalPatroAccessToken" || e.key === "dhakalPatroRefreshToken") {
        void refreshUser();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshUser, ssr]);

  const login = useCallback(async (email: string, password: string) => {
    authEpoch.current += 1;
    const epoch = authEpoch.current;
    tokenStore.set(await apiLogin(email, password));
    const me = await apiMe();
    if (epoch !== authEpoch.current) return;
    setUser(me);
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    authEpoch.current += 1;
    const epoch = authEpoch.current;
    tokenStore.set(await apiSignup(email, password));
    const me = await apiMe();
    if (epoch !== authEpoch.current) return;
    setUser(me);
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    authEpoch.current += 1;
    const epoch = authEpoch.current;
    tokenStore.set(await apiGoogle(idToken));
    const me = await apiMe();
    if (epoch !== authEpoch.current) return;
    setUser(me);
  }, []);

  const loginWithFacebook = useCallback(async (accessToken: string) => {
    authEpoch.current += 1;
    const epoch = authEpoch.current;
    clearFacebookAutoLoginSkip();
    tokenStore.set(await apiFacebook(accessToken));
    const me = await apiMe();
    if (epoch !== authEpoch.current) return;
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    authEpoch.current += 1;
    skipFacebookAutoLogin();
    setUser(null);
    await Promise.all([apiLogout(), facebookLogout()]);
  }, []);

  const deleteAccount = useCallback(async () => {
    authEpoch.current += 1;
    skipFacebookAutoLogin();
    try {
      await apiDeleteAccount();
    } finally {
      setUser(null);
      await facebookLogout();
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      login,
      signup,
      loginWithGoogle,
      loginWithFacebook,
      logout,
      deleteAccount,
      refreshUser,
    }),
    [user, loading, login, signup, loginWithGoogle, loginWithFacebook, logout, deleteAccount, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
