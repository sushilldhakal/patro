import { Pressable } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const BTN =
  "h-9 items-center justify-center rounded-lg border border-border bg-card active:bg-muted shrink-0";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useLocale();
  const isNepali = lang === "ne";
  // Always names the language being switched to, in that language.
  const label = isNepali ? t("switch_to_english") : t("switch_to_nepali");

  return (
    <Pressable
      onPress={() => setLang(isNepali ? "en" : "ne")}
      className={cn(BTN, "min-w-[2.25rem] px-2.5", className)}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text className="text-xs font-semibold text-foreground">{label}</Text>
    </Pressable>
  );
}

/** @deprecated Use LanguageSwitcher */
export function LangToggle() {
  return <LanguageSwitcher />;
}
