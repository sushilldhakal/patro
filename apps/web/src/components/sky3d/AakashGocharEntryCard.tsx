/**
 * The way into the 3D sky from the home page — a single compact row above the
 * calendar, matching where the mobile app puts it.
 */

import { Link } from "@tanstack/react-router";
import { ChevronRight, Orbit } from "lucide-react";
import { useLocale } from "@/i18n/locale";
import { cn } from "@vedic-patro/domain/utils";

import { tFor } from "@vedic-patro/i18n/runtime";
export function AakashGocharEntryCard({ className }: { className?: string }) {
  const { lang } = useLocale();

  return (
    <Link
      to="/aakash-gochar"
      className={cn(
        "group flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 transition-[border-color,box-shadow] hover:border-secondary/40 hover:shadow-sm",
        className,
      )}
    >
      <Orbit className="size-5 shrink-0 text-secondary" strokeWidth={1.75} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {tFor(lang, "sidebar_nav.items.aakash-gochar.label")}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {tFor(lang, "ui.home.geocentric")}
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
