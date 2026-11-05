import { useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchSaitDetail, type NewEventKind, type SaitDetailDay } from "@vedic-patro/api-client";
import { SAIT_CATEGORIES, SAIT_CATEGORY_LABELS, type SaitCategoryId } from "@vedic-patro/domain/festivals/sait-data";
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

type Panel = "startDate" | "startTime" | "endDate" | "endTime" | "repeat" | "alert1" | "alert2" | "priority" | null;
/** Where the time comes from: typed in, or one of the day's / a ceremony's times. */
type PickSource = "none" | "sait" | "shubh" | "ashubh" | "pushkara";
const PICK_SOURCES: PickSource[] = ["none", "sait", "shubh", "ashubh", "pushkara"];
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
export function EventForm({ kind, onClose, onSaved }: { kind: NewEventKind; onClose: () => void; onSaved: () => void }) {
  const { t, lang, digits } = useLocale();
  const colors = useThemeColors();
  const { location } = usePanchangaLocation();
  // Guests save to the phone (lib/events/api.ts); invitations and profile tips need an account.
  const { isAuthenticated } = useAuth();
  const zone = location.params.timezone ?? "Asia/Kathmandu";
  const today = todayIn(zone);
  const labels = useEventLabels(today);

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
  const nextHour = addMinutes(`${new Date().getHours()}:00`, 60);
  const firstDate = nextHour.dayShift ? shiftDate(today, nextHour.dayShift) : today;
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


  const toggle = (p: Panel) => {
    haptics.tick();
    setPanel((cur) => (cur === p ? null : p));
  };

  // The साइत's days from today on, this BS year and the next.
  const bsYear = bsFromCivilIso(today).year;
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

  const pickSaitDay = (day: SaitDetailDay) => {
    haptics.tick();
    const label = SAIT_CATEGORY_LABELS[sait!];
    setSaitDay(day);
    setPickedId(`sait:${day.gregorian}`);
    setPickDate(day.gregorian);
    apply(lang === "en" ? label.en : label.ne, day.gregorian, day.window_start, day.gregorian, day.window_end, true);
  };

  const pickName = (p: DayTimePick) => {
    const name = lang === "en" ? p.nameEn : p.nameNe;
    if (p.source === "pushkara") return t("events.pick_pushkara_name", { lagna: name });
    if (p.source === "ashubh") return t("events.pick_ashubh_title", { name });
    return name;
  };

  const pickDayTime = (p: DayTimePick) => {
    haptics.tick();
    setPickedId(p.id);
    // A पुष्कर नवांश is a moment to begin at; the शुभ / अशुभ windows run to their end.
    apply(pickName(p), p.startDate, p.startTime, p.endDate, p.endTime, p.source !== "pushkara");
    // A bad time is worth knowing when it begins.
    if (p.source === "ashubh" && alert1 == null) setAlert1(0);
  };

  const choosePickSource = (s: PickSource) => {
    haptics.tick();
    setPickSource(s);
    setPickedId(null);
    if (s !== "sait") {
      setSait(null);
      setSaitDay(null);
    }
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

  // Only warn about an अशुभ window the user did not choose on purpose.
  const clash: GuidanceWindow | null = useMemo(() => {
    if (!day || !timeOn || pickSource === "ashubh") return null;
    const at = toMinutes(startTime);
    return day.windows.find((w) => w.kind === "ashubh" && w.end && toMinutes(w.start) <= at && at < toMinutes(w.end)) ?? null;
  }, [day, timeOn, startTime, pickSource]);
  const better: GuidanceWindow | null = useMemo(
    () => (clash && day ? (day.windows.find((w) => w.kind === "shubh" && w.end) ?? null) : null),
    [clash, day],
  );

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
    const picked = pickSource === "sait" ? (sait ? { kind: "sait", key: sait } : null) : pickSource === "none" ? null : pickList.find((p) => p.id === pickedId);
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
      source_kind: picked ? ("source" in picked ? picked.source : picked.kind) : null,
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

      {error ? (
        <Text className="text-center text-caption text-destructive" style={nepaliTextStyle(13)}>
          {error}
        </Text>
      ) : null}

      {/* Optional: the time from a साइत, or the day's शुभ / अशुभ / पुष्कर times. */}
      <Group>
        <Text className="pt-3 text-body text-foreground" style={nepaliTextStyle(16)}>{t("events.pick")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-3">
          {PICK_SOURCES.map((s) => (
            <Chip key={s} label={t(`events.pick_${s}`)} active={pickSource === s} tone={s === "ashubh" ? "bad" : "normal"} onPress={() => choosePickSource(s)} />
          ))}
        </ScrollView>
        {pickSource === "sait" ? (
          <View className="gap-3 pb-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-1">
              {SAIT_CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  label={lang === "en" ? SAIT_CATEGORY_LABELS[c.id].en : SAIT_CATEGORY_LABELS[c.id].ne}
                  active={sait === c.id}
                  onPress={() => {
                    setSait(c.id);
                    setSaitDay(null);
                  }}
                />
              ))}
            </ScrollView>
            {sait ? (
              saitDays.isLoading ? (
                <Text className="px-1 text-caption text-muted-foreground">{t("events.sait_loading")}</Text>
              ) : (saitDays.data ?? []).length === 0 ? (
                <Text className="px-1 text-caption text-muted-foreground">{t("events.sait_no_days")}</Text>
              ) : (
                <View>
                  <Text className="px-1 pb-1 text-caption text-muted-foreground">{t("events.sait_pick_day")}</Text>
                  {(saitDays.data ?? []).map((d) => (
                    <Option
                      key={d.gregorian}
                      label={`${lang === "en" ? labels.bsDate(d.gregorian) : `${d.bs_month_name_ne} ${digits(d.bs_day)}`} · ${lang === "en" ? d.weekday_en : d.weekday_ne}`}
                      detail={`${labels.clock(d.window_start)}–${labels.clock(d.window_end)}`}
                      active={saitDay?.gregorian === d.gregorian}
                      onPress={() => pickSaitDay(d)}
                    />
                  ))}
                </View>
              )
            ) : null}
          </View>
        ) : pickSource !== "none" ? (
          <View className="pb-3">
            <View className="flex-row items-center justify-between">
              <Pressable onPress={() => { haptics.tick(); setPickDate(shiftDate(pickDate, -1)); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("events.prev_day")} className="h-8 w-8 items-center justify-center active:opacity-50">
                <Ionicons name="chevron-back" size={18} color={colors.foreground} />
              </Pressable>
              <Text className="text-caption font-semibold text-foreground" style={nepaliTextStyle(13)}>
                {t("events.pick_for_day", { date: labels.day(pickDate) })}
              </Text>
              <Pressable onPress={() => { haptics.tick(); setPickDate(shiftDate(pickDate, 1)); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("events.next_day")} className="h-8 w-8 items-center justify-center active:opacity-50">
                <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
              </Pressable>
            </View>
            <Text className="px-1 pb-1 text-caption text-muted-foreground" style={nepaliTextStyle(12)}>{t(`events.pick_${pickSource}_hint`)}</Text>
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
                  detail={`${labels.clock(p.startTime)}${p.source === "pushkara" ? "" : `–${labels.clock(p.endTime)}`}${p.startDate !== pickDate ? ` · ${labels.day(p.startDate)}` : ""}`}
                  active={pickedId === p.id}
                  tone={p.source === "ashubh" ? "bad" : p.source === "shubh" || p.source === "pushkara" ? "good" : undefined}
                  onPress={() => pickDayTime(p)}
                />
              ))
            )}
          </View>
        ) : null}
      </Group>

      <Group>
        <Field value={title} onChange={setTitle} placeholder={t("events.title")} />
        <Divider />
        <Field value={place} onChange={setPlace} placeholder={t("events.location")} />
      </Group>

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

      {isAuthenticated ? (
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

      {/* Tips for the chosen day: the saait's own reading, the profile's guidance, and a clash with a bad window. */}
      <View className="gap-2 rounded-3xl border border-secondary/30 bg-secondary/5 p-4">
        <View className="flex-row items-center gap-2">
          <Ionicons name="bulb-outline" size={18} color={colors.secondary} />
          <Text className="text-body font-semibold text-secondary" style={nepaliTextStyle(15)}>{t("events.tips")}</Text>
        </View>
        {saitDay ? (
          <Text className="text-caption text-foreground" style={nepaliTextStyle(13)}>
            {t("events.tips_sait_day", {
              tithi: lang === "en" ? saitDay.tithi_en : saitDay.tithi_ne,
              nakshatra: lang === "en" ? saitDay.nakshatra_en : saitDay.nakshatra_ne,
              lagna: lang === "en" ? saitDay.lagna_en : (saitDay.lagna_ne ?? saitDay.lagna_en),
            })}
          </Text>
        ) : null}
        {clash ? (
          <View className="gap-2 rounded-2xl bg-destructive/10 p-3">
            <Text className="text-caption text-destructive" style={nepaliTextStyle(13)}>
              {t("events.tips_bad_window", {
                name: (lang === "en" ? clash.name_en : clash.name_ne) ?? clash.key,
                start: labels.clock(clash.start),
                end: clash.end ? labels.clock(clash.end) : "",
              })}
            </Text>
            {better ? (
              <Pressable
                onPress={() => {
                  haptics.tick();
                  setStartTime(better.start);
                  setEndTime(better.end ?? addMinutes(better.start, 60).time);
                }}
                accessibilityRole="button"
                className="self-start rounded-full bg-secondary px-3 py-1.5 active:opacity-70"
              >
                <Text className="text-caption font-semibold text-secondary-foreground" style={nepaliTextStyle(13)}>
                  {t("events.tips_better", {
                    name: (lang === "en" ? better.name_en : better.name_ne) ?? better.key,
                    start: labels.clock(better.start),
                    end: better.end ? labels.clock(better.end) : "",
                  })}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
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
      {tone ? <View className={cn("h-2 w-2 rounded-full", tone === "bad" ? "bg-destructive" : "bg-secondary")} /> : null}
      <Text className="min-w-0 flex-1 text-body text-foreground" style={nepaliTextStyle(15)}>{label}</Text>
      {detail ? <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>{detail}</Text> : null}
    </Pressable>
  );
}

function Chip({ label, active, tone = "normal", onPress }: { label: string; active: boolean; tone?: "normal" | "bad"; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptics.tick();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        "rounded-full border px-3 py-1.5 active:opacity-70",
        active ? (tone === "bad" ? "border-destructive bg-destructive" : "border-secondary bg-secondary") : "border-border bg-background",
      )}
    >
      <Text className={cn("text-caption font-medium", active ? (tone === "bad" ? "text-white" : "text-secondary-foreground") : "text-foreground")} style={nepaliTextStyle(14)}>
        {label}
      </Text>
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
