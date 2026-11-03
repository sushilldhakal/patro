import { InnerPage } from "@/components/account/AccountList";
import { NotificationSettings } from "@/components/account/SettingsPanel";
import { useLocale } from "@/lib/i18n";

/** Profile → Notifications & reminders. */
export default function NotificationsSettingsScreen() {
  const { t } = useLocale();
  return (
    <InnerPage title={t("ui.settings.notifications_reminders")}>
      <NotificationSettings />
    </InnerPage>
  );
}
