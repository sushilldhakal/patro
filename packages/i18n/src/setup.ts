/**
 * Start-up for the shared translator. Each app calls this once:
 *
 *   website: setupI18n({ bundles: { ne }, language: stored, loadBundle: () => import("…/en.json") })
 *   app:     setupI18n({ bundles: { ne, en }, language: "ne" })
 *
 * It also points the domain package's locale helpers (`translateKey`,
 * `normalizeLang` without an argument) at the same language and copy, so pure
 * code and components can never disagree about which language is showing.
 */
import { configureLocale } from "@vedic-patro/domain/locale";
import {
  getLanguage,
  getRequestedLanguage,
  lookupKey,
  registerBundle,
  setBundleLoader,
  setLanguage,
  subscribe,
  type Lang,
} from "./runtime";

type Bundle = Record<string, unknown>;

export function setupI18n({
  bundles,
  language,
  loadBundle,
  persist,
}: {
  bundles: Partial<Record<Lang, Bundle>>;
  /** Starting language (the stored choice, or the Nepali default). */
  language?: string | null;
  /** Fetches a bundle that was left out of `bundles` (the website's English). */
  loadBundle?: (lang: Lang) => Promise<Bundle>;
  /** Saves the reader's pick whenever it changes (after the starting language is applied). */
  persist?: (lang: Lang) => void;
}): void {
  for (const [lang, bundle] of Object.entries(bundles) as [Lang, Bundle | undefined][]) {
    if (bundle) registerBundle(lang, bundle);
  }
  if (loadBundle) setBundleLoader(loadBundle);
  configureLocale({
    currentLanguage: getLanguage,
    translate: (key, lng) => {
      const value = lookupKey(lng, key);
      return typeof value === "string" ? value : undefined;
    },
  });
  if (language) void setLanguage(language);
  if (persist) {
    let saved = getRequestedLanguage();
    subscribe(() => {
      const picked = getRequestedLanguage();
      if (picked === saved) return;
      saved = picked;
      persist(picked);
    });
  }
}
