import { cn } from "@vedic-patro/domain/utils";
import type { BoxProps } from "../contract";

export function Box({ as: Tag = "div", className, webClassName, children, label, testID }: BoxProps) {
  return (
    <Tag className={cn(className, webClassName) || undefined} aria-label={label} data-testid={testID}>
      {children}
    </Tag>
  );
}
