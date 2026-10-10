import { dayCycleToggleMetrics } from "@/lib/day-cycle-toggle-metrics";
import { useLocale } from "@/lib/i18n";
import { useBreakpoint } from "@/lib/responsive";
import { cn } from "@/lib/utils";

export type DayCycleMode = "Day-Night" | "Calendar Day";

type Props = {
  mode: DayCycleMode;
  onModeChange?: (mode: DayCycleMode) => void;
};

const OPTIONS: Array<{ value: DayCycleMode; ne: string; en: string }> = [
  { value: "Day-Night", ne: "अहोरात्र", en: "Day-Night" },
  { value: "Calendar Day", ne: "दिन-रात", en: "Calendar Day" },
];

/** Phone: 22px. Tablet (≥768): 31px. */
export function DayCycleToggle({ mode, onModeChange }: Props) {
  const { pick } = useLocale();
  const { isCompact } = useBreakpoint();
  const { height, fontSize, lineHeight } = dayCycleToggleMetrics(isCompact);
  const inactive = OPTIONS.find((o) => o.value !== mode) ?? OPTIONS[0]!;
  const shellStyle = { height, maxHeight: height, fontSize, lineHeight };
  const btnClass =
    "inline-flex items-center justify-center px-2.5 font-semibold transition-colors";

  if (isCompact) {
    return (
      <button
        type="button"
        onClick={() => onModeChange?.(inactive.value)}
        aria-label={pick(`${inactive.ne} मा बदल्नुहोस्`, `Switch to ${inactive.en}`)}
        className={cn(btnClass, "rounded-md border border-border bg-card text-foreground hover:bg-muted")}
        style={shellStyle}
      >
        {pick(inactive.ne, inactive.en)}
      </button>
    );
  }

  return (
    <div
      className="inline-flex overflow-hidden rounded-md border border-border"
      role="radiogroup"
      aria-label={pick("दिन सीमा", "Day boundary")}
      style={{ height, maxHeight: height }}
    >
      {OPTIONS.map((o) => {
        const active = mode === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onModeChange?.(o.value)}
            className={cn(
              btnClass,
              active ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted",
            )}
            style={shellStyle}
          >
            {pick(o.ne, o.en)}
          </button>
        );
      })}
    </div>
  );
}
