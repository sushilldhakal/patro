/**
 * Optional biometric app lock.
 *
 * The session itself never expires on its own (see lib/auth/client.ts); this is
 * the *convenience + privacy* layer on top: when enabled, opening the app (or
 * returning to it after a short while) asks for Face ID / Touch ID / fingerprint
 * instead of a password. Signing out remains an explicit user action.
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
import { AppState, Pressable, StyleSheet, View } from "react-native";
import { BiometricOfferSheet } from "@/components/auth/BiometricOfferSheet";
import { BIOMETRIC_ENABLED_KEY, revokeParkedSession } from "@/lib/auth/parked-session";
import { LucideNative } from "@/components/icons/LucideNative";
import { __iconNode as ScanFaceNode } from "lucide-react/dist/esm/icons/scan-face";
import { __iconNode as FingerprintNode } from "lucide-react/dist/esm/icons/fingerprint";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { authenticateBiometric, biometricLabel, getBiometricInfo, type BiometricInfo } from "@/lib/auth/biometrics";
import { deviceStore } from "@/lib/device-store";
import { useLocale } from "@/lib/i18n";
import { space } from "@vedic-patro/design-tokens";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

const ENABLED_KEY = BIOMETRIC_ENABLED_KEY;
const PROMPTED_KEY = "device:biometric_prompted";
/** Re-lock only after the app has been away this long, so quick app-switches don't nag. */
const RELOCK_AFTER_MS = 30_000;

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
  const colors = useThemeColors();
  const { isAuthenticated, loading: authLoading, logout } = useAuth();

  const [info, setInfo] = useState<BiometricInfo>({ available: false, kind: "generic" });
  const [enabled, setEnabledState] = useState(false);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);

  const prompting = useRef(false);
  const backgroundedAt = useRef<number | null>(null);
  const bootHandled = useRef(false);
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

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      const ok = await authenticateBiometric(
        t("ui.auth.use_label_to_open_vedic_patro", { label }),
        t("common.cancel"),
      );
      if (ok) setLocked(false);
    } finally {
      // iOS reports the system sheet as an inactive→active blip; let it settle first.
      setTimeout(() => {
        prompting.current = false;
      }, 400);
    }
  }, [label, pick]);

  // Cold start: lock once, as soon as we know who is signed in.
  useEffect(() => {
    if (!ready || authLoading || bootHandled.current) return;
    bootHandled.current = true;
    if (enabled && isAuthenticated) {
      setLocked(true);
      void unlock();
    }
  }, [ready, authLoading, enabled, isAuthenticated, unlock]);

  // Returning from the background after a while.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (prompting.current) return;
      if (state === "background") {
        backgroundedAt.current = Date.now();
      } else if (state === "active") {
        const away = backgroundedAt.current;
        backgroundedAt.current = null;
        if (enabled && isAuthenticated && away != null && Date.now() - away > RELOCK_AFTER_MS) {
          setLocked(true);
          void unlock();
        }
      }
    });
    return () => sub.remove();
  }, [enabled, isAuthenticated, unlock]);

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

  // Hide content from the first frame until we know whether a lock applies.
  const cover = !ready || (enabled && authLoading);
  const showLock = isAuthenticated && enabled && locked;

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
      {cover || showLock ? (
        <View
          style={[StyleSheet.absoluteFill, styles.lock, { backgroundColor: colors.background }]}
          accessibilityViewIsModal
        >
          {showLock ? (
            <>
              <View className="size-20 items-center justify-center rounded-3xl bg-secondary/10">
                <LucideNative node={info.kind === "fingerprint" ? FingerprintNode : ScanFaceNode} size={44} color={colors.secondary} strokeWidth={1.5} />
              </View>
              <Text className="text-title mt-6 font-bold text-foreground">
                {t("ui.auth.vedic_patro_is_locked")}
              </Text>
              <Pressable
                onPress={() => void unlock()}
                accessibilityRole="button"
                className="mt-8 h-14 w-full max-w-sm flex-row items-center justify-center gap-2 rounded-2xl bg-secondary px-6 active:opacity-85"
              >
                <LucideNative node={info.kind === "fingerprint" ? FingerprintNode : ScanFaceNode} size={20} color={inkOn(colors.secondary)} />
                <Text className="text-body font-semibold text-secondary-foreground">
                  {t("ui.auth.unlock_with_label", { label })}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setLocked(false);
                  void logout();
                }}
                accessibilityRole="button"
                className="mt-5 py-2 active:opacity-70"
              >
                <Text className="text-body text-muted-foreground">{t("ui.auth.sign_out")}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}
    </BiometricLockContext.Provider>
  );
}

const styles = StyleSheet.create({
  lock: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    elevation: 1000, // design-ok: stacking order, paired with zIndex above
    paddingHorizontal: space["2xl"],
  },
});
