import { usePanchangaDetailsPage } from "@vedic-patro/features/panchanga-details";
import { AppShell } from "@/components/AppShell";
import { Ionicons } from "@/components/icons/Ionicons";
import { PanchangaDirectoryMobile } from "@/components/panchanga/PanchangaDirectoryMobile";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { useThemeColors } from "@/lib/theme-context";

/** Panchanga details hub — the app's drawing of `usePanchangaDetailsPage` (@vedic-patro/features). */
export default function PanchangaDetailsScreen() {
  const colors = useThemeColors();
  const { copy } = usePanchangaDetailsPage();
  return (
    <AppShell title={copy.title} showHeader={false}>
      <PatroPageHeader icon={<Ionicons name="grid-outline" size={24} color={colors.secondary} />} title={copy.title} subtitle={copy.subtitle} />
      <PanchangaDirectoryMobile />
    </AppShell>
  );
}
