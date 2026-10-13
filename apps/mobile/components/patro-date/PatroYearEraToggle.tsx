import { Pressable } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { isGregorianEra, toggleEraForLanguage, type Era } from "@vedic-patro/domain/era";
import { patroEraShortLabel } from "./patro-era-labels";
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
  const { t, lang } = useLocale();
  if (isGregorianEra(era) && lang !== "en") return null;
  if (!isGregorianEra(era) && lang === "en") return null;

  const targetEra = toggleEraForLanguage(era, lang);
  const targetLabel = patroEraShortLabel(targetEra, lang);

  return (
    <Pressable
      onPress={() => onEraChange(targetEra)}
      accessibilityLabel={t("ui.patro_date.switch_to_targetlabel", { targetLabel })}
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
