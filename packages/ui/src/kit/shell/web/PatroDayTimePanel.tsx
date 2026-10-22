import { cn } from "@vedic-patro/design-tokens/cn";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { calendarPickerClasses as pick } from "@vedic-patro/design-tokens/classes/calendar-picker-classes";
import { Grid, Box, Icon, Input, Pressable, Text } from "@vedic-patro/ui";
import type { PatroDayTimePanelProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** Date and time panel: era switch, crumbs, day grid, month grid, year jump and time steppers. */
export function PatroDayTimePanel({ h, onEraChange, onOk, onToday }: PatroDayTimePanelProps) {
  const { labels, crumbs, yearInput, yearPage, time } = h;
  return (
    <>
      {onEraChange && h.eras.length > 0 ? (
        <Box className={cn(cls.segment, "mb-3")} label={h.eraAria}>
          {h.eras.map((e) => (
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
      <Box className={pick.crumbRow}>
        <Pressable label={labels.prevMonth} onPress={crumbs.prevMonth} className={cls.iconButtonSmall} webClassName="hover:bg-muted">
          <Icon node={shellIcons.chevronLeft} size="sm" tone="secondary" />
        </Pressable>
        <Box className={pick.crumbs}>
          <Pressable label={labels.pickMonth} onPress={crumbs.month.toggle} className={cn(pick.crumb, crumbs.month.active && pick.crumbActive)} webClassName="hover:bg-muted">
            <Text className={pick.crumbLabel}>{crumbs.month.label}</Text>
          </Pressable>
          <Pressable label={labels.pickYear} onPress={crumbs.year.toggle} className={cn(pick.crumb, crumbs.year.active && pick.crumbActive)} webClassName="hover:bg-muted">
            <Text className={pick.crumbLabel}>{crumbs.year.label}</Text>
          </Pressable>
        </Box>
        <Pressable label={labels.nextMonth} onPress={crumbs.nextMonth} className={cls.iconButtonSmall} webClassName="hover:bg-muted">
          <Icon node={shellIcons.chevronRight} size="sm" tone="secondary" />
        </Pressable>
      </Box>

      {h.view === "days" ? (
        <>
          <Box className={pick.weekRow}>
            {h.weekdays.map((w) => (
              <Box key={w.label} className={pick.weekHead}>
                <Text className={cn(pick.weekHeadText, "w-full text-center", w.saturday && pick.weekHeadSaturday)}>{w.label}</Text>
              </Box>
            ))}
          </Box>
          <Box className={pick.dayGrid}>
            {h.cells.map((c) =>
              c.day === null ? (
                <Box key={c.key} className={cn(pick.dayCell, pick.dayCellEmpty)} />
              ) : (
                <Box key={c.key} className={pick.dayCell}>
                  <Pressable
                    label={c.label}
                    selected={c.selected}
                    onPress={c.pick}
                    className={cn(pick.dayButton, c.selected ? pick.dayButtonSelected : c.today && pick.dayButtonToday)}
                    webClassName={c.selected ? undefined : "hover:bg-muted"}
                  >
                    <Text className={cn(pick.dayLabel, c.saturday && pick.dayLabelSaturday, c.today && pick.dayLabelToday, c.selected && pick.dayLabelSelected)}>
                      {c.label}
                    </Text>
                  </Pressable>
                </Box>
              ),
            )}
            {/* Close the last week so its lines run to the edge. */}
            {Array.from({ length: (7 - (h.cells.length % 7)) % 7 }, (_, i) => (
              <Box key={`pad-${i}`} className={cn(pick.dayCell, pick.dayCellEmpty)} />
            ))}
          </Box>
          {time ? (
            <Box className={pick.timeRow}>
              <Text className={pick.timeLabel}>{labels.time}</Text>
              <Stepper value={time.hour} up={labels.hourUp} down={labels.hourDown} onStep={(d) => time.step("hour", d)} />
              <Text className={pick.timeColon}>:</Text>
              <Stepper value={time.minute} up={labels.minuteUp} down={labels.minuteDown} onStep={(d) => time.step("minute", d)} />
              <Box className={pick.timeSpacer} />
              <Pressable label={labels.now} onPress={time.setNow} className={pick.ghostButton} webClassName="hover:bg-muted max-w-24">
                <Text className={pick.ghostLabel}>{labels.now}</Text>
              </Pressable>
            </Box>
          ) : null}
          {onOk ? (
            <Box className={pick.footer}>
              {onToday ? (
                <Pressable label={labels.todayShort} onPress={onToday} className={pick.ghostButton} webClassName="hover:bg-muted">
                  <Text className={pick.ghostLabel}>{labels.todayShort}</Text>
                </Pressable>
              ) : null}
              <Pressable label={labels.ok} onPress={onOk} className={pick.okButton} webClassName="hover:opacity-90">
                <Text className={cls.yearGoLabel}>{labels.ok}</Text>
              </Pressable>
            </Box>
          ) : null}
        </>
      ) : null}

      {h.view === "months" ? (
        <Grid cols={3} gap={8}>
          {h.months.map((m) => (
            <Pressable
              key={m.month}
              label={m.label}
              selected={m.selected}
              onPress={m.pick}
              className={cn(cls.monthChip, m.selected ? cls.monthChipActive : cls.monthChipIdle, m.current && !m.selected && pick.monthChipCurrent)}
              webClassName={m.selected ? undefined : "hover:bg-muted"}
            >
              <Text className={cn(cls.monthChipLabel, m.selected ? cls.monthChipLabelActive : cls.monthChipLabelIdle)}>{m.label}</Text>
            </Pressable>
          ))}
        </Grid>
      ) : null}

      {h.view === "years" ? (
        <>
          <Text className={pick.jumpLabel}>{labels.jump}</Text>
          <Box className={pick.jumpRow}>
            <Input
              value={yearInput.value}
              onChange={(text) => yearInput.onChange(text.slice(0, yearInput.maxLength))}
              onSubmit={yearInput.commit}
              placeholder={yearInput.placeholder}
              label={labels.input}
              className={cn(cls.yearInput, yearInput.invalid ? cls.yearInputBad : cls.yearInputOk)}
              webClassName="outline-none focus:border-secondary"
            />
            <Pressable label={labels.go} onPress={yearInput.commit} className={cls.yearGo} webClassName="hover:opacity-90">
              <Text className={cls.yearGoLabel}>{labels.go}</Text>
            </Pressable>
          </Box>
          {yearInput.invalid ? <Text className={cls.yearError}>{yearInput.errorText}</Text> : null}
          <Box className={pick.yearPageRow}>
            <Pressable label={labels.prevPage} onPress={yearPage.prev} disabled={yearPage.prevDisabled} className={cls.iconButtonSmall} webClassName="hover:bg-muted">
              <Icon node={shellIcons.chevronLeft} size="sm" tone="secondary" />
            </Pressable>
            <Text className={pick.yearPageText}>{yearPage.rangeText}</Text>
            <Pressable label={labels.nextPage} onPress={yearPage.next} disabled={yearPage.nextDisabled} className={cls.iconButtonSmall} webClassName="hover:bg-muted">
              <Icon node={shellIcons.chevronRight} size="sm" tone="secondary" />
            </Pressable>
          </Box>
          <Grid cols={3} gap={8}>
            {h.years.map((y) => (
              <Pressable
                key={y.year}
                label={y.label}
                selected={y.selected}
                onPress={y.pick}
                className={cn(cls.monthChip, y.selected ? cls.monthChipActive : cls.monthChipIdle, y.current && !y.selected && pick.monthChipCurrent)}
                webClassName={y.selected ? undefined : "hover:bg-muted"}
              >
                <Text className={cn(cls.monthChipLabel, y.selected ? cls.monthChipLabelActive : cls.monthChipLabelIdle)}>{y.label}</Text>
              </Pressable>
            ))}
          </Grid>
        </>
      ) : null}
    </>
  );
}

function Stepper({ value, up, down, onStep }: { value: string; up: string; down: string; onStep: (direction: 1 | -1) => void }) {
  return (
    <Box className={pick.stepper}>
      <Pressable label={up} onPress={() => onStep(1)} className={pick.stepButton} webClassName="hover:bg-muted">
        <Icon node={shellIcons.chevronUp} size="sm" tone="secondary" />
      </Pressable>
      <Box className={pick.stepValue}>
        <Text className={pick.stepValueText}>{value}</Text>
      </Box>
      <Pressable label={down} onPress={() => onStep(-1)} className={pick.stepButton} webClassName="hover:bg-muted">
        <Icon node={shellIcons.chevronDown} size="sm" tone="secondary" />
      </Pressable>
    </Box>
  );
}
