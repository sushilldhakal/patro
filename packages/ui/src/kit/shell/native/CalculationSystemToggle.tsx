import { cn } from "@vedic-patro/design-tokens/cn";
import { useCalculationSystemToggle } from "@vedic-patro/features/patro-date";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import { haptics } from "@vedic-patro/ui/motion";
import type { CalculationSystemToggleProps } from "../contract";

/**
 * Drik | Surya Siddhanta — the calculation the panchanga, calendar, festivals and
 * kundali follow. Options never swap places: Drik first. Same control on web and app.
 */
export function CalculationSystemToggle({ className }: CalculationSystemToggleProps) {
  const { ariaLabel, options, select } = useCalculationSystemToggle();
  return (
    <Box label={ariaLabel} className={cn("h-7 shrink-0 flex-row overflow-hidden rounded-md border border-border bg-card", className)}>
      {options.map((option) => (
        <Pressable
          key={option.system}
          role="tab"
          label={option.hint}
          selected={option.active}
          onPress={() => {
            if (option.active) return;
            haptics.tick();
            select(option.system);
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
