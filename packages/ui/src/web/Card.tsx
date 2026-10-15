import { cn } from "@vedic-patro/domain/utils";
import { cardClass } from "../classes";
import type { CardProps } from "../contract";

export function Card({ as: Tag = "div", size = "default", className, webClassName, children, testID }: CardProps) {
  return (
    <Tag className={cn(cardClass[size], className, webClassName)} data-testid={testID}>
      {children}
    </Tag>
  );
}
