import { View, useWindowDimensions } from "react-native";
import { TopBarSlot } from "@/components/navigation/TopBarSlot";
import { usePageViewMenu } from "@/lib/page-view-menu";
import type { MonthBrowseEra } from "@/lib/api";
import { PatroCalendarHeader } from "@/components/patro-date/PatroCalendarHeader";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { useLocale } from "@/lib/i18n";
import { isGregorianEra } from "@vedic-patro/domain/calendar/era";
import { patroEraShortLabel } from "@/components/patro-date/patro-era-labels";
import { homeViewsFor } from "@vedic-patro/features/events";
import { HOME_VIEW_ICONS } from "@vedic-patro/ui/kit/events";
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
  // Seven day columns need room: a phone gets Multi Day (two days) instead of Week.
  const { width } = useWindowDimensions();

  const calendarTabLabel = isGregorianEra(browseEra) ? t("calendar.mode_ad") : patroEraShortLabel(browseEra, lang);
  // वि.सं. | पञ्चाङ्ग live in the header's view menu, not above the grid.
  usePageViewMenu([
    {
      key: "view",
      // The BS grid, the panchanga grid, and the planner views of the user's own events.
      options: homeViewsFor(width >= 768).map((view) => ({
        icon: HOME_VIEW_ICONS[view],
        key: view,
        label: view === "calendar" ? calendarTabLabel : t(view === "panchanga" ? "calendar.mode_panchanga" : `calendar.view_${view}`),
        active: patroView === view,
        onPress: () => onPatroViewChange(view),
      })),
    },
  ]);

  return (
    <TopBarSlot>
      <View className="mb-3">
        {/* The BS | AD preference lives in the sidebar menu and in Settings, not in the page header. */}
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
        />
      </View>
    </TopBarSlot>
  );
}
