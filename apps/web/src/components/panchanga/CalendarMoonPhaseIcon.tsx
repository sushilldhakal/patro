import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import { elongationFromTithiIndex, moonPhaseLitPath } from "@/lib/moon-phase-svg";

type Props = {
  /** Wheel tithi index 0–29 (0 = शुक्ल प्रतिपदा … 14 = पूर्णिमा … 29 = औंसी). */
  tithiIndex: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

const R = 9;
const R_FULL = 10;

const darkFill = "fill-slate-900 dark:fill-slate-800";
const darkStroke = "stroke-slate-700 dark:stroke-slate-600";
const yellowFill = "fill-yellow-200 dark:fill-yellow-100/90";
const yellowStroke = "stroke-yellow-400 dark:stroke-yellow-500";

/**
 * App-wide tithi moon phase glyph (geometry from {@link moonPhaseLitPath}).
 * Used on home/month grids, day timeline, panchanga sections, and element tithi spans.
 *
 * पूर्णिमा → fully yellow; darkness creeps in from the right through कृष्ण पक्ष.
 * औंसी → fully black; yellow light grows from the right through शुक्ल पक्ष.
 */
export function CalendarMoonPhaseIcon({ tithiIndex, className, style, title }: Props) {
  const isPurnima = tithiIndex === 14;
  const isAaushi = tithiIndex === 29;

  const litPath =
    !isPurnima && !isAaushi
      ? moonPhaseLitPath(elongationFromTithiIndex(tithiIndex), R)
      : null;

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
          <circle
            cx={12}
            cy={12}
            r={R_FULL}
            className={cn("fill-none", yellowStroke)}
            strokeWidth={1}
          />
        </>
      ) : isAaushi ? (
        <>
          <circle cx={12} cy={12} r={R_FULL} className={darkFill} />
          <circle
            cx={12}
            cy={12}
            r={R_FULL}
            className={cn("fill-none", darkStroke)}
            strokeWidth={1}
          />
        </>
      ) : (
        <>
          {/* Dark moon disc — shadow grows from the right during waning */}
          <circle
            cx={12}
            cy={12}
            r={R}
            className={cn(darkFill, darkStroke)}
            strokeWidth={1}
          />
          {/* Yellow lit portion — grows from the right during waxing, shrinks from the right during waning */}
          <g transform="translate(12,12)">
            <path d={litPath!} className={cn(yellowFill, yellowStroke)} />
          </g>
        </>
      )}
    </svg>
  );
}
