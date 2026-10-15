import { Pressable } from "react-native";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import type { Era } from "@vedic-patro/domain/era";
import { usePatroYearEraToggle } from "@vedic-patro/features/patro-date";
import { cn } from "@vedic-patro/domain/utils";
import { patroDateClasses } from "@vedic-patro/design-tokens/classes/patro-date-classes";

type Props = {
  era: Era;
  onEraChange: (era: Era) => void;
  compact?: boolean;
  className?: string;
};

/** BS↔BBS / AD↔BC — matches web {@link PatroYearEraToggle} inline variant. */
export function PatroYearEraToggle({ era, onEraChange, compact, className }: Props) {
  const toggle = usePatroYearEraToggle(era);
  if (!toggle) return null;
  const { targetEra, label: targetLabel, ariaLabel } = toggle;

  return (
    <Pressable
      onPress={() => onEraChange(targetEra)}
      accessibilityLabel={ariaLabel}
      className={cn(
        patroDateClasses.eraToggle,
        "items-center justify-center active:bg-muted",
        compact ? cn("h-7", patroDateClasses.eraToggleCompact) : patroDateClasses.eraToggleRegular,
        className,
      )}
    >
      <Text
        numberOfLines={1}
        className={cn(patroDateClasses.eraToggleLabel, compact ? patroDateClasses.eraToggleLabelCompact : patroDateClasses.eraToggleLabelRegular)}
        style={nepaliTextStyle(compact ? 10 : 12)}
      >
        {targetLabel}
      </Text>
    </Pressable>
  );
}
