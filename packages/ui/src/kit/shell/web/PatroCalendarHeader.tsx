import { useState } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { usePatroCalendarHeader, usePatroMonthYearNav } from "@vedic-patro/features/patro-date";
import { Grid, Box, Icon, Input, Pressable, Text } from "@vedic-patro/ui";
import type { CalendarHeaderSegment, PatroCalendarHeaderProps, PatroMonthYearNavProps } from "../contract";
import { shellIcons } from "../icon-nodes";
import { PatroHeaderLocation } from "./PatroHeaderLocation";

/** Date badge, month and year panel, prev/next, calendar toggle and location. One row from `lg`. */
export function PatroCalendarHeader({
  era,
  year,
  month,
  onChange,
  onEraChange,
  location,
  onLocationChange,
  locate,
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
    <Box className={cn(cls.webRoot, className)}>
      {panel ? <Pressable label={labels.picker} onPress={header.closePanel} className={cls.webScrim} /> : null}

      <Box className={cls.webTitle}>
        <Pressable label={labels.today} onPress={header.goToday} className={cls.badge} webClassName={cls.webBadgeHover}>
          <Text className={cls.badgeMonth}>{header.title.month}</Text>
          <Box className={cls.badgeDays}>
            <Text className={cls.badgeDaysText}>{header.dayRange}</Text>
          </Box>
        </Pressable>
        <Box className="flex min-w-0 flex-col">
          <Text as="h2" numberOfLines={1} className={cls.titleMain} webClassName={cls.webTitleMain}>
            {[header.title.year, header.eraLabel, header.samvatsara].filter(Boolean).join(" ")}
          </Text>
          {nav.crossEraSubtitle ? (
            <Text numberOfLines={1} className={cls.titleSub} webClassName={cls.webTitleSub}>
              {nav.crossEraSubtitle}
            </Text>
          ) : null}
        </Box>
      </Box>

      <Box className={cls.webNav}>
        <Pressable
          label={labels.prevMonth}
          onPress={() => header.stepMonth(-1)}
          disabled={prevDisabled}
          className={cls.iconButton}
          webClassName={cn("hover:bg-muted", cls.webDenseIcon)}
        >
          <Icon node={shellIcons.chevronLeft} size="md" tone="secondary" />
        </Pressable>
        <Box className={cls.webMonthAnchor}>
          <Pressable
            label={labels.picker}
            onPress={() => header.togglePanel("month")}
            className={cn(cls.selectButton, monthOpen ? cls.selectButtonOpen : cls.selectButtonIdle, "w-full")}
            webClassName={cn("hover:bg-muted", cls.webDenseControl)}
          >
            <Text className={cn(cls.selectLabel, cls.webDenseText)} numberOfLines={1}>
              {header.title.month} {header.title.year}
            </Text>
            <Icon node={shellIcons.chevronDown} size="sm" tone="secondary" webClassName={cls.webChevronHide} />
          </Pressable>
          {monthOpen ? (
            <Box className={cn(cls.panel, cls.webPanel)} label={labels.picker}>
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
                  <Icon node={shellIcons.chevronLeft} size="sm" tone="secondary" />
                </Pressable>
                <Input
                  value={yearInput.value}
                  onChange={(text) => yearInput.onChange(text.slice(0, 4))}
                  onSubmit={yearInput.commit}
                  label={labels.yearInput}
                  className={cn(cls.yearInput, yearInput.invalid ? cls.yearInputBad : cls.yearInputOk)}
                  webClassName="outline-none focus:border-secondary"
                />
                <Pressable label={labels.yearGo} onPress={yearInput.commit} className={cls.yearGo} webClassName="hover:opacity-90">
                  <Text className={cls.yearGoLabel}>{labels.yearGo}</Text>
                </Pressable>
                <Pressable label={labels.nextYear} onPress={() => header.stepYear("next")} className={cls.iconButtonSmall} webClassName="hover:bg-muted">
                  <Icon node={shellIcons.chevronRight} size="sm" tone="secondary" />
                </Pressable>
              </Box>
              {yearInput.invalid ? <Text className={cls.yearError}>{labels.yearInvalid}</Text> : null}
              <Text className={cls.panelLabel}>{labels.monthSection}</Text>
              <Grid cols={3} gap={8}>
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
              </Grid>
            </Box>
          ) : null}
        </Box>
        <Pressable
          label={labels.nextMonth}
          onPress={() => header.stepMonth(1)}
          disabled={nextDisabled}
          className={cls.iconButton}
          webClassName={cn("hover:bg-muted", cls.webDenseIcon)}
        >
          <Icon node={shellIcons.chevronRight} size="md" tone="secondary" />
        </Pressable>
      </Box>

      {segments && segments.length > 2 ? <ViewDropdown segments={segments} label={segmentsLabel} /> : null}
      {segments && segments.length === 2 ? (
        <Box className={cls.webSwap}>
          {segments
            .filter((seg) => !seg.active)
            .map((seg) => (
              <Pressable key={seg.key} label={seg.label} onPress={seg.onPress} className={cls.swapButton} webClassName={cn("hover:bg-muted", cls.webDenseControl, cls.webDenseSwap)}>
                <Icon node={shellIcons.arrowLeftRight} size="sm" tone="secondary" />
                <Text className={cls.swapLabel} webClassName={cls.webDenseSwapLabel}>{seg.label}</Text>
              </Pressable>
            ))}
        </Box>
      ) : null}
      {segments && (segments.length === 1 || segments.length === 2) ? (
        <Box className={cn(cls.segment, cls.webSegment)} label={segmentsLabel}>
          {segments.map((seg) => (
            <Pressable key={seg.key} label={seg.label} selected={seg.active} onPress={seg.onPress} className={cn(cls.segmentItem, seg.active && cls.segmentItemActive)}>
              <Text className={cn(cls.segmentLabel, seg.active ? cls.segmentLabelActive : cls.segmentLabelIdle)}>{seg.label}</Text>
            </Pressable>
          ))}
        </Box>
      ) : null}

      {location && onLocationChange && locate ? (
        <PatroHeaderLocation
          location={location}
          onLocationChange={onLocationChange}
          locate={locate}
          open={locationOpen}
          onOpenChange={(next) => header.openPanel(next ? "location" : null)}
        />
      ) : null}
    </Box>
  );
}

