import { TextInput, View } from "react-native";
import { __iconNode as arrowLeftRight } from "lucide-react/dist/esm/icons/arrow-left-right";
import { __iconNode as chevronDown } from "lucide-react/dist/esm/icons/chevron-down";
import { __iconNode as chevronLeft } from "lucide-react/dist/esm/icons/chevron-left";
import { __iconNode as chevronRight } from "lucide-react/dist/esm/icons/chevron-right";
import { Box, Icon, Pressable, Sheet, Text } from "@vedic-patro/ui";
import type { Era, Language } from "@vedic-patro/domain/era";
import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { usePatroCalendarHeader, usePatroMonthYearNav } from "@vedic-patro/features/patro-date";
import { PatroHeaderLocation } from "./PatroHeaderLocation";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { useBreakpoint } from "@/lib/responsive";

export type CalendarHeaderSegment = { key: string; label: string; active: boolean; onPress: () => void };

export type PatroCalendarHeaderProps = {
  era: Era;
  year: number;
  month: number;
  onChange: (next: { year: number; month: number }) => void;
  onEraChange?: (era: Era) => void;
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  /** The calendar toggle (e.g. BS calendar | panchanga); omitted when the page has one view. */
  segments?: CalendarHeaderSegment[];
  segmentsLabel?: string;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  crossEraSubtitle?: string | null;
  displayLanguage?: Language;
  className?: string;
};

/**
 * The calendar header: date badge, month + year panel, prev/next, calendar
 * toggle and location panel. One row on a wide screen, two on a tablet, three
 * on a phone; the panels open as full-width sheets.
 */
