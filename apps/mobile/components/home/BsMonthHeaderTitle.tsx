import { View } from "react-native";
import type { MonthBrowseEra } from "@/lib/api";
import { PatroCalendarHeader } from "@/components/patro-date/PatroCalendarHeader";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { useLocale } from "@/lib/i18n";
import { isGregorianEra } from "@vedic-patro/domain/calendar/era";
import { patroEraShortLabel } from "@/components/patro-date/patro-era-labels";
import type { HomePatroView } from "./PatroViewToggle";

type Props = {
  year: number;
  month: number;
  onToday: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  patroView: HomePatroView;
  onPatroViewChange: (view: HomePatroView) => void;
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
  crossEraSubtitle?: string;
  browseEra: MonthBrowseEra;
  onBrowseEraChange?: (era: MonthBrowseEra) => void;
};

/** Home calendar header — {@link PatroCalendarHeader} with the calendar / panchanga toggle. */
export function BsMonthHeaderTitle({
  year,
  month,
  onMonthChange,
  onYearChange,
  prevDisabled,
  nextDisabled,
  patroView,
  onPatroViewChange,
  location,
  onLocationChange,
  crossEraSubtitle,
  browseEra,
  onBrowseEraChange,
}: Props) {
  const { t, lang } = useLocale();

  const calendarTabLabel = isGregorianEra(browseEra) ? t("calendar.mode_ad") : patroEraShortLabel(browseEra, lang);

  return (
    <View className="mb-3">
      <PatroCalendarHeader
        era={browseEra}
        onEraChange={(e) => onBrowseEraChange?.(e as MonthBrowseEra)}
        year={year}
        month={month}
        onChange={(next) => {
          if (next.year !== year) onYearChange(next.year);
          if (next.month !== month) onMonthChange(next.month);
        }}
        location={location}
        onLocationChange={onLocationChange}
        crossEraSubtitle={crossEraSubtitle}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
        segments={[
          { key: "calendar", label: calendarTabLabel, active: patroView === "calendar", onPress: () => onPatroViewChange("calendar") },
          { key: "panchanga", label: t("calendar.mode_panchanga"), active: patroView === "panchanga", onPress: () => onPatroViewChange("panchanga") },
        ]}
        segmentsLabel={t("calendar.patro_mode_aria")}
      />
    </View>
  );
}
