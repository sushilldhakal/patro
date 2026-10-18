import { ScrollView, useWindowDimensions } from "react-native";
import type { GocharPage } from "@vedic-patro/features/gochar";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { patroDateClasses } from "@vedic-patro/design-tokens/classes/patro-date-classes";
import { patroMonthChipDay, patroMonthChipHead, patroMonthChipShell } from "@vedic-patro/design-tokens/classes/patro-classes";
import { chevronLeftIcon, chevronRightIcon } from "../icons";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";

/** ~15 calendar-day rows visible; additional events scroll inside the panel. */
const INGRESS_VISIBLE_DAY_ROWS = 15;
const INGRESS_EVENT_ROW_HEIGHT = 54;

/** Upcoming ingress events of the browsed month — draws `page.ingress` from `useGocharPage`. */
export function GocharIngressSection({ page }: { page: GocharPage }) {
  const { ingress, copy } = page;
  const { height: windowHeight } = useWindowDimensions();
  const listMaxHeight = Math.min(INGRESS_VISIBLE_DAY_ROWS * INGRESS_EVENT_ROW_HEIGHT, Math.round(windowHeight * 0.52));

  return (
    <Box className={gocharClasses.ingressCard}>
      <Box className={gocharClasses.ingressHead}>
        <Box className="flex-row items-start justify-between gap-2">
          <Box className="min-w-0 flex-1">
            <Text className={gocharClasses.ingressEyebrow}>{copy.ingressEyebrow}</Text>
            <Text className={gocharClasses.ingressTitle}>{copy.ingressTitle}</Text>
          </Box>
          {ingress.monthLabel ? (
            <Box className={cn("flex-row", gocharClasses.navGroup)}>
              <Pressable label={copy.prevMonth} onPress={ingress.prevMonth} className={cn(gocharClasses.navButton, "active:bg-muted")}>
                <Icon node={chevronLeftIcon} size={16} />
              </Pressable>
              <Text numberOfLines={1} className={cn("min-w-[6.5rem]", gocharClasses.navLabel)}>
                {ingress.monthLabel}
              </Text>
              <Pressable label={copy.nextMonth} onPress={ingress.nextMonth} className={cn(gocharClasses.navButton, "active:bg-muted")}>
                <Icon node={chevronRightIcon} size={16} />
              </Pressable>
            </Box>
          ) : null}
        </Box>
      </Box>

      <Box className={cn("flex-row flex-wrap", gocharClasses.filterBar)}>
        {ingress.filters.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => ingress.setFilter(f.id)}
            className={cn(
              gocharClasses.filterChip,
              "active:opacity-80",
              f.active ? gocharClasses.filterChipActive : gocharClasses.filterChipIdle,
            )}
          >
            <Text className={cn(gocharClasses.filterText, f.active ? gocharClasses.filterTextActive : gocharClasses.filterTextIdle)}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </Box>

      <ScrollView
        style={{ maxHeight: listMaxHeight }}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        contentContainerClassName={gocharClasses.ingressList}
      >
        {ingress.loading ? (
          <Text className={gocharClasses.ingressStatus}>{copy.loading}</Text>
        ) : ingress.rows.length === 0 ? (
          <Text className={gocharClasses.ingressStatus}>{copy.ingressEmpty}</Text>
        ) : (
          ingress.rows.map((row) => (
            <Box key={row.key} className={cn("flex-row", gocharClasses.ingressRow)} nativeClassName="min-h-14">
              <DayChip month={row.chip.month} day={row.chip.day} />
              <GrahaPlanetIcon graha={row.graha} size={22} />
              <Box className={gocharClasses.ingressBody}>
                <Text className={gocharClasses.ingressName}>{row.name}</Text>
                <Text className={gocharClasses.ingressDetail}>{row.detail}</Text>
              </Box>
              <Text className={gocharClasses.ingressRel}>{row.relative}</Text>
            </Box>
          ))
        )}
      </ScrollView>
    </Box>
  );
}

function DayChip({ month, day }: { month: string; day: string }) {
  return (
    <Box className={cn(patroMonthChipShell, "shrink-0", patroDateClasses.chipCompact)}>
      <Box className={cn(patroMonthChipHead, patroDateClasses.chipHeadCompact)}>
        <Text className={patroDateClasses.chipHeadLabel}>{month}</Text>
      </Box>
      <Box className={cn(patroMonthChipDay, patroDateClasses.chipDayCompact)}>
        <Text className="font-num text-xs font-bold text-foreground sm:text-sm">{day}</Text>
      </Box>
    </Box>
  );
}
