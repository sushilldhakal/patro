import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ne from "./ne.json";
import en from "./en.json";

let initialized = false;

/** Fixed Nepali locale for SSR / prerender so HTML matches the default client first paint. */
export function initSsrI18n() {
  if (initialized) return i18n;
  initialized = true;

  void i18n.use(initReactI18next).init({
    resources: {
      ne: { translation: ne },
      en: { translation: en },
    },
    lng: "ne",
    supportedLngs: ["en", "ne"],
    fallbackLng: "ne",
    load: "languageOnly",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

  return i18n;
}
