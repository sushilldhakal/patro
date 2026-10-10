import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { PatroMonthYearNav } from "@/components/patro-date/PatroMonthYearNav";
import { formatPatroMonthCrossEraSubtitle } from "@vedic-patro/domain/patro-headline-subtitle";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { patroSegBtn } from "@/lib/patro-classes";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import type { SamvatsaraPayload } from "@/lib/samvatsara";
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
};

function PakshaSegToggle({
  value,
  onChange,
  options,
  className,
  buttonClassName,
}: {
  value: PakshaFilter | "krishna" | "shukla";
  onChange: (v: PakshaFilter) => void;
  options: readonly (readonly [PakshaFilter, string])[];
  className?: string;
  buttonClassName?: string;
}) {
  const { pick } = useLocale();
  return (
    <View
      className={cn(
        "h-[30px] shrink-0 flex-row gap-0.5 rounded-lg border border-border bg-card p-0.5",
        className,
      )}
      accessibilityRole="radiogroup"
      accessibilityLabel={pick("पक्ष छान्नुहोस्", "Select paksha")}
    >
      {options.map(([opt, label]) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === opt }}
          className={cn(patroSegBtn(value === opt), buttonClassName)}
        >
          <Text
            className={cn(
              "text-caption font-semibold",
              value === opt ? "text-secondary-foreground" : "text-muted-foreground",
            )}
            style={nepaliTextStyle(12)}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Dainik Kranti — web `PatroMonthYearNav` + paksha / location slots. */
export function DainikKrantiHeader({
  year,
  month,
  paksha,
  onPakshaChange,
  mobilePakshaDisplay,
  onToday,
  onMonthChange,
  onYearChange,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  location,
  onLocationChange,
  samvatsara,
}: Props) {
  const { pick, digits, lang } = useLocale();
  const { isCompact } = useBreakpoint();

  const crossEraSubtitle = useMemo(
    () => formatPatroMonthCrossEraSubtitle("bs", year, month, lang, digits),
    [year, month, lang, digits],
  );

  const pakshaOptionsAll: readonly (readonly [PakshaFilter, string])[] = [
    ["all", pick("सबै", "All")],
    ["krishna", pick("कृष्ण", "Krishna")],
    ["shukla", pick("शुक्ल", "Shukla")],
  ];

  const pakshaOptionsMobile: readonly (readonly [PakshaFilter, string])[] = [
    ["krishna", pick("कृष्ण", "Krishna")],
    ["shukla", pick("शुक्ल", "Shukla")],
  ];

  const pakshaToggleDesktop = (
    <PakshaSegToggle value={paksha} onChange={onPakshaChange} options={pakshaOptionsAll} />
  );

  const pakshaToggleMobile = (
    <PakshaSegToggle
      value={mobilePakshaDisplay}
      onChange={onPakshaChange}
      options={pakshaOptionsMobile}
      className="shrink-0"
      buttonClassName="px-2.5"
    />
  );

  const locationControl = (
    <LocationSelector
      location={location}
      onLocationChange={onLocationChange}
      className="max-w-[12.5rem]"
    />
  );

  const desktopAside = (
    <View className="items-end gap-2">
      {pakshaToggleDesktop}
      {locationControl}
    </View>
  );

  return (
    <View className="mb-4">
      <PatroMonthYearNav
        era="bs"
        onEraChange={() => {}}
        year={year}
        month={month}
        onMonthChange={onMonthChange}
        onYearChange={onYearChange}
        onToday={onToday}
        onPrev={onPrev}
        onNext={onNext}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
        crossEraSubtitle={crossEraSubtitle}
        samvatsara={samvatsara}
        location={location}
        onLocationChange={onLocationChange}
        mobileToolbar={isCompact ? pakshaToggleMobile : undefined}
        desktopAside={desktopAside}
      />
    </View>
  );
}
