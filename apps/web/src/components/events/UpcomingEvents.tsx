import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { deleteEvent, listEvents } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";

/** The signed-in user's next events, tasks and appointments, newest first to come, with a delete. */
export function UpcomingEvents() {
  const { t, lang } = useLocale();
  const queryClient = useQueryClient();
  const events = useQuery({
    queryKey: ["events", "upcoming"],
    queryFn: async () => (await listEvents(new Date().toISOString())).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    staleTime: 60_000,
  });
  const remove = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
  const items = (events.data ?? []).slice(0, 8);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">{t("events.upcoming")}</h2>
      {items.length === 0 ? (
        <p className="rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground">{t("events.upcoming_none")}</p>
      ) : (
        <ul className="overflow-hidden rounded-3xl border border-border bg-card">
          {items.map((e) => {
            const kind = e.kind === "task" || e.kind === "reminder" ? "task" : e.kind === "appointment" ? "appointment" : "event";
            return (
              <li key={e.id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`events.kind_${kind}`)} ·{" "}
                    {new Date(e.starts_at).toLocaleString(lang === "en" ? "en-US" : "ne-NP", e.all_day ? { dateStyle: "medium", timeZone: e.timezone } : { dateStyle: "medium", timeStyle: "short", timeZone: e.timezone })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(e.id)}
                  aria-label={t("events.delete")}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
