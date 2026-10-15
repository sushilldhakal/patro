import { cn } from "@vedic-patro/domain/utils";
import { elongationFromTithiIndex, moonPhaseLitPath } from "@vedic-patro/domain/moon-phase-svg";

export type CalendarMoonPhaseIconProps = {
  /** Wheel tithi index 0-29 (0 shukla pratipada, 14 purnima, 29 aaushi). */
  tithiIndex: number;
  className?: string;
  size?: number;
  title?: string;
  style?: { width?: number | string; height?: number | string };
};

const R = 9;
const R_FULL = 10;

const darkFill = "fill-slate-900 dark:fill-slate-800";
const darkStroke = "stroke-slate-700 dark:stroke-slate-600";
const yellowFill = "fill-yellow-200 dark:fill-yellow-100/90";
const yellowStroke = "stroke-yellow-400 dark:stroke-yellow-500";

/** Tithi moon for calendar cells. Purnima is a full yellow disc; aaushi is a full dark disc. */
export function CalendarMoonPhaseIcon({ tithiIndex, className, style, title }: CalendarMoonPhaseIconProps) {
  const isPurnima = tithiIndex === 14;
  const isAaushi = tithiIndex === 29;
  const litPath = !isPurnima && !isAaushi ? moonPhaseLitPath(elongationFromTithiIndex(tithiIndex), R) : null;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      style={style}
      className={cn("shrink-0 text-muted-foreground", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {isPurnima ? (
        <>
          <circle cx={12} cy={12} r={R_FULL} className={yellowFill} />
          <circle cx={12} cy={12} r={R_FULL} className={cn("fill-none", yellowStroke)} strokeWidth={1} />
        </>
      ) : isAaushi ? (
        <>
          <circle cx={12} cy={12} r={R_FULL} className={darkFill} />
          <circle cx={12} cy={12} r={R_FULL} className={cn("fill-none", darkStroke)} strokeWidth={1} />
        </>
      ) : (
        <>
          <circle cx={12} cy={12} r={R} className={cn(darkFill, darkStroke)} strokeWidth={1} />
          <g transform="translate(12,12)">
            <path d={litPath ?? ""} className={cn(yellowFill, yellowStroke)} />
          </g>
        </>
      )}
    </svg>
  );
}
