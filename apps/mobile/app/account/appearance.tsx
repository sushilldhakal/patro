import { InnerPage } from "@/components/account/AccountList";
import { AppearanceSettings } from "@/components/account/SettingsPanel";
import { useLocale } from "@/lib/i18n";

/** Profile → Appearance. */
export default function AppearanceSettingsScreen() {
  const { t } = useLocale();
  return (
    <InnerPage title={t("ui.settings.appearance")}>
      <AppearanceSettings />
    </InnerPage>
  );
}
