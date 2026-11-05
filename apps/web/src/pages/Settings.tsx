import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { useAyanamshaMode } from "@vedic-patro/features/kundali";
import { useCalculationSystem, useCalendarSystem, useLocale } from "@vedic-patro/i18n/react";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { CreateEventCards } from "@/components/events/NewEventButton";
import { UpcomingEvents } from "@/components/events/UpcomingEvents";
import { AyanamshaSelector } from "@/components/kundali/AyanamshaSelector";
import { ayanamshaStorage } from "@/lib/kundali/ayanamsha-storage";
import { useRouteLoading } from "@/lib/route-loading";
import { useAuth } from "@/lib/auth/AuthContext";

type ThemePreference = "system" | "light" | "dark";

/**
 * Logged-in settings. The same choices as the app's settings screen: language,
 * calendar, calculation system and theme. Each control writes the store the
 * header toggles already use, so the two never disagree.
 */
export function Settings() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLocale();
  const { calendar, setCalendar } = useCalendarSystem();
  const { system, setSystem } = useCalculationSystem();
  const [ayanamsha, setAyanamsha] = useAyanamshaMode(ayanamshaStorage);
  const { theme, setTheme } = useTheme();

  useRouteLoading(auth.loading);

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      void navigate({ to: "/" });
    }
  }, [auth.loading, auth.isAuthenticated, navigate]);

  if (auth.loading || !auth.user) return null;

  const language = lang === "en" ? "en" : "ne";
  const preference: ThemePreference = theme === "dark" || theme === "system" ? theme : "light";
  const themes: { value: ThemePreference; label: string }[] = [
    { value: "system", label: t("ui.settings.theme_system") },
    { value: "light", label: t("theme_light") },
    { value: "dark", label: t("theme_dark") },
  ];

  return (
    <div className={cn("px-4 py-8", accountClasses.column)}>
      <header className={accountClasses.header}>
        <h1 className={accountClasses.title}>{t("ui.settings.title")}</h1>
        <p className={accountClasses.subtitle}>{auth.user.email}</p>
      </header>

      <div className={accountClasses.settingsStack}>
        <CreateEventCards />
        <UpcomingEvents />

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
          <Choice
            label={t("calculation_system.surya_siddhanta")}
            active={system === "surya_siddhanta"}
            onPress={() => setSystem("surya_siddhanta")}
          />
        </ChoiceGroup>

        {system === "drik" ? <AyanamshaSelector mode={ayanamsha} onModeChange={setAyanamsha} /> : null}

        <ChoiceGroup label={t("ui.settings.theme")}>
          {themes.map((item) => (
            <Choice
              key={item.value}
              label={item.label}
              active={preference === item.value}
              onPress={() => setTheme(item.value)}
            />
          ))}
        </ChoiceGroup>
      </div>
    </div>
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
