import type { BhavaHouse } from "@vedic-patro/domain/bhava";
import { D1Chart as KitD1Chart } from "@vedic-patro/ui/kit/panchanga";
import { BhavaDetailDialog } from "@/components/kundali/BhavaDetailDialog";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";

type Props = {
  houses: BhavaHouse[];
};

/**
 * The drawing lives in the kit. This binder keeps the house-detail sheet,
 * which belongs to the kundali screens, and the device theme colours.
 */
export function D1Chart({ houses }: Props) {
  const { isTablet } = useBreakpoint();
  const colors = useThemeColors();
  return (
    <KitD1Chart
      houses={houses}
      isTablet={isTablet}
      colors={{
        card: colors.card,
        border: colors.border,
        secondary: colors.secondary,
        mutedForeground: colors.mutedForeground,
        foreground: colors.foreground,
        danger: colors.danger,
      }}
      renderHouseDetail={(detail) => (
        <BhavaDetailDialog
          houses={detail.houses}
          houseNumber={detail.houseNumber}
          reference={detail.reference}
          onClose={detail.onClose}
        />
      )}
    />
  );
}
