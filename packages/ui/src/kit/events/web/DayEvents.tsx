import { useLocale } from "@vedic-patro/i18n/react";
import type { DayEventsProps } from "../contract";

/** The signed-in user's events, tasks and appointments on one day, for the day's detail. */
export function DayEvents({ events }: DayEventsProps) {
  const { t, lang } = useLocale();
  if (events.length === 0) return null;
  return (
    <>
      <h4 className="mb-2 text-sm font-bold">{t("events.on_this_day")}</h4>
      <ul className="m-0 mb-4 list-none p-0">
        {events.map((e) => {
          const kind = e.kind === "task" || e.kind === "reminder" ? "task" : e.kind === "appointment" ? "appointment" : "event";
          const time = e.all_day
            ? t("events.all_day_short")
            : new Date(e.starts_at).toLocaleTimeString(lang === "en" ? "en-US" : "ne-NP", { hour: "numeric", minute: "2-digit", timeZone: e.timezone });
          return (
            <li key={e.id} className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0">
              <span className="min-w-0 truncate font-medium">{e.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t(`events.kind_${kind}`)} · {time}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
