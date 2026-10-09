import { View } from "react-native";
import type { MonthBrowseEra } from "@/lib/api";
import { PatroDateNav } from "@/components/patro-date/PatroDateNav";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { useLocale } from "@/lib/i18n";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useThemeColors } from "@/lib/theme-context";
import { nepaliTextStyle } from "@/lib/nepali-text";
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
  const { pick } = useLocale();

  const nextView: HomePatroView = patroView === "calendar" ? "panchanga" : "calendar";
  const nextViewLabel = nextView === "panchanga" ? pick("पञ्चाङ्ग", "Panchanga") : pick("वि.सं.", "B.S.");

  const viewToggle = (
    <Pressable
      onPress={() => onPatroViewChange(nextView)}
      accessibilityLabel={pick("पात्रो प्रकार बदल्नुहोस्", "Switch patro type")}
      className="h-[30px] shrink-0 flex-row items-center gap-1 rounded-lg border border-border bg-card px-2 active:bg-muted"
    >
      <Ionicons name="swap-horizontal" size={14} color={colors.foreground} />
      <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
        {nextViewLabel}
      </Text>
    </Pressable>
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
        toolbar={viewToggle}
        mobileToolbar={viewToggle}
      />
    </View>
  );
}
