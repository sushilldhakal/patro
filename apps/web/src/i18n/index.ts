import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getStoredLanguage } from "@/lib/user-preferences";

import ne from "./ne.json";

function clientInitialLng(): string {
  if (typeof window === "undefined") return "ne";
  return getStoredLanguage() ?? "ne";
}

// Nepali only on first paint (default locale, matches SSR). English is loaded on
// demand when the user switches language — keeps ~30 KiB out of the home bundle.
void i18n.use(initReactI18next).init({
  resources: {
    ne: { translation: ne },
  },
  lng: clientInitialLng(),
  supportedLngs: ["en", "ne"],
  fallbackLng: "ne",
  load: "languageOnly",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

let enLoadPromise: Promise<void> | null = null;

export function ensureEnglishBundle(): Promise<void> {
  if (i18n.hasResourceBundle("en", "translation")) {
    return Promise.resolve();
  }
  if (!enLoadPromise) {
    enLoadPromise = import("./en.json").then((mod) => {
      i18n.addResourceBundle("en", "translation", mod.default, true, true);
      // `lng` may already be "en" (restored from storage), in which case nothing
      // else emits languageChanged once the bundle lands — components would keep
      // rendering the Nepali fallback they resolved on first paint.
      if ((i18n.language ?? "").slice(0, 2) === "en") {
        void i18n.changeLanguage("en");
      }
    });
  }
  return enLoadPromise;
}

export default i18n;

if (typeof window !== "undefined" && clientInitialLng() === "en") {
  void ensureEnglishBundle();
}
