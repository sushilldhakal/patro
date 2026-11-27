import { InnerPage } from "@/components/account/AccountList";
import { HomeScreenSettings } from "@/components/account/SettingsPanel";
import { useLocale } from "@/lib/i18n";

/** Profile → Home screen: which sections the home page shows. */
export default function HomeScreenSettingsScreen() {
  const { t } = useLocale();
  return (
    <InnerPage title={t("ui.settings.home_screen")}>
      <HomeScreenSettings />
    </InnerPage>
  );
}
