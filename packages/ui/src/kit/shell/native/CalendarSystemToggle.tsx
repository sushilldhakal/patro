import { cn } from "@vedic-patro/design-tokens/cn";
import { useCalendarSystemToggle } from "@vedic-patro/features/patro-date";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import { haptics } from "@vedic-patro/ui/motion";
import type { CalendarSystemToggleProps } from "../contract";

/**
 * BS | AD — the calendar-system preference. Independent of the UI language and
 * separate from the BBS/BC pair toggle inside the month picker. Options never
 * swap places: BS first, AD second. Same control as the website.
 */
export function CalendarSystemToggle({ className }: CalendarSystemToggleProps) {
  const { ariaLabel, options, select } = useCalendarSystemToggle();
  return (
    <Box label={ariaLabel} className={cn("h-7 shrink-0 flex-row overflow-hidden rounded-md border border-border bg-card", className)}>
      {options.map((option) => (
        <Pressable
          key={option.calendar}
          role="tab"
          label={option.hint}
          selected={option.active}
          onPress={() => {
            if (option.active) return;
            haptics.tick();
            select(option.calendar);
          }}
          className={cn("items-center justify-center px-2.5 active:opacity-80", option.active ? "bg-secondary" : "bg-card")}
        >
          <Text
            numberOfLines={1}
            className={cn("text-diagram-xs font-semibold", option.active ? "text-secondary-foreground" : "text-muted-foreground")}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </Box>
  );
}
