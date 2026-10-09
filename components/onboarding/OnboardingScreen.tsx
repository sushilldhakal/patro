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
  setStoredCalendarEraPreference,
  setStoredDataMode,
  type OnboardingCalendarEra,
  type OnboardingDataMode,
} from "@/lib/onboarding-storage";
import { setCachedCalendarEraPreference } from "@/lib/patro-era-preference";

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
        className="text-center text-sm font-semibold"
        style={{ color: selected ? colors.secondary : colors.foreground }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-center text-xs text-muted-foreground">{subtitle}</Text>
      ) : null}
    </Pressable>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mt-7 gap-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
    ne: ["आजको पञ्चाङ्ग", "बि.सं. र ई.सं. मिति, तिथि, नक्षत्र, योग, करण र सूर्योदय–सूर्यास्त एकै ठाउँमा।"],
    en: ["Daily panchanga", "BS and AD dates, tithi, nakshatra, yoga, karana and sunrise–sunset in one place."],
  },
  {
    icon: "gift-outline",
    ne: ["चाडपर्व र बिदा", "महिना ग्रिडमा चाडपर्व र सार्वजनिक बिदा हेर्नुहोस्।"],
    en: ["Festivals & holidays", "Browse festivals and public holidays on the month grid."],
  },
  {
    icon: "planet-outline",
    ne: ["ग्रह स्थिति र आकाश", "ग्रहहरूको स्थिति र ३D आकाश दृश्य हेर्नुहोस्।"],
    en: ["Planets & sky view", "See planetary positions and explore the 3D sky."],
  },
  {
    icon: "menu-outline",
    ne: ["थप मेनु", "कुण्डली, साइत, राशिफल, रूपान्तरण र सेटिङ तलको 'थप' बाट पुग्न सकिन्छ।"],
    en: ["The More tab", "Kundali, sait, rashifal, converter and settings live under 'More' at the bottom."],
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
          accessibilityLabel={ne ? "छोड्नुहोस्" : "Skip tour"}
        >
          <Text className="text-sm font-semibold text-muted-foreground">
            {ne ? "छोड्नुहोस्" : "Skip"}
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
        <Text className="text-center text-2xl font-bold text-foreground">{title}</Text>
        <Text className="text-center text-base text-muted-foreground">{body}</Text>
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
        <Text className="text-base font-semibold" style={{ color: "#ffffff" }}>
          {last ? (ne ? "सुरु गर्नुहोस्" : "Start exploring") : ne ? "अर्को" : "Next"}
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
  const [era, setEra] = useState<OnboardingCalendarEra>("bs");
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
      setCachedCalendarEraPreference(era);
      await Promise.all([setStoredCalendarEraPreference(era), setStoredDataMode(dataMode)]);
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
      contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 40 }}
    >
      <Text className="text-2xl font-bold text-foreground">वैदिक पात्रोमा स्वागत छ</Text>
      <Text className="mt-1 text-base text-foreground">Welcome to Vedic Patro</Text>
      <Text className="mt-2 text-sm text-muted-foreground">
        सुरु गर्नु अघि केही रोजाइहरू मिलाऔं। पछि सेटिङबाट यी सबै परिवर्तन गर्न सकिन्छ।
      </Text>
      <Text className="mt-1 text-sm text-muted-foreground">
        Let's set a few preferences before you start — you can change all of these later in
        Settings.
      </Text>

      <Section label="थिम · Theme">
        <OptionCard
          icon="phone-portrait-outline"
          title="सिस्टम · System"
          selected={theme === "system"}
          onPress={() => chooseTheme("system")}
        />
        <OptionCard
          icon="sunny-outline"
          title="उज्यालो · Light"
          selected={theme === "light"}
          onPress={() => chooseTheme("light")}
        />
        <OptionCard
          icon="moon-outline"
          title="अँध्यारो · Dark"
          selected={theme === "dark"}
          onPress={() => chooseTheme("dark")}
        />
      </Section>

      <Section label="भाषा · Language">
        <OptionCard
          icon="language-outline"
          title="नेपाली"
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

      <Section label="पात्रो · Calendar">
        <OptionCard
          icon="calendar-outline"
          title="वि.सं. · BS"
          subtitle="Bikram Sambat"
          selected={era === "bs"}
          onPress={() => setEra("bs")}
        />
        <OptionCard
          icon="calendar-outline"
          title="ई.सं. · AD"
          subtitle="Gregorian"
          selected={era === "ad"}
          onPress={() => setEra("ad")}
        />
      </Section>

      <Section label="डाटा · Data">
        <OptionCard
          icon="download-outline"
          title="अफलाइन · Offline"
          subtitle="डाउनलोड गर्नुहोस् · Download data"
          selected={dataMode === "offline"}
          onPress={() => setDataMode("offline")}
        />
        <OptionCard
          icon="cloud-outline"
          title="अनलाइन · Online"
          subtitle="डाउनलोड नगर्नुहोस् · Don't download"
          selected={dataMode === "online"}
          onPress={() => setDataMode("online")}
        />
      </Section>

      {dataMode === "offline" ? (
        <Text className="mt-3 text-xs text-muted-foreground">
          {isOnline
            ? "अर्को स्क्रिनमा कुन वर्षदेखि कुन वर्षसम्म चाहिने छान्नुहोस् (बढीमा ९० वर्षको अन्तर)। डाउनलोड सुरु गर्नु अघि कति डाटा लाग्छ देखाइनेछ। · Next, choose which years you need (at most a 90-year span). You'll see how much data it takes before anything downloads."
            : "इन्टरनेट जोडिएपछि वर्ष छान्न सकिनेछ। · You can pick your years once you're connected to the internet."}
        </Text>
      ) : (
        <Text className="mt-3 text-xs text-muted-foreground">
          पछि जुनसुकै बेला सेटिङबाट वर्ष छानेर डाउनलोड गर्न सकिनेछ। · You can still choose years to
          download later from Offline Data in settings.
        </Text>
      )}

      <Pressable
        onPress={submit}
        disabled={submitting}
        className="mt-8 flex-row items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 active:opacity-80 disabled:opacity-60"
      >
        {submitting ? <ActivityIndicator size="small" color="#ffffff" /> : null}
        <Text className="text-base font-semibold" style={{ color: "#ffffff" }}>
          अगाडि बढ्नुहोस् · Get Started
        </Text>
      </Pressable>
    </ScrollView>
  );
}
