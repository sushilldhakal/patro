import type { ReactNode } from "react";
import { useMemo } from "react";
import { View } from "react-native";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { getCurrentBs } from "@/lib/bs-calendar";
import { useLocale } from "@/lib/i18n";
import {
  formatPatroYearGregorianRange,
  patroHeadlineDigits,
} from "@/lib/patro-headline-subtitle";
import type { PatroBrowseEra } from "@/lib/patro-era";
import { stepPatroBrowseYear } from "@/lib/patro-year-browse-step";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { useBreakpoint } from "@/lib/responsive";
import { cn } from "@/lib/utils";
import { PatroDateNav } from "./PatroDateNav";

export type PatroYearBrowseNavProps = {
  era: PatroBrowseEra;
  onEraChange: (era: PatroBrowseEra) => void;
  year: number;
  onYearChange: (year: number) => void;
  /** API `gregorian_range` for the cross-era headline line. */
  gregorianRange?: { start: string; end: string } | null;
  crossEraSubtitle?: string;
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  showLocation?: boolean;
  mobileToolbar?: ReactNode;
  desktopAside?: ReactNode;
  className?: string;
  /** Override the chip's "go to today"; default sets year via {@link getCurrentBs}. */
  onToday?: () => void;
};

/**
 * Year-only browse chrome — same layout as {@link PatroMonthYearNav} / dainik kranti,
 * without month controls (web `PatroYearNav`).
 */
export function PatroYearBrowseNav({
  era,
  onEraChange,
  year,
  onYearChange,
  gregorianRange,
  crossEraSubtitle: crossEraSubtitleProp,
  location: locationProp,
  onLocationChange: onLocationChangeProp,
  showLocation = true,
  mobileToolbar,
  desktopAside,
  className,
  onToday,
}: PatroYearBrowseNavProps) {
  const { lang } = useLocale();
  const { isCompact } = useBreakpoint();
  const fallback = usePanchangaLocation();
  const location = locationProp ?? fallback.location;
  const onLocationChange = onLocationChangeProp ?? fallback.setLocation;
  const digitFn = patroHeadlineDigits(lang);

  const crossEraSubtitle = useMemo(() => {
    if (crossEraSubtitleProp?.trim()) return crossEraSubtitleProp;
    if (gregorianRange?.start && gregorianRange?.end) {
      return formatPatroYearGregorianRange(
        gregorianRange.start,
        gregorianRange.end,
        lang,
        digitFn,
      );
    }
    return undefined;
  }, [crossEraSubtitleProp, gregorianRange, lang, digitFn]);

  const jumpToToday =
    onToday ??
    (() => {
      onYearChange(getCurrentBs().year);
    });

  const navProps = {
    mode: "year" as const,
    era,
    onEraChange,
    year,
    onYearChange,
    crossEraSubtitle,
    onToday: jumpToToday,
    onPrev: () => onYearChange(stepPatroBrowseYear(era, year, "prev")),
    onNext: () => onYearChange(stepPatroBrowseYear(era, year, "next")),
    location,
    onLocationChange,
    hideNavLocation: !showLocation,
  };

  const locationControl = showLocation ? (
    <LocationSelector
      location={location}
      onLocationChange={onLocationChange}
      className="max-w-[12.5rem]"
    />
  ) : null;

  const aside =
    desktopAside ??
    (!isCompact && showLocation ? (
      <View className="items-end">{locationControl}</View>
    ) : null);

  if (isCompact) {
    return (
      <PatroDateNav
        {...navProps}
        hideNavLocation={!showLocation}
        mobileToolbar={mobileToolbar}
        className={className}
      />
    );
  }

  return (
    <View className={cn("w-full flex-row items-start gap-3", className)}>
      <View className="min-w-0 flex-1">
        <PatroDateNav
          {...navProps}
          hideNavLocation={Boolean(aside) || !showLocation}
          className="mb-0"
        />
      </View>
      {aside ? <View className="shrink-0 items-end pt-0.5">{aside}</View> : null}
    </View>
  );
}
