import "../global.css";
import "@/lib/quiet-native-gl-logs";
import { Stack, useNavigationContainerRef, useRootNavigationState, useRouter, type ErrorBoundaryProps } from "expo-router";
import * as Sentry from "@sentry/react-native";
import { deviceStore } from "@/lib/device-store";
import { OFFLINE_SETUP_PENDING_KEY } from "@/lib/offline/offline-setup";
import { StatusBar } from "expo-status-bar";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { tFor } from "@vedic-patro/i18n/runtime";
import { light, mobileTypeScale, radius, space } from "@vedic-patro/design-tokens";
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
import { NOTO_DEVANAGARI_BOLD, NOTO_DEVANAGARI_MEDIUM, NOTO_DEVANAGARI_REGULAR, NOTO_DEVANAGARI_SEMIBOLD } from "@/lib/fonts";
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
import * as Updates from "expo-updates";
import { Observe, ObserveRoot } from "@/lib/observe";
import { useReducedMotionPref } from "@vedic-patro/ui/motion";

/*
 * EAS Observe: startup timing (TTR is measured by `ObserveRoot.wrap` below, TTI by the
 * `markInteractive` call once the first screen is up), per-route timing through the Expo Router
 * integration, and unhandled JS errors as `exception` events — the closest thing to a crash
 * reason we get from TestFlight testers. Configured at module scope: the integration cannot be
 * switched on after a screen has mounted. Events are tagged with the update channel, so preview
 * (TestFlight) and production (store) read apart in the dashboard. Debug builds do not dispatch.
 */
/*
 * Sentry: crashes and JS errors with the file and line (source maps are uploaded by the EAS build
 * and update steps), the screen the user was on and their last taps. The DSN comes from the EAS
 * environment (`EXPO_PUBLIC_SENTRY_DSN`); with none set — or in development, or on the web — it
 * stays off. No personal data is attached.
 */
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const sentryNavigation = Sentry.reactNavigationIntegration({ enableTimeToInitialDisplay: true });
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN) && !__DEV__ && Platform.OS !== "web",
  environment: Updates.channel || (__DEV__ ? "development" : "production"),
  sendDefaultPii: false,
  tracesSampleRate: 0.2,
  integrations: [sentryNavigation],
});

Observe.configure({
  environment: Updates.channel || (__DEV__ ? "development" : "production"),
  integrations: {
    "expo-router": {
      // Route params that can carry personal data stay on the device.
      filteredParams: ["token", "profileId", "email", "name", "dob", "birthDate", "birthTime", "lat", "lon"],
    },
  },
});

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

const WEB_NOTO_FONTS = {
  [NOTO_DEVANAGARI_REGULAR]: require("../assets/fonts/NotoSansDevanagariSemiCondensed-Regular.ttf"),
  [NOTO_DEVANAGARI_MEDIUM]: require("../assets/fonts/NotoSansDevanagariSemiCondensed-Medium.ttf"),
  [NOTO_DEVANAGARI_SEMIBOLD]: require("../assets/fonts/NotoSansDevanagariSemiCondensed-SemiBold.ttf"),
  [NOTO_DEVANAGARI_BOLD]: require("../assets/fonts/NotoSansDevanagariSemiCondensed-Bold.ttf"),
};

function RootLayout() {
  usePreviewAutoUpdate();
  const navigationRef = useNavigationContainerRef();
  useEffect(() => {
    if (navigationRef) sentryNavigation.registerNavigationContainer(navigationRef);
  }, [navigationRef]);
  const [loaded] = useFonts({
    /* Noto (semi-condensed, see assets/fonts/README.md) is built into the iOS and Android apps by the
       expo-font plugin and registered by the OS at launch. Registered here at runtime instead, the
       weights could drop back to regular after the app reloaded into an update. Web still loads them. */
    ...(Platform.OS === "web" ? WEB_NOTO_FONTS : {}),
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
    /* App-level TTI: fonts, the onboarding check and the saved place are in, and the
       splash is going — the first screen (home or onboarding) is usable from here. */
    Observe.markInteractive({ params: { onboarded: onboarded === true } });
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const reducedMotion = useReducedMotionPref();
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
            // Phone keeps the root rise. Reduce Motion drops the travel and fades.
            animation: reducedMotion ? "fade" : "fade_from_bottom",
            animationDuration: 220,
            ...(reducedMotion ? { animationMatchesGesture: true } : {}),
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

export default Sentry.wrap(ObserveRoot.wrap(RootLayout));

/**
 * A screen that throws while rendering lands here instead of closing the app (what a release
 * build does with an uncaught render error). Render errors never reach Observe's global
 * handler, so this reports them itself — with the message and stack, which is what tells us
 * why a page "crashed" for a TestFlight tester. Drawn outside the providers, so it uses plain
 * colours and the runtime translator.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    Observe.reportError(error);
    Sentry.captureException(error);
  }, [error]);
  return (
    <View style={styles.errorRoot}>
      <Text style={styles.errorText}>{tFor(undefined, "common.route_error_body")}</Text>
      <Pressable accessibilityRole="button" onPress={() => void retry()} style={styles.errorButton}>
        <Text style={styles.errorButtonText}>{tFor(undefined, "common.reload")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fontGate: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorRoot: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, padding: space["2xl"], backgroundColor: light.background },
  errorText: { fontSize: mobileTypeScale.base.size, lineHeight: mobileTypeScale.base.lineHeight, color: light.foreground, textAlign: "center" },
  errorButton: { borderRadius: radius.xl, backgroundColor: light.secondary, paddingHorizontal: space.xl, paddingVertical: space.md },
  errorButtonText: { fontSize: mobileTypeScale.base.size, fontWeight: "700", color: light.secondaryForeground },
});
