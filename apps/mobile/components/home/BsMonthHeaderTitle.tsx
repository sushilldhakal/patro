import { View } from "react-native";
import type { MonthBrowseEra } from "@/lib/api";
import { PatroDateNav } from "@/components/patro-date/PatroDateNav";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { useLocale } from "@/lib/i18n";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useThemeColors } from "@/lib/theme-context";
import { useBreakpoint } from "@/lib/responsive";
import { isGregorianEra } from "@vedic-patro/domain/era";
import { cn } from "@vedic-patro/domain/utils";
import { patroEraShortLabel } from "@/components/patro-date/patro-era-labels";
import { nepaliTextStyle } from "@/lib/nepali-text";
import type { HomePatroView } from "./PatroViewToggle";
import { calendarClasses } from "@vedic-patro/design-tokens/classes/calendar-classes";

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

/** Home calendar header — delegates date/location to {@link PatroDateNav}. */
export function BsMonthHeaderTitle({
  year,
  month,
  onToday,
  onMonthChange,
  onYearChange,
  onPrev,
  onNext,
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
  const colors = useThemeColors();
  const { t, lang } = useLocale();
  const { isCompact } = useBreakpoint();

  const calendarTabLabel = isGregorianEra(browseEra) ? t("calendar.mode_ad") : patroEraShortLabel(browseEra, lang);
  const nextView: HomePatroView = patroView === "calendar" ? "panchanga" : "calendar";
  const nextViewLabel = nextView === "panchanga" ? t("calendar.mode_panchanga") : calendarTabLabel;

  /* Web: below md a single swap button (`h-8 px-2 text-sm font-semibold`); md+ a segmented radiogroup. */
  const viewToggleButton = (
    <Pressable
      onPress={() => onPatroViewChange(nextView)}
      accessibilityLabel={t("calendar.patro_mode_switch")}
      className={cn(calendarClasses.viewSwap, "active:bg-muted")}
    >
      <Ionicons name="swap-horizontal" size={14} color={colors.foreground} />
      <Text className={calendarClasses.viewSwapText} style={nepaliTextStyle()}>
        {nextViewLabel}
      </Text>
    </Pressable>
  );

  const viewToggleSegmented = (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t("calendar.patro_mode_aria")}
      className={calendarClasses.viewSegGroup}
    >
      {(["calendar", "panchanga"] as const).map((view) => {
        const active = patroView === view;
        return (
          <Pressable
            key={view}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => onPatroViewChange(view)}
            className={cn("h-[26px] items-center justify-center rounded-md px-3", active && "bg-secondary")}
          >
            <Text
              className={cn("text-xs font-semibold", active ? "text-secondary-foreground" : "text-foreground")}
              style={nepaliTextStyle()}
            >
              {view === "calendar" ? calendarTabLabel : t("calendar.mode_panchanga")}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View>
      <PatroDateNav
        mode="year-month"
        era={browseEra}
        onEraChange={(e) => onBrowseEraChange?.(e as MonthBrowseEra)}
        year={year}
        onYearChange={onYearChange}
        month={month}
        onMonthChange={onMonthChange}
        location={location}
        onLocationChange={onLocationChange}
        onToday={onToday}
        onPrev={onPrev}
        onNext={onNext}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
        crossEraSubtitle={crossEraSubtitle}
        toolbar={isCompact ? undefined : viewToggleSegmented}
        mobileToolbar={viewToggleButton}
      />
    </View>
  );
}
