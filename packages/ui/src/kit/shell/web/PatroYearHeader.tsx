import { cn } from "@vedic-patro/design-tokens/cn";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { calendarPickerClasses as pick } from "@vedic-patro/design-tokens/classes/calendar-picker-classes";
import { usePatroYearHeader } from "@vedic-patro/features/patro-date";
import { Grid, Box, Icon, Input, Pressable, Text } from "@vedic-patro/ui";
import type { PatroYearHeaderProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** Year-only picker: badge, title, prev/next and a panel with the jump box and a paged year grid. */
export function PatroYearHeader({ era, year, onChange, onToday, todayYear, onEraChange, subtitle, className }: PatroYearHeaderProps) {
  const h = usePatroYearHeader({ era, year, onChange, onToday, todayYear, subtitleOverride: subtitle });
  const { input, page, labels } = h;

  return (
    <Box className={cn(pick.webStack, className)}>
      {h.open ? <Pressable label={labels.picker} onPress={h.close} className={pick.webScrim} /> : null}

      <Box className={cn(pick.webTitle, pick.webDtTitle)}>
        <Pressable label={labels.today} onPress={h.goToday} className={cls.badge} webClassName={pick.webBadgeHover}>
          <Text className={cls.badgeMonth}>{h.badge.top}</Text>
          <Box className={cls.badgeDays}>
            <Text className={cls.badgeDaysText}>{h.badge.bottom}</Text>
          </Box>
        </Pressable>
        <Box className="flex min-w-0 flex-col">
          <Text as="h2" numberOfLines={1} className={cls.titleMain}>
            {h.title.main}
          </Text>
          {h.title.sub ? (
            <Text numberOfLines={1} className={cls.titleSub}>
              {h.title.sub}
            </Text>
          ) : null}
        </Box>
      </Box>

      <Box className={cn(pick.webNav, pick.webDtNav, "w-full max-w-sm")}>
        <Pressable label={labels.prev} onPress={h.prev} className={cls.iconButton} webClassName="hover:bg-muted">
          <Icon node={shellIcons.chevronLeft} size="md" tone="secondary" />
        </Pressable>
        <Pressable
          label={labels.picker}
          onPress={h.toggle}
          className={cn(pick.yearButton, h.open ? cls.selectButtonOpen : cls.selectButtonIdle, "max-sm:flex-1")}
          webClassName="hover:bg-muted"
        >
          <Text className={pick.yearButtonText}>{h.yearLabel}</Text>
          <Icon node={shellIcons.chevronDown} size="sm" tone="secondary" />
        </Pressable>
        <Pressable label={labels.next} onPress={h.next} className={cls.iconButton} webClassName="hover:bg-muted">
          <Icon node={shellIcons.chevronRight} size="md" tone="secondary" />
        </Pressable>

        {h.open ? (
          <Box className={cn(cls.panel, pick.webYearPanel, "left-0 right-auto")} label={labels.picker}>
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
            <Text className={pick.jumpLabel}>{labels.jump}</Text>
            <Box className={pick.jumpRow}>
              <Input
                value={input.value}
                onChange={(text) => input.onChange(text.slice(0, input.maxLength))}
                onSubmit={input.commit}
                placeholder={input.placeholder}
                label={labels.input}
                className={cn(cls.yearInput, input.invalid ? cls.yearInputBad : cls.yearInputOk)}
                webClassName="outline-none focus:border-secondary"
              />
              <Pressable label={labels.go} onPress={input.commit} className={cls.yearGo} webClassName="hover:opacity-90">
                <Text className={cls.yearGoLabel}>{labels.go}</Text>
              </Pressable>
            </Box>
            {input.invalid ? <Text className={cls.yearError}>{input.errorText}</Text> : null}
            <Box className={pick.yearPageRow}>
              <Pressable label={labels.prevPage} onPress={page.prev} disabled={page.prevDisabled} className={cls.iconButtonSmall} webClassName="hover:bg-muted">
                <Icon node={shellIcons.chevronLeft} size="sm" tone="secondary" />
              </Pressable>
              <Text className={pick.yearPageText}>{page.rangeText}</Text>
              <Pressable label={labels.nextPage} onPress={page.next} disabled={page.nextDisabled} className={cls.iconButtonSmall} webClassName="hover:bg-muted">
                <Icon node={shellIcons.chevronRight} size="sm" tone="secondary" />
              </Pressable>
            </Box>
            <Grid cols={3} gap={8}>
              {h.chips.map((chip) => (
                <Pressable
                  key={chip.year}
                  label={chip.label}
                  selected={chip.selected}
                  onPress={chip.pick}
                  className={cn(pick.yearChip, chip.selected ? cls.monthChipActive : cls.monthChipIdle, chip.current && !chip.selected && pick.monthChipCurrent)}
                  webClassName={chip.selected ? undefined : "hover:bg-muted"}
                >
                  <Text className={cn(pick.yearChipLabel, chip.selected ? cls.monthChipLabelActive : cls.monthChipLabelIdle)}>{chip.label}</Text>
                  {chip.sub ? <Text className={cn(pick.yearChipSub, chip.selected && pick.yearChipSubSelected)}>{chip.sub}</Text> : null}
                </Pressable>
              ))}
            </Grid>
            <Box className={pick.footer}>
              <Pressable label={labels.today} onPress={h.goToday} className={pick.ghostButton} webClassName="hover:bg-muted">
                <Text className={pick.ghostLabel}>{labels.thisYear}</Text>
              </Pressable>
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
