import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, ChevronsUpDown, Clock, Flag, Globe, Lightbulb, Plus, Repeat, Sparkles, TriangleAlert, X } from "lucide-react";
import {
  EVENT_ALERTS,
  EVENT_PRIORITIES,
  EVENT_REPEATS,
  NEW_EVENT_KINDS,
  createEvent,
  fetchDayGuidance,
  type CalendarEventInput,
  type EventPriority,
  type NewEventKind,
  type EventRepeat,
} from "@vedic-patro/api-client";
import { bsFromCivilIso, bsToAD } from "@vedic-patro/domain/calendar/bs-calendar";
import { addMinutes, shiftDate, todayIn, zonedToIso } from "@vedic-patro/domain/calendar/event-time";
import { useDayTimePicks, useEventLabels, type DayTimePick } from "@vedic-patro/features/events";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useLocale } from "@vedic-patro/i18n/react";
import { IosMonthGrid, TimeWheel } from "@vedic-patro/ui/kit/events";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { listProfiles } from "@/lib/auth/client";
import { uploadGuestEvents } from "@/lib/guest-events";

/** The reminder each type starts with: an event 1 day before, a task at its time, an appointment 30 minutes before. */
const KIND_ALERT: Record<NewEventKind, number> = { event: 1440, task: 0, appointment: 30 };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
type Panel = "pick" | "startDate" | "startTime" | "endDate" | "endTime" | "repeat" | "priority" | null;
/** An all-day reminder's alert rings at 9:00, as Apple Reminders does. */
const ALL_DAY_REMINDER_AT = "09:00";
const pad = (n: number) => String(n).padStart(2, "0");

