/**
 * Optional Face ID / Touch ID / fingerprint sign-in.
 *
 * The session itself never expires on its own (see lib/auth/client.ts). With this on, signing out
 * parks the session behind the device's biometrics (lib/auth/parked-session.ts), so signing back in
 * after an accidental sign-out or a phone restart is one Face ID instead of a password. It is not an
 * app lock: once signed in, opening the app or coming back to it never asks again.
 */
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
import { BiometricOfferSheet } from "@/components/auth/BiometricOfferSheet";
import { BIOMETRIC_ENABLED_KEY, revokeParkedSession } from "@/lib/auth/parked-session";
import { useAuth } from "@/lib/auth/AuthContext";
import { authenticateBiometric, biometricLabel, getBiometricInfo, type BiometricInfo } from "@/lib/auth/biometrics";
import { deviceStore } from "@/lib/device-store";
import { useLocale } from "@/lib/i18n";

const ENABLED_KEY = BIOMETRIC_ENABLED_KEY;
const PROMPTED_KEY = "device:biometric_prompted";

interface BiometricLockValue {
  available: boolean;
  label: string;
  enabled: boolean;
  setEnabled: (on: boolean) => Promise<boolean>;
}

const BiometricLockContext = createContext<BiometricLockValue | null>(null);

export function useBiometricLock(): BiometricLockValue {
  const ctx = useContext(BiometricLockContext);
  if (!ctx) throw new Error("useBiometricLock must be used within <BiometricLockProvider>");
  return ctx;
}

export function BiometricLockProvider({ children }: { children: ReactNode }) {
  const { t, pick } = useLocale();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [info, setInfo] = useState<BiometricInfo>({ available: false, kind: "generic" });
  const [enabled, setEnabledState] = useState(false);
  const [ready, setReady] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);

  const wasAuthenticated = useRef<boolean | null>(null);

  const label = biometricLabel(info.kind);

  useEffect(() => {
    let active = true;
    (async () => {
      const [stored, bio] = await Promise.all([deviceStore.get<boolean>(ENABLED_KEY), getBiometricInfo()]);
      if (!active) return;
      setInfo(bio);
      // A removed enrolment silently turns the lock off rather than trapping the user.
      setEnabledState(Boolean(stored) && bio.available);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const setEnabled = useCallback(
    async (on: boolean) => {
      if (on) {
        if (!info.available) return false;
        const ok = await authenticateBiometric(
          t("ui.auth.confirm_to_turn_on_label", { label }),
          t("common.cancel"),
        );
        if (!ok) return false;
      }
      setEnabledState(on);
      await deviceStore.set(ENABLED_KEY, on);
      // Off: a session parked behind Face ID at sign-out ends too.
      if (!on) void revokeParkedSession(t("ui.auth.face_id_prompt"));
      return true;
    },
    [info.available, label, pick],
  );

  // Offer the lock once, right after the user signs in during this session.
  useEffect(() => {
    if (!ready || authLoading) return;
    const before = wasAuthenticated.current;
    wasAuthenticated.current = isAuthenticated;
    if (before !== false || !isAuthenticated || enabled || !info.available) return;
    void (async () => {
      if (await deviceStore.get<boolean>(PROMPTED_KEY)) return;
      await deviceStore.set(PROMPTED_KEY, true);
      setOfferOpen(true);
    })();
  }, [ready, authLoading, isAuthenticated, enabled, info.available, label, pick, setEnabled]);

  const value = useMemo<BiometricLockValue>(
    () => ({ available: info.available, label, enabled, setEnabled }),
    [info.available, label, enabled, setEnabled],
  );

  return (
    <BiometricLockContext.Provider value={value}>
      {children}
      <BiometricOfferSheet
        open={offerOpen}
        kind={info.kind}
        label={label}
        onDecline={() => setOfferOpen(false)}
        onAccept={() => {
          setOfferOpen(false);
          void setEnabled(true);
        }}
      />
    </BiometricLockContext.Provider>
  );
}
