import { useLocale } from "@vedic-patro/i18n/react";
import type { DayEventsProps } from "../contract";
import { eventKindOf, eventTimeText } from "../event-text";

const DOT = { event: "bg-primary", task: "bg-success", appointment: "bg-warning" } as const;

/** The signed-in user's events, tasks and appointments on one day, with their time, place and notes. */
export function DayEvents({ events }: DayEventsProps) {
  const { t, lang } = useLocale();
  if (events.length === 0) return null;
  return (
    <section className="mb-4 flex flex-col gap-2">
      <h4 className="text-sm font-bold">{t("events.on_this_day")}</h4>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {events.map((e) => {
          const kind = eventKindOf(e);
          return (
            <li key={e.id} className="flex gap-3 rounded-2xl bg-muted p-3 dark:bg-foreground/5">
              <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT[kind]}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-semibold">{e.title}</p>
                <p className="m-0 text-xs text-muted-foreground">
                  {t(`events.kind_${kind}`)} · {eventTimeText(e, lang, t("events.all_day_short"))}
                </p>
                {e.location ? <p className="m-0 truncate text-xs text-muted-foreground">{e.location}</p> : null}
                {e.notes ? <p className="m-0 line-clamp-2 text-xs">{e.notes}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