/** ISO date of a BS day (the pickers speak BS; the event is stored by its Gregorian date). */
function bsIso(y: number, m: number, d: number): string {
  const ad = bsToAD(y, m, d);
  return `${ad.getFullYear()}-${pad(ad.getMonth() + 1)}-${pad(ad.getDate())}`;
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * "Create" on the settings page (signed-in only; the header no longer has a "+"): one card per type —
 * event, task, appointment — and the form in a dialog, the same form the app raises as a sheet
 * (components/events/EventForm.tsx). The tabs at the top of the form switch type after the pick. "Pick a
 * time" from a साइत or the day's शुभ / अशुभ / पुष्कर times; date rows open the month inline, time rows
 * the wheel.
 */
export function CreateEventCards() {
  const { t } = useLocale();
  const [kind, setKind] = useState<NewEventKind | null>(null);
  // Events saved as a guest in this browser (before "+" was for signed-in users) move to the account.
  useEffect(() => {
    void uploadGuestEvents().catch(() => 0);
  }, []);
  const icons = { event: CalendarDays, task: Check, appointment: Clock } as const;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">{t("events.create")}</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        {NEW_EVENT_KINDS.map((k) => {
          const Icon = icons[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className="flex flex-col items-start gap-2 rounded-3xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted"
            >
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <Icon className="size-5" />
              </span>
              <span className="text-base font-medium">{t(`events.kind_${k}`)}</span>
              <span className="text-xs text-muted-foreground">{t(`events.kind_${k}_hint`)}</span>
            </button>
          );
        })}
      </div>
      <Dialog open={kind != null} onOpenChange={(next) => !next && setKind(null)}>
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[90vh] max-w-[420px] gap-0 overflow-y-auto rounded-3xl p-0 [&>button.absolute]:hidden"
        >
          <DialogTitle className="sr-only">{t("events.create")}</DialogTitle>
          {kind != null ? <EventFormWeb initialKind={kind} guest={false} onClose={() => setKind(null)} onSignIn={() => setKind(null)} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function EventFormWeb({ initialKind, guest, onClose, onSignIn }: { initialKind: NewEventKind; guest: boolean; onClose: () => void; onSignIn: () => void }) {
  const { t, lang } = useLocale();
  const queryClient = useQueryClient();
  const { location } = usePanchangaLocation();
  const zone = location.params.timezone ?? "Asia/Kathmandu";
  const today = todayIn(zone);
  const labels = useEventLabels(today);
  const nextHour = addMinutes(`${new Date().getHours()}:00`, 60);
  const firstDate = nextHour.dayShift ? shiftDate(today, nextHour.dayShift) : today;

  const [panel, setPanel] = useState<Panel>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  /** The title a pick wrote; another pick may replace it, a typed one stays. */
  const [autoTitle, setAutoTitle] = useState<string | null>(null);
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  // An event is a date or a span (all-day to start); a task and an appointment sit at a time.
  const [kind, setKind] = useState<NewEventKind>(initialKind);
  const [timeOn, setTimeOn] = useState(initialKind !== "event");
  /** Off: a reminder at one moment. On: an event with an end. */
  const [endOn, setEndOn] = useState(initialKind !== "task");
  const [startDate, setStartDate] = useState(firstDate);
  const [startTime, setStartTime] = useState(nextHour.time);
  const [endDate, setEndDate] = useState(firstDate);
  const [endTime, setEndTime] = useState(addMinutes(nextHour.time, 60).time);
  const [repeat, setRepeat] = useState<EventRepeat>("never");
  const [priority, setPriority] = useState<EventPriority>(0);
  // Rings when due unless changed; a reminder that never rings is no reminder.
  const [alert1, setAlert1] = useState<number | null>(KIND_ALERT[initialKind]);
  const [alert2, setAlert2] = useState<number | null>(null);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  const bsYear = bsFromCivilIso(today).year;
  const years = Array.from({ length: 8 }, (_, i) => bsYear - 1 + i);
  // The day's शुभ and अशुभ times, from its panchanga, as one list in clock order (green and red).
  const dayPicks = useDayTimePicks(startDate, location.params, true);
  const pickList: DayTimePick[] = useMemo(
    () => [...dayPicks.picks.shubh, ...dayPicks.picks.ashubh].sort((a, b) => `${a.startDate}T${a.startTime}`.localeCompare(`${b.startDate}T${b.startTime}`)),
    [dayPicks.picks],
  );
  const picked = pickList.find((p) => p.id === pickedId) ?? null;

  // Invitations and profile tips need an account; a guest's event is kept in this browser.
  const profiles = useQuery({ queryKey: ["events", "profiles"], queryFn: listProfiles, enabled: !guest, staleTime: 5 * 60_000 });
  const profile = guest ? null : profiles.data?.find((p) => p.is_default) ?? profiles.data?.[0] ?? null;
  const guidance = useQuery({
    queryKey: ["events", "guidance", profile?.id, startDate, zone],
    enabled: profile != null,
    staleTime: 30 * 60_000,
    queryFn: () => fetchDayGuidance(profile!.id, startDate, location.params),
  });
  const day = guidance.data?.days[0] ?? null;
  // A time typed in by hand that lands in an अशुभ window gets a warning (not when the user picked that window).
  const clash: DayTimePick | null = useMemo(() => {
    if (!timeOn || picked?.source === "ashubh") return null;
    const at = `${startDate}T${startTime}`;
    return dayPicks.picks.ashubh.find((w) => `${w.startDate}T${w.startTime}` <= at && at < `${w.endDate}T${w.endTime}`) ?? null;
  }, [dayPicks.picks.ashubh, timeOn, picked, startDate, startTime]);
  // The next शुभ window after the typed time, else the day's first.
  const better: DayTimePick | null = useMemo(() => {
    if (!clash) return null;
    const at = `${startDate}T${startTime}`;
    const good = dayPicks.picks.shubh;
    return good.find((w) => `${w.startDate}T${w.startTime}` > at) ?? good[0] ?? null;
  }, [clash, dayPicks.picks.shubh, startDate, startTime]);

  const setStart = (date: string) => {
    setStartDate(date);
    if (endDate < date) setEndDate(date);
  };

  /** A pick fills the title (unless one was typed) and the times; a window gets its end, a moment none. */
  const apply = (name: string, sd: string, st: string, ed: string, et: string, withEnd: boolean) => {
    if (!title.trim() || title === autoTitle) {
      setTitle(name);
      setAutoTitle(name);
    }
    setTimeOn(true);
    setEndOn(withEnd);
    setStartDate(sd);
    setStartTime(st);
    setEndDate(ed);
    setEndTime(et);
    setPanel(null);
  };

  const pickName = (p: DayTimePick) => {
    const name = lang === "en" ? p.nameEn : p.nameNe;
    if (p.source === "ashubh") return t("events.pick_ashubh_title", { name });
    return name;
  };

  const pickDayTime = (p: DayTimePick) => {
    setPickedId(p.id);
    apply(pickName(p), p.startDate, p.startTime, p.endDate, p.endTime, true);
    // A bad time is worth knowing when it begins.
    if (p.source === "ashubh" && alert1 == null) setAlert1(0);
  };

  const addInvitee = () => {
    const email = draft.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL.test(email)) return setError(t("events.invitee_bad"));
    setError(null);
    if (!invitees.includes(email)) setInvitees([...invitees, email]);
    setDraft("");
  };

  // No end: one moment (a whole day rings at 9:00, as Apple Reminders). With an end: start to end,
  // a whole day from midnight to 23:59.
  const startIso = zonedToIso(startDate, timeOn ? startTime : endOn ? "00:00" : ALL_DAY_REMINDER_AT, zone);
  const endIso = endOn ? zonedToIso(endDate, timeOn ? endTime : "23:59", zone) : timeOn ? startIso : zonedToIso(startDate, "23:59", zone);

  const save = async () => {
    if (!title.trim()) return setError(t("events.need_title"));
    if (Date.parse(endIso) < Date.parse(startIso)) return setError(t("events.end_before_start"));
    const pending = draft.trim().toLowerCase();
    const dayPick = picked;
    const input: CalendarEventInput = {
      kind,
      priority,
      title: title.trim(),
      location: place.trim() || null,
      notes: notes.trim() || null,
      all_day: !timeOn,
      starts_at: startIso,
      ends_at: endIso,
      timezone: zone,
      repeat,
      alerts: [alert1, alert2].filter((a): a is number => a != null),
      source_kind: dayPick ? dayPick.source : null,
      source_key: dayPick ? dayPick.key.slice(0, 64) : null,
      invitees: guest ? [] : pending && EMAIL.test(pending) && !invitees.includes(pending) ? [...invitees, pending] : invitees,
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
  // Switching the tab re-seeds what differs per type: an event is all-day with an end, a task one moment, an appointment a timed span; their default alerts are 1 day, at the time and 30 minutes before.
  const changeKind = (next: NewEventKind) => {
    setKind(next);
    setTimeOn(next !== "event");
    setEndOn(next !== "task");
    setAlert1(KIND_ALERT[next]);
  };
  const bsStart = bsFromCivilIso(startDate);
  const bsEnd = bsFromCivilIso(endDate);

  const startGrid = <IosMonthGrid year={bsStart.year} month={bsStart.month} day={bsStart.day} yearOptions={years} onSelect={(y, m, d) => setStart(bsIso(y, m, d))} />;
  const startWheel = (
    <>
      <TimeWheel
        value={startTime}
        onChange={(v) => {
          const length = toMinutes(endTime) - toMinutes(startTime);
          setStartTime(v);
          if (endDate === startDate) setEndTime(addMinutes(v, Math.max(length, 0)).time);
        }}
      />
      <Divider />
      <div className="flex min-h-12 items-center justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-3">
          <Globe className="size-5 text-muted-foreground" />
          {t("events.time_zone")}
        </span>
        <span className="text-muted-foreground">{labels.zone(zone)}</span>
      </div>
    </>
  );
  const repeatRow = (
    <>
      <button type="button" onClick={() => toggle("repeat")} aria-expanded={panel === "repeat"} className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm hover:opacity-80">
        <span className="inline-flex items-center gap-3">
          <Repeat className="size-5 text-muted-foreground" />
          {t("events.repeat")}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          {t(`events.repeat_${repeat}`)}
          <ChevronsUpDown className="size-4" />
        </span>
      </button>
      {panel === "repeat" ? (
        <div className="pb-2">
          {EVENT_REPEATS.map((r, i) => (
            <div key={r}>
              {i === 1 ? <Divider /> : null}
              <Option label={t(`events.repeat_${r}`)} active={repeat === r} onClick={() => { setRepeat(r); setPanel(null); }} />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onClose} aria-label={t("events.cancel")} className="inline-flex size-10 items-center justify-center rounded-full bg-muted hover:opacity-80">
          <X className="size-5 text-muted-foreground" />
        </button>
        <span className="text-base font-semibold">{t(`events.new_${kind}`)}</span>
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

      {/* The three types, always in view with the current one lit; each switch re-seeds the defaults. */}
      <div role="tablist" aria-label={t("events.create")} className="relative grid grid-cols-3 rounded-full bg-muted p-1 dark:bg-foreground/10">
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-card shadow-sm transition-transform duration-200 ease-out"
          style={{ transform: `translateX(${NEW_EVENT_KINDS.indexOf(kind) * 100}%)` }}
        />
        {NEW_EVENT_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => changeKind(k)}
            className={cn("relative z-10 rounded-full py-2 text-sm font-medium transition-colors", kind === k ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {t(`events.kind_${k}`)}
          </button>
        ))}
      </div>

      {error ? <p className="text-center text-xs text-destructive">{error}</p> : null}

      {/* Optional: one dropdown of the day's times, शुभ in green and अशुभ in red; picking fills the title and times. */}
      <Group>
        <button type="button" onClick={() => toggle("pick")} aria-expanded={panel === "pick"} className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm hover:opacity-80">
          <span className="inline-flex items-center gap-3">
            <Sparkles className="size-5 text-muted-foreground" />
            {t("events.pick_shubh_ashubh")}
          </span>
          <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
            {picked ? (
              <>
                <span className={cn("size-2 shrink-0 rounded-full", picked.source === "ashubh" ? "bg-destructive" : "bg-success")} />
                <span className={cn("truncate", picked.source === "ashubh" ? "text-destructive" : "text-success")}>{lang === "en" ? picked.nameEn : picked.nameNe}</span>
              </>
            ) : (
              t("events.pick_none")
            )}
            <ChevronsUpDown className="size-4 shrink-0" />
          </span>
        </button>
        {panel === "pick" ? (
          <div className="flex flex-col pb-2">
            <p className="pb-1 text-xs text-muted-foreground">{t("events.pick_for_day", { date: labels.day(startDate) })}</p>
            <Option label={t("events.pick_none")} active={picked == null} onClick={() => { setPickedId(null); setPanel(null); }} />
            {dayPicks.loading ? (
              <p className="py-2 text-xs text-muted-foreground">{t("events.pick_loading")}</p>
            ) : dayPicks.failed ? (
              <p className="py-2 text-xs text-muted-foreground">{t("events.pick_failed")}</p>
            ) : pickList.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">{t("events.pick_empty")}</p>
            ) : (
              pickList.map((p) => (
                <Option
                  key={p.id}
                  label={lang === "en" ? p.nameEn : p.nameNe}
                  detail={`${labels.clock(p.startTime)}–${labels.clock(p.endTime)}${p.startDate !== startDate ? ` · ${labels.day(p.startDate)}` : ""}`}
                  active={pickedId === p.id}
                  tone={p.source === "ashubh" ? "bad" : "good"}
                  onClick={() => pickDayTime(p)}
                />
              ))
            )}
          </div>
        ) : null}
      </Group>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("events.title")}
        aria-label={t("events.title")}
        className="w-full border-b-2 border-secondary bg-transparent px-1 pb-2 pt-1 text-2xl font-semibold outline-none placeholder:text-muted-foreground/70"
      />
      {kind !== "task" ? (
        <Group>
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t("events.location")} aria-label={t("events.location")} className={input} />
        </Group>
      ) : null}

      {/* Apple's rows: the date opens the month; time and end have their switches. No end = a reminder. */}
      <Group>
        <IconRow icon={CalendarDays} label={t("events.date")} value={labels.day(startDate)} open={panel === "startDate"} onClick={() => toggle("startDate")} />
        {panel === "startDate" ? <><Divider />{startGrid}</> : null}
        <Divider />
        <IconRow
          icon={Clock}
          label={t("events.time")}
          value={timeOn ? labels.clock(startTime) : t("events.all_day")}
          open={panel === "startTime"}
          onClick={timeOn ? () => toggle("startTime") : undefined}
          right={
            <Toggle
              label={t("events.time")}
              on={timeOn}
              onChange={(on) => {
                setTimeOn(on);
                setPanel(on ? "startTime" : null);
              }}
            />
          }
        />
        {timeOn && panel === "startTime" ? <><Divider />{startWheel}</> : null}
        <Divider />
        <IconRow
          icon={Flag}
          label={t("events.ends")}
          value={endOn ? `${labels.day(endDate)}${timeOn ? ` · ${labels.clock(endTime)}` : ""}` : null}
          open={panel === "endDate"}
          onClick={endOn ? () => toggle("endDate") : undefined}
          right={
            <Toggle
              label={t("events.ends")}
              on={endOn}
              onChange={(on) => {
                setEndOn(on);
                if (on) {
                  // An end an hour on, as Calendar starts one.
                  if (endDate < startDate || (endDate === startDate && toMinutes(endTime) <= toMinutes(startTime))) {
                    const next = addMinutes(startTime, 60);
                    setEndDate(next.dayShift ? shiftDate(startDate, next.dayShift) : startDate);
                    setEndTime(next.time);
                  }
                  setPanel("endDate");
                } else setPanel(null);
              }}
            />
          }
        />
        {endOn && panel === "endDate" ? (
          <>
            <Divider />
            <IosMonthGrid year={bsEnd.year} month={bsEnd.month} day={bsEnd.day} yearOptions={years} onSelect={(y, m, d) => setEndDate(bsIso(y, m, d))} />
            {timeOn ? <><Divider /><TimeWheel value={endTime} onChange={setEndTime} /></> : null}
          </>
        ) : null}
      </Group>

      {/* A typed time that falls in an अशुभ window: say so, and offer the next शुभ one. */}
      {clash ? (
        <div role="alert" className="flex flex-col gap-2 rounded-3xl border border-destructive/40 bg-destructive/10 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-destructive">
            <TriangleAlert className="size-4" />
            {t("events.bad_time_alert")}
          </p>
          <p className="text-xs text-destructive">
            {t("events.tips_bad_window", { name: lang === "en" ? clash.nameEn : clash.nameNe, start: labels.clock(clash.startTime), end: labels.clock(clash.endTime) })}
          </p>
          {better ? (
            <button
              type="button"
              onClick={() => {
                setStartDate(better.startDate);
                setStartTime(better.startTime);
                setEndDate(better.endDate);
                setEndTime(better.endTime);
              }}
              className="self-start rounded-full bg-success px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              {t("events.tips_better", { name: lang === "en" ? better.nameEn : better.nameNe, start: labels.clock(better.startTime), end: labels.clock(better.endTime) })}
            </button>
          ) : null}
        </div>
      ) : null}

      <Group>{repeatRow}</Group>

      <Group>
        <SelectRow
          label={t("events.alert")}
          value={alert1 == null ? "" : String(alert1)}
          onChange={(v) => setAlert1(v === "" ? null : Number(v))}
          options={EVENT_ALERTS.map((a) => ({ value: a == null ? "" : String(a), label: labels.alert(a) }))}
        />
        {alert1 != null ? (
          <>
            <Divider />
            <SelectRow
              label={t("events.second_alert")}
              value={alert2 == null ? "" : String(alert2)}
              onChange={(v) => setAlert2(v === "" ? null : Number(v))}
              options={EVENT_ALERTS.map((a) => ({ value: a == null ? "" : String(a), label: labels.alert(a) }))}
            />
          </>
        ) : null}
        <Divider />
        <button type="button" onClick={() => toggle("priority")} aria-expanded={panel === "priority"} className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm hover:opacity-80">
          <span className="inline-flex items-center gap-3">
            <span className="w-5 text-center font-bold text-muted-foreground">!!!</span>
            {t("events.priority")}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            {t(`events.priority_${priority}`)}
            <ChevronsUpDown className="size-4" />
          </span>
        </button>
        {panel === "priority"
          ? EVENT_PRIORITIES.map((p) => (
              <Option key={p} label={t(`events.priority_${p}`)} active={priority === p} onClick={() => { setPriority(p); setPanel(null); }} />
            ))
          : null}
      </Group>

      {kind === "task" ? null : guest ? (
        <Group>
          <button type="button" onClick={onSignIn} className="flex min-h-12 w-full items-center justify-between gap-3 text-left hover:opacity-80">
            <span className="text-sm">{t("events.invitees")}</span>
            <span className="text-sm text-secondary">{t("events.invitee_guest")}</span>
          </button>
          <p className="pb-3 text-xs text-muted-foreground">{t("events.guest_note_web")}</p>
        </Group>
      ) : (
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
      )}

      <Group>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("events.notes")} rows={3} className={cn(input, "resize-none")} />
      </Group>

      <div className="flex flex-col gap-2 rounded-3xl border border-secondary/30 bg-secondary/5 p-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-secondary">
          <Lightbulb className="size-4" />
          {t("events.tips")}
        </p>
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

function Divider() {
  return <div className="h-px bg-border" />;
}

/** Apple's switch: green when on. */
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors", on ? "bg-success" : "bg-foreground/15")}
    >
      <span className={cn("absolute top-0.5 size-[27px] rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

/** Apple Reminders' row: an icon, the label with its value under it in red ("Today", "1:00 pm"), and a switch. */
function IconRow({
  icon: Icon,
  label,
  value,
  open,
  onClick,
  right,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  open: boolean;
  onClick?: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3">
      <button type="button" onClick={onClick} disabled={!onClick} aria-expanded={open} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left enabled:hover:opacity-80">
        <Icon className="size-5 shrink-0 text-muted-foreground" />
        <span className="flex min-w-0 flex-col">
          <span className="text-sm">{label}</span>
          {value ? <span className="truncate text-xs text-destructive">{value}</span> : null}
        </span>
      </button>
      {right}
    </div>
  );
}

function Option({ label, detail, active, tone, onClick }: { label: string; detail?: string; active: boolean; tone?: "good" | "bad"; onClick: () => void }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={active} onClick={onClick} className="flex min-h-10 w-full items-center gap-2 text-left text-sm hover:opacity-80">
      <span className="w-4">{active ? <Check className="size-4" /> : null}</span>
      {tone ? <span className={cn("size-2 rounded-full", tone === "bad" ? "bg-destructive" : "bg-success")} /> : null}
      <span className="flex-1">{label}</span>
      {detail ? <span className="text-xs text-muted-foreground">{detail}</span> : null}
    </button>
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
