/**
 * "This year's adhik maas" — one quiet row under the calendar. Clicking it
 * opens which month is adhik, its span, and a jump to that month.
 */

import { ChevronDown, Moon } from "lucide-react";
import { useAdhikMaasNotice } from "@vedic-patro/features/home";
import { cn } from "@vedic-patro/design-tokens/cn";

export function AdhikMaasNotice({
  bsYear,
  onJump,
  className,
}: {
  bsYear: number;
  /** Shows the adhik month's BS month in the calendar; omitted when the calendar can't jump there. */
  onJump?: (year: number, month: number) => void;
  className?: string;
}) {
  const notice = useAdhikMaasNotice(bsYear);
  if (!notice) return null;

  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      <button
        type="button"
        onClick={notice.toggle}
        aria-expanded={notice.open}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
      >
        <Moon className="size-4 shrink-0 text-secondary" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{notice.label}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", notice.open && "rotate-180")}
          aria-hidden
        />
      </button>
      {notice.open ? (
        <div className="border-t border-border px-3 pb-3 pt-2 text-sm">
          <p className="m-0 font-medium text-foreground">{notice.detail}</p>
          <p className="m-0 mt-1 text-xs leading-relaxed text-muted-foreground">{notice.why}</p>
          {onJump ? (
            <button
              type="button"
              onClick={() => onJump(notice.target.year, notice.target.month)}
              className="mt-2 text-xs font-medium text-secondary hover:underline"
            >
              {notice.jumpLabel} →
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
