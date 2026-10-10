import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type BsNativeSelectOption = {
  value: number;
  label: string;
  /**
   * Shown on the closed control below `md` when `label` is too wide there
   * (e.g. "Sep" for "September"). The option list keeps the full label — it
   * opens as the OS picker, which has room and reads better spelled out.
   */
  shortLabel?: string;
};

interface Props {
  value: number;
  options: BsNativeSelectOption[];
  onChange: (value: number) => void;
  ariaLabel: string;
  className?: string;
  /** Taller touch target for bottom-sheet pickers. */
  comfortable?: boolean;
}

/** Native `<select>` overlay — opens iOS wheel picker on tap. */
export function BsNativeSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  comfortable = false,
}: Props) {
  const selected = options.find((option) => option.value === value);

  return (
    <label className={cn("relative inline-flex shrink-0", className)}>
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(Number(event.target.value))}
        className="patro-native-select absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        className={cn(
          "pointer-events-none flex w-full min-w-0 items-center justify-between gap-0.5 rounded-md border border-border bg-card text-foreground",
          comfortable
            ? "h-9 gap-1 px-2 text-sm"
            : "h-6 gap-0.5 px-1 text-sm text-base sm:h-7 sm:gap-1 sm:px-1.5 sm:text-xs",
        )}
        aria-hidden
      >
        {selected?.shortLabel ? (
          <span className="truncate">
            <span className="md:hidden">{selected.shortLabel}</span>
            <span className="hidden md:inline">{selected.label}</span>
          </span>
        ) : (
          <span className="truncate">{selected?.label ?? "—"}</span>
        )}
        <ChevronDown className="size-3 shrink-0 opacity-45" strokeWidth={2.25} />
      </span>
    </label>
  );
}
