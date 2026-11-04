import { lazy, Suspense, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Lightbulb, Plus, X } from "lucide-react";
import {
  EVENT_ALERTS,
  EVENT_REPEATS,
  createEvent,
  fetchDayGuidance,
  fetchSaitDetail,
  type CalendarEventInput,
  type DayWindow,
  type EventRepeat,
  type SaitDetailDay,
} from "@vedic-patro/api-client";
import { SAIT_CATEGORIES, SAIT_CATEGORY_LABELS, type SaitCategoryId } from "@vedic-patro/domain/festivals/sait-data";
import { bsFromCivilIso } from "@vedic-patro/domain/calendar/bs-calendar";
import { addMinutes, todayIn, zonedToIso } from "@vedic-patro/domain/calendar/event-time";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useLocale } from "@vedic-patro/i18n/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { listProfiles } from "@/lib/auth/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { importWithRetry } from "@/lib/lazy-route";

const LazyAuthDialog = lazy(() =>
  importWithRetry(() => import("@/components/auth/AuthDialog")).then((m) => ({ default: m.AuthDialog })),
);

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * The header's "+": a new event or reminder, in a popover under the button like Apple Calendar's
 * (the app shows the same form as a sheet). Signed out, it opens sign-in — events live on the account.
 */
export function NewEventButton() {
  const { t } = useLocale();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const label = t("ui.reminders.new_reminder");

  if (!isAuthenticated) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          aria-label={label}
          className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
        >
          <Plus className="size-5" />
        </button>
        {authOpen ? (
          <Suspense fallback={null}>
            <LazyAuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
          </Suspense>
        ) : null}
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
        >
          <Plus className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="max-h-[80vh] w-[380px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-3xl p-0">
        {open ? <EventFormWeb onClose={() => setOpen(false)} /> : null}
      </PopoverContent>
    </Popover>
  );
}

