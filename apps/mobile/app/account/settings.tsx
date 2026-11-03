import { AppShell } from "@/components/AppShell";
import { SettingsPanel } from "@/components/account/SettingsPanel";
import { useLocale } from "@/lib/i18n";

/** The settings on a page of their own (old links reach it); the profile page shows the same panel. */
export default function SettingsScreen() {
  const { t } = useLocale();
  return (
    <AppShell title={t("ui.settings.title")}>
      <SettingsPanel />
    </AppShell>
  );
}
