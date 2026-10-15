import { Children } from "react";
import { cn } from "@vedic-patro/domain/utils";
import type { GridProps } from "../contract";

/* Whole class names, so Tailwind finds them. */
const BASE = ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4", "grid-cols-5", "grid-cols-6", "grid-cols-7", "grid-cols-8", "grid-cols-9", "grid-cols-10", "grid-cols-11", "grid-cols-12"];
const XS = ["", "xs:grid-cols-1", "xs:grid-cols-2", "xs:grid-cols-3", "xs:grid-cols-4", "xs:grid-cols-5", "xs:grid-cols-6", "xs:grid-cols-7", "xs:grid-cols-8", "xs:grid-cols-9", "xs:grid-cols-10", "xs:grid-cols-11", "xs:grid-cols-12"];
const COMPACT = ["", "compact:grid-cols-1", "compact:grid-cols-2", "compact:grid-cols-3", "compact:grid-cols-4", "compact:grid-cols-5", "compact:grid-cols-6", "compact:grid-cols-7", "compact:grid-cols-8", "compact:grid-cols-9", "compact:grid-cols-10", "compact:grid-cols-11", "compact:grid-cols-12"];
const SM = ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-4", "sm:grid-cols-5", "sm:grid-cols-6", "sm:grid-cols-7", "sm:grid-cols-8", "sm:grid-cols-9", "sm:grid-cols-10", "sm:grid-cols-11", "sm:grid-cols-12"];
const MD = ["", "md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4", "md:grid-cols-5", "md:grid-cols-6", "md:grid-cols-7", "md:grid-cols-8", "md:grid-cols-9", "md:grid-cols-10", "md:grid-cols-11", "md:grid-cols-12"];
const LG = ["", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4", "lg:grid-cols-5", "lg:grid-cols-6", "lg:grid-cols-7", "lg:grid-cols-8", "lg:grid-cols-9", "lg:grid-cols-10", "lg:grid-cols-11", "lg:grid-cols-12"];

export function Grid({ cols, gap, gapX, gapY, as: Tag = "div", label, className, webClassName, children, testID }: GridProps) {
  const c = typeof cols === "number" ? { base: cols } : cols;
  const columns = cn("grid", BASE[c.base], c.xs && XS[c.xs], c.compact && COMPACT[c.compact], c.sm && SM[c.sm], c.md && MD[c.md], c.lg && LG[c.lg]);
  const x = gapX ?? gap;
  const y = gapY ?? gap;
  return (
    <Tag
      className={cn(columns, className, webClassName)}
      style={x === undefined && y === undefined ? undefined : { columnGap: x, rowGap: y }}
      aria-label={label}
      data-testid={testID}
    >
      {Children.toArray(children)}
    </Tag>
  );
}