export function PatroCalendarHeader({
  era,
  year,
  month,
  onChange,
  onEraChange,
  location,
  onLocationChange,
  segments,
  segmentsLabel,
  prevDisabled,
  nextDisabled,
  crossEraSubtitle,
  displayLanguage,
  className,
}: PatroCalendarHeaderProps) {
  const { isCompact, isCalendarWide, width } = useBreakpoint();
  const dense = width < 420;
  const header = usePatroCalendarHeader({ era, year, month, onChange });
  const nav = usePatroMonthYearNav({ era, year, month, location, crossEraSubtitle, displayLanguage });
  const { panel, labels, yearInput } = header;
  const monthOpen = panel === "month";
  const locationOpen = panel === "location";

  const title = (
    <View className={cls.nativeTitle}>
      <Pressable label={labels.today} onPress={header.goToday} className={cls.badge}>
        <Text className={cls.badgeMonth}>{header.title.month}</Text>
        <Box className={cls.badgeDays}>
          <Text className={cls.badgeDaysText}>{header.dayRange}</Text>
        </Box>
      </Pressable>
      <View className="min-w-0 flex-1">
        <Text as="h2" numberOfLines={1} className={cls.titleMain}>
          {[header.title.year, header.eraLabel, header.samvatsara].filter(Boolean).join(" ")}
        </Text>
        {nav.crossEraSubtitle ? (
          <Text numberOfLines={1} className={cls.titleSub}>
            {nav.crossEraSubtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const stepper = (
    <View className="flex-row items-center gap-2">
      <Pressable label={labels.prevMonth} onPress={() => header.stepMonth(-1)} disabled={prevDisabled} className={cn(cls.iconButton, dense && cls.nativeDenseIcon)}>
        <Icon node={chevronLeft} size="md" tone="secondary" />
      </Pressable>
      <Pressable
        label={labels.picker}
        onPress={() => header.togglePanel("month")}
        className={cn(cls.selectButton, "flex-1", monthOpen ? cls.selectButtonOpen : cls.selectButtonIdle, dense && cls.nativeDenseControl)}
      >
        <Text numberOfLines={1} className={cn(cls.selectLabel, dense && cls.nativeDenseText)}>
          {header.title.month} {header.title.year}
        </Text>
        {dense ? null : <Icon node={chevronDown} size="sm" tone="secondary" />}
      </Pressable>
      <Pressable label={labels.nextMonth} onPress={() => header.stepMonth(1)} disabled={nextDisabled} className={cn(cls.iconButton, dense && cls.nativeDenseIcon)}>
        <Icon node={chevronRight} size="md" tone="secondary" />
      </Pressable>
    </View>
  );

  const segment =
    segments && segments.length > 0 ? (
      <Box className={cls.segment} label={segmentsLabel}>
        {segments.map((seg) => (
          <Pressable
            key={seg.key}
            label={seg.label}
            role="tab"
            selected={seg.active}
            onPress={seg.onPress}
            className={cn(cls.segmentItem, seg.active && cls.segmentItemActive)}
          >
            <Text className={cn(cls.segmentLabel, seg.active ? cls.segmentLabelActive : cls.segmentLabelIdle)}>{seg.label}</Text>
          </Pressable>
        ))}
      </Box>
    ) : null;

  /** Phone: the toggle becomes one button that offers the other view. */
  const swap =
    segments && segments.length === 2
      ? segments
          .filter((seg) => !seg.active)
          .map((seg) => (
            <Pressable key={seg.key} label={seg.label} onPress={seg.onPress} className={cn(cls.swapButton, dense && cls.nativeDenseControl)}>
              <Icon node={arrowLeftRight} size="sm" tone="secondary" />
              <Text className={cls.swapLabel}>{seg.label}</Text>
            </Pressable>
          ))
      : null;

  const locationButton = location && onLocationChange ? (
    <PatroHeaderLocation
      location={location}
      onLocationChange={onLocationChange}
      open={locationOpen}
      onOpenChange={(next) => header.openPanel(next ? "location" : null)}
    />
  ) : null;

  let rows;
  if (isCompact) {
    rows = (
      <>
        <View className="flex-row items-center justify-between gap-3">
          {title}
          {locationButton}
        </View>
        {swap ? (
          <View className="flex-row items-center gap-2">
            <View className="min-w-0 flex-1">{stepper}</View>
            {swap}
          </View>
        ) : (
          stepper
        )}
      </>
    );
  } else if (!isCalendarWide) {
    rows = (
      <>
        <View className="flex-row items-center justify-between gap-3">
          {title}
          {locationButton}
        </View>
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">{stepper}</View>
          {segment}
        </View>
      </>
    );
  } else {
    rows = (
      <View className="flex-row items-center gap-3.5">
        {title}
        <View className="w-80">{stepper}</View>
        {segment}
        {locationButton}
      </View>
    );
  }

  return (
    <View className={cn("w-full gap-3", className)}>
      {rows}

      <Sheet open={monthOpen} onClose={header.closePanel} title={labels.picker} closeLabel={labels.yearGo}>
        {onEraChange && header.eras.length > 0 ? (
          <Box className={cn(cls.segment, "mb-3")} label={header.eraAria}>
            {header.eras.map((e) => (
              <Pressable
                key={e.era}
                label={e.label}
                role="tab"
                selected={e.active}
                onPress={() => (e.active ? undefined : onEraChange(e.era))}
                className={cn(cls.segmentItem, e.active && cls.segmentItemActive)}
              >
                <Text className={cn(cls.segmentLabel, e.active ? cls.segmentLabelActive : cls.segmentLabelIdle)}>{e.label}</Text>
              </Pressable>
            ))}
          </Box>
        ) : null}
        <Text className={cls.panelLabel}>{labels.yearSection}</Text>
        <Box className={cls.yearRow}>
          <Pressable label={labels.prevYear} onPress={() => header.stepYear("prev")} className={cls.iconButtonSmall}>
            <Icon node={chevronLeft} size="sm" tone="secondary" />
          </Pressable>
          <TextInput
            value={yearInput.value}
            onChangeText={yearInput.onChange}
            onSubmitEditing={yearInput.commit}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel={labels.yearInput}
            className={cn(cls.yearInput, yearInput.invalid ? cls.yearInputBad : cls.yearInputOk)}
          />
          <Pressable label={labels.yearGo} onPress={yearInput.commit} className={cls.yearGo}>
            <Text className={cls.yearGoLabel}>{labels.yearGo}</Text>
          </Pressable>
          <Pressable label={labels.nextYear} onPress={() => header.stepYear("next")} className={cls.iconButtonSmall}>
            <Icon node={chevronRight} size="sm" tone="secondary" />
          </Pressable>
        </Box>
        {yearInput.invalid ? <Text className={cls.yearError}>{labels.yearInvalid}</Text> : null}
        <Text className={cls.panelLabel}>{labels.monthSection}</Text>
        <Box className={cls.monthGrid}>
          {header.months.map((m) => (
            <Pressable
              key={m.month}
              label={m.label}
              onPress={m.pick}
              className={cn(cls.monthChip, m.selected ? cls.monthChipActive : cls.monthChipIdle)}
            >
              <Text className={cn(cls.monthChipLabel, m.selected ? cls.monthChipLabelActive : cls.monthChipLabelIdle)}>{m.label}</Text>
            </Pressable>
          ))}
        </Box>
      </Sheet>
    </View>
  );
}
