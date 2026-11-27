import { useLocalSearchParams } from "expo-router";
import { InnerPage } from "@/components/account/AccountList";
import { RemindersPanel } from "@/components/reminders/RemindersPanel";
import { useLocale } from "@/lib/i18n";

/** Settings → Notifications & reminders → Reminders: शुभ/अशुभ window alerts (a home-page bell opens one by `window`). */
export default function RemindersScreen() {
  const { t } = useLocale();
  const { window } = useLocalSearchParams<{ window?: string }>();
  return (
    <InnerPage title={t("ui.settings.reminders")} subtitle={t("ui.settings.reminders_body")}>
      <RemindersPanel window={window} />
    </InnerPage>
  );
}
