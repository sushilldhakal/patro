import { deviceStore } from "@/lib/device-store";
import { OFFLINE_SETUP_PENDING_KEY } from "@/lib/offline/offline-setup";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/theme-context";
import { useLocale } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language-storage";
import { useOfflineData } from "@/lib/offline/OfflineDataContext";
import {
  setOnboardingComplete,
  setStoredDataMode,
  type OnboardingDataMode,
} from "@/lib/onboarding-storage";
import {
  DEFAULT_CALENDAR,
  setCalendarSystem,
  type CalendarSystem,
} from "@vedic-patro/domain/calendar/calendar-system";

import { neutral } from "@vedic-patro/design-tokens";
import { tFor, lazyList } from "@vedic-patro/i18n/runtime";
function OptionCard({
  selected,
  onPress,
  title,
  subtitle,
  icon,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center gap-2 rounded-xl border-2 px-3 py-4 active:opacity-80"
      style={{
        borderColor: selected ? colors.secondary : colors.border,
        backgroundColor: selected ? `${colors.secondary}1a` : colors.card,
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Ionicons name={icon} size={22} color={selected ? colors.secondary : colors.mutedForeground} />
      <Text
        className="text-body text-center font-semibold"
        style={{ color: selected ? colors.secondary : colors.foreground }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-caption text-center text-muted-foreground">{subtitle}</Text>
      ) : null}
    </Pressable>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mt-7 gap-3">
      <Text className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Text>
      <View className="flex-row gap-3">{children}</View>
    </View>
  );
}

const TOUR_STEPS: {
  icon: keyof typeof Ionicons.glyphMap;
  ne: [string, string];
  en: [string, string];
}[] = [
  {
    icon: "calendar-outline",
    ne: lazyList("ne", "ui.onboarding.daily_panchanga_bs_and_ad_dates"),
    en: lazyList("en", "ui.onboarding.daily_panchanga_bs_and_ad_dates"),
  },
  {
    icon: "gift-outline",
    ne: lazyList("ne", "ui.onboarding.festivals_holidays_browse_festivals_and_public"),
    en: lazyList("en", "ui.onboarding.festivals_holidays_browse_festivals_and_public"),
  },
  {
    icon: "planet-outline",
    ne: lazyList("ne", "ui.onboarding.planets_sky_view_see_planetary_positions"),
    en: lazyList("en", "ui.onboarding.planets_sky_view_see_planetary_positions"),
  },
  {
    icon: "menu-outline",
    ne: lazyList("ne", "ui.onboarding.the_more_tab_kundali_sait_rashifal"),
    en: lazyList("en", "ui.onboarding.the_more_tab_kundali_sait_rashifal"),
  },
];

/** Short, skippable feature tour shown once, right after the setup screen. */
function FeatureTour({ language, onDone }: { language: AppLanguage; onDone: () => void }) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const ne = language === "ne";
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;
  const [title, body] = ne ? step.ne : step.en;

  return (
    <View className="flex-1 px-6 pb-10 pt-16" style={{ backgroundColor: colors.background }}>
      <View className="flex-row justify-end">
        <Pressable
          onPress={onDone}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={tFor((ne) ? "ne" : "en", "ui.onboarding.skip_tour")}
        >
          <Text className="text-body font-semibold text-muted-foreground">
            {tFor((ne) ? "ne" : "en", "ui.onboarding.skip")}
          </Text>
        </Pressable>
      </View>
      <View className="flex-1 items-center justify-center gap-4">
        <View
          className="h-24 w-24 items-center justify-center rounded-full"
          style={{ backgroundColor: `${colors.secondary}1a` }}
        >
          <Ionicons name={step.icon} size={44} color={colors.secondary} />
        </View>
        <Text className="text-display text-center font-bold text-foreground">{title}</Text>
        <Text className="text-body text-center text-muted-foreground">{body}</Text>
        <View className="mt-2 flex-row gap-2">
          {TOUR_STEPS.map((_, i) => (
            <View
              key={i}
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: i === index ? colors.secondary : colors.border }}
            />
          ))}
        </View>
      </View>
      <Pressable
        onPress={() => (last ? onDone() : setIndex(index + 1))}
        className="items-center rounded-lg bg-primary px-5 py-3.5 active:opacity-80"
      >
        <Text className="text-body font-semibold" style={{ color: neutral.white }}>
          {last ? (tFor((ne) ? "ne" : "en", "ui.onboarding.start_exploring")) : tFor((ne) ? "ne" : "en", "learn_page.next")}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * The very first screen a new install sees, before anything else in the app
 * renders (see app/_layout.tsx). Downloading calendar data offline is the
 * user's call, not something the app decides on its own — this is the one
 * place that asks, up front, alongside the other day-one preferences.
 */
