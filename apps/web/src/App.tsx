import { RouterProvider, type AnyRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
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

    const onLanguageChanged = (lang: string) => {
      const next = normalizeLang(lang) as StoredLang;
      setStoredLanguage(next);
      syncDocumentLang(next);
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

function AppRoutes({ appRouter }: { appRouter: AnyRouter }) {
  useTranslation();
  return <RouterProvider router={appRouter} />;
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
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider ssr={ssr}>
            {!ssr && isBrowser ? <LanguageBootstrap /> : null}
            {!ssr && isBrowser ? <CapabilitiesBootstrap /> : null}
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
