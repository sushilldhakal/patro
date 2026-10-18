import { dayCycleToggleMetrics } from "@/lib/day-cycle-toggle-metrics";
import { useLocale } from "@/lib/i18n";
import { useBreakpoint } from "@/lib/responsive";
import { cn } from "@vedic-patro/design-tokens/cn";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { tFor } from "@vedic-patro/i18n/runtime";

export type DayCycleMode = "Day-Night" | "Calendar Day";

type Props = {
  mode: DayCycleMode;
  onModeChange?: (mode: DayCycleMode) => void;
};

const OPTIONS: Array<{ value: DayCycleMode; ne: string; en: string }> = [
  { value: "Day-Night", get ne() { return tFor("ne", "ui.panchanga.day_night"); }, get en() { return tFor("en", "ui.panchanga.day_night"); } },
  { value: "Calendar Day", get ne() { return tFor("ne", "ui.panchanga.calendar_day"); }, get en() { return tFor("en", "ui.panchanga.calendar_day"); } },
];

/** Phone: 22px. Tablet (≥768): 31px. */
export function DayCycleToggle({ mode, onModeChange }: Props) {
  const { t, pick } = useLocale();
  const { isCompact } = useBreakpoint();
  const { height, fontSize, lineHeight } = dayCycleToggleMetrics(isCompact);
  const inactive = OPTIONS.find((o) => o.value !== mode) ?? OPTIONS[0]!;
  const shellStyle = { height, maxHeight: height, fontSize, lineHeight };
  const btnClass =
    "inline-flex items-center justify-center px-2.5 transition-colors";

  if (isCompact) {
    return (
      <button
        type="button"
        onClick={() => onModeChange?.(inactive.value)}
        aria-label={pick(tFor(undefined, "ui.panchanga.x_3dc91e42", { v0: inactive.ne }), `Switch to ${inactive.en}`)}
        className={cn(btnClass, panchangaPageClasses.dayCycle.toggleLabel, panchangaPageClasses.dayCycle.toggleRadiusMd, panchangaPageClasses.dayCycle.toggleSingle, "text-foreground hover:bg-muted")}
        style={shellStyle}
      >
        {pick(inactive.ne, inactive.en)}
      </button>
    );
  }

  return (
    <div
      className={cn("inline-flex", panchangaPageClasses.dayCycle.toggleRadiusMd, panchangaPageClasses.dayCycle.toggleGroup)}
      role="radiogroup"
      aria-label={t("panchanga.day_cycle.day_boundary")}
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
              panchangaPageClasses.dayCycle.toggleLabel,
              active ? panchangaPageClasses.dayCycle.toggleActive : cn(panchangaPageClasses.dayCycle.toggleIdle, "hover:bg-muted"),
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
