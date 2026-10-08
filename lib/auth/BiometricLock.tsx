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
import { Alert, AppState, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { authenticateBiometric, biometricLabel, getBiometricInfo, type BiometricInfo } from "@/lib/auth/biometrics";
import { deviceStore } from "@/lib/device-store";
import { useLocale } from "@/lib/i18n";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

const ENABLED_KEY = "device:biometric_lock";
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
  const { pick } = useLocale();
  const colors = useThemeColors();
  const { isAuthenticated, loading: authLoading, logout } = useAuth();

  const [info, setInfo] = useState<BiometricInfo>({ available: false, kind: "generic" });
  const [enabled, setEnabledState] = useState(false);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);

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
        pick(`${label} प्रयोग गरी वैदिक पात्रो खोल्नुहोस्`, `Use ${label} to open Vedic Patro`),
        pick("रद्द", "Cancel"),
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
          pick(`${label} चालु गर्न पुष्टि गर्नुहोस्`, `Confirm to turn on ${label}`),
          pick("रद्द", "Cancel"),
        );
        if (!ok) return false;
      }
      setEnabledState(on);
      await deviceStore.set(ENABLED_KEY, on);
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
      Alert.alert(
        pick(`${label} प्रयोग गर्ने?`, `Use ${label}?`),
        pick(
          `तपाईं साइन इन नै रहनुहुनेछ। अर्को पटकदेखि ${label} ले एप खोल्नुहोस्।`,
          `You'll stay signed in. Next time, open the app with ${label}.`,
        ),
        [
          { text: pick("अहिले होइन", "Not now"), style: "cancel" },
          { text: pick("चालु गर्नुहोस्", "Turn on"), onPress: () => void setEnabled(true) },
        ],
      );
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
      {cover || showLock ? (
        <View
          style={[StyleSheet.absoluteFill, styles.lock, { backgroundColor: colors.background }]}
          accessibilityViewIsModal
        >
          {showLock ? (
            <>
              <Ionicons name="lock-closed-outline" size={44} color={colors.secondary} />
              <Text className="mt-4 text-lg font-bold text-foreground">
                {pick("वैदिक पात्रो लक गरिएको छ", "Vedic Patro is locked")}
              </Text>
              <Pressable
                onPress={() => void unlock()}
                accessibilityRole="button"
                className="mt-6 flex-row items-center gap-2 rounded-xl bg-secondary px-6 py-3 active:opacity-80"
              >
                <Ionicons name={info.kind === "fingerprint" ? "finger-print" : "scan-outline"} size={18} color={inkOn(colors.secondary)} />
                <Text className="text-base font-semibold text-secondary-foreground">
                  {pick(`${label} प्रयोग गर्नुहोस्`, `Unlock with ${label}`)}
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
                <Text className="text-sm text-muted-foreground">{pick("साइन आउट", "Sign out")}</Text>
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
    elevation: 1000,
    paddingHorizontal: 24,
  },
});
