import { useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, TextInput, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NEW_EVENT_KINDS, type NewEventKind } from "@vedic-patro/api-client";
import { bsFromCivilIso, bsToAD } from "@vedic-patro/domain/calendar/bs-calendar";
import { shiftDate } from "@vedic-patro/domain/calendar/event-time";
import { betterSlot, eventToDraft, useDayTimePicks, useEventLabels, type DayTimePick } from "@vedic-patro/features/events";
import { cn } from "@vedic-patro/design-tokens/cn";
import { neutral } from "@vedic-patro/design-tokens";
import { haptics } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { IosMonthGrid, TimeWheel } from "@vedic-patro/ui/kit/events";
import { listProfiles } from "@/lib/auth/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { requestSignIn } from "@/lib/menu-request";
import {
  createEvent,
  deleteEvent,
  updateEvent,
  EVENT_ALERTS,
  EVENT_PRIORITIES,
  EVENT_REPEATS,
  type CalendarEvent,
  type CalendarEventInput,
  type EventPriority,
  type EventRepeat,
} from "@/lib/events/api";
import { addMinutes, todayIn, zonedToIso } from "@/lib/events/time";
import { exportToPhoneCalendar } from "@/lib/events/device-calendars";
import { offerPhoneCalendarAfterSave } from "@/lib/events/phone-calendar-ask";
import { fetchDailyGuidance } from "@/lib/notifications/api";
import type { GuidanceDay, GuidanceWindow } from "@/lib/notifications/types";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

type Panel = "pick" | "startDate" | "startTime" | "endDate" | "endTime" | "repeat" | "alert1" | "alert2" | "priority" | null;
type IconName = ComponentProps<typeof Ionicons>["name"];

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const pad = (n: number) => String(n).padStart(2, "0");
/** An all-day reminder's alert rings at 9:00, as Apple Reminders does. */
const ALL_DAY_REMINDER_AT = "09:00";

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
 * A new event or reminder — one form, in Apple Calendar's look. Title and place; a date row that
 * opens the BS month inline; a time row with its switch (off = the whole day) that opens the wheel;
 * an End row with its switch: off, it is a reminder at one moment; on, an event that runs to the end
 * date and time. Then repeat, alerts, priority, invitees and notes.
 *
 * The time can come from "Pick a time": a साइत (its coming days), or the chosen day's शुभ समय,
 * अशुभ समय (a reminder when one begins) and पुष्कर नवांश moments — the same lists as the panchanga
 * page. Under it, tips for the day from the default profile's guidance.
 */
/** The alert each type starts with: an event 1 day before, a task at its time, an appointment 30 minutes before. */
const KIND_ALERT: Record<NewEventKind, number> = { event: 1440, task: 0, appointment: 30 };

