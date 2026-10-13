import { AppShell } from "@/components/AppShell";
import { Ionicons } from "@/components/icons/Ionicons";
import { PanchangaDirectoryMobile } from "@/components/panchanga/PanchangaDirectoryMobile";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";

export default function PanchangaDetailsScreen() {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <AppShell title={t("ui.panchanga.panchanga_details")} showHeader={false}>
      <PatroPageHeader
        icon={<Ionicons name="grid-outline" size={24} color={colors.secondary} />}
        title={t("ui.panchanga.panchanga_details")}
        subtitle={t("ui.panchanga.every_element_on_its_own_page")}
      />
      <PanchangaDirectoryMobile />
    </AppShell>
  );
}
