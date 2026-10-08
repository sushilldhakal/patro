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
  className = "mt-7 text-center text-sm text-muted-foreground",
  paddingHorizontal,
}: {
  locationLabel?: string;
  className?: string;
  paddingHorizontal?: number;
}) {
  const { pick } = useLocale();
  const place = locationLabel?.trim();

  return (
    <Text className={className} style={paddingHorizontal ? { paddingHorizontal } : undefined}>
      {place
        ? pick(
            `वैदिक पात्रो · नेपाल पञ्चाङ्ग · गणना स्थान: ${place}`,
            `Powered by Vedic Patro · Nepal Panchanga · Location ${place}`,
          )
        : pick(
            "वैदिक पात्रो · नेपाल पञ्चाङ्ग · गणना स्थान: काठमाडौं",
            "Powered by Vedic Patro · Nepal Panchanga · Default location Kathmandu",
          )}
    </Text>
  );
}