export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { setPreference, colors } = useTheme();
  const { setLang } = useLocale();
  const { isOnline } = useOfflineData();

  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [tour, setTour] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>("ne");
  // Independent of the language picked above: BS unless the reader chooses AD.
  const [calendar, setCalendar] = useState<CalendarSystem>(DEFAULT_CALENDAR);
  const [dataMode, setDataMode] = useState<OnboardingDataMode>("online");
  const [submitting, setSubmitting] = useState(false);

  const chooseTheme = (next: "system" | "light" | "dark") => {
    setTheme(next);
    setPreference(next);
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      setLang(language);
      // Updates the in-memory preference at once and persists it (hook set in lib/i18n.tsx).
      setCalendarSystem(calendar);
      await setStoredDataMode(dataMode);
      await setOnboardingComplete();
      // Which years to keep (and how big that is) is asked on the Offline Data
      // screen, which opens right after onboarding.
      if (dataMode === "offline") await deviceStore.set(OFFLINE_SETUP_PENDING_KEY, true);
      setTour(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (tour) return <FeatureTour language={language} onDone={onComplete} />;

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerClassName="p-6 pb-10 pt-16"
    >
      <Text className="text-display font-bold text-foreground">{tFor(undefined, "ui.onboarding.x_0822b526")}</Text>
      <Text className="text-body mt-1 text-foreground">Welcome to Vedic Patro</Text>
      <Text className="text-body mt-2 text-muted-foreground">
        {tFor(undefined, "ui.onboarding.x_f8221375")}
      </Text>
      <Text className="text-body mt-1 text-muted-foreground">
        Let's set a few preferences before you start — you can change all of these later in
        Settings.
      </Text>

      <Section label={tFor(undefined, "ui.onboarding.x_d90a78d6")}>
        <OptionCard
          icon="phone-portrait-outline"
          title={tFor(undefined, "ui.onboarding.x_db713fc4")}
          selected={theme === "system"}
          onPress={() => chooseTheme("system")}
        />
        <OptionCard
          icon="sunny-outline"
          title={tFor(undefined, "ui.onboarding.x_41f208d0")}
          selected={theme === "light"}
          onPress={() => chooseTheme("light")}
        />
        <OptionCard
          icon="moon-outline"
          title={tFor(undefined, "ui.onboarding.x_90d38a50")}
          selected={theme === "dark"}
          onPress={() => chooseTheme("dark")}
        />
      </Section>

      <Section label={tFor(undefined, "ui.onboarding.x_b87583dc")}>
        <OptionCard
          icon="language-outline"
          title={tFor(undefined, "switch_to_nepali")}
          selected={language === "ne"}
          onPress={() => setLanguage("ne")}
        />
        <OptionCard
          icon="language-outline"
          title="English"
          selected={language === "en"}
          onPress={() => setLanguage("en")}
        />
      </Section>

      {/* The app language may not be applied yet, so this step reads in the language picked above. */}
      <Section label={tFor(language, "calendar_system.onboarding_title")}>
        <OptionCard
          icon="calendar-outline"
          title={tFor(language, "calendar_system.bs")}
          subtitle={tFor(language, "calendar_system.bs_hint")}
          selected={calendar === "bs"}
          onPress={() => setCalendar("bs")}
        />
        <OptionCard
          icon="calendar-outline"
          title={tFor(language, "calendar_system.ad")}
          subtitle={tFor(language, "calendar_system.ad_hint")}
          selected={calendar === "ad"}
          onPress={() => setCalendar("ad")}
        />
      </Section>

      <Section label={tFor(undefined, "ui.onboarding.x_856487a7")}>
        <OptionCard
          icon="download-outline"
          title={tFor(undefined, "ui.onboarding.x_3cf0da1c")}
          subtitle={tFor(undefined, "ui.onboarding.x_444fe4eb")}
          selected={dataMode === "offline"}
          onPress={() => setDataMode("offline")}
        />
        <OptionCard
          icon="cloud-outline"
          title={tFor(undefined, "ui.onboarding.x_5ac38b38")}
          subtitle={tFor(undefined, "ui.onboarding.x_3eb17acd")}
          selected={dataMode === "online"}
          onPress={() => setDataMode("online")}
        />
      </Section>

      {dataMode === "offline" ? (
        <Text className="text-caption mt-3 text-muted-foreground">
          {isOnline
            ? tFor(undefined, "ui.onboarding.x_3c35ba8e")
            : tFor(undefined, "ui.onboarding.x_e00d1329")}
        </Text>
      ) : (
        <Text className="text-caption mt-3 text-muted-foreground">
          {tFor(undefined, "ui.onboarding.x_5f81991c")}
        </Text>
      )}

      <Pressable
        onPress={submit}
        disabled={submitting}
        className="mt-8 flex-row items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 active:opacity-80 disabled:opacity-60"
      >
        {submitting ? <ActivityIndicator size="small" color={neutral.white} /> : null}
        <Text className="text-body font-semibold" style={{ color: neutral.white }}>
          {tFor(undefined, "ui.onboarding.x_5158dc32")}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
