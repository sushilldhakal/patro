import { useTranslation } from "@vedic-patro/i18n/react";
import { useLanguageSwitcher } from "@vedic-patro/features/common";
import { LanguageButton } from "@vedic-patro/ui/kit/shell";
import { ensureEnglishBundle } from "@/i18n";
import { setStoredLanguage } from "@/lib/user-preferences";

function notifyLangPrefChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("patro-lang-pref"));
  }
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n: i18nInstance, ready } = useTranslation();
  // English resources load on demand, so i18next keeps `resolvedLanguage` on the
  // Nepali fallback even while the UI is English. `useLocale` (behind `useLanguageSwitcher`) applies
  // the stored preference the same way the rest of the app does.
  const { next, label } = useLanguageSwitcher();

  const toggle = () => {
    if (next === "en") {
      setStoredLanguage("en");
      notifyLangPrefChange();
      void ensureEnglishBundle().then(() => {
        void i18nInstance.changeLanguage("en");
      });
      void i18nInstance.changeLanguage("en");
      return;
    }
    setStoredLanguage("ne");
    notifyLangPrefChange();
    void i18nInstance.changeLanguage("ne");
  };

  return <LanguageButton label={ready ? label : "…"} onPress={toggle} disabled={!ready} className={className} />;
}
