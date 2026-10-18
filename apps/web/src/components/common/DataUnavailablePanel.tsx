import { cn } from "@vedic-patro/design-tokens/cn";

export function DataUnavailablePanel({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return <p className={cn("text-sm text-danger", className)}>{message}</p>;
}
