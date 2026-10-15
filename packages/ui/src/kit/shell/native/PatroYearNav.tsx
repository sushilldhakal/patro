import { patroBrowseTodayEra } from "@vedic-patro/domain/era";
import { patroBrowseTodayYear } from "@vedic-patro/domain/patro-browse-params";
import { cn } from "@vedic-patro/domain/utils";
import { patroDateClasses } from "@vedic-patro/design-tokens/classes/patro-date-classes";
import { usePatroYearHeadlineSubtitle } from "@vedic-patro/features/common";
import { Box, Text } from "@vedic-patro/ui";
import type { PatroYearNavBlockProps, PatroYearNavProps } from "../contract";
import { PatroHeaderTabs } from "./PatroHeaderTabs";
import { PatroHeaderLocation } from "./PatroHeaderLocation";
import { PatroYearHeader } from "./PatroYearHeader";

/** Year navigation for holidays, suryakranti and the graha year pages. */
export function PatroYearNav({
  era,
  year,
  onYearChange,
  onEraChange,
  gregorianRange,
  rangeLabel,
  yearError,
  todayAd,
  onToday,
  displayLanguage,
  location,
  onLocationChange,
  locate,
  tabs,
  tabsLabel,
  className,
}: PatroYearNavProps) {
  const jumpToToday =
    onToday ??
    (() => {
      const targetEra = patroBrowseTodayEra(era);
      if (targetEra !== era) onEraChange?.(targetEra);
      onYearChange(patroBrowseTodayYear(era, todayAd));
    });
  const subtitle = usePatroYearHeadlineSubtitle(era, year, gregorianRange, rangeLabel, displayLanguage);

  const locationButton =
    location && onLocationChange && locate ? <PatroHeaderLocation location={location} onLocationChange={onLocationChange} locate={locate} /> : null;
  const tabsView = tabs ? <PatroHeaderTabs tabs={tabs} label={tabsLabel} /> : null;

  return (
    <Box className={cn("flex w-full flex-col gap-2", className)}>
      <PatroYearHeader
        era={era}
        year={year}
        onChange={onYearChange}
        onEraChange={onEraChange}
        onToday={jumpToToday}
        todayYear={patroBrowseTodayYear(era, todayAd)}
        subtitle={subtitle}
        titleAside={locationButton}
        navAside={tabsView}
      />
      {yearError ? (
        <Text as="p" className={patroDateClasses.navError}>
          {yearError}
        </Text>
      ) : null}
    </Box>
  );
}

/** Page spacing around {@link PatroYearNav}. */
export function PatroYearNavBlock({ className = "space-y-3", ...navProps }: PatroYearNavBlockProps) {
  return (
    <Box className={className}>
      <PatroYearNav {...navProps} />
    </Box>
  );
}
