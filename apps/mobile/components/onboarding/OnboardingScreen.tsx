import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/theme-context";
import { useLocale } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language-storage";
import { setOnboardingComplete, setStoredDataMode } from "@/lib/onboarding-storage";
import { DEFAULT_CALENDAR, setCalendarSystem } from "@vedic-patro/domain/calendar/calendar-system";
import { DEFAULT_CALCULATION_SYSTEM, setCalculationSystem } from "@vedic-patro/domain/calendar/calculation-system";
import { neutral } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";

function LanguageCard({ selected, onPress, title }: { selected: boolean; onPress: () => void; title: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center gap-2 rounded-xl border-2 px-3 py-6 active:opacity-80"
      style={{
        borderColor: selected ? colors.secondary : colors.border,
        backgroundColor: selected ? `${colors.secondary}1a` : colors.card,
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Ionicons name="language-outline" size={24} color={selected ? colors.secondary : colors.mutedForeground} />
      <Text className="text-body text-center font-semibold" style={{ color: selected ? colors.secondary : colors.foreground }}>
        {title}
      </Text>
    </Pressable>
  );
}

/**
 * The very first screen a new install sees (see app/_layout.tsx): one question, the language, then
 * straight to today's patro. Everything else starts on a default and is changed in Settings or asked
 * when it matters — theme follows the system, the calendar is BS, the calculation is drik, and data
 * comes online (offline download is offered when the calendar is missing offline, and the phone
 * calendar is asked when the first event is saved).
 */
export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { colors } = useTheme();
  const { setLang } = useLocale();
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState<AppLanguage>("ne");
  const [submitting, setSubmitting] = useState(false);

  const start = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      setLang(language);
      setCalendarSystem(DEFAULT_CALENDAR);
      setCalculationSystem(DEFAULT_CALCULATION_SYSTEM);
      await setStoredDataMode("online");
      await setOnboardingComplete();
      onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      className="flex-1 px-6"
      style={{ backgroundColor: colors.background, paddingTop: insets.top + 48, paddingBottom: Math.max(insets.bottom, 16) + 16 }}
    >
      <View className="flex-1 justify-center">
        <Text className="text-display text-center font-bold text-foreground">{tFor(language, "ui.onboarding.x_0822b526")}</Text>
        <Text className="text-body mt-3 text-center text-muted-foreground">{tFor(language, "ui.onboarding.language_title")}</Text>
        <View accessibilityRole="radiogroup" className="mt-8 flex-row gap-3">
          <LanguageCard title={tFor("ne", "switch_to_nepali")} selected={language === "ne"} onPress={() => setLanguage("ne")} />
          <LanguageCard title="English" selected={language === "en"} onPress={() => setLanguage("en")} />
        </View>
        <Text className="text-caption mt-4 text-center text-muted-foreground">{tFor(language, "ui.onboarding.language_note")}</Text>
      </View>
      <Pressable
        onPress={() => void start()}
        disabled={submitting}
        accessibilityRole="button"
        className="flex-row items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 active:opacity-80 disabled:opacity-60"
      >
        {submitting ? <ActivityIndicator size="small" color={neutral.white} /> : null}
        <Text className="text-body font-semibold" style={{ color: neutral.white }}>
          {tFor(language, "ui.onboarding.x_5158dc32")}
        </Text>
      </Pressable>
    </View>
  );
}
