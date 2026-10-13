import { createElement } from "react";
import { cn } from "@vedic-patro/domain/utils";
import { iconSize } from "@vedic-patro/design-tokens";
import { iconStrokeWidth } from "@vedic-patro/icons";
import { iconToneClass } from "../classes";
import type { IconProps } from "../contract";

/** Draws a Lucide node list as inline SVG, coloured by the tone's text class (currentColor). */
export function Icon({ node, size = "md", tone = "foreground", filled, strokeWidth, label, className, webClassName, testID }: IconProps) {
  const px = typeof size === "number" ? size : iconSize[size];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth ?? iconStrokeWidth(px)}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-testid={testID}
      className={cn("shrink-0", iconToneClass[tone], className, webClassName)}
    >
      {node.map(([tag, attrs], i) => {
        const { key: _key, ...rest } = attrs as Record<string, string | number>;
        return createElement(tag, { key: i, ...rest });
      })}
    </svg>
  );
}
