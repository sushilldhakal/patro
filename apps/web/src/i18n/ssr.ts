import { setupI18n } from "@vedic-patro/i18n/setup";
import { i18n } from "@vedic-patro/i18n/react";
import ne from "@vedic-patro/i18n/ne.json";
import en from "@vedic-patro/i18n/en.json";

let initialized = false;

/** Fixed Nepali locale for SSR / prerender so HTML matches the default client first paint. */
export function initSsrI18n() {
  if (initialized) return i18n;
  initialized = true;
  setupI18n({ bundles: { ne, en }, language: "ne" });
  return i18n;
}
