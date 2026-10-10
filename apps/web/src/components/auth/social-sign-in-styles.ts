import { cn } from "@/lib/utils";

/** Shared pill button — follows app background/border in light and dark. */
export const socialSignInButtonClass = cn(
  "h-10 w-[300px] max-w-full gap-2 rounded-full border border-border bg-background text-base text-foreground shadow-none",
  "hover:bg-muted/60",
);
