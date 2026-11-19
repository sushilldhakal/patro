import { RouterProvider, type AnyRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { useEffect, useRef, type ReactNode } from "react";
import { useCalculationSystem, useTranslation } from "@vedic-patro/i18n/react";
import i18n, { ensureEnglishBundle } from "./i18n/index";
import { router } from "./router.tsx";
import { AuthProvider } from "./lib/auth/AuthContext";
import { isBrowser } from "./lib/browser";
import { syncDocumentLang } from "./lib/fonts";
import { usePatroCapabilities } from "./hooks/use-patro-capabilities";
import {
  getStoredLanguage,
  setStoredLanguage,
  THEME_STORAGE_KEY,
  type StoredLang,
} from "./lib/user-preferences";
import { normalizeLang } from "./i18n/locale";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Never retry a client error. A 4xx here means the request itself is
      // wrong — an out-of-range year, a date with no ephemeris — and repeating
      // it cannot help. It also actively hurt: React Query pauses *between*
      // retry attempts, so a doomed retry left the query parked at
      // fetchStatus "paused" with status "pending" instead of settling to
      // "error", and the page showed placeholder state forever rather than the
      // API's explanation. Server/network faults still get one retry.
      retry: (failureCount, error) =>
        error instanceof ApiError && error.status >= 400 && error.status < 500
          ? false
          : failureCount < 1,
      // Jittered so browsers turned away by a busy server (503) don't all retry at once.
      retryDelay: () => 800 + Math.random() * 1700,
      refetchOnWindowFocus: false,
      // Always run and always settle. Under the default "online" mode React
      // Query consults its own connectivity guess before retrying, and when
      // that guess is wrong a failed query parks at fetchStatus "paused"
      // forever: status stays "pending", `isError` never becomes true, and the
      // page keeps rendering placeholder state instead of the API's actual
      // error. Every request here is same-origin (nginx proxies /api), so
      // there is nothing for the offline heuristic to usefully protect.
      networkMode: "always",
    },
  },
});

/**
 * Restore language from localStorage after hydration.
 * First visit → Nepali. After the user switches, keep that choice until they change it again.
 */
function LanguageBootstrap() {
  useEffect(() => {
    const stored = getStoredLanguage();
    const applyStored = async () => {
      if (stored === "en") await ensureEnglishBundle();
      if (stored && normalizeLang(i18n.resolvedLanguage ?? i18n.language) !== stored) {
        await i18n.changeLanguage(stored);
      }
    };
    void applyStored();
    syncDocumentLang(stored ?? i18n.language);

    let cachedLang = normalizeLang(i18n.language) as StoredLang;
    const onLanguageChanged = (lang: string) => {
      const next = normalizeLang(lang) as StoredLang;
      setStoredLanguage(next);
      syncDocumentLang(next);
      if (next !== cachedLang) {
        cachedLang = next;
        // The same era (and so the same query key) is now served in two languages:
        // drop what is cached for screens nobody is looking at and refetch the rest.
        queryClient.removeQueries({ type: "inactive" });
        void queryClient.invalidateQueries();
      }
    };
    i18n.on("languageChanged", onLanguageChanged);
    return () => {
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, []);
  return null;
}

function CapabilitiesBootstrap() {
  usePatroCapabilities();
  return null;
}

/**
 * Drik and the Surya Siddhanta (and drik's ayanamsha) give different days and festival
 * dates, so on a switch every cached response is dropped and the screens on show fetch again.
 */
function CalculationSystemQueryReset() {
  // The whole calculation: the system and drik's ayanamsha.
  const { key } = useCalculationSystem();
  const queryClient = useQueryClient();
  const previous = useRef(key);
  useEffect(() => {
    if (previous.current === key) return;
    previous.current = key;
    void queryClient.resetQueries();
  }, [key, queryClient]);
  return null;
}

function AppRoutes({ appRouter }: { appRouter: AnyRouter }) {
  useTranslation();
  // A calculation switch (drik / Surya Siddhanta, drik's ayanamsha) redraws the page: BS ↔ AD
  // reads that calculation's month table, and a memoised date would otherwise keep the old one.
  // The router keeps its URL, so the reader stays on the same page.
  const { key } = useCalculationSystem();
  return <RouterProvider key={key} router={appRouter} />;
}

export function AppProviders({
  children,
  ssr = false,
}: {
  children: ReactNode;
  ssr?: boolean;
}) {
  return (
    <HelmetProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        storageKey={THEME_STORAGE_KEY}
        disableTransitionOnChange
        /* index.html already applies the stored theme before first paint; next-themes' own inline
           script never runs when React renders it on the client and only drew React's
           "Encountered a script tag" warning. As a data block it is inert and silent. */
        scriptProps={{ type: "application/json" }}
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider ssr={ssr}>
            {!ssr && isBrowser ? <LanguageBootstrap /> : null}
            {!ssr && isBrowser ? <CapabilitiesBootstrap /> : null}
            {!ssr && isBrowser ? <CalculationSystemQueryReset /> : null}
            {children}
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default function App({
  appRouter = router,
  ssr = false,
}: {
  appRouter?: AnyRouter;
  ssr?: boolean;
}) {
  return (
    <AppProviders ssr={ssr}>
      <AppRoutes appRouter={appRouter} />
    </AppProviders>
  );
}
