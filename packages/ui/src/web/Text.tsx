import { cn } from "@vedic-patro/design-tokens/cn";
import { textVariantClass } from "../classes";
import type { TextProps } from "../contract";

/** Clamp classes for `numberOfLines` (written out in full so Tailwind sees them). */
const CLAMP: Record<number, string> = { 1: "truncate", 2: "line-clamp-2", 3: "line-clamp-3", 4: "line-clamp-4" };

export function Text({ as: Tag = "span", variant, numberOfLines, className, webClassName, children, testID }: TextProps) {
  return (
    <Tag
      className={cn(variant && textVariantClass[variant], numberOfLines && CLAMP[numberOfLines], className, webClassName) || undefined}
      data-testid={testID}
    >
      {children}
    </Tag>
  );
}
