import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, ChevronLeft, ChevronRight, ChevronsUpDown, Clock, Flag, Globe, Lightbulb, Plus, Repeat, X } from "lucide-react";
import {
  EVENT_ALERTS,
  EVENT_PRIORITIES,
  EVENT_REPEATS,
  NEW_EVENT_KINDS,
  createEvent,
  fetchDayGuidance,
  fetchSaitDetail,
  type CalendarEventInput,
  type DayWindow,
  type EventPriority,
  type NewEventKind,
  type EventRepeat,
  type SaitDetailDay,
} from "@vedic-patro/api-client";
import { SAIT_CATEGORIES, SAIT_CATEGORY_LABELS, type SaitCategoryId } from "@vedic-patro/domain/festivals/sait-data";
import { bsFromCivilIso, bsToAD } from "@vedic-patro/domain/calendar/bs-calendar";
import { addMinutes, shiftDate, todayIn, zonedToIso } from "@vedic-patro/domain/calendar/event-time";
import { useDayTimePicks, useEventLabels, type DayTimePick } from "@vedic-patro/features/events";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useLocale } from "@vedic-patro/i18n/react";
import { IosMonthGrid, TimeWheel } from "@vedic-patro/ui/kit/events";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { listProfiles } from "@/lib/auth/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { importWithRetry } from "@/lib/lazy-route";
import { uploadGuestEvents } from "@/lib/guest-events";

const LazyAuthDialog = lazy(() =>
  importWithRetry(() => import("@/components/auth/AuthDialog")).then((m) => ({ default: m.AuthDialog })),
);

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
type Panel = "startDate" | "startTime" | "endDate" | "endTime" | "repeat" | "priority" | null;
/** Where the time comes from: typed in, or one of the day's / a ceremony's times. */
type PickSource = "none" | "sait" | "shubh" | "ashubh" | "pushkara";
const PICK_SOURCES: PickSource[] = ["none", "sait", "shubh", "ashubh", "pushkara"];
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
 * The header's "+": a new event or reminder, in a popover under the button like Apple Calendar's
 * (the app shows the same form as a sheet, components/events/EventForm.tsx): one form for both —
 * without an end it is a reminder at one moment, with the End switch on an event. "Pick a time" from
 * a साइत or the day's शुभ / अशुभ / पुष्कर times; date rows open the month inline, time rows the wheel. Signed out, the same form saves to this browser
 * (lib/guest-events.ts); on sign-in those events move to the account.
 */
export function NewEventButton() {
  const { t } = useLocale();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  /** The "+" first lists what can be made; the form follows the pick. */
  const [kind, setKind] = useState<NewEventKind | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const label = t("events.create");

  // Just signed in: events saved as a guest in this browser move to the account.
  useEffect(() => {
    if (isAuthenticated) void uploadGuestEvents().catch(() => 0);
  }, [isAuthenticated]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setKind(null);
      }}
    >
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
        {open && kind == null ? (
          <div role="menu" className="flex flex-col gap-1 p-2">
            {NEW_EVENT_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="menuitem"
                onClick={() => setKind(k)}
                className="flex flex-col items-start rounded-2xl px-4 py-3 text-left transition-colors hover:bg-muted"
              >
                <span className="text-base font-medium">{t(`events.kind_${k}`)}</span>
                <span className="text-sm text-muted-foreground">{t(`events.kind_${k}_hint`)}</span>
              </button>
            ))}
          </div>
        ) : null}
        {open && kind != null ? (
          <EventFormWeb
            kind={kind}
            guest={!isAuthenticated}
            onClose={() => {
              setOpen(false);
              setKind(null);
            }}
            onSignIn={() => {
              setOpen(false);
              setKind(null);
              setAuthOpen(true);
            }}
          />
        ) : null}
      </PopoverContent>
      {authOpen ? (
        <Suspense fallback={null}>
          <LazyAuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
        </Suspense>
      ) : null}
    </Popover>
  );
}

