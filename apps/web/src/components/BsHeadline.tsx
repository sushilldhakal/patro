import type { ReactNode } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";

interface BsHeadlineProps {
  /** Nepali BS year / era label (month is on the month chip, not here). */
  bs: ReactNode;
  /** संवत्सर name. Always rendered right after the Nepali year, before the AD date. */
  samvatsara?: ReactNode;
  /** Gregorian date / range subtitle. Always rendered last. */
  gregorian?: ReactNode;
  className?: string;
  bsClassName?: string;
  samvatsaraClassName?: string;
  gregorianClassName?: string;
  /**
   * Phone header: one line each, spread to the month-chip height.
   * Desktop keeps the single wrapping row.
   */
  stacked?: boolean;
}

/**
 * Single source of truth for every BS calendar page heading. Enforces the one
 * canonical order across the whole app:
 *
 *   <Nepali year / era>   <संवत्सर name>   <Gregorian date>
 *
 * Month name is shown on the month chip beside this headline, not repeated here.
 * e.g. `वि.सं. २०८३ रौद्र जुल/अग २०२६`.
 */
export function BsHeadline({
  bs,
  samvatsara,
  gregorian,
  className,
  bsClassName,
  samvatsaraClassName,
  gregorianClassName,
  stacked = false,
}: BsHeadlineProps) {
  if (stacked) {
    return (
      <h1
        className={cn(
          "m-0 flex h-full min-w-0 flex-col justify-between font-bold leading-tight tracking-tight",
          className,
        )}
      >
        <span className={cn("min-w-0 whitespace-nowrap", bsClassName)}>{bs}</span>
        {samvatsara ? (
          <span className={cn("whitespace-nowrap font-semibold text-foreground/90", samvatsaraClassName)}>
            {samvatsara}
          </span>
        ) : null}
        {gregorian ? (
          <span className={cn("whitespace-nowrap", gregorianClassName)}>{gregorian}</span>
        ) : null}
      </h1>
    );
  }

  return (
    <h1
      className={cn(
        "m-0 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 font-bold leading-tight tracking-tight",
        className,
      )}
    >
      <span className={cn("min-w-0", bsClassName)}>{bs}</span>
      {samvatsara ? (
        <span className={cn("shrink-0 font-semibold text-foreground/90", samvatsaraClassName)}>
          {samvatsara}
        </span>
      ) : null}
      {gregorian ? <span className={gregorianClassName}>{gregorian}</span> : null}
    </h1>
  );
}
