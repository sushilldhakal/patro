import type { AyanamshaMode } from "@vedic-patro/domain/ayanamsha";
import { useAyanamshaSelector } from "@vedic-patro/features/kundali";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

interface Props {
  mode: AyanamshaMode;
  onModeChange: (mode: AyanamshaMode) => void;
}

export function AyanamshaSelector(props: Props) {
  const sel = useAyanamshaSelector(props);

  return (
    <div className={cn(kundaliDetailClasses.ayanamsha.card, "w-full overflow-hidden shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]")}>
      <div className={cn(kundaliDetailClasses.ayanamsha.header, "flex flex-wrap items-baseline gap-x-2.5 gap-y-1 bg-secondary/[0.09] dark:bg-secondary/20")}>
        <span className={kundaliDetailClasses.ayanamsha.heading}>{sel.heading}</span>
      </div>

      <div className={kundaliDetailClasses.ayanamsha.body}>
        <div className={kundaliDetailClasses.ayanamsha.chips}>
          {sel.chips.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.title}
              onClick={m.select}
              className={cn(
                kundaliDetailClasses.ayanamsha.chip,
                kundaliDetailClasses.ayanamsha.chipText,
                "inline-flex items-center transition-colors",
                m.active
                  ? cn(kundaliDetailClasses.ayanamsha.chipActive, kundaliDetailClasses.ayanamsha.chipActiveText)
                  : cn(kundaliDetailClasses.ayanamsha.chipIdle, kundaliDetailClasses.ayanamsha.chipIdleText, "hover:bg-muted")
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <p className={kundaliDetailClasses.ayanamsha.note}>{sel.note}</p>
      </div>
    </div>
  );
}
