import { __iconNode as chevronDown } from "lucide-react/dist/esm/icons/chevron-down.mjs";
import { __iconNode as chevronLeft } from "lucide-react/dist/esm/icons/chevron-left.mjs";
import { __iconNode as chevronRight } from "lucide-react/dist/esm/icons/chevron-right.mjs";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { Era } from "@vedic-patro/domain/era";
import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { calendarPickerClasses as pick } from "@vedic-patro/design-tokens/classes/calendar-picker-classes";
import { usePatroYearHeader } from "@vedic-patro/features/patro-date";

export type PatroYearHeaderProps = {
  era: Era;
  year: number;
  onChange: (year: number) => void;
  /** The badge and "this year": the caller picks the year (and era) that is. */
  onToday: () => void;
  todayYear?: number;
  /** With it the panel opens with the era switch (वि.सं. | पू.वि.सं.). */
  onEraChange?: (era: Era) => void;
  /** Replaces the Gregorian years under the title. */
  subtitle?: string | null;
  className?: string;
};

/** Year-only picker: badge, title, prev/next year and a panel with the jump box and a paged year grid. */
export function PatroYearHeader({ era, year, onChange, onToday, todayYear, onEraChange, subtitle, className }: PatroYearHeaderProps) {
  const h = usePatroYearHeader({ era, year, onChange, onToday, todayYear, subtitleOverride: subtitle });
  const { input, page, labels } = h;

  return (
    <Box className={cn(pick.webStack, className)}>
      {h.open ? <button type="button" tabIndex={-1} aria-hidden className={pick.webScrim} onClick={h.close} /> : null}

      <Box className={cn(pick.webTitle, pick.webDtTitle)}>
        <Pressable label={labels.today} onPress={h.goToday} className={cls.badge} webClassName={pick.webBadgeHover}>
          <Text className={cls.badgeMonth}>{h.badge.top}</Text>
          <Box className={cls.badgeDays}>
            <Text className={cls.badgeDaysText}>{h.badge.bottom}</Text>
          </Box>
        </Pressable>
        <Box className="flex min-w-0 flex-col">
          <Text as="h2" className={cn(cls.titleMain, "truncate")}>
            {h.title.main}
          </Text>
          {h.title.sub ? <Text className={cn(cls.titleSub, "truncate")}>{h.title.sub}</Text> : null}
        </Box>
      </Box>

      <Box className={cn(pick.webNav, pick.webDtNav, "w-full max-w-sm")}>
        <Pressable label={labels.prev} onPress={h.prev} className={cls.iconButton} webClassName="hover:bg-muted">
          <Icon node={chevronLeft} size="md" tone="secondary" />
        </Pressable>
        <Pressable
          label={labels.picker}
          onPress={h.toggle}
          className={cn(pick.yearButton, h.open ? cls.selectButtonOpen : cls.selectButtonIdle, "max-sm:flex-1")}
          webClassName="hover:bg-muted"
        >
          <Text className={pick.yearButtonText}>{h.yearLabel}</Text>
          <Icon node={chevronDown} size="sm" tone="secondary" />
        </Pressable>
        <Pressable label={labels.next} onPress={h.next} className={cls.iconButton} webClassName="hover:bg-muted">
          <Icon node={chevronRight} size="md" tone="secondary" />
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
              <input
                type="text"
                inputMode="numeric"
                maxLength={input.maxLength}
                value={input.value}
                placeholder={input.placeholder}
                onChange={(e) => input.onChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") input.commit();
                }}
                aria-label={labels.input}
                aria-invalid={input.invalid}
                className={cn(cls.yearInput, input.invalid ? cls.yearInputBad : cls.yearInputOk, "outline-none focus:border-secondary")}
              />
              <Pressable label={labels.go} onPress={input.commit} className={cls.yearGo} webClassName="hover:opacity-90">
                <Text className={cls.yearGoLabel}>{labels.go}</Text>
              </Pressable>
            </Box>
            {input.invalid ? <Text className={cls.yearError}>{input.errorText}</Text> : null}
            <Box className={pick.yearPageRow}>
              <Pressable label={labels.prevPage} onPress={page.prev} disabled={page.prevDisabled} className={cls.iconButtonSmall} webClassName="hover:bg-muted">
                <Icon node={chevronLeft} size="sm" tone="secondary" />
              </Pressable>
              <Text className={pick.yearPageText}>{page.rangeText}</Text>
              <Pressable label={labels.nextPage} onPress={page.next} disabled={page.nextDisabled} className={cls.iconButtonSmall} webClassName="hover:bg-muted">
                <Icon node={chevronRight} size="sm" tone="secondary" />
              </Pressable>
            </Box>
            <Box className="grid grid-cols-3 gap-2">
              {h.chips.map((chip) => (
                <Pressable
                  key={chip.year}
                  label={chip.label}
                  selected={chip.selected}
                  onPress={chip.pick}
                  className={cn(
                    pick.yearChip,
                    chip.selected ? cls.monthChipActive : cls.monthChipIdle,
                    chip.current && !chip.selected && pick.monthChipCurrent,
                  )}
                  webClassName={chip.selected ? undefined : "hover:bg-muted"}
                >
                  <Text className={cn(pick.yearChipLabel, chip.selected ? cls.monthChipLabelActive : cls.monthChipLabelIdle)}>{chip.label}</Text>
                  {chip.sub ? <Text className={cn(pick.yearChipSub, chip.selected && pick.yearChipSubSelected)}>{chip.sub}</Text> : null}
                </Pressable>
              ))}
            </Box>
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
