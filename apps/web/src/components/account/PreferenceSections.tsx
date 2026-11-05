import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import { useAyanamshaMode } from "@vedic-patro/features/kundali";
import { useCalculationSystem, useCalendarSystem, useLocale } from "@vedic-patro/i18n/react";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { AyanamshaSelector } from "@/components/kundali/AyanamshaSelector";
import { ayanamshaStorage } from "@/lib/kundali/ayanamsha-storage";

type ThemePreference = "system" | "light" | "dark";

/** Account → Language and calendar: language, BS | AD, the calculation system and (with Drik) the ayanamsha. */
export function LanguageCalendarSection() {
  const { t, lang, setLang } = useLocale();
  const { calendar, setCalendar } = useCalendarSystem();
  const { system, setSystem } = useCalculationSystem();
  const [ayanamsha, setAyanamsha] = useAyanamshaMode(ayanamshaStorage);
  const language = lang === "en" ? "en" : "ne";
  return (
    <div className={accountClasses.settingsStack}>
      <ChoiceGroup label={t("ui.settings.language")}>
        <Choice label={t("switch_to_nepali")} active={language === "ne"} onPress={() => void setLang("ne")} />
        <Choice label={t("switch_to_english")} active={language === "en"} onPress={() => void setLang("en")} />
      </ChoiceGroup>

      <ChoiceGroup label={t("calendar_system.label")}>
        <Choice label={t("calendar_system.bs")} active={calendar === "bs"} onPress={() => setCalendar("bs")} />
        <Choice label={t("calendar_system.ad")} active={calendar === "ad"} onPress={() => setCalendar("ad")} />
      </ChoiceGroup>

      <ChoiceGroup
        label={t("calculation_system.label")}
        hint={`${t(system === "drik" ? "calculation_system.drik_hint" : "calculation_system.surya_siddhanta_hint")}${
          system === "surya_siddhanta" ? ` — ${t("calculation_system.kundali_note")}` : ""
        }`}
      >
        <Choice label={t("calculation_system.drik")} active={system === "drik"} onPress={() => setSystem("drik")} />
        <Choice label={t("calculation_system.surya_siddhanta")} active={system === "surya_siddhanta"} onPress={() => setSystem("surya_siddhanta")} />
      </ChoiceGroup>

      {system === "drik" ? <AyanamshaSelector mode={ayanamsha} onModeChange={setAyanamsha} /> : null}
    </div>
  );
}

/** Account → Appearance: system, light or dark. */
export function AppearanceSection() {
  const { t } = useLocale();
  const { theme, setTheme } = useTheme();
  const preference: ThemePreference = theme === "dark" || theme === "system" ? theme : "light";
  const themes: { value: ThemePreference; label: string }[] = [
    { value: "system", label: t("ui.settings.theme_system") },
    { value: "light", label: t("theme_light") },
    { value: "dark", label: t("theme_dark") },
  ];
  return (
    <ChoiceGroup label={t("ui.settings.theme")}>
      {themes.map((item) => (
        <Choice key={item.value} label={item.label} active={preference === item.value} onPress={() => setTheme(item.value)} />
      ))}
    </ChoiceGroup>
  );
}

function ChoiceGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <section className={accountClasses.settingsGroup}>
      <h2 className={accountClasses.settingsGroupTitle}>{label}</h2>
      <div className={accountClasses.settingsChoices} role="radiogroup" aria-label={label}>
        {children}
      </div>
      {hint ? <p className={accountClasses.settingsHint}>{hint}</p> : null}
    </section>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onPress}
      className={cn(accountClasses.settingsChoice, active ? accountClasses.settingsChoiceOn : accountClasses.settingsChoiceOff)}
    >
      {label}
    </button>
  );
}
