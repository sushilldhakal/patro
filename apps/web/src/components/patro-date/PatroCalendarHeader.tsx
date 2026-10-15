import { __iconNode as arrowLeftRight } from "lucide-react/dist/esm/icons/arrow-left-right.mjs";
import { __iconNode as chevronDown } from "lucide-react/dist/esm/icons/chevron-down.mjs";
import { __iconNode as chevronLeft } from "lucide-react/dist/esm/icons/chevron-left.mjs";
import { __iconNode as chevronRight } from "lucide-react/dist/esm/icons/chevron-right.mjs";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { Era, Language } from "@vedic-patro/domain/era";
import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { usePatroCalendarHeader, usePatroMonthYearNav } from "@vedic-patro/features/patro-date";
import { PatroHeaderLocation } from "./PatroHeaderLocation";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";

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

/** Panels hang under their button from `sm`; on a phone they span the whole header. */
const PANEL = cls.webPanel;

/**
 * The calendar header: date badge, month + year panel, prev/next, calendar
 * toggle and location panel. One row from `lg`, two from `sm`, three on a phone.
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
  const header = usePatroCalendarHeader({ era, year, month, onChange });
  const nav = usePatroMonthYearNav({ era, year, month, location, crossEraSubtitle, displayLanguage });
  const { panel, labels, yearInput } = header;
  const monthOpen = panel === "month";
  const locationOpen = panel === "location";

  return (
    <Box
      className={cn(cls.webRoot, className)}
    >
      {panel ? (
        <button type="button" tabIndex={-1} aria-hidden className={cls.webScrim} onClick={header.closePanel} />
      ) : null}

      <Box className={cls.webTitle}>
        <Pressable
          label={labels.today}
          onPress={header.goToday}
          className={cls.badge}
          webClassName={cls.webBadgeHover}
        >
          <Text className={cls.badgeMonth}>{header.title.month}</Text>
          <Box className={cls.badgeDays}>
            <Text className={cls.badgeDaysText}>{header.dayRange}</Text>
          </Box>
        </Pressable>
        <Box className="flex min-w-0 flex-col">
          <Text as="h2" className={cn(cls.titleMain, "truncate")}>
            {[header.title.year, header.eraLabel, header.samvatsara].filter(Boolean).join(" ")}
          </Text>
          {nav.crossEraSubtitle ? <Text className={cn(cls.titleSub, "truncate")}>{nav.crossEraSubtitle}</Text> : null}
        </Box>
      </Box>

      <Box className={cls.webNav}>
        <Pressable label={labels.prevMonth} onPress={() => header.stepMonth(-1)} disabled={prevDisabled} className={cls.iconButton} webClassName={cn("hover:bg-muted", cls.webDenseIcon)}>
          <Icon node={chevronLeft} size="md" tone="secondary" />
        </Pressable>
        <Box className={cls.webMonthAnchor}>
          <Pressable
            label={labels.picker}
            onPress={() => header.togglePanel("month")}
            className={cn(cls.selectButton, monthOpen ? cls.selectButtonOpen : cls.selectButtonIdle, "w-full")}
            webClassName={cn("hover:bg-muted", cls.webDenseControl)}
          >
            <Text className={cn(cls.selectLabel, cls.webDenseText, "whitespace-nowrap")}>
              {header.title.month} {header.title.year}
            </Text>
            <Icon node={chevronDown} size="sm" tone="secondary" webClassName={cls.webChevronHide} />
          </Pressable>
          {monthOpen ? (
            <Box className={cn(cls.panel, PANEL)} label={labels.picker}>
              {onEraChange && header.eras.length > 0 ? (
                <Box className={cn(cls.segment, "mb-3")} label={header.eraAria}>
                  {header.eras.map((e) => (
                    <Pressable
                      key={e.era}
                      label={e.label}
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
                <Pressable label={labels.prevYear} onPress={() => header.stepYear("prev")} className={cls.iconButtonSmall} webClassName="hover:bg-muted">
                  <Icon node={chevronLeft} size="sm" tone="secondary" />
                </Pressable>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={yearInput.value}
                  onChange={(e) => yearInput.onChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") yearInput.commit();
                  }}
                  aria-label={labels.yearInput}
                  aria-invalid={yearInput.invalid}
                  className={cn(cls.yearInput, yearInput.invalid ? cls.yearInputBad : cls.yearInputOk, "outline-none focus:border-secondary")}
                />
                <Pressable label={labels.yearGo} onPress={yearInput.commit} className={cls.yearGo} webClassName="hover:opacity-90">
                  <Text className={cls.yearGoLabel}>{labels.yearGo}</Text>
                </Pressable>
                <Pressable label={labels.nextYear} onPress={() => header.stepYear("next")} className={cls.iconButtonSmall} webClassName="hover:bg-muted">
                  <Icon node={chevronRight} size="sm" tone="secondary" />
                </Pressable>
              </Box>
              {yearInput.invalid ? (
                <Text className={cls.yearError}>{labels.yearInvalid}</Text>
              ) : null}
              <Text className={cls.panelLabel}>{labels.monthSection}</Text>
              <Box className="grid grid-cols-3 gap-2">
                {header.months.map((m) => (
                  <Pressable
                    key={m.month}
                    label={m.label}
                    onPress={m.pick}
                    className={cn(cls.monthChip, m.selected ? cls.monthChipActive : cls.monthChipIdle)}
                    webClassName={m.selected ? undefined : "hover:bg-muted"}
                  >
                    <Text className={cn(cls.monthChipLabel, m.selected ? cls.monthChipLabelActive : cls.monthChipLabelIdle)}>{m.label}</Text>
                  </Pressable>
                ))}
              </Box>
            </Box>
          ) : null}
        </Box>
        <Pressable label={labels.nextMonth} onPress={() => header.stepMonth(1)} disabled={nextDisabled} className={cls.iconButton} webClassName={cn("hover:bg-muted", cls.webDenseIcon)}>
          <Icon node={chevronRight} size="md" tone="secondary" />
        </Pressable>
      </Box>

      {segments && segments.length === 2 ? (
        <Box className={cls.webSwap}>
          {segments
            .filter((seg) => !seg.active)
            .map((seg) => (
              <Pressable key={seg.key} label={seg.label} onPress={seg.onPress} className={cls.swapButton} webClassName={cn("hover:bg-muted", cls.webDenseControl)}>
                <Icon node={arrowLeftRight} size="sm" tone="secondary" />
                <Text className={cls.swapLabel}>{seg.label}</Text>
              </Pressable>
            ))}
        </Box>
      ) : null}
      {segments && segments.length > 0 ? (
        <Box className={cn(cls.segment, cls.webSegment)} label={segmentsLabel}>
          {segments.map((seg) => (
            <Pressable
              key={seg.key}
              label={seg.label}
              selected={seg.active}
              onPress={seg.onPress}
              className={cn(cls.segmentItem, seg.active && cls.segmentItemActive)}
            >
              <Text className={cn(cls.segmentLabel, seg.active ? cls.segmentLabelActive : cls.segmentLabelIdle)}>{seg.label}</Text>
            </Pressable>
          ))}
        </Box>
      ) : null}

      {location && onLocationChange ? (
        <PatroHeaderLocation
          location={location}
          onLocationChange={onLocationChange}
          open={locationOpen}
          onOpenChange={(next) => header.openPanel(next ? "location" : null)}
        />
      ) : null}
    </Box>
  );
}
