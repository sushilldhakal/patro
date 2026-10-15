import { locateDevice } from "@/components/panchanga/locate-device";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { PatroYearNavBlock as View } from "@vedic-patro/ui/kit/shell";
import type { PatroYearBrowseNavProps } from "./PatroYearBrowseNav";

type Props = PatroYearBrowseNavProps & { className?: string };

/** Year navigation with page spacing. Draws the website header and keeps the app's call shape. */
export function PatroYearNavBlock({
  className,
  location,
  onLocationChange,
  crossEraSubtitle,
  gregorianRange,
  tabs,
  tabsLabel,
  era,
  year,
  onYearChange,
  onEraChange,
  onToday,
}: Props) {
  const fallback = usePanchangaLocation();
  return (
    <View
      className={className}
      era={era}
      year={year}
      onYearChange={onYearChange}
      onEraChange={onEraChange}
      onToday={onToday}
      gregorianRange={gregorianRange}
      rangeLabel={crossEraSubtitle}
      location={location ?? fallback.location}
      onLocationChange={onLocationChange ?? fallback.setLocation}
      locate={locateDevice}
      tabs={tabs}
      tabsLabel={tabsLabel}
    />
  );
}
