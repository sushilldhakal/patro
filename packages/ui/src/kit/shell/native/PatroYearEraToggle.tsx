import { cn } from "@vedic-patro/domain/utils";
import { patroDateClasses as era } from "@vedic-patro/design-tokens/classes/patro-date-classes";
import { usePatroYearEraToggle } from "@vedic-patro/features/patro-date";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import type { PatroYearEraToggleProps } from "../contract";

/** BS↔BBS / AD↔BC. Same control as the website. */
export function PatroYearEraToggle({ era: current, onEraChange, className, compact = false, comfortable = false, variant = "inline" }: PatroYearEraToggleProps) {
  const toggle = usePatroYearEraToggle(current);
  if (!toggle) return null;
  const { targetEra, label, ariaLabel } = toggle;
  const button = (
    <Pressable
      label={ariaLabel}
      onPress={() => onEraChange(targetEra)}
      className={cn(
        "items-center justify-center active:bg-muted",
        variant === "dropdown" ? "w-full rounded-md border border-border bg-card px-2 py-1.5" : cn(era.eraToggle, compact ? cn("h-7", era.eraToggleCompact, comfortable && "h-9") : era.eraToggleRegular),
        variant === "inline" && className,
      )}
    >
      <Text
        numberOfLines={1}
        className={cn(era.eraToggleLabel, variant === "dropdown" || (compact && !comfortable) ? era.eraToggleLabelCompact : era.eraToggleLabelRegular)}
      >
        {label}
      </Text>
    </Pressable>
  );
  if (variant === "dropdown") return <Box className={cn("border-b border-border px-2 pb-2 pt-1.5", className)}>{button}</Box>;
  return button;
}