/** Month + year navigation. The caller stores the browsed month. */
export function PatroMonthYearNav({ onBrowse, ...rest }: PatroMonthYearNavProps) {
  return <PatroCalendarHeader {...rest} onChange={onBrowse} />;
}

/** More than two views: one button showing the current view, and a menu of all of them with their icons. */
function ViewDropdown({ segments, label }: { segments: CalendarHeaderSegment[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const current = segments.find((s) => s.active) ?? segments[0]!;
  return (
    <div className={cls.webViewMenu}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={cls.webViewMenuButton}
      >
        {current.icon ? <Icon node={current.icon} size={18} tone="secondary" /> : null}
        <span className={cls.webViewMenuLabel}>{current.label}</span>
        <Icon node={shellIcons.chevronRight} size={14} tone="muted" className="rotate-90" />
      </button>
      {open ? (
        <>
          <button type="button" aria-label={label} onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default border-none bg-transparent" />
          <div role="menu" className="absolute right-0 z-50 mt-2 flex min-w-48 flex-col overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-lg">
            {segments.map((seg) => (
              <button
                key={seg.key}
                type="button"
                role="menuitemradio"
                aria-checked={seg.active}
                onClick={() => {
                  setOpen(false);
                  seg.onPress();
                }}
                className={cn("flex items-center gap-3 rounded-xl border-none bg-transparent px-3 py-2.5 text-left text-sm hover:bg-muted", seg.active && "font-semibold text-secondary")}
              >
                {seg.icon ? <Icon node={seg.icon} size={18} tone={seg.active ? "secondary" : "muted"} /> : <span className="w-[18px]" />}
                <span className="flex-1">{seg.label}</span>
                {seg.active ? <span aria-hidden>✓</span> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
