import type { ReactNode } from "react";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";

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
  /* Web titleBlock: h1 `text-sm` on phones, `text-xl` from md; the AD subtitle is always `text-xs`. */
  const size = compact ? "text-sm" : "text-xl";

  return (
    <Text
      numberOfLines={2}
      className={cn("min-w-0 font-bold leading-tight tracking-tight text-secondary", size, className)}
      style={nepaliTextStyle()}
    >
      {bs}
      {samvatsara ? (
        <Text className={cn("font-semibold text-secondary", size)} style={nepaliTextStyle()}>
          {"  "}
          {samvatsara}
        </Text>
      ) : null}
      {gregorian ? (
        <Text className="text-xs font-semibold text-muted-foreground" style={nepaliTextStyle()}>
          {"  "}
          {gregorian}
        </Text>
      ) : null}
    </Text>
  );
}
