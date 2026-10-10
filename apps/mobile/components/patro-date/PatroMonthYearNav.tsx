import type { ReactNode } from "react";
import { View } from "react-native";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { useBreakpoint } from "@/lib/responsive";
import { cn } from "@/lib/utils";
import { PatroDateNav } from "./PatroDateNav";
import type { PatroDateNavProps } from "./types";

type MonthYearNavProps = Omit<
  Extract<PatroDateNavProps, { mode: "year-month" }>,
  "mode" | "toolbar" | "mobileToolbar" | "mobileToolbarLower" | "hideNavLocation"
> & {
  mobileToolbar?: ReactNode;
  /** Phone row 2 right — e.g. dainik kranti paksha + location (web `mobileToolbarLower`). */
  mobileToolbarLower?: ReactNode;
  /** Tablet+ right column (paksha + location on dainik kranti). */
  desktopAside?: ReactNode;
  className?: string;
};

/**
 * Month + year navigation — home calendar, dainik kranti (web `PatroMonthYearNav`).
 * Phone: date nav + optional row-1 toolbar; location on row 2 right.
 * Tablet+: date nav left; `desktopAside` right (paksha, location, …).
 */
export function PatroMonthYearNav({
  mobileToolbar,
  mobileToolbarLower,
  desktopAside,
  className,
  location,
  onLocationChange,
  ...navProps
}: MonthYearNavProps) {
  const { isCompact } = useBreakpoint();

  const locationControl = (
    <LocationSelector
      location={location}
      onLocationChange={onLocationChange}
      className="max-w-[12.5rem]"
    />
  );

  const aside =
    desktopAside ??
    (!isCompact ? (
      <View className="items-end">{locationControl}</View>
    ) : null);

  if (isCompact) {
    return (
      <PatroDateNav
        mode="year-month"
        {...navProps}
        location={location}
        onLocationChange={onLocationChange}
        mobileToolbar={mobileToolbar}
        mobileToolbarLower={mobileToolbarLower}
        className={className}
      />
    );
  }

  return (
    <View className={cn("w-full flex-row items-start gap-3", className)}>
      <View className="min-w-0 flex-1">
        <PatroDateNav
          mode="year-month"
          {...navProps}
          location={location}
          onLocationChange={onLocationChange}
          hideNavLocation
          className="mb-0"
        />
      </View>
      {aside ? <View className="shrink-0 items-end pt-0.5">{aside}</View> : null}
    </View>
  );
}