export function EventForm({ initialKind, onClose, onSaved, editing, slot, initialDate }: { initialKind: NewEventKind; /** A new event on this day ("YYYY-MM-DD"). */ initialDate?: string; onClose: () => void; onSaved: () => void; /** An event to change (its times are on its own clock). */ editing?: CalendarEvent; /** A new event starting here: a tapped slot of the day or week grid. */ slot?: { date: string; time: string; end?: string; endDate?: string; title?: string } }) {
  const init = editing ? eventToDraft(editing) : null;
  const { t, lang, digits } = useLocale();
  const colors = useThemeColors();
  const { location } = usePanchangaLocation();
  // Guests save to the phone (lib/events/api.ts); invitations and profile tips need an account.
  const { isAuthenticated } = useAuth();
  const zone = location.params.timezone ?? "Asia/Kathmandu";
  const today = todayIn(zone);
  const labels = useEventLabels(today);

  const [panel, setPanel] = useState<Panel>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const queryClient = useQueryClient();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [title, setTitle] = useState(init?.title ?? slot?.title ?? "");
  /** The title a pick wrote; another pick may replace it, a typed one stays. */
  const [autoTitle, setAutoTitle] = useState<string | null>(slot?.title ?? null);
  const [place, setPlace] = useState(init?.place ?? "");
  const [notes, setNotes] = useState(init?.notes ?? "");
  // An event is a date or a span (all-day to start); a task and an appointment sit at a time.
  const [kind, setKind] = useState<NewEventKind>(init?.kind ?? initialKind);
  const [timeOn, setTimeOn] = useState(init ? init.timeOn : slot ? true : initialKind !== "event");
  /** Off: a reminder at one moment. On: an event with an end. */
  const [endOn, setEndOn] = useState(init ? init.endOn : initialKind !== "task");
  const nextHour = addMinutes(`${new Date().getHours()}:00`, 60);
  const firstDate = nextHour.dayShift ? shiftDate(today, nextHour.dayShift) : today;
  const [startDate, setStartDate] = useState(init?.startDate ?? slot?.date ?? initialDate ?? firstDate);
  const [startTime, setStartTime] = useState(init?.startTime ?? slot?.time ?? nextHour.time);
  const [endDate, setEndDate] = useState(init?.endDate ?? slot?.endDate ?? slot?.date ?? initialDate ?? firstDate);
  const [endTime, setEndTime] = useState(init?.endTime ?? slot?.end ?? addMinutes(slot?.time ?? nextHour.time, 60).time);
  const [repeat, setRepeat] = useState<EventRepeat>(init?.repeat ?? "never");
  const [priority, setPriority] = useState<EventPriority>(init?.priority ?? 0);
  // Rings when due unless changed; a reminder that never rings is no reminder.
  const [alert1, setAlert1] = useState<number | null>(init ? init.alert1 : KIND_ALERT[initialKind]);
  const [alert2, setAlert2] = useState<number | null>(init?.alert2 ?? null);
  const [invitees, setInvitees] = useState<string[]>(init?.invitees ?? []);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);


  /** Switching the tab re-seeds what differs per type: all-day or timed, with or without an end, and the alert. */
  const changeKind = (next: NewEventKind) => {
    if (next === kind) return;
    haptics.tick();
    setKind(next);
    setTimeOn(next !== "event");
    setEndOn(next !== "task");
    setAlert1(KIND_ALERT[next]);
  };

  const toggle = (p: Panel) => {
    haptics.tick();
    setPanel((cur) => (cur === p ? null : p));
  };

  // The day's शुभ and अशुभ times, from its panchanga, as one list in clock order (green and red).
  const dayPicks = useDayTimePicks(startDate, location.params, true);
  const pickList: DayTimePick[] = useMemo(
    () => [...dayPicks.picks.shubh, ...dayPicks.picks.ashubh].sort((a, b) => `${a.startDate}T${a.startTime}`.localeCompare(`${b.startDate}T${b.startTime}`)),
    [dayPicks.picks],
  );
  const picked = pickList.find((p) => p.id === pickedId) ?? null;

  const bsYear = bsFromCivilIso(today).year;

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
    haptics.tick();
    setPickedId(p.id);
    apply(pickName(p), p.startDate, p.startTime, p.endDate, p.endTime, true);
    // A bad time is worth knowing when it begins.
    if (p.source === "ashubh" && alert1 == null) setAlert1(0);
  };

  // Tips: the default profile's guidance for the start day.
  const profiles = useQuery({
    queryKey: ["events", "profiles"],
    queryFn: listProfiles,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
  const profile = !isAuthenticated ? null : profiles.data?.find((p) => p.is_default) ?? profiles.data?.[0] ?? null;
  const guidance = useQuery({
    queryKey: ["events", "guidance", profile?.id, startDate, zone],
    enabled: profile != null,
    staleTime: 30 * 60_000,
    queryFn: () => fetchDailyGuidance(profile!.id, startDate, 1, location.params),
  });
  const day: GuidanceDay | null = guidance.data?.days[0] ?? null;

  // A time typed in by hand that lands in an अशुभ window gets a warning (not when the user picked that window).
  const clash: DayTimePick | null = useMemo(() => {
    if (!timeOn || picked?.source === "ashubh") return null;
    const at = `${startDate}T${startTime}`;
    return dayPicks.picks.ashubh.find((w) => `${w.startDate}T${w.startTime}` <= at && at < `${w.endDate}T${w.endTime}`) ?? null;
  }, [dayPicks.picks.ashubh, timeOn, picked, startDate, startTime]);
  // The first clean शुभ time from the typed one on: past every अशुभ window, never into another.
  const better: DayTimePick | null = useMemo(() => {
    if (!clash) return null;
    return betterSlot(dayPicks.picks.shubh, dayPicks.picks.ashubh, `${startDate}T${startTime}`);
  }, [clash, dayPicks.picks, startDate, startTime]);

  const addInvitee = () => {
    const email = draft.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL.test(email)) {
      setError(t("events.invitee_bad"));
      return;
    }
    setError(null);
    if (!invitees.includes(email)) setInvitees([...invitees, email]);
    setDraft("");
  };

  // No end: one moment (a whole day rings at 9:00, as Apple Reminders). With an end: start to end,
  // a whole day from midnight to 23:59.
  const startIso = zonedToIso(startDate, timeOn ? startTime : endOn ? "00:00" : ALL_DAY_REMINDER_AT, zone);
  const endIso = endOn
    ? zonedToIso(endDate, timeOn ? endTime : "23:59", zone)
    : timeOn
      ? startIso
      : zonedToIso(startDate, "23:59", zone);
  const canSave = title.trim().length > 0 && !saving;

  const save = async () => {
    if (!title.trim()) {
      setError(t("events.need_title"));
      return;
    }
    if (Date.parse(endIso) < Date.parse(startIso)) {
      setError(t("events.end_before_start"));
      return;
    }
    const pending = draft.trim().toLowerCase();
    const allInvitees = pending && EMAIL.test(pending) && !invitees.includes(pending) ? [...invitees, pending] : invitees;
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
      source_kind: picked ? picked.source : null,
      source_key: picked ? picked.key.slice(0, 64) : null,
      invitees: isAuthenticated ? allInvitees : [],
      profile_id: profile?.id ?? null,
    };
    setSaving(true);
    setError(null);
    try {
      if (editing) await updateEvent(editing.id, input);
      else await createEvent(input);
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      haptics.success?.();
      onSaved();
      // Into the phone's calendar at once when access is on; a new item offers access when it is not.
      void exportToPhoneCalendar().catch(() => 0);
      if (!editing) void offerPhoneCalendarAfterSave(t);
    } catch {
      setError(t("events.save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const bsStart = bsFromCivilIso(startDate);
  const bsEnd = bsFromCivilIso(endDate);
  const years = Array.from({ length: 8 }, (_, i) => bsYear - 1 + i);

  const startGrid = (
    <IosMonthGrid year={bsStart.year} month={bsStart.month} day={bsStart.day} yearOptions={years} onSelect={(y, m, d) => setStart(bsIso(y, m, d))} />
  );
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
      <Row icon="globe-outline" label={t("events.time_zone")} value={labels.zone(zone)} />
    </>
  );
  const repeatMenu =
    panel === "repeat" ? (
      <View className="pb-2">
        {EVENT_REPEATS.map((r, i) => (
          <View key={r}>
            {i === 1 ? <Divider /> : null}
            <Option label={t(`events.repeat_${r}`)} active={repeat === r} onPress={() => { setRepeat(r); setPanel(null); }} />
          </View>
        ))}
      </View>
    ) : null;

  return (
    <View className="gap-4 px-4 pb-6 pt-3">
      {/* Apple Calendar's bar: close, the title, and a tick that fills in once the event can be saved. */}
      <View className="flex-row items-center justify-between">
        <RoundButton icon="close" label={t("events.cancel")} onPress={onClose} />
        <Text className="text-title font-semibold text-foreground" style={nepaliTextStyle(17)}>
          {editing ? t("events.edit") : t(`events.new_${kind}`)}
        </Text>
        <RoundButton icon="checkmark" label={t("events.save")} onPress={() => void save()} filled={canSave} busy={saving} />
      </View>

      {/* The three types, always in view with the current one lit. */}
      <View accessibilityRole="tablist" className="flex-row rounded-full bg-muted p-1">
        {NEW_EVENT_KINDS.map((k) => (
          <Pressable
            key={k}
            accessibilityRole="tab"
            accessibilityState={{ selected: kind === k }}
            onPress={() => changeKind(k)}
            className={`min-h-10 flex-1 items-center justify-center rounded-full ${kind === k ? "bg-card shadow-sm" : ""}`}
          >
            <Text
              className={`text-body font-medium ${kind === k ? "text-foreground" : "text-muted-foreground"}`}
              style={nepaliTextStyle(15)}
            >
              {t(`events.kind_${k}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Text className="text-center text-caption text-destructive" style={nepaliTextStyle(13)}>
          {error}
        </Text>
      ) : null}

      <TitleField value={title} onChange={setTitle} placeholder={t("events.title")} />

      {/* When: a date pill and a time pill for the start (and the end), the month or wheel opening under them. */}
      <Group>
        <View className="min-h-14 flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-3">
            <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
            <Text className="text-body text-foreground" style={nepaliTextStyle(16)}>{t("events.starts")}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pill label={labels.day(startDate)} active={panel === "startDate"} onPress={() => toggle("startDate")} />
            {timeOn ? <Pill label={labels.clock(startTime)} active={panel === "startTime"} onPress={() => toggle("startTime")} /> : null}
          </View>
        </View>
        {panel === "startDate" ? <><Divider />{startGrid}</> : null}
        {timeOn && panel === "startTime" ? <><Divider />{startWheel}</> : null}
        {endOn ? (
          <>
            <Divider />
            <View className="min-h-14 flex-row items-center justify-between gap-2">
              <View className="flex-row items-center gap-3">
                <Ionicons name="flag-outline" size={20} color={colors.mutedForeground} />
                <Text className="text-body text-foreground" style={nepaliTextStyle(16)}>{t("events.ends")}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Pill label={labels.day(endDate)} active={panel === "endDate"} onPress={() => toggle("endDate")} />
                {timeOn ? <Pill label={labels.clock(endTime)} active={panel === "endTime"} onPress={() => toggle("endTime")} /> : null}
              </View>
            </View>
            {panel === "endDate" ? <><Divider /><IosMonthGrid year={bsEnd.year} month={bsEnd.month} day={bsEnd.day} yearOptions={years} onSelect={(y, m, d) => setEndDate(bsIso(y, m, d))} /></> : null}
            {timeOn && panel === "endTime" ? <><Divider /><TimeWheel value={endTime} onChange={setEndTime} /></> : null}
          </>
        ) : null}
        <Divider />
        <View className="flex-row items-center gap-3 py-3">
          <Switch value={!timeOn} onValueChange={(on) => { setTimeOn(!on); setPanel(null); }} />
          <Text className="mr-3 text-body text-foreground" style={nepaliTextStyle(15)}>{t("events.all_day")}</Text>
          <Switch
            value={endOn}
            onValueChange={(on) => {
              setEndOn(on);
              if (!on) return setPanel(null);
              // An end an hour on, as Calendar starts one.
              if (endDate < startDate || (endDate === startDate && toMinutes(endTime) <= toMinutes(startTime))) {
                const next = addMinutes(startTime, 60);
                setEndDate(next.dayShift ? shiftDate(startDate, next.dayShift) : startDate);
                setEndTime(next.time);
              }
              setPanel("endDate");
            }}
          />
          <Text className="text-body text-foreground" style={nepaliTextStyle(15)}>{t("events.ends")}</Text>
        </View>
      </Group>

      {/* A typed time that falls in an अशुभ window: say so, and offer the next शुभ one. */}
      {clash ? (
        <View accessibilityRole="alert" className="gap-2 rounded-3xl border border-destructive/40 bg-destructive/10 p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="warning-outline" size={18} color={colors.destructive} />
            <Text className="text-body font-semibold text-destructive" style={nepaliTextStyle(15)}>{t("events.bad_time_alert")}</Text>
          </View>
          <Text className="text-caption text-destructive" style={nepaliTextStyle(13)}>
            {t("events.tips_bad_window", { name: lang === "en" ? clash.nameEn : clash.nameNe, start: labels.clock(clash.startTime), end: labels.clock(clash.endTime) })}
          </Text>
          {better ? (
            <Pressable
              onPress={() => {
                haptics.tick();
                setStartDate(better.startDate);
                setStartTime(better.startTime);
                setEndDate(better.endDate);
                setEndTime(better.endTime);
              }}
              accessibilityRole="button"
              className="self-start rounded-full bg-success px-3 py-1.5 active:opacity-70"
            >
              <Text className="text-caption font-semibold text-white" style={nepaliTextStyle(13)}>
                {t("events.tips_better", { name: lang === "en" ? better.nameEn : better.nameNe, start: labels.clock(better.startTime), end: labels.clock(better.endTime) })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Optional: one dropdown of the day's times, शुभ in green and अशुभ in red; picking fills the title and times. */}
      <Group>
        <Pressable
          onPress={() => toggle("pick")}
          accessibilityRole="button"
          accessibilityState={{ expanded: panel === "pick" }}
          className="min-h-14 flex-row items-center gap-3 active:opacity-70"
        >
          <View className="w-6 items-center">
            <Ionicons name="sparkles-outline" size={20} color={colors.mutedForeground} />
          </View>
          <Text className="min-w-0 flex-1 text-body text-foreground" style={nepaliTextStyle(16)}>{t("events.pick_shubh_ashubh")}</Text>
          <View className="min-w-0 flex-row items-center gap-2">
            {picked ? (
              <>
                <View className={cn("h-2 w-2 rounded-full", picked.source === "ashubh" ? "bg-destructive" : "bg-success")} />
                <Text className={cn("shrink text-body", picked.source === "ashubh" ? "text-destructive" : "text-success")} style={nepaliTextStyle(15)} numberOfLines={1}>
                  {lang === "en" ? picked.nameEn : picked.nameNe}
                </Text>
              </>
            ) : (
              <Text className="text-body text-muted-foreground" style={nepaliTextStyle(15)}>{t("events.pick_none")}</Text>
            )}
            <Ionicons name="chevron-expand" size={16} color={colors.mutedForeground} />
          </View>
        </Pressable>
        {panel === "pick" ? (
          <View className="pb-3">
            <Text className="px-1 pb-1 text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
              {t("events.pick_for_day", { date: labels.day(startDate) })}
            </Text>
            <Option label={t("events.pick_none")} active={picked == null} onPress={() => { setPickedId(null); setPanel(null); }} />
            {dayPicks.loading ? (
              <ActivityIndicator color={colors.mutedForeground} />
            ) : dayPicks.failed ? (
              <Text className="px-1 text-caption text-muted-foreground">{t("events.pick_failed")}</Text>
            ) : pickList.length === 0 ? (
              <Text className="px-1 text-caption text-muted-foreground">{t("events.pick_empty")}</Text>
            ) : (
              pickList.map((p) => (
                <Option
                  key={p.id}
                  label={lang === "en" ? p.nameEn : p.nameNe}
                  detail={`${labels.clock(p.startTime)}–${labels.clock(p.endTime)}${p.startDate !== startDate ? ` · ${labels.day(p.startDate)}` : ""}`}
                  active={pickedId === p.id}
                  tone={p.source === "ashubh" ? "bad" : "good"}
                  onPress={() => pickDayTime(p)}
                />
              ))
            )}
          </View>
        ) : null}
      </Group>

      {kind !== "task" ? (
        <Group>
          <Field value={place} onChange={setPlace} placeholder={t("events.location")} />
        </Group>
      ) : null}

      <Group>
        <IconRow icon="repeat" label={t("events.repeat")} value={t(`events.repeat_${repeat}`)} muted onPress={() => toggle("repeat")} updown />
        {repeatMenu}
      </Group>

      <Group>
        <Row label={t("events.alert")} value={labels.alert(alert1)} onPress={() => toggle("alert1")} updown />
        {panel === "alert1"
          ? EVENT_ALERTS.map((a) => (
              <Option key={String(a)} label={labels.alert(a)} active={alert1 === a} onPress={() => { setAlert1(a); setPanel(null); }} />
            ))
          : null}
        {alert1 != null ? (
          <>
            <Divider />
            <Row label={t("events.second_alert")} value={labels.alert(alert2)} onPress={() => toggle("alert2")} updown />
            {panel === "alert2"
              ? EVENT_ALERTS.map((a) => (
                  <Option key={String(a)} label={labels.alert(a)} active={alert2 === a} onPress={() => { setAlert2(a); setPanel(null); }} />
                ))
              : null}
          </>
        ) : null}
        <Divider />
        <IconRow glyph="!!!" label={t("events.priority")} value={t(`events.priority_${priority}`)} muted onPress={() => toggle("priority")} updown />
        {panel === "priority"
          ? EVENT_PRIORITIES.map((p) => (
              <Option key={p} label={t(`events.priority_${p}`)} active={priority === p} onPress={() => { setPriority(p); setPanel(null); }} />
            ))
          : null}
      </Group>

      {kind === "task" ? null : isAuthenticated ? (
        <Group>
          <Text className="pt-3 text-body text-foreground" style={nepaliTextStyle(16)}>{t("events.invitees")}</Text>
          {invitees.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 pt-2">
              {invitees.map((email) => (
                <Pressable
                  key={email}
                  onPress={() => setInvitees(invitees.filter((e) => e !== email))}
                  accessibilityRole="button"
                  accessibilityLabel={email}
                  className="flex-row items-center gap-1 rounded-full bg-background px-3 py-1.5 active:opacity-60"
                >
                  <Text className="text-caption text-foreground">{email}</Text>
                  <Ionicons name="close" size={14} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>
          ) : null}
          <View className="min-h-12 flex-row items-center gap-2">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={addInvitee}
              placeholder={t("events.invitee_add")}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              className="min-w-0 flex-1 py-3 text-body text-foreground"
            />
            <Pressable onPress={addInvitee} accessibilityRole="button" accessibilityLabel={t("events.invitee_add")} hitSlop={8}>
              <Ionicons name="add-circle" size={24} color={colors.secondary} />
            </Pressable>
          </View>
          <Text className="pb-3 text-caption text-muted-foreground" style={nepaliTextStyle(12)}>{t("events.invitee_hint")}</Text>
        </Group>
      ) : (
        <Group>
          <Row label={t("events.invitees")} value={t("events.invitee_guest")} onPress={() => { onClose(); requestSignIn(); }} chevron />
          <Text className="pb-3 text-caption text-muted-foreground" style={nepaliTextStyle(12)}>{t("events.guest_note")}</Text>
        </Group>
      )}

      <Group>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t("events.notes")}
          placeholderTextColor={colors.mutedForeground}
          multiline
          className="min-h-24 py-3 text-body text-foreground"
          style={nepaliTextStyle(16)}
        />
      </Group>

      {/* Tips for the chosen day: the profile's guidance for the day. */}
      <View className="rounded-3xl border border-secondary/30 bg-secondary/5 px-4">
        <Pressable
          onPress={() => {
            haptics.tick();
            setTipsOpen((o) => !o);
          }}
          accessibilityRole="button"
          accessibilityState={{ expanded: tipsOpen }}
          className="min-h-12 flex-row items-center justify-between active:opacity-70"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="bulb-outline" size={18} color={colors.secondary} />
            <Text className="text-body font-semibold text-secondary" style={nepaliTextStyle(15)}>{t("events.tips")}</Text>
          </View>
          <Ionicons name={tipsOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.secondary} />
        </Pressable>
        {tipsOpen ? (
        <View className="gap-2 pb-4">
        {day ? (
          <>
            <Text className="text-caption text-foreground" style={nepaliTextStyle(13)}>{lang === "en" ? day.summary_en : day.summary_ne}</Text>
            <TipList title={t("events.tips_do")} items={(lang === "en" ? day.do_en : day.do_ne).slice(0, 3)} tone="good" />
            <TipList title={t("events.tips_careful")} items={(lang === "en" ? day.careful_en : day.careful_ne).slice(0, 3)} tone="careful" />
            <TipList title={t("events.tips_avoid")} items={(lang === "en" ? day.dont_en : day.dont_ne).slice(0, 2)} tone="bad" />
          </>
        ) : profiles.isSuccess && !profile ? (
          <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>{t("events.tips_need_profile")}</Text>
        ) : guidance.isLoading ? (
          <ActivityIndicator color={colors.secondary} />
        ) : null}
        </View>
        ) : null}
      </View>

      {editing ? (
        <Pressable
          onPress={() =>
            Alert.alert(editing.title, undefined, [
              { text: t("events.cancel"), style: "cancel" },
              {
                text: t("events.delete"),
                style: "destructive",
                onPress: async () => {
                  await deleteEvent(editing.id);
                  void queryClient.invalidateQueries({ queryKey: ["events"] });
                  onSaved();
                  void exportToPhoneCalendar().catch(() => 0);
                },
              },
            ])
          }
          accessibilityRole="button"
          className="min-h-12 items-center justify-center rounded-3xl bg-destructive/10 active:opacity-70"
        >
          <Text className="text-body font-semibold text-destructive" style={nepaliTextStyle(16)}>{t("events.delete")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function RoundButton({ icon, label, onPress, filled, busy }: { icon: "close" | "checkmark"; label: string; onPress: () => void; filled?: boolean; busy?: boolean }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => {
        haptics.tick();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className={cn("h-11 w-11 items-center justify-center rounded-full active:opacity-70", filled ? "bg-secondary" : "bg-muted")}
    >
      {busy ? (
        <ActivityIndicator color={neutral.white} />
      ) : (
        <Ionicons name={icon} size={22} color={filled ? neutral.white : colors.mutedForeground} />
      )}
    </Pressable>
  );
}

/** One of Apple Calendar's grouped, rounded sections. */
function Group({ children }: { children: ReactNode }) {
  return <View className="rounded-3xl bg-muted px-4 dark:bg-foreground/5">{children}</View>;
}

function Divider() {
  return <View className="h-px bg-border" />;
}

/** The big title with the accent underline, as Google Calendar's "Add title". */
function TitleField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const colors = useThemeColors();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      accessibilityLabel={placeholder}
      className="border-b-2 border-secondary px-1 pb-2 pt-1 text-foreground"
      style={nepaliTextStyle(26)}
    />
  );
}

/** A date or time shown as a tappable pill; lit while its picker is open. */
function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptics.tick();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ expanded: active }}
      className={cn("rounded-full px-3 py-2 active:opacity-70", active ? "border border-secondary bg-secondary/15" : "border border-transparent bg-background")}
    >
      <Text className={cn("font-num text-body font-medium", active ? "text-secondary" : "text-foreground")} style={nepaliTextStyle(15)}>{label}</Text>
    </Pressable>
  );
}

function Field({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const colors = useThemeColors();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      className="min-h-12 py-3 text-body text-foreground"
      style={nepaliTextStyle(17)}
    />
  );
}

function Row({ icon, label, value, onPress, chevron, updown }: { icon?: IconName; label: string; value: string; onPress?: () => void; chevron?: boolean; updown?: boolean }) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined} className="min-h-12 flex-row items-center justify-between gap-3 active:opacity-70">
      <View className="flex-row items-center gap-3">
        {icon ? <Ionicons name={icon} size={20} color={colors.mutedForeground} /> : null}
        <Text className="text-body text-foreground" style={nepaliTextStyle(16)}>{label}</Text>
      </View>
      <View className="min-w-0 flex-row items-center gap-1">
        <Text className="text-body text-muted-foreground" style={nepaliTextStyle(16)} numberOfLines={1}>{value}</Text>
        {chevron ? <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} /> : null}
        {updown ? <Ionicons name="chevron-expand" size={16} color={colors.mutedForeground} /> : null}
      </View>
    </Pressable>
  );
}

/**
 * Apple Reminders' row: an icon, the label with its value under it in the accent colour ("Today",
 * "1:00 pm"), and a switch or a value on the right.
 */
function IconRow({
  icon,
  glyph,
  label,
  value,
  muted,
  onPress,
  right,
  updown,
}: {
  icon?: IconName;
  glyph?: string;
  label: string;
  value?: string | null;
  /** The value sits on the right in grey (Repeat, Priority) rather than under the label in red. */
  muted?: boolean;
  onPress?: () => void;
  right?: ReactNode;
  updown?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View className="min-h-14 flex-row items-center gap-3">
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined} className="min-h-14 min-w-0 flex-1 flex-row items-center gap-3 active:opacity-70">
        <View className="w-6 items-center">
          {glyph ? (
            <Text className="text-body font-bold text-muted-foreground">{glyph}</Text>
          ) : icon ? (
            <Ionicons name={icon} size={20} color={colors.mutedForeground} />
          ) : null}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-body text-foreground" style={nepaliTextStyle(16)}>{label}</Text>
          {value && !muted ? (
            <Text className="text-caption text-destructive" style={nepaliTextStyle(13)} numberOfLines={1}>{value}</Text>
          ) : null}
        </View>
        {value && muted ? (
          <View className="flex-row items-center gap-1">
            <Text className="text-body text-muted-foreground" style={nepaliTextStyle(16)} numberOfLines={1}>{value}</Text>
            {updown ? <Ionicons name="chevron-expand" size={16} color={colors.mutedForeground} /> : null}
          </View>
        ) : null}
      </Pressable>
      {right}
    </View>
  );
}

function Option({ label, detail, active, tone, onPress }: { label: string; detail?: string; active: boolean; tone?: "good" | "bad"; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="menuitem" accessibilityState={{ selected: active }} className="min-h-11 flex-row items-center gap-3 active:opacity-60">
      <View className="w-5 items-center">{active ? <Ionicons name="checkmark" size={18} color={colors.foreground} /> : null}</View>
      {tone ? <View className={cn("h-2 w-2 rounded-full", tone === "bad" ? "bg-destructive" : "bg-success")} /> : null}
      <Text className="min-w-0 flex-1 text-body text-foreground" style={nepaliTextStyle(15)}>{label}</Text>
      {detail ? <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>{detail}</Text> : null}
    </Pressable>
  );
}

function TipList({ title, items, tone }: { title: string; items: string[]; tone: "good" | "careful" | "bad" }) {
  if (items.length === 0) return null;
  return (
    <View className="gap-0.5">
      <Text
        className={cn("text-caption font-semibold", tone === "good" ? "text-secondary" : tone === "careful" ? "text-warning" : "text-destructive")}
        style={nepaliTextStyle(13)}
      >
        {title}
      </Text>
      {items.map((item) => (
        <Text key={item} className="text-caption text-foreground" style={nepaliTextStyle(13)}>
          · {item}
        </Text>
      ))}
    </View>
  );
}
