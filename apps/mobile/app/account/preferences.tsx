import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { cn } from "@vedic-patro/design-tokens/cn";
import { InnerPage } from "@/components/account/AccountList";
import { AppearanceSettings, AstrologyPreferences, GeneralPreferences, HomeScreenSettings, UnitsSettings } from "@/components/account/SettingsPanel";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";

type Tab = "general" | "appearance" | "astrology";
const TABS: Tab[] = ["general", "appearance", "astrology"];

/** Profile → Preferences: language, dates and units; the theme and the home screen; the calculation — on three tabs. */
export default function PreferencesScreen() {
  const { t } = useLocale();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(TABS.includes(params.tab as Tab) ? (params.tab as Tab) : "general");
  return (
    <InnerPage title={t("ui.settings.preferences")} subtitle={t("ui.settings.preferences_hero")}>
      <View accessibilityRole="tablist" className="-mx-1 flex-row border-b border-border">
        {TABS.map((id) => {
          const on = tab === id;
          return (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              className="flex-1 items-center pt-2"
            >
              <Text
                className={cn("pb-3 text-base font-semibold", on ? "text-secondary" : "text-muted-foreground")}
                style={nepaliTextStyle(15)}
              >
                {t(`ui.settings.tab_${id}`)}
              </Text>
              <View className={cn("h-1 w-4/5 rounded-full", on ? "bg-secondary" : "bg-transparent")} />
            </Pressable>
          );
        })}
      </View>
      {tab === "general" ? (
        <View className="gap-4">
          <GeneralPreferences />
          <UnitsSettings />
        </View>
      ) : tab === "appearance" ? (
        <View className="gap-4">
          <AppearanceSettings />
          <HomeScreenSettings />
        </View>
      ) : <AstrologyPreferences />}
    </InnerPage>
  );
}
