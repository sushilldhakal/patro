/**
 * "This year's adhik maas" — one quiet row under the calendar. Clicking it
 * opens which month is adhik and its span, with a link to the adhik maas page.
 */

import { Link } from "@tanstack/react-router";
import { ChevronDown, Moon } from "lucide-react";
import { useAdhikMaasNotice } from "@vedic-patro/features/home";
import { cn } from "@vedic-patro/design-tokens/cn";
import { buildPageSearch, getLanguageForEra } from "@vedic-patro/domain/calendar/era";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { locationToSearch } from "@/lib/url-state";

export function AdhikMaasNotice({ bsYear, location, className }: { bsYear: number; location: PanchangaLocation; className?: string }) {
  const notice = useAdhikMaasNotice(bsYear);
  if (!notice) return null;
  const search = {
    ...locationToSearch(location),
    ...buildPageSearch({ era: "bs", language: getLanguageForEra("bs"), year: notice.year }),
  };

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
          <Link
            to="/adhik-maas"
            search={search as never}
            className="mt-2 inline-block text-xs font-medium text-secondary no-underline hover:underline"
          >
            {notice.moreLabel} →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
