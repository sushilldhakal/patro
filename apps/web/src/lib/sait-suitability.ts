import type { SaitSuitability } from "@/lib/api";

/** Visual treatment for a native (profile-based) per-day verdict. */
export const SUITABILITY_STYLE: Record<
  SaitSuitability,
  { dot: string; pill: string; ring: string; ne: string; en: string }
> = {
  favourable: {
    dot: "bg-success",
    pill: "bg-success/12 text-success-foreground dark:text-success",
    ring: "ring-2 ring-success/50",
    ne: "अनुकूल",
    en: "Favourable",
  },
  neutral: {
    dot: "bg-muted-foreground/60",
    pill: "bg-surface-muted text-muted-foreground",
    ring: "ring-1 ring-border",
    ne: "सामान्य",
    en: "Neutral",
  },
  avoid: {
    dot: "bg-danger",
    pill: "bg-danger/12 text-danger",
    ring: "ring-2 ring-danger/40",
    ne: "त्याज्य",
    en: "Avoid",
  },
};
