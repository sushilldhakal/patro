/**
 * The signed-in session state shared by the website's and the app's
 * `lib/auth/AuthContext.tsx`: the user and loading flags, the epoch that stops
 * a late `apiMe()` answer restoring a session after sign-out, and every
 * sign-in / sign-out / delete flow. Token storage, the OAuth SDKs, the
 * bootstrap on launch and any on-device cache stay in each app and are passed
 * in; each app keeps its own `<AuthProvider>` and `useAuth`.
 */
import { useCallback, useMemo, useRef, useState } from "react";

export type AuthSessionPlatform<TUser> = {
  /** Fetch the current user with the stored tokens. */
  fetchMe: () => Promise<TUser>;
  /** Whether any token is stored (no tokens means signed out without asking the server). */
  hasSession: () => boolean;
  /** Exchange credentials and store the tokens. */
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  google: (idToken: string) => Promise<void>;
  facebook: (accessToken: string) => Promise<void>;
  apple?: (identityToken: string, email?: string | null) => Promise<void>;
  /** Server sign-out plus any provider sign-out; clears the stored tokens. */
  signOut: () => Promise<void>;
  /** Server account deletion; clears the stored tokens. */
  deleteAccount: () => Promise<void>;
  /** Runs when the user is dropped by logout / delete (e.g. stop provider auto-login). */
  onSignedOut?: () => void;
  /** Runs after delete, even when the server call failed (e.g. provider sign-out). */
  afterDelete?: () => Promise<void>;
  /** Runs whenever the user changes (e.g. cache it for offline launches). */
  onUser?: (user: TUser | null) => void;
  /** After a failed refresh, keep the remembered user instead of signing out. */
  keepUserOnRefreshError?: (err: unknown) => boolean;
  /** Initial loading flag (false for SSR). */
  initialLoading: boolean;
};

export function useAuthSession<TUser>(platform: AuthSessionPlatform<TUser>) {
  const [user, setUserState] = useState<TUser | null>(null);
  const [loading, setLoading] = useState(platform.initialLoading);
  /** Bumped on logout so late apiMe() responses cannot restore a stale session. */
  const authEpoch = useRef(0);
  const platformRef = useRef(platform);
  platformRef.current = platform;

  /** Set the signed-in user (and let the platform remember them). */
  const applyUser = useCallback((me: TUser | null) => {
    setUserState(me);
    platformRef.current.onUser?.(me);
  }, []);

  const refreshUser = useCallback(async () => {
    const p = platformRef.current;
    const epoch = authEpoch.current;
    if (!p.hasSession()) {
      applyUser(null);
      return;
    }
    try {
      const me = await p.fetchMe();
      if (epoch !== authEpoch.current) return;
      applyUser(me);
    } catch (err) {
      if (epoch !== authEpoch.current) return;
      if (p.keepUserOnRefreshError?.(err)) return;
      applyUser(null);
    }
  }, [applyUser]);

  const signInWith = useCallback(
    async (exchange: () => Promise<void>) => {
      authEpoch.current += 1;
      const epoch = authEpoch.current;
      await exchange();
      const me = await platformRef.current.fetchMe();
      if (epoch !== authEpoch.current) return;
      applyUser(me);
    },
    [applyUser],
  );

  const login = useCallback(
    (email: string, password: string) => signInWith(() => platformRef.current.login(email, password)),
    [signInWith],
  );
  const signup = useCallback(
    (email: string, password: string) => signInWith(() => platformRef.current.signup(email, password)),
    [signInWith],
  );
  const loginWithGoogle = useCallback(
    (idToken: string) => signInWith(() => platformRef.current.google(idToken)),
    [signInWith],
  );
  const loginWithFacebook = useCallback(
    (accessToken: string) => signInWith(() => platformRef.current.facebook(accessToken)),
    [signInWith],
  );
  const loginWithApple = useCallback(
    (identityToken: string, email?: string | null) =>
      signInWith(async () => {
        await platformRef.current.apple?.(identityToken, email);
      }),
    [signInWith],
  );

  const logout = useCallback(async () => {
    authEpoch.current += 1;
    platformRef.current.onSignedOut?.();
    applyUser(null);
    await platformRef.current.signOut();
  }, [applyUser]);

  const deleteAccount = useCallback(async () => {
    authEpoch.current += 1;
    platformRef.current.onSignedOut?.();
    try {
      await platformRef.current.deleteAccount();
    } finally {
      applyUser(null);
      await platformRef.current.afterDelete?.();
    }
  }, [applyUser]);

  return useMemo(
    () => ({
      user,
      loading,
      setLoading,
      applyUser,
      isAuthenticated: user !== null,
      refreshUser,
      login,
      signup,
      loginWithGoogle,
      loginWithFacebook,
      loginWithApple,
      logout,
      deleteAccount,
    }),
    [user, loading, applyUser, refreshUser, login, signup, loginWithGoogle, loginWithFacebook, loginWithApple, logout, deleteAccount],
  );
}
