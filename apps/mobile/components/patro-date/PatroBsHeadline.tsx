import type { ReactNode } from "react";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

type Props = {
  /** Vikram year + era (month stays on the left chip). */
  bs: ReactNode;
  samvatsara?: ReactNode;
  gregorian?: ReactNode;
  className?: string;
  /** Phone title row vs tablet headline. */
  compact?: boolean;
};

/**
 * Same content as web {@link BsHeadline}: `२०८३ वि.सं.  रौद्र  अग/सेप २०२६`.
 *
 * One `Text`, not a wrapping row of three. As siblings each part was a flex
 * item with its own measurement, and each was measured against whatever width
 * happened to be left over at the time rather than against the width it ended
 * up with — `रौद्र` came back as a bare `…` sitting in a 25dp box with ~90dp
 * of empty row beside it. A single paragraph is measured once, against the
 * real width, and the double spaces between the parts are where it breaks.
 */
export function PatroBsHeadline({ bs, samvatsara, gregorian, className, compact = false }: Props) {
  const colors = useThemeColors();
  const bsSize = compact ? 14 : 20;
  const samSize = compact ? 14 : 20;
  const gregSize = compact ? 12 : 16;
  const secondary = { color: colors.secondary };
  const muted = { color: colors.mutedForeground };

  return (
    <Text
      numberOfLines={2}
      className={cn("min-w-0 font-semibold text-secondary", className)}
      style={[nepaliTextStyle(bsSize), secondary]}
    >
      {bs}
      {samvatsara ? (
        <Text className="font-semibold text-secondary" style={[nepaliTextStyle(samSize), secondary]}>
          {"  "}
          {samvatsara}
        </Text>
      ) : null}
      {gregorian ? (
        <Text
          className="font-semibold text-muted-foreground"
          style={[nepaliTextStyle(gregSize), muted]}
        >
          {"  "}
          {gregorian}
        </Text>
      ) : null}
    </Text>
  );
}
