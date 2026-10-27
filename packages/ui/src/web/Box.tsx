import { cn } from "@vedic-patro/design-tokens/cn";
import type { BoxProps } from "../contract";
import { withFlexDisplay } from "./flex-display";

export function Box({ as: Tag = "div", className, webClassName, children, label, testID, widthPercent }: BoxProps) {
  return (
    <Tag className={withFlexDisplay(cn(className, webClassName)) || undefined} aria-label={label} data-testid={testID} style={widthPercent === undefined ? undefined : { width: `${widthPercent}%` }}>
      {children}
    </Tag>
  );
}
