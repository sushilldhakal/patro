import { useMemo } from "react";
import { View } from "react-native";
import { PatroMonthYearNav } from "@/components/patro-date/PatroMonthYearNav";
import { formatPatroMonthCrossEraSubtitle } from "@vedic-patro/domain/calendar/patro-headline-subtitle";
import { useLocale } from "@/lib/i18n";
import { useBreakpoint } from "@/lib/responsive";
import type { SamvatsaraPayload } from "@vedic-patro/domain/calendar/samvatsara";
import { type PanchangaLocation } from "@/lib/use-panchanga-location";

export type PakshaFilter = "all" | "krishna" | "shukla";

type Props = {
  year: number;
  month: number;
  paksha: PakshaFilter;
  onPakshaChange: (paksha: PakshaFilter) => void;
  /** Krishna/Shukla segment highlight when paksha is still `all` (mobile toolbar). */
  mobilePakshaDisplay: "krishna" | "shukla";
  onToday: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
  samvatsara?: SamvatsaraPayload | null;
  /** Paksha choices and their group label (from the shared page hook). */
  pakshaOptions: readonly (readonly [PakshaFilter, string])[];
  pakshaAria: string;
};

/** Dainik Kranti — the month + year header with the paksha filter as its toggle. */
export function DainikKrantiHeader({
  year,
  month,
  paksha,
  onPakshaChange,
  mobilePakshaDisplay,
  onMonthChange,
  onYearChange,
  prevDisabled,
  nextDisabled,
  location,
  onLocationChange,
  pakshaOptions,
  pakshaAria,
}: Props) {
  const { digits, lang } = useLocale();
  const { isCompact } = useBreakpoint();

  const crossEraSubtitle = useMemo(
    () => formatPatroMonthCrossEraSubtitle("bs", year, month, lang, digits),
    [year, month, lang, digits],
  );

  // Phones show Krishna | Shukla only (two options become one swap button).
  const options = isCompact ? pakshaOptions.filter(([value]) => value !== "all") : pakshaOptions;
  const tabs = options.map(([value, label]) => ({
    key: value,
    label,
    active: (isCompact ? mobilePakshaDisplay : paksha) === value,
    onPress: () => onPakshaChange(value),
  }));

  return (
    <View>
      <PatroMonthYearNav
        era="bs"
        onEraChange={() => {}}
        year={year}
        month={month}
        onMonthChange={onMonthChange}
        onYearChange={onYearChange}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
        crossEraSubtitle={crossEraSubtitle}
        location={location}
        onLocationChange={onLocationChange}
        tabs={tabs}
        tabsLabel={pakshaAria}
      />
    </View>
  );
}
