import { TextInput } from "react-native";
import { __iconNode as chevronDown } from "lucide-react/dist/esm/icons/chevron-down";
import { __iconNode as chevronLeft } from "lucide-react/dist/esm/icons/chevron-left";
import { __iconNode as chevronRight } from "lucide-react/dist/esm/icons/chevron-right";
import { __iconNode as chevronUp } from "lucide-react/dist/esm/icons/chevron-up";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { Era } from "@vedic-patro/domain/era";
import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { calendarPickerClasses as pick } from "@vedic-patro/design-tokens/classes/calendar-picker-classes";
import type { usePatroDayTimeHeader } from "@vedic-patro/features/patro-date";

function Stepper({ value, up, down, onStep }: { value: string; up: string; down: string; onStep: (direction: 1 | -1) => void }) {
  return (
    <Box className={pick.stepper}>
      <Pressable label={up} onPress={() => onStep(1)} className={pick.stepButton}>
        <Icon node={chevronUp} size="sm" tone="secondary" />
      </Pressable>
      <Box className={pick.stepValue}>
        <Text className={pick.stepValueText}>{value}</Text>
      </Box>
      <Pressable label={down} onPress={() => onStep(-1)} className={pick.stepButton}>
        <Icon node={chevronDown} size="sm" tone="secondary" />
      </Pressable>
    </Box>
  );
}

/**
 * The date + time panel: era switch, month / year crumbs, the day grid, the
 * month grid, the year view and the time steppers. Drawn in the day + time
 * header's sheet and in the date picker of the panchanga wheel and sky view.
 */
