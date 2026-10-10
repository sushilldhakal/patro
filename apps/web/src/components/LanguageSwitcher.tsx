import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ensureEnglishBundle } from "@/i18n";
import { useLocale } from "@/i18n/locale";
import { setStoredLanguage } from "@/lib/user-preferences";

function notifyLangPrefChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("patro-lang-pref"));
  }
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n: i18nInstance, t, ready } = useTranslation();
  // English resources load on demand, so i18next keeps `resolvedLanguage` on the
  // Nepali fallback even while the UI is English — reading it raw left the
  // button offering "English" in English, with no way back. `useLocale` applies
  // the stored preference the same way the rest of the app does.
  const { lang } = useLocale();
  const isNepali = lang !== "en";

  const toggle = () => {
    if (isNepali) {
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

  const label = isNepali ? t("switch_to_english") : t("switch_to_nepali");

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!ready}
      className={cn(
        "h-9 px-2.5 rounded-lg border border-border bg-card text-xs font-semibold hover:text-foreground hover:bg-muted transition-colors shrink-0 disabled:opacity-60",
        className,
      )}
      aria-label={label}
    >
      {ready ? label : "…"}
    </button>
  );
}
