import { InnerPage } from "@/components/account/AccountList";
import { LanguageCalendarSettings } from "@/components/account/SettingsPanel";
import { useLocale } from "@/lib/i18n";

/** Profile → Language & calendar. */
export default function LanguageSettingsScreen() {
  const { t } = useLocale();
  return (
    <InnerPage title={t("ui.settings.language_calendar")}>
      <LanguageCalendarSettings />
    </InnerPage>
  );
}
