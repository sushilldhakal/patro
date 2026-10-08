import { AppShell } from "@/components/AppShell";
import { Ionicons } from "@/components/icons/Ionicons";
import { PanchangaDirectoryMobile } from "@/components/panchanga/PanchangaDirectoryMobile";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";

export default function PanchangaDetailsScreen() {
  const { pick } = useLocale();
  const colors = useThemeColors();
  return (
    <AppShell title={pick("पञ्चाङ्ग विवरण", "Panchanga details")} showHeader={false}>
      <PatroPageHeader
        icon={<Ionicons name="grid-outline" size={24} color={colors.secondary} />}
        title={pick("पञ्चाङ्ग विवरण", "Panchanga details")}
        subtitle={pick(
          "प्रत्येक तत्त्वको छुट्टै पृष्ठ — आरम्भ, अन्त्य र तालिका",
          "Every element on its own page — begin, end & tables",
        )}
      />
      <PanchangaDirectoryMobile />
    </AppShell>
  );
}