function EventFormWeb({ onClose }: { onClose: () => void }) {
  const { t, lang, digits } = useLocale();
  const queryClient = useQueryClient();
  const { location } = usePanchangaLocation();
  const zone = location.params.timezone ?? "Asia/Kathmandu";
  const today = todayIn(zone);
  const nextHour = addMinutes(`${new Date().getHours()}:00`, 60);

  const [sait, setSait] = useState<SaitCategoryId | null>(null);
  const [saitDay, setSaitDay] = useState<SaitDetailDay | null>(null);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState(nextHour.time);
  const [endDate, setEndDate] = useState(today);
  const [endTime, setEndTime] = useState(addMinutes(nextHour.time, 60).time);
  const [repeat, setRepeat] = useState<EventRepeat>("never");
  const [alert1, setAlert1] = useState<number | null>(null);
  const [alert2, setAlert2] = useState<number | null>(null);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const bsYear = bsFromCivilIso(today).year;
  const saitDays = useQuery({
    queryKey: ["events", "sait-days", sait, bsYear, location.params.lat, location.params.lon],
    enabled: sait != null,
    queryFn: async () => {
      const years = await Promise.all([bsYear, bsYear + 1].map((y) => fetchSaitDetail(y, sait!, location.params).catch(() => null)));
      return years.flatMap((r) => r?.days ?? []).filter((d) => d.gregorian >= today).slice(0, 12);
    },
  });

  const profiles = useQuery({ queryKey: ["events", "profiles"], queryFn: listProfiles, staleTime: 5 * 60_000 });
  const profile = profiles.data?.find((p) => p.is_default) ?? profiles.data?.[0] ?? null;
  const guidance = useQuery({
    queryKey: ["events", "guidance", profile?.id, startDate, zone],
    enabled: profile != null,
    staleTime: 30 * 60_000,
    queryFn: () => fetchDayGuidance(profile!.id, startDate, location.params),
  });
  const day = guidance.data?.days[0] ?? null;
  const clash: DayWindow | null = useMemo(() => {
    if (!day || allDay) return null;
    const at = toMinutes(startTime);
    return day.windows.find((w) => w.kind === "ashubh" && w.end && toMinutes(w.start) <= at && at < toMinutes(w.end)) ?? null;
  }, [day, allDay, startTime]);
  const better = clash && day ? (day.windows.find((w) => w.kind === "shubh" && w.end) ?? null) : null;

  const saitLabel = (id: SaitCategoryId) => (lang === "en" ? SAIT_CATEGORY_LABELS[id].en : SAIT_CATEGORY_LABELS[id].ne);
  const alertLabel = (minutes: number | null) => {
    if (minutes == null) return t("events.alert_none");
    if (minutes === 0) return t("events.alert_at_time");
    if (minutes < 60) return t("events.alert_minutes", { count: digits(minutes) });
    if (minutes === 60) return t("events.alert_hour");
    if (minutes < 1440) return t("events.alert_hours", { count: digits(minutes / 60) });
    if (minutes === 1440) return t("events.alert_day");
    if (minutes === 10080) return t("events.alert_week");
    return t("events.alert_days", { count: digits(minutes / 1440) });
  };
  const bsLabel = (iso: string) => {
    const bs = bsFromCivilIso(iso);
    return `${bs.monthName} ${digits(bs.day)}, ${digits(bs.year)}`;
  };

  const pickSaitDay = (d: SaitDetailDay) => {
    setSaitDay(d);
    setTitle(saitLabel(sait!));
    setAllDay(false);
    setStartDate(d.gregorian);
    setEndDate(d.gregorian);
    setStartTime(d.window_start);
    setEndTime(d.window_end);
  };

  const addInvitee = () => {
    const email = draft.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL.test(email)) return setError(t("events.invitee_bad"));
    setError(null);
    if (!invitees.includes(email)) setInvitees([...invitees, email]);
    setDraft("");
  };

  const startIso = zonedToIso(startDate, allDay ? "00:00" : startTime, zone);
  const endIso = zonedToIso(endDate, allDay ? "23:59" : endTime, zone);

  const save = async () => {
    if (!title.trim()) return setError(t("events.need_title"));
    if (Date.parse(endIso) < Date.parse(startIso)) return setError(t("events.end_before_start"));
    const pending = draft.trim().toLowerCase();
    const input: CalendarEventInput = {
      title: title.trim(),
      location: place.trim() || null,
      notes: notes.trim() || null,
      all_day: allDay,
      starts_at: startIso,
      ends_at: endIso,
      timezone: zone,
      repeat,
      alerts: [alert1, alert2].filter((a): a is number => a != null),
      source_kind: sait ? "sait" : null,
      source_key: sait,
      invitees: pending && EMAIL.test(pending) && !invitees.includes(pending) ? [...invitees, pending] : invitees,
      profile_id: profile?.id ?? null,
    };
    setSaving(true);
    setError(null);
    try {
      await createEvent(input);
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      onClose();
    } catch {
      setError(t("events.save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground";
  const pill = "rounded-full bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-secondary/50";

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onClose} aria-label={t("events.cancel")} className="inline-flex size-10 items-center justify-center rounded-full bg-muted hover:opacity-80">
          <X className="size-5 text-muted-foreground" />
        </button>
        <span className="text-base font-semibold">{t("events.new")}</span>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          aria-label={t("events.save")}
          className={cn("inline-flex size-10 items-center justify-center rounded-full hover:opacity-90", title.trim() ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground")}
        >
          <Check className="size-5" />
        </button>
      </div>
      {error ? <p className="text-center text-xs text-destructive">{error}</p> : null}

      <Group>
        <label className="flex min-h-12 items-center justify-between gap-3">
          <span className="text-sm">{t("events.sait")}</span>
          <select
            value={sait ?? ""}
            onChange={(e) => {
              setSait((e.target.value || null) as SaitCategoryId | null);
              setSaitDay(null);
            }}
            className="max-w-[55%] bg-transparent text-right text-sm text-muted-foreground outline-none"
          >
            <option value="">{t("events.sait_none")}</option>
            {SAIT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{saitLabel(c.id)}</option>
            ))}
          </select>
        </label>
        {sait ? (
          <div className="flex flex-col pb-2">
            {saitDays.isLoading ? (
              <p className="py-2 text-xs text-muted-foreground">{t("events.sait_loading")}</p>
            ) : (saitDays.data ?? []).length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">{t("events.sait_no_days")}</p>
            ) : (
              (saitDays.data ?? []).map((d) => (
                <button key={d.gregorian} type="button" onClick={() => pickSaitDay(d)} className="flex min-h-10 items-center gap-2 text-left text-sm hover:opacity-80">
                  <span className="w-4">{saitDay?.gregorian === d.gregorian ? <Check className="size-4 text-secondary" /> : null}</span>
                  <span className="flex-1">{`${d.bs_month_name_ne} ${digits(d.bs_day)} · ${lang === "en" ? d.weekday_en : d.weekday_ne}`}</span>
                  <span className="text-xs text-muted-foreground">{`${digits(d.window_start)}–${digits(d.window_end)}`}</span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </Group>

      <Group>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("events.title")} className={input} />
        <div className="h-px bg-border" />
        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t("events.location")} className={input} />
      </Group>

      <Group>
        <label className="flex min-h-12 items-center justify-between">
          <span className="text-sm">{t("events.all_day")}</span>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="size-5 accent-secondary" />
        </label>
        <div className="h-px bg-border" />
        <DateTimeRow label={t("events.starts")} bs={bsLabel(startDate)}>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }} className={pill} />
          {allDay ? null : <input type="time" step={300} value={startTime} onChange={(e) => setStartTime(e.target.value)} className={pill} />}
        </DateTimeRow>
        <div className="h-px bg-border" />
        <DateTimeRow label={t("events.ends")} bs={bsLabel(endDate)}>
          <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={pill} />
          {allDay ? null : <input type="time" step={300} value={endTime} onChange={(e) => setEndTime(e.target.value)} className={pill} />}
        </DateTimeRow>
        <div className="h-px bg-border" />
        <SelectRow label={t("events.repeat")} value={repeat} onChange={(v) => setRepeat(v as EventRepeat)} options={EVENT_REPEATS.map((r) => ({ value: r, label: t(`events.repeat_${r}`) }))} />
      </Group>

      <Group>
        <SelectRow
          label={t("events.alert")}
          value={alert1 == null ? "" : String(alert1)}
          onChange={(v) => setAlert1(v === "" ? null : Number(v))}
          options={EVENT_ALERTS.map((a) => ({ value: a == null ? "" : String(a), label: alertLabel(a) }))}
        />
        {alert1 != null ? (
          <>
            <div className="h-px bg-border" />
            <SelectRow
              label={t("events.second_alert")}
              value={alert2 == null ? "" : String(alert2)}
              onChange={(v) => setAlert2(v === "" ? null : Number(v))}
              options={EVENT_ALERTS.map((a) => ({ value: a == null ? "" : String(a), label: alertLabel(a) }))}
            />
          </>
        ) : null}
      </Group>

      <Group>
        <p className="pt-3 text-sm">{t("events.invitees")}</p>
        {invitees.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {invitees.map((email) => (
              <button key={email} type="button" onClick={() => setInvitees(invitees.filter((e) => e !== email))} className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs hover:opacity-80">
                {email}
                <X className="size-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addInvitee();
              }
            }}
            placeholder={t("events.invitee_add")}
            className={input}
          />
          <button type="button" onClick={addInvitee} aria-label={t("events.invitee_add")} className="text-secondary hover:opacity-80">
            <Plus className="size-5" />
          </button>
        </div>
        <p className="pb-3 text-xs text-muted-foreground">{t("events.invitee_hint")}</p>
      </Group>

      <Group>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("events.notes")} rows={3} className={cn(input, "resize-none")} />
      </Group>

      <div className="flex flex-col gap-2 rounded-3xl border border-secondary/30 bg-secondary/5 p-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-secondary">
          <Lightbulb className="size-4" />
          {t("events.tips")}
        </p>
        {saitDay ? (
          <p className="text-xs">
            {t("events.tips_sait_day", {
              tithi: lang === "en" ? saitDay.tithi_en : saitDay.tithi_ne,
              nakshatra: lang === "en" ? saitDay.nakshatra_en : saitDay.nakshatra_ne,
              lagna: lang === "en" ? saitDay.lagna_en : (saitDay.lagna_ne ?? saitDay.lagna_en),
            })}
          </p>
        ) : null}
        {clash ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-destructive/10 p-3">
            <p className="text-xs text-destructive">
              {t("events.tips_bad_window", { name: (lang === "en" ? clash.name_en : clash.name_ne) ?? clash.key, start: digits(clash.start), end: digits(clash.end ?? "") })}
            </p>
            {better ? (
              <button
                type="button"
                onClick={() => {
                  setStartTime(better.start);
                  setEndTime(better.end ?? addMinutes(better.start, 60).time);
                }}
                className="self-start rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:opacity-90"
              >
                {t("events.tips_better", { name: (lang === "en" ? better.name_en : better.name_ne) ?? better.key, start: digits(better.start), end: digits(better.end ?? "") })}
              </button>
            ) : null}
          </div>
        ) : null}
        {day ? (
          <>
            <p className="text-xs">{lang === "en" ? day.summary_en : day.summary_ne}</p>
            <TipList title={t("events.tips_do")} items={(lang === "en" ? day.do_en : day.do_ne).slice(0, 3)} className="text-secondary" />
            <TipList title={t("events.tips_careful")} items={(lang === "en" ? day.careful_en : day.careful_ne).slice(0, 3)} className="text-warning" />
            <TipList title={t("events.tips_avoid")} items={(lang === "en" ? day.dont_en : day.dont_ne).slice(0, 2)} className="text-destructive" />
          </>
        ) : profiles.isSuccess && !profile ? (
          <p className="text-xs text-muted-foreground">{t("events.tips_need_profile")}</p>
        ) : null}
      </div>
    </div>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl bg-muted px-4 dark:bg-foreground/5">{children}</div>;
}

function DateTimeRow({ label, bs, children }: { label: string; bs: string; children: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-2 py-1.5">
      <div className="flex flex-col">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-muted-foreground">{bs}</span>
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function SelectRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-transparent text-right outline-none">
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronsUpDown className="size-4" />
      </span>
    </label>
  );
}

function TipList({ title, items, className }: { title: string; items: string[]; className: string }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <p className={cn("text-xs font-semibold", className)}>{title}</p>
      {items.map((item) => (
        <p key={item} className="text-xs">· {item}</p>
      ))}
    </div>
  );
}
