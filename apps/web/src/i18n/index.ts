import { setupI18n } from "@vedic-patro/i18n/setup";
import { i18n, type Lang } from "@vedic-patro/i18n/react";
import ne from "@vedic-patro/i18n/web/ne.json";
import { getStoredLanguage } from "@/lib/user-preferences";

function clientInitialLng(): Lang {
  if (typeof window === "undefined") return "ne";
  return getStoredLanguage() ?? "ne";
}

// Nepali only on first paint (default locale, matches SSR). English is loaded on
// demand when the user switches language — keeps ~30 KiB out of the home bundle.
// The translator itself is the shared one (@vedic-patro/i18n), the same as the app's.
setupI18n({
  bundles: { ne },
  language: clientInitialLng(),
  loadBundle: async () => (await import("@vedic-patro/i18n/web/en.json")).default,
});

export function ensureEnglishBundle(): Promise<void> {
  return i18n.loadLanguage("en");
}

export default i18n;
