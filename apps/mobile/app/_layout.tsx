import "../global.css";
import "@/lib/quiet-native-gl-logs";
import { Stack, useRootNavigationState, useRouter } from "expo-router";
import { deviceStore } from "@/lib/device-store";
import { OFFLINE_SETUP_PENDING_KEY } from "@/lib/offline/offline-setup";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, View } from "react-native";
import { QueryClient } from "@tanstack/react-query";
import { ApiError, TimeoutError } from "@vedic-patro/api-client";
import { OfflineMissError } from "@/lib/offline/offline-http";
import { OfflineUnavailableError } from "@/lib/offline/offline-store";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  deserializeQueryCache,
  queryCacheRestoreStats,
  queryCacheStorage,
  serializeQueryCache,
} from "@/lib/query-cache-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
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
import { NotificationsRuntime } from "@/components/notifications/NotificationsRuntime";
import "@/lib/notifications/background";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { isOnboardingComplete } from "@/lib/onboarding-storage";
import { loadCalendarEraPreference } from "@/lib/patro-era-preference";
import { loadStoredLocation } from "@/lib/use-panchanga-location";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { usePatroCapabilities } from "@/lib/use-patro-capabilities";
import { usePreviewAutoUpdate } from "@/lib/use-preview-auto-update";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* Expo Go / hot reload may not register a native splash view controller. */
});

// Kept well past staleTime so a query survives long enough to be persisted
// and read back offline after the app is closed and reopened.
const QUERY_GC_TIME = 1000 * 60 * 60 * 24 * 7;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Almost everything here is keyed by date + place (panchanga, calendar,
      // festivals, documents) and does not change once computed, so a query is
      // reused for an hour instead of being refetched every time a screen
      // remounts. Account data (profiles) sets its own shorter staleTime.
      staleTime: 60 * 60_000,
      gcTime: QUERY_GC_TIME,
      // Two retries with the default backoff (1 s, 2 s) kept a failed screen on its
      // loader for 3+ s before showing the error or the offline copy.
      retry: (failureCount, error) => failureCount < 1 && isWorthRetrying(error),
      retryDelay: 800,
    },
  },
});

/**
 * One retry helps a dropped connection; it only doubles the wait for a timeout
 * on a weak signal (another 45 s on the loader), for an answer the server gave
 * on purpose (4xx: unsupported year, bad date), or for data that is simply not
 * downloaded while offline.
 */
function isWorthRetrying(error: unknown): boolean {
  if (error instanceof TimeoutError || error instanceof OfflineMissError || error instanceof OfflineUnavailableError) {
    return false;
  }
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return true;
}

/** JS start, for the one-line cache-restore timing logged after restore. */
const JS_START = Date.now();

function logQueryCacheRestore() {
  const { bytes, readMs, parseMs } = queryCacheRestoreStats;
  console.info(
    `[query-cache] restored ${Math.round(bytes / 1024)} KB, ${queryClient.getQueryCache().getAll().length} queries — ` +
      `read ${readMs} ms, parse ${parseMs} ms, ready ${Date.now() - JS_START} ms after JS start`,
  );
}

const asyncStoragePersister = createAsyncStoragePersister({
  // A file on iOS/Android — AsyncStorage rows over ~2 MB are unreadable on Android.
  storage: queryCacheStorage,
  key: "vedic-patro-query-cache",
  serialize: serializeQueryCache,
  deserialize: deserializeQueryCache,
  // Serializing the whole cache runs on the JS thread; batch writes while browsing.
  throttleTime: 3000,
});

// The bulk BS-year/month calendar payloads have their own dedicated, much more
// storage-efficient offline store (lib/offline/offline-store.ts, backed by
// SQLite) — keep them out of this general-purpose persister so it stays small
// and fast for everything else the user has recently viewed (a day's
// panchanga, gochar, rashifal, festivals, holidays…).
function shouldPersistQuery(query: { queryKey: readonly unknown[]; state: { status: string } }): boolean {
  // Only settled data: a pending query is dehydrated with a promise that cannot be saved,
  // and restoring it fails with "promise.then is not a function" (the whole cache is then discarded).
  if (query.state.status !== "success") return false;
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
  usePreviewAutoUpdate();
  const [loaded] = useFonts({
    /* Semi-condensed (width 87.5%), the width the website loads. See assets/fonts/README.md. */
    NotoSansDevanagari_400Regular: require("../assets/fonts/NotoSansDevanagari-SemiCondensed-400.ttf"),
    NotoSansDevanagari_500Medium: require("../assets/fonts/NotoSansDevanagari-SemiCondensed-500.ttf"),
    NotoSansDevanagari_600SemiBold: require("../assets/fonts/NotoSansDevanagari-SemiCondensed-600.ttf"),
    NotoSansDevanagari_700Bold: require("../assets/fonts/NotoSansDevanagari-SemiCondensed-700.ttf"),
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
    // The saved place is read here too, so the first screen fetches it rather than Kathmandu.
    Promise.all([isOnboardingComplete(), loadCalendarEraPreference(), loadStoredLocation()]).then(([done]) => {
      if (active) setOnboarded(done);
    });
    return () => {
      active = false;
    };
  }, []);

  // Web: the Google Noto stylesheet styles html/body and any text that doesn't
  // pin a family. Hold the splash until it's loaded too, so text never swaps
  // from the fallback face (a visible size jump) after first paint.
  const [webFontReady, setWebFontReady] = useState(Platform.OS !== "web");
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined" || !document.fonts) {
      setWebFontReady(true);
      return;
    }
    let active = true;
    const done = () => active && setWebFontReady(true);
    const timeout = setTimeout(done, 3000);
    Promise.all([
      document.fonts.load('400 16px "Noto Sans Devanagari"', /* copy-ok */ "अआक"),
      document.fonts.load('700 16px "Noto Sans Devanagari"', /* copy-ok */ "अआक"),
    ])
      .then(done, done);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, []);

  const ready = loaded && onboarded !== null && webFontReady;

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
              onSuccess={logQueryCacheRestore}
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
      {ready && onboarded ? <NotificationsRuntime /> : null}
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
