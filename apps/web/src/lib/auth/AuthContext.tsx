import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useAuthSession } from "@vedic-patro/features/account";
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
  const session = useAuthSession<AuthUser>({
    initialLoading: !ssr && isBrowser,
    fetchMe: apiMe,
    hasSession: () => Boolean(tokenStore.access || tokenStore.refresh),
    login: async (email, password) => tokenStore.set(await apiLogin(email, password)),
    signup: async (email, password) => tokenStore.set(await apiSignup(email, password)),
    google: async (idToken) => tokenStore.set(await apiGoogle(idToken)),
    facebook: async (accessToken) => {
      clearFacebookAutoLoginSkip();
      tokenStore.set(await apiFacebook(accessToken));
    },
    signOut: async () => {
      await Promise.all([apiLogout(), facebookLogout()]);
    },
    deleteAccount: apiDeleteAccount,
    onSignedOut: skipFacebookAutoLogin,
    afterDelete: facebookLogout,
  });
  const { refreshUser, setLoading } = session;

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

    void refreshUser().finally(() => setLoading(false));
  }, [refreshUser, setLoading, ssr]);

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

  const value: AuthContextValue = {
    user: session.user,
    loading: session.loading,
    isAuthenticated: session.isAuthenticated,
    login: session.login,
    signup: session.signup,
    loginWithGoogle: session.loginWithGoogle,
    loginWithFacebook: session.loginWithFacebook,
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
