import { cn } from "@vedic-patro/domain/utils";

export function DataUnavailablePanel({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return <p className={cn("text-sm text-danger", className)}>{message}</p>;
}
