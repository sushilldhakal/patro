import { Link } from "@tanstack/react-router";
import { AlertCircle, CalendarDays, ChevronRight, Orbit, User } from "lucide-react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { calendarClasses as cal } from "@vedic-patro/design-tokens/classes/calendar-classes";
import { personalDayCopy, usePlannerText, type PersonalColumn } from "@vedic-patro/features/events";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const TONE_BAR = { best: "bg-success", good: "bg-success", neutral: "bg-muted-foreground", bad: "bg-warning", worst: "bg-danger" } as const;
const TONE_INK = { best: "text-success", good: "text-success", neutral: "text-muted-foreground", bad: "text-warning", worst: "text-danger" } as const;
const TONE_CHIP = { best: "bg-success/10", good: "bg-success/10", neutral: "bg-muted", bad: "bg-warning/15", worst: "bg-danger/10" } as const;

/**
 * The day's personal reading, drawn as the app's sheet (EventDetailSheet, "personal"): the tone and its
 * strongest reason, "तपाईंको दिन · 65%", a card with the date, the profile, the dasha and its notes, then the
 * reading, the life areas, the planets in transit and the general do / don't / careful. A sheet from the
 * bottom on a phone, a dialog in the middle on a wider screen.
 */
export function PersonalReadingDialog({ detail, onClose }: { detail: { date: string; column: PersonalColumn } | null; onClose: () => void }) {
  const tx = usePlannerText();
  const copy = detail ? personalDayCopy(detail.column, tx) : null;
  const reading = copy?.reading ?? null;
  return (
    <Dialog open={detail != null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className={cal.readingSheet}>
        {detail && copy ? (
          <div className="flex flex-col gap-4">
            <div className={cal.readingHead}>
              <span className={cn(cal.readingBar, TONE_BAR[copy.tone])} />
              <div className="min-w-0">
                <DialogTitle className={cal.readingTitle}>{copy.reason ? `${copy.toneLabel} · ${copy.reason}` : copy.toneLabel}</DialogTitle>
                <span className={cn(cal.readingKind, TONE_CHIP[copy.tone], TONE_INK[copy.tone])}>
                  {reading?.percent ? `${copy.heading} · ${reading.percent}` : copy.heading}
                </span>
              </div>
            </div>

            <div className={cal.readingGroup}>
              <div className={cal.readingRow}>
                <CalendarDays className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="flex flex-col">
                  <span>{tx.dayHeading(detail.date)}</span>
                  <span className="text-sm text-muted-foreground">{tx.adShort(detail.date)}</span>
                </div>
              </div>
              <div className={cal.readingRow}>
                <User className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <span>{copy.profileName}</span>
              </div>
              {reading?.dasha ? (
                <div className={cal.readingRow}>
                  <Orbit className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <span>{reading.dasha}</span>
                </div>
              ) : null}
              {copy.notes.map((note) => (
                <div key={note} className={cal.readingRow}>
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <span>{note}</span>
                </div>
              ))}
            </div>

            {reading?.paragraph ? (
              <div className={cal.readingGroup}>
                <p className={cal.readingLabel}>{reading.heading}</p>
                <p className={cal.readingParagraph}>{reading.paragraph}</p>
              </div>
            ) : null}

            {reading && reading.areas.length > 0 ? (
              <div className={cn(cal.readingGroup, "gap-3")}>
                <p className={cal.readingLabel}>{reading.areasHeading}</p>
                {reading.areas.map((area) => (
                  <div key={area.key} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-base">{area.label}</span>
                      <span className={cn("text-sm font-semibold tabular-nums", TONE_INK[area.tone])}>{area.percentText}</span>
                    </div>
                    <div className={cal.readingTrack}>
                      <div className={cn("h-full rounded-full", TONE_BAR[area.tone])} style={{ width: `${Math.max(4, Math.min(100, area.percent))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {reading && reading.gochar.length > 0 ? (
              <div className={cal.readingGroup}>
                <p className={cal.readingLabel}>{reading.gocharHeading}</p>
                {reading.gochar.map((g) => (
                  <div key={g.key} className="flex items-center gap-2.5 py-0.5">
                    <span className={cn("size-2 shrink-0 rounded-full", g.favourable ? "bg-success" : "bg-danger")} />
                    <span className="w-20 shrink-0 text-base font-medium">{g.graha}</span>
                    <span className="min-w-0 text-sm text-muted-foreground">{g.where}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {copy.sections.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className={cn(cal.readingLabel, "px-1")}>{copy.generalHeading}</p>
                {copy.sections.map((section) => (
                  <div key={section.label} className={cal.readingGroup}>
                    <p className={cal.readingLabel}>{section.label}</p>
                    {section.lines.map((line) => (
                      <div key={line} className="flex gap-2 text-base">
                        <span className="text-muted-foreground">•</span>
                        <span className="min-w-0">{line}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}

            <Link to="/jyotish/rashifal" onClick={onClose} className={cal.readingLink}>
              {copy.viewRashifal}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
