import type { GocharPage } from "@vedic-patro/features/gochar";
import { cn } from "@vedic-patro/domain/utils";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { patroDateClasses } from "@vedic-patro/design-tokens/classes/patro-date-classes";
import { patroMonthChipDay, patroMonthChipHead, patroMonthChipShell } from "@vedic-patro/design-tokens/classes/patro-classes";
import { chevronLeftIcon, chevronRightIcon } from "../icons";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";

/** Upcoming ingress events of the browsed month — draws `page.ingress` from `useGocharPage`. */
export function GocharIngressSection({ page }: { page: GocharPage }) {
  const { ingress, copy } = page;

  return (
    <Box
      as="section"
      className={cn(
        "flex max-h-[min(32rem,70vh)] min-h-[18rem] flex-col shadow-ring-soft lg:max-h-[min(36rem,75vh)]",
        gocharClasses.ingressCard,
      )}
    >
      <Box className={cn("flex shrink-0 flex-col sm:flex-row sm:items-start sm:justify-between", gocharClasses.ingressHead)}>
        <Box className="min-w-0">
          <Text as="p" className={cn("m-0", gocharClasses.ingressEyebrow)}>
            {copy.ingressEyebrow}
          </Text>
          <Text as="h2" className={cn("mb-0 break-words", gocharClasses.ingressTitle)}>
            {copy.ingressTitle}
          </Text>
        </Box>
        {ingress.monthLabel ? (
          <Box className={cn("flex justify-end self-stretch sm:self-auto", gocharClasses.navGroup)}>
            <Pressable
              label={copy.prevMonth}
              onPress={ingress.prevMonth}
              className={cn("flex transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40", gocharClasses.navButton)}
            >
              <Icon node={chevronLeftIcon} size={16} strokeWidth={2.25} />
            </Pressable>
            <Text
              as="span"
              numberOfLines={1}
              className={cn("min-w-0 max-w-[min(100%,8.5rem)] truncate sm:max-w-none sm:min-w-[6.5rem]", gocharClasses.navLabel)}
            >
              {ingress.monthLabel}
            </Text>
            <Pressable
              label={copy.nextMonth}
              onPress={ingress.nextMonth}
              className={cn("flex transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40", gocharClasses.navButton)}
            >
              <Icon node={chevronRightIcon} size={16} strokeWidth={2.25} />
            </Pressable>
          </Box>
        ) : null}
      </Box>

      <Box className={cn("flex flex-wrap", gocharClasses.filterBar)}>
        {ingress.filters.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => ingress.setFilter(f.id)}
            className={cn(
              gocharClasses.filterChip,
              gocharClasses.filterText,
              "transition-colors",
              f.active
                ? cn(gocharClasses.filterChipActive, gocharClasses.filterTextActive)
                : cn(gocharClasses.filterChipIdle, gocharClasses.filterTextIdle, "hover:text-foreground"),
            )}
          >
            {f.label}
          </Pressable>
        ))}
      </Box>

      <Box className={cn("min-h-0 flex-1 overflow-y-auto overscroll-y-contain", gocharClasses.ingressList)}>
        {ingress.loading ? (
          <Text as="p" className={gocharClasses.ingressStatus}>
            {copy.loading}
          </Text>
        ) : ingress.rows.length === 0 ? (
          <Text as="p" className={gocharClasses.ingressStatus}>
            {copy.ingressEmpty}
          </Text>
        ) : (
          <Box as="ul" className="m-0 list-none p-0">
            {ingress.rows.map((row) => (
              <Box as="li" key={row.key} className={cn("flex last:border-b-0", gocharClasses.ingressRow)}>
                <DayChip month={row.chip.month} day={row.chip.day} />
                <GrahaPlanetIcon graha={row.graha} size={22} className="shrink-0" />
                <Box className={cn("leading-snug", gocharClasses.ingressBody)}>
                  <Text as="p" className={cn("m-0", gocharClasses.ingressName)}>
                    {row.name}
                  </Text>
                  <Text as="p" className={cn("m-0", gocharClasses.ingressDetail)}>
                    {row.detail}
                  </Text>
                </Box>
                <Text as="span" className={gocharClasses.ingressRel}>
                  {row.relative}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function DayChip({ month, day }: { month: string; day: string }) {
  return (
    <Box className={cn(patroMonthChipShell, "shrink-0", patroDateClasses.chipCompact)} label="">
      <Box className={cn(patroMonthChipHead, patroDateClasses.chipHeadCompact)}>{month}</Box>
      <Box className={cn(patroMonthChipDay, patroDateClasses.chipDayCompact)}>{day}</Box>
    </Box>
  );
}