function EventFormWeb({ kind, guest, onClose, onSignIn }: { kind: NewEventKind; guest: boolean; onClose: () => void; onSignIn: () => void }) {
  const { t, lang, digits } = useLocale();
  const queryClient = useQueryClient();
  const { location } = usePanchangaLocation();
  const zone = location.params.timezone ?? "Asia/Kathmandu";
  const today = todayIn(zone);
  const labels = useEventLabels(today);
  const nextHour = addMinutes(`${new Date().getHours()}:00`, 60);
  const firstDate = nextHour.dayShift ? shiftDate(today, nextHour.dayShift) : today;

  const [panel, setPanel] = useState<Panel>(null);
  const [pickSource, setPickSource] = useState<PickSource>("none");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [sait, setSait] = useState<SaitCategoryId | null>(null);
  const [saitDay, setSaitDay] = useState<SaitDetailDay | null>(null);
  const [title, setTitle] = useState("");
  /** The title a pick wrote; another pick may replace it, a typed one stays. */
  const [autoTitle, setAutoTitle] = useState<string | null>(null);
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  // An event is a date or a span (all-day to start); a task and an appointment sit at a time.
  const [timeOn, setTimeOn] = useState(kind !== "event");
  /** Off: a reminder at one moment. On: an event with an end. */
  const [endOn, setEndOn] = useState(kind !== "task");
  const [startDate, setStartDate] = useState(firstDate);
  const [startTime, setStartTime] = useState(nextHour.time);
  const [endDate, setEndDate] = useState(firstDate);
  const [endTime, setEndTime] = useState(addMinutes(nextHour.time, 60).time);
  /** Whose शुभ / अशुभ / पुष्कर list is shown; follows the start date the user picks. */
  const [pickDate, setPickDate] = useState(firstDate);
  const [repeat, setRepeat] = useState<EventRepeat>("never");
  const [priority, setPriority] = useState<EventPriority>(0);
  // Rings when due unless changed; a reminder that never rings is no reminder.
  const [alert1, setAlert1] = useState<number | null>(kind === "event" ? 1440 : kind === "appointment" ? 30 : 0);
  const [alert2, setAlert2] = useState<number | null>(null);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  const bsYear = bsFromCivilIso(today).year;
  const years = Array.from({ length: 8 }, (_, i) => bsYear - 1 + i);
  const saitDays = useQuery({
    queryKey: ["events", "sait-days", sait, bsYear, location.params.lat, location.params.lon],
    enabled: sait != null,
    queryFn: async () => {
      const years = await Promise.all([bsYear, bsYear + 1].map((y) => fetchSaitDetail(y, sait!, location.params).catch(() => null)));
      return years.flatMap((r) => r?.days ?? []).filter((d) => d.gregorian >= today).slice(0, 12);
    },
  });

  // The day's शुभ / अशुभ / पुष्कर times, from its panchanga.
  const dayPicks = useDayTimePicks(pickDate, location.params, pickSource === "shubh" || pickSource === "ashubh" || pickSource === "pushkara");
  const pickList: DayTimePick[] =
    pickSource === "shubh" ? dayPicks.picks.shubh : pickSource === "ashubh" ? dayPicks.picks.ashubh : pickSource === "pushkara" ? dayPicks.picks.pushkara : [];

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
  // Only warn about an अशुभ window the user did not choose on purpose.
  const clash: DayWindow | null = useMemo(() => {
    if (!day || !timeOn || pickSource === "ashubh") return null;
    const at = toMinutes(startTime);
    return day.windows.find((w) => w.kind === "ashubh" && w.end && toMinutes(w.start) <= at && at < toMinutes(w.end)) ?? null;
  }, [day, timeOn, startTime, pickSource]);
  const better = clash && day ? (day.windows.find((w) => w.kind === "shubh" && w.end) ?? null) : null;

  const saitLabel = (id: SaitCategoryId) => (lang === "en" ? SAIT_CATEGORY_LABELS[id].en : SAIT_CATEGORY_LABELS[id].ne);

  const setStart = (date: string) => {
    setStartDate(date);
    setPickDate(date);
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

  const pickSaitDay = (d: SaitDetailDay) => {
    setSaitDay(d);
    setPickedId(`sait:${d.gregorian}`);
    setPickDate(d.gregorian);
    apply(saitLabel(sait!), d.gregorian, d.window_start, d.gregorian, d.window_end, true);
  };

  const pickName = (p: DayTimePick) => {
    const name = lang === "en" ? p.nameEn : p.nameNe;
    if (p.source === "pushkara") return t("events.pick_pushkara_name", { lagna: name });
    if (p.source === "ashubh") return t("events.pick_ashubh_title", { name });
    return name;
  };

  const pickDayTime = (p: DayTimePick) => {
    setPickedId(p.id);
    // A पुष्कर नवांश is a moment to begin at; the शुभ / अशुभ windows run to their end.
    apply(pickName(p), p.startDate, p.startTime, p.endDate, p.endTime, p.source !== "pushkara");
    // A bad time is worth knowing when it begins.
    if (p.source === "ashubh" && alert1 == null) setAlert1(0);
  };

  const choosePickSource = (s: PickSource) => {
    setPickSource(s);
    setPickedId(null);
    if (s !== "sait") {
      setSait(null);
      setSaitDay(null);
    }
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
    const dayPick = pickSource === "none" || pickSource === "sait" ? null : pickList.find((p) => p.id === pickedId) ?? null;
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
      source_kind: pickSource === "sait" && sait ? "sait" : dayPick ? dayPick.source : null,
      source_key: pickSource === "sait" && sait ? sait : dayPick ? dayPick.key.slice(0, 64) : null,
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

      {error ? <p className="text-center text-xs text-destructive">{error}</p> : null}

      {/* Optional: the time from a साइत, or the day's शुभ / अशुभ / पुष्कर times. */}
      <Group>
        <p className="pt-3 text-sm">{t("events.pick")}</p>
        <div className="flex flex-wrap gap-2 py-3">
          {PICK_SOURCES.map((s) => (
            <Chip key={s} label={t(`events.pick_${s}`)} active={pickSource === s} bad={s === "ashubh"} onClick={() => choosePickSource(s)} />
          ))}
        </div>
        {pickSource === "sait" ? (
          <div className="flex flex-col pb-2">
            <select
              value={sait ?? ""}
              onChange={(e) => {
                setSait((e.target.value || null) as SaitCategoryId | null);
                setSaitDay(null);
              }}
              aria-label={t("events.pick_sait")}
              className="mb-2 rounded-full bg-background px-3 py-1.5 text-sm outline-none"
            >
              <option value="">{t("events.sait_none")}</option>
              {SAIT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{saitLabel(c.id)}</option>
              ))}
            </select>
            {sait ? (
              saitDays.isLoading ? (
                <p className="py-2 text-xs text-muted-foreground">{t("events.sait_loading")}</p>
              ) : (saitDays.data ?? []).length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">{t("events.sait_no_days")}</p>
              ) : (
                (saitDays.data ?? []).map((d) => (
                  <Option
                    key={d.gregorian}
                    label={`${lang === "en" ? labels.bsDate(d.gregorian) : `${d.bs_month_name_ne} ${digits(d.bs_day)}`} · ${lang === "en" ? d.weekday_en : d.weekday_ne}`}
                    detail={`${labels.clock(d.window_start)}–${labels.clock(d.window_end)}`}
                    active={saitDay?.gregorian === d.gregorian}
                    onClick={() => pickSaitDay(d)}
                  />
                ))
              )
            ) : null}
          </div>
        ) : pickSource !== "none" ? (
          <div className="flex flex-col pb-2">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setPickDate(shiftDate(pickDate, -1))} aria-label={t("events.prev_day")} className="inline-flex size-8 items-center justify-center rounded-full hover:bg-background">
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs font-semibold">{t("events.pick_for_day", { date: labels.day(pickDate) })}</span>
              <button type="button" onClick={() => setPickDate(shiftDate(pickDate, 1))} aria-label={t("events.next_day")} className="inline-flex size-8 items-center justify-center rounded-full hover:bg-background">
                <ChevronRight className="size-4" />
              </button>
            </div>
            <p className="pb-1 text-xs text-muted-foreground">{t(`events.pick_${pickSource}_hint`)}</p>
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
                  detail={`${labels.clock(p.startTime)}${p.source === "pushkara" ? "" : `–${labels.clock(p.endTime)}`}${p.startDate !== pickDate ? ` · ${labels.day(p.startDate)}` : ""}`}
                  active={pickedId === p.id}
                  tone={p.source === "ashubh" ? "bad" : "good"}
                  onClick={() => pickDayTime(p)}
                />
              ))
            )}
          </div>
        ) : null}
      </Group>

      <Group>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("events.title")} className={input} />
        <Divider />
        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t("events.location")} className={input} />
      </Group>

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

      {guest ? (
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
              {t("events.tips_bad_window", { name: (lang === "en" ? clash.name_en : clash.name_ne) ?? clash.key, start: labels.clock(clash.start), end: clash.end ? labels.clock(clash.end) : "" })}
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
                {t("events.tips_better", { name: (lang === "en" ? better.name_en : better.name_ne) ?? better.key, start: labels.clock(better.start), end: better.end ? labels.clock(better.end) : "" })}
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
      {tone ? <span className={cn("size-2 rounded-full", tone === "bad" ? "bg-destructive" : "bg-secondary")} /> : null}
      <span className="flex-1">{label}</span>
      {detail ? <span className="text-xs text-muted-foreground">{detail}</span> : null}
    </button>
  );
}

function Chip({ label, active, bad, onClick }: { label: string; active: boolean; bad?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium hover:opacity-80",
        active ? (bad ? "border-destructive bg-destructive text-white" : "border-secondary bg-secondary text-secondary-foreground") : "border-border bg-background",
      )}
    >
      {label}
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
