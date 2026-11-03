import { locateDevice } from "@/components/panchanga/locate-device";
import { TopBarSlot } from "@/components/navigation/TopBarSlot";
import { usePageViewMenu } from "@/lib/page-view-menu";
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
  era,
  year,
  onYearChange,
  onEraChange,
  onToday,
}: Props) {
  // The page's view tabs live in the header's view menu, not in the date row.
  usePageViewMenu(tabs ? [{ key: "view", options: tabs }] : null);
  const fallback = usePanchangaLocation();
  return (
    <TopBarSlot>
      <View
        className={className ?? "mb-4"}
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
      />
    </TopBarSlot>
  );
}
