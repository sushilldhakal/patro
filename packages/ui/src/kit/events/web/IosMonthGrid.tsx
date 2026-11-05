import { useBsDateTimePicker } from "@vedic-patro/features/panchanga";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useLocale } from "@vedic-patro/i18n/react";
import { Icon } from "@vedic-patro/ui";
import type { IosMonthGridProps } from "../contract";
import { iconChevronLeft, iconChevronRight } from "../icons";

/**
 * A BS month as Apple Calendar's inline date picker draws it under a date row: "कात्तिक २०८३ ›"
 * with ‹ › on the right, the weekday letters, then borderless days — the chosen one in a filled
 * circle, today in the accent colour. A click picks at once (no Done).
 */
export function IosMonthGrid({ year, month, day, yearOptions, onSelect }: IosMonthGridProps) {
  const { t, digits } = useLocale();
  const picker = useBsDateTimePicker({ year, month, day, yearOptions, onSelectDate: onSelect, showTime: false, onDraftDate: onSelect, holidays: true });
  const monthName = picker.monthOptions.find((o) => o.value === picker.draft.month)?.label ?? "";
  const arrow = "inline-flex size-8 items-center justify-center rounded-full hover:bg-background disabled:opacity-30";

  return (
    <div className="flex flex-col gap-1 pb-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 pl-1 text-sm font-semibold">
          {`${monthName} ${digits(picker.draft.year)}`}
          <Icon node={iconChevronRight} size={16} tone="destructive" />
        </span>
        <span className="flex items-center gap-1">
          <button type="button" disabled={picker.prev.disabled} onClick={picker.prev.go} aria-label={picker.prev.label} className={arrow}>
            <Icon node={iconChevronLeft} size={20} />
          </button>
          <button type="button" disabled={picker.next.disabled} onClick={picker.next.go} aria-label={picker.next.label} className={arrow}>
            <Icon node={iconChevronRight} size={20} />
          </button>
        </span>
      </div>
      <div className="grid grid-cols-7 pt-1">
        {picker.weekdays.map((wd) => (
          <span key={wd.label} className="py-1 text-center text-xs font-semibold uppercase text-muted-foreground">
            {wd.label}
          </span>
        ))}
      </div>
      {picker.gridLoading ? (
        <p className="py-16 text-center text-xs text-muted-foreground">{picker.copy.loading}</p>
      ) : (
        <div className="grid grid-cols-7">
          {picker.cells.map((c) =>
            c.day == null ? (
              <span key={c.key} className="h-10" />
            ) : (
              <button key={c.key} type="button" onClick={c.pick} aria-label={c.label} aria-pressed={c.selected} className="flex h-10 items-center justify-center">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full text-base tabular-nums",
                    c.selected
                      ? "bg-secondary font-semibold text-secondary-foreground"
                      : c.holiday
                        ? "bg-destructive/15 font-semibold text-destructive hover:bg-destructive/25"
                        : c.today
                          ? "font-semibold text-secondary ring-1 ring-secondary hover:bg-background"
                          : c.weekend
                            ? "text-destructive/80 hover:bg-background"
                            : "hover:bg-background",
                  )}
                >
                  {c.label}
                </span>
              </button>
            ),
          )}
        </div>
      )}
      <p className="flex items-center gap-2 px-1 pt-1 text-xs text-muted-foreground">
        <span className="size-2.5 rounded-full bg-destructive/30" />
        {t("sections.public_holiday")}
      </p>
    </div>
  );
}
