import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";

/**
 * The line that closes a page: what computed it and where from.
 *
 * Shared so the pages that carry it can't drift apart in wording — pass
 * `locationLabel` on pages that have a location picker, so the note names the
 * place the panchanga on screen was actually computed for.
 */
export function PatroFooterNote({
  locationLabel,
  className = "text-body mt-7 text-center text-muted-foreground",
  paddingHorizontal,
}: {
  locationLabel?: string;
  className?: string;
  paddingHorizontal?: number;
}) {
  const { t } = useLocale();
  const place = locationLabel?.trim();

  return (
    <Text className={className} style={paddingHorizontal ? { paddingHorizontal } : undefined}>
      {place
        ? t("ui.branding.powered_by_vedic_patro_nepal_panchanga", { place })
        : t("ui.branding.powered_by_vedic_patro_nepal_panchanga_2")}
    </Text>
  );
}
