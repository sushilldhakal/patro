import "../global.css";
import "@/lib/quiet-native-gl-logs";
import { Stack, useRootNavigationState, useRouter } from "expo-router";
import { deviceStore } from "@/lib/device-store";
import { OFFLINE_SETUP_PENDING_KEY } from "@/lib/offline/offline-setup";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, View } from "react-native";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
} from "@expo-google-fonts/noto-sans-devanagari";
import { FiraCode_400Regular, FiraCode_700Bold } from "@expo-google-fonts/fira-code";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LocaleProvider } from "@/lib/i18n";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { BiometricLockProvider } from "@/lib/auth/BiometricLock";
import { OfflineDataProvider } from "@/lib/offline/OfflineDataContext";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { isOnboardingComplete } from "@/lib/onboarding-storage";
import { loadCalendarEraPreference } from "@/lib/patro-era-preference";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { usePatroCapabilities } from "@/lib/use-patro-capabilities";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* Expo Go / hot reload may not register a native splash view controller. */
});

// Kept well past staleTime so a query survives long enough to be persisted
// and read back offline after the app is closed and reopened.
const QUERY_GC_TIME = 1000 * 60 * 60 * 24 * 7;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: QUERY_GC_TIME,
      retry: 2,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "vedic-patro-query-cache",
});

// The bulk BS-year/month calendar payloads have their own dedicated, much more
// storage-efficient offline store (lib/offline/offline-store.ts, backed by
// SQLite) — keep them out of this general-purpose persister so it stays small
// and fast for everything else the user has recently viewed (a day's
// panchanga, gochar, rashifal, festivals, holidays…).
function shouldPersistQuery(query: { queryKey: readonly unknown[] }): boolean {
  const [scope, sub] = query.queryKey;
  if (scope === "month") return false;
  if (scope === "panchanga" && sub === "year-wheel") return false;
  return true;
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,
    NotoSansDevanagari_600SemiBold,
    NotoSansDevanagari_700Bold,
    FiraCode_400Regular,
    FiraCode_700Bold,
    ...Ionicons.font,
  });

  // "checking" until we know whether this install has been through onboarding
  // (theme/language/calendar/offline-or-online) — resolved once, before the
  // splash screen hides, so the very first thing shown is either onboarding
  // or the real app, never a flash of one then the other.
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([isOnboardingComplete(), loadCalendarEraPreference()]).then(([done]) => {
      if (active) setOnboarded(done);
    });
    return () => {
      active = false;
    };
  }, []);

  const ready = loaded && onboarded !== null;

  useEffect(() => {
    if (!ready) return;
    if (Platform.OS === "web") {
      window.__hideVedicPatroBootSplash?.();
    }
    void SplashScreen.hideAsync().catch(() => {
      /* Already hidden or unavailable (common in Expo Go). */
    });
  }, [ready]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }} className="flex-1 bg-background">
      <SafeAreaProvider>
        <ThemeProvider>
          <LocaleProvider>
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{
                persister: asyncStoragePersister,
                maxAge: QUERY_GC_TIME,
                dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
              }}
            >
              <OfflineDataProvider>
                <AuthProvider>
                  <BiometricLockProvider>
                    <RootShell ready={ready} onboarded={onboarded} onOnboarded={() => setOnboarded(true)} />
                  </BiometricLockProvider>
                </AuthProvider>
              </OfflineDataProvider>
            </PersistQueryClientProvider>
          </LocaleProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootShell({
  ready,
  onboarded,
  onOnboarded,
}: {
  ready: boolean;
  onboarded: boolean | null;
  onOnboarded: () => void;
}) {
  const { colors } = useTheme();
  usePatroCapabilities();
  const router = useRouter();
  const navState = useRootNavigationState();

  // Someone who chose "offline" at onboarding lands on the Offline Data screen
  // once, to pick their years and see the size before anything downloads.
  useEffect(() => {
    if (!ready || onboarded !== true || !navState?.key) return;
    let active = true;
    void deviceStore.get<boolean>(OFFLINE_SETUP_PENDING_KEY).then(async (pending) => {
      if (!active || !pending) return;
      await deviceStore.set(OFFLINE_SETUP_PENDING_KEY, false);
      router.push("/account/offline-data");
    });
    return () => {
      active = false;
    };
  }, [ready, onboarded, navState?.key, router]);

  return (
    <>
      {ready && onboarded === false ? (
        <OnboardingScreen onComplete={onOnboarded} />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade_from_bottom",
            animationDuration: 220,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      )}
      {ready ? <ThemedStatusBar /> : null}
      {!ready ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.fontGate,
            { backgroundColor: colors.background, pointerEvents: "none" },
          ]}
        >
          <VedicPatroLoader />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  fontGate: {
    alignItems: "center",
    justifyContent: "center",
  },
});
