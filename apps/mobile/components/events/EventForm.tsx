import { useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Switch, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NEW_EVENT_KINDS, type NewEventKind } from "@vedic-patro/api-client";
import { bsFromCivilIso, bsToAD } from "@vedic-patro/domain/calendar/bs-calendar";
import { shiftDate } from "@vedic-patro/domain/calendar/event-time";
import { useDayTimePicks, useEventLabels, type DayTimePick } from "@vedic-patro/features/events";
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
  EVENT_ALERTS,
  EVENT_PRIORITIES,
  EVENT_REPEATS,
  type CalendarEventInput,
  type EventPriority,
  type EventRepeat,
} from "@/lib/events/api";
import { addMinutes, todayIn, zonedToIso } from "@/lib/events/time";
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

export function EventForm({ initialKind, onClose, onSaved }: { initialKind: NewEventKind; onClose: () => void; onSaved: () => void }) {
  const { t, lang, digits } = useLocale();
  const colors = useThemeColors();
  const { location } = usePanchangaLocation();
  // Guests save to the phone (lib/events/api.ts); invitations and profile tips need an account.
  const { isAuthenticated } = useAuth();
  const zone = location.params.timezone ?? "Asia/Kathmandu";
  const today = todayIn(zone);
  const labels = useEventLabels(today);

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
  const nextHour = addMinutes(`${new Date().getHours()}:00`, 60);
  const firstDate = nextHour.dayShift ? shiftDate(today, nextHour.dayShift) : today;
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
  // The next शुभ window after the typed time, else the day's first.
  const better: DayTimePick | null = useMemo(() => {
    if (!clash) return null;
    const at = `${startDate}T${startTime}`;
    const good = dayPicks.picks.shubh;
    return good.find((w) => `${w.startDate}T${w.startTime}` > at) ?? good[0] ?? null;
  }, [clash, dayPicks.picks.shubh, startDate, startTime]);

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
      await createEvent(input);
      haptics.success?.();
      onSaved();
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
          {t(`events.new_${kind}`)}
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

      <TitleField value={title} onChange={setTitle} placeholder={t("events.title")} />
      {kind !== "task" ? (
        <Group>
          <Field value={place} onChange={setPlace} placeholder={t("events.location")} />
        </Group>
      ) : null}

      {/* Apple's rows: the date opens the month; time and end have their switches. No end = a reminder. */}
      <Group>
        <IconRow icon="calendar-outline" label={t("events.date")} value={labels.day(startDate)} onPress={() => toggle("startDate")} />
        {panel === "startDate" ? <><Divider />{startGrid}</> : null}
        <Divider />
        <IconRow
          icon="time-outline"
          label={t("events.time")}
          value={timeOn ? labels.clock(startTime) : t("events.all_day")}
          onPress={timeOn ? () => toggle("startTime") : undefined}
          right={
            <Switch
              value={timeOn}
              onValueChange={(on) => {
                setTimeOn(on);
                setPanel(on ? "startTime" : null);
              }}
            />
          }
        />
        {timeOn && panel === "startTime" ? <><Divider />{startWheel}</> : null}
        <Divider />
        <IconRow
          icon="flag-outline"
          label={t("events.ends")}
          value={endOn ? `${labels.day(endDate)}${timeOn ? ` · ${labels.clock(endTime)}` : ""}` : null}
          onPress={endOn ? () => toggle("endDate") : undefined}
          right={
            <Switch
              value={endOn}
              onValueChange={(on) => {
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
      <View className="gap-2 rounded-3xl border border-secondary/30 bg-secondary/5 p-4">
        <View className="flex-row items-center gap-2">
          <Ionicons name="bulb-outline" size={18} color={colors.secondary} />
          <Text className="text-body font-semibold text-secondary" style={nepaliTextStyle(15)}>{t("events.tips")}</Text>
        </View>
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
