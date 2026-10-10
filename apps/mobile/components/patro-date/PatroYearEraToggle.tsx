import { Pressable } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { isGregorianEra, toggleEraForLanguage, type Era } from "@vedic-patro/domain/era";
import { patroEraShortLabel } from "./patro-era-labels";
import { cn } from "@/lib/utils";

type Props = {
  era: Era;
  onEraChange: (era: Era) => void;
  compact?: boolean;
  className?: string;
};

/** BS↔BBS / AD↔BC — matches web {@link PatroYearEraToggle} inline variant. */
export function PatroYearEraToggle({ era, onEraChange, compact, className }: Props) {
  const { pick, lang } = useLocale();
  if (isGregorianEra(era) && lang !== "en") return null;
  if (!isGregorianEra(era) && lang === "en") return null;

  const targetEra = toggleEraForLanguage(era, lang);
  const targetLabel = patroEraShortLabel(targetEra, pick);

  return (
    <Pressable
      onPress={() => onEraChange(targetEra)}
      accessibilityLabel={pick(`${targetLabel} मा जानुहोस्`, `Switch to ${targetLabel}`)}
      className={cn(
        "shrink-0 items-center justify-center rounded-md border border-border bg-card active:bg-muted",
        compact ? "h-7 px-1.5" : "px-2 py-1.5",
        className,
      )}
    >
      <Text
        numberOfLines={1}
        className={cn("font-semibold text-muted-foreground", compact ? "text-caption" : "text-caption")}
        style={nepaliTextStyle(compact ? 10 : 12)}
      >
        {targetLabel}
      </Text>
    </Pressable>
  );
}