export function PatroDayTimePanel({
  h,
  onEraChange,
  onOk,
  onToday,
}: {
  h: ReturnType<typeof usePatroDayTimeHeader>;
  /** With it the panel opens with the era switch (वि.सं. | पू.वि.सं.). */
  onEraChange?: (era: Era) => void;
  /** Shows the OK button under the days. */
  onOk?: () => void;
  /** Shows a Today button beside OK. */
  onToday?: () => void;
}) {
  const { labels, crumbs, yearInput, yearPage, time } = h;
  return (
    <>
      {onEraChange && h.eras.length > 0 ? (
        <Box className={cn(cls.segment, "mb-3")} label={h.eraAria}>
          {h.eras.map((e) => (
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
      <Box className={pick.crumbRow}>
        <Pressable label={labels.prevMonth} onPress={crumbs.prevMonth} className={cls.iconButtonSmall}>
          <Icon node={chevronLeft} size="sm" tone="secondary" />
        </Pressable>
        <Box className={pick.crumbs}>
          <Pressable label={labels.pickMonth} onPress={crumbs.month.toggle} className={cn(pick.crumb, crumbs.month.active && pick.crumbActive)}>
            <Text className={pick.crumbLabel}>{crumbs.month.label}</Text>
          </Pressable>
          <Pressable label={labels.pickYear} onPress={crumbs.year.toggle} className={cn(pick.crumb, crumbs.year.active && pick.crumbActive)}>
            <Text className={pick.crumbLabel}>{crumbs.year.label}</Text>
          </Pressable>
        </Box>
        <Pressable label={labels.nextMonth} onPress={crumbs.nextMonth} className={cls.iconButtonSmall}>
          <Icon node={chevronRight} size="sm" tone="secondary" />
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
                <Box key={c.key} className={pick.dayCell} />
              ) : (
                <Box key={c.key} className={pick.dayCell}>
                  <Pressable
                    label={c.label}
                    selected={c.selected}
                    onPress={c.pick}
                    className={cn(pick.dayButton, c.selected ? pick.dayButtonSelected : c.today && pick.dayButtonToday)}
                  >
                    <Text className={cn(pick.dayLabel, c.saturday && pick.dayLabelSaturday, c.today && pick.dayLabelToday, c.selected && pick.dayLabelSelected)}>
                      {c.label}
                    </Text>
                  </Pressable>
                </Box>
              ),
            )}
          </Box>
          {time ? (
            <Box className={pick.timeRow}>
              <Text className={pick.timeLabel}>{labels.time}</Text>
              <Stepper value={time.hour} up={labels.hourUp} down={labels.hourDown} onStep={(d) => time.step("hour", d)} />
              <Text className={pick.timeColon}>:</Text>
              <Stepper value={time.minute} up={labels.minuteUp} down={labels.minuteDown} onStep={(d) => time.step("minute", d)} />
              <Box className={pick.timeSpacer} />
              <Pressable label={labels.now} onPress={time.setNow} className={cn(pick.ghostButton, "flex-none px-3.5")}>
                <Text className={pick.ghostLabel}>{labels.now}</Text>
              </Pressable>
            </Box>
          ) : null}
          {onOk ? (
            <Box className={pick.footer}>
              {onToday ? (
                <Pressable label={labels.todayShort} onPress={onToday} className={pick.ghostButton}>
                  <Text className={pick.ghostLabel}>{labels.todayShort}</Text>
                </Pressable>
              ) : null}
              <Pressable label={labels.ok} onPress={onOk} className={pick.okButton}>
                <Text className={cls.yearGoLabel}>{labels.ok}</Text>
              </Pressable>
            </Box>
          ) : null}
        </>
      ) : null}

      {h.view === "months" ? (
        <Box className={cls.monthGrid}>
          {h.months.map((m) => (
            <Pressable
              key={m.month}
              label={m.label}
              selected={m.selected}
              onPress={m.pick}
              className={cn(cls.monthChip, m.selected ? cls.monthChipActive : cls.monthChipIdle, m.current && !m.selected && pick.monthChipCurrent)}
            >
              <Text className={cn(cls.monthChipLabel, m.selected ? cls.monthChipLabelActive : cls.monthChipLabelIdle)}>{m.label}</Text>
            </Pressable>
          ))}
        </Box>
      ) : null}

      {h.view === "years" ? (
        <>
          <Text className={pick.jumpLabel}>{labels.jump}</Text>
          <Box className={pick.jumpRow}>
            <TextInput
              value={yearInput.value}
              onChangeText={yearInput.onChange}
              onSubmitEditing={yearInput.commit}
              keyboardType="number-pad"
              maxLength={yearInput.maxLength}
              placeholder={yearInput.placeholder}
              accessibilityLabel={labels.input}
              className={cn(cls.yearInput, yearInput.invalid ? cls.yearInputBad : cls.yearInputOk)}
            />
            <Pressable label={labels.go} onPress={yearInput.commit} className={cls.yearGo}>
              <Text className={cls.yearGoLabel}>{labels.go}</Text>
            </Pressable>
          </Box>
          {yearInput.invalid ? <Text className={cls.yearError}>{yearInput.errorText}</Text> : null}
          <Box className={pick.yearPageRow}>
            <Pressable label={labels.prevPage} onPress={yearPage.prev} disabled={yearPage.prevDisabled} className={cls.iconButtonSmall}>
              <Icon node={chevronLeft} size="sm" tone="secondary" />
            </Pressable>
            <Text className={pick.yearPageText}>{yearPage.rangeText}</Text>
            <Pressable label={labels.nextPage} onPress={yearPage.next} disabled={yearPage.nextDisabled} className={cls.iconButtonSmall}>
              <Icon node={chevronRight} size="sm" tone="secondary" />
            </Pressable>
          </Box>
          <Box className={cls.monthGrid}>
            {h.years.map((y) => (
              <Pressable
                key={y.year}
                label={y.label}
                selected={y.selected}
                onPress={y.pick}
                className={cn(cls.monthChip, y.selected ? cls.monthChipActive : cls.monthChipIdle, y.current && !y.selected && pick.monthChipCurrent)}
              >
                <Text className={cn(cls.monthChipLabel, y.selected ? cls.monthChipLabelActive : cls.monthChipLabelIdle)}>{y.label}</Text>
              </Pressable>
            ))}
          </Box>
        </>
      ) : null}
    </>
  );
}
