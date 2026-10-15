import { useLocale } from "@/lib/i18n";
import { useLanguageSwitcher } from "@vedic-patro/features/common";
import { LanguageButton } from "@vedic-patro/ui/kit/shell";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { setLang } = useLocale();
  const { next, label } = useLanguageSwitcher();
  return <LanguageButton label={label} onPress={() => void setLang(next)} className={className} />;
}

/** @deprecated Use LanguageSwitcher */
export function LangToggle() {
  return <LanguageSwitcher />;
}
