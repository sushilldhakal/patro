import { useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchSaitDetail, type SaitDetailDay } from "@vedic-patro/api-client";
import { SAIT_CATEGORIES, SAIT_CATEGORY_LABELS, type SaitCategoryId } from "@vedic-patro/domain/festivals/sait-data";
import { adToBS, bsFromCivilIso, bsToAD } from "@vedic-patro/domain/calendar/bs-calendar";
import { cn } from "@vedic-patro/design-tokens/cn";
import { neutral } from "@vedic-patro/design-tokens";
import { haptics } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { BsDateTimePicker } from "@/components/panchanga/BsDateTimePicker";
import { listProfiles } from "@/lib/auth/client";
import { createEvent, EVENT_ALERTS, EVENT_REPEATS, type CalendarEventInput, type EventRepeat } from "@/lib/events/api";
import { addMinutes, todayIn, zonedToIso } from "@/lib/events/time";
import { fetchDailyGuidance } from "@/lib/notifications/api";
import type { GuidanceDay, GuidanceWindow } from "@/lib/notifications/types";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

type Panel = "sait" | "startDate" | "startTime" | "endDate" | "endTime" | "repeat" | "alert1" | "alert2" | null;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const pad = (n: number) => String(n).padStart(2, "0");

/** ISO date of a BS day (the picker speaks BS; the event is stored by its Gregorian date). */
function bsIso(y: number, m: number, d: number): string {
  const ad = bsToAD(y, m, d);
  return `${ad.getFullYear()}-${pad(ad.getMonth() + 1)}-${pad(ad.getDate())}`;
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * A new event or reminder — one form for both, laid out like Apple Calendar's "New" sheet: title and
 * place, then all-day / starts / ends / repeat, then alerts, invitees and notes. A साइत can be picked
 * first: its name becomes the title and its day and window the start and end (the time stays
 * editable). Under it, tips for the chosen day from the default profile's daily guidance.
 */
export function EventForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t, lang, digits } = useLocale();
  const colors = useThemeColors();
  const { location } = usePanchangaLocation();
  const zone = location.params.timezone ?? "Asia/Kathmandu";
  const today = todayIn(zone);

  const [panel, setPanel] = useState<Panel>(null);
  const [sait, setSait] = useState<SaitCategoryId | null>(null);
  const [saitDay, setSaitDay] = useState<SaitDetailDay | null>(null);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [allDay, setAllDay] = useState(false);
  const nextHour = addMinutes(`${new Date().getHours()}:00`, 60);
  const [startDate, setStartDate] = useState(nextHour.dayShift ? todayIn(zone) : today);
  const [startTime, setStartTime] = useState(nextHour.time);
  const [endDate, setEndDate] = useState(startDate);
  const [endTime, setEndTime] = useState(addMinutes(nextHour.time, 60).time);
  const [repeat, setRepeat] = useState<EventRepeat>("never");
  const [alert1, setAlert1] = useState<number | null>(null);
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

  const pickSaitDay = (day: SaitDetailDay) => {
    haptics.tick();
    const label = SAIT_CATEGORY_LABELS[sait!];
    setSaitDay(day);
    setTitle(lang === "en" ? label.en : label.ne);
    setAllDay(false);
    setStartDate(day.gregorian);
    setEndDate(day.gregorian);
    setStartTime(day.window_start);
    setEndTime(day.window_end);
    setPanel(null);
  };

  // Tips: the default profile's guidance for the start day.
  const profiles = useQuery({ queryKey: ["events", "profiles"], queryFn: listProfiles, staleTime: 5 * 60_000 });
  const profile = profiles.data?.find((p) => p.is_default) ?? profiles.data?.[0] ?? null;
  const guidance = useQuery({
    queryKey: ["events", "guidance", profile?.id, startDate, zone],
    enabled: profile != null,
    staleTime: 30 * 60_000,
    queryFn: () => fetchDailyGuidance(profile!.id, startDate, 1, location.params),
  });
  const day: GuidanceDay | null = guidance.data?.days[0] ?? null;

  const clash: GuidanceWindow | null = useMemo(() => {
    if (!day || allDay) return null;
    const at = toMinutes(startTime);
    return day.windows.find((w) => w.kind === "ashubh" && w.end && toMinutes(w.start) <= at && at < toMinutes(w.end)) ?? null;
  }, [day, allDay, startTime]);
  const better: GuidanceWindow | null = useMemo(
    () => (clash && day ? (day.windows.find((w) => w.kind === "shubh" && w.end) ?? null) : null),
    [clash, day],
  );

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
  const dateLabel = (iso: string) => {
    const bs = bsFromCivilIso(iso);
    return `${bs.monthName} ${digits(bs.day)}, ${digits(bs.year)}`;
  };

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

  const startIso = allDay ? zonedToIso(startDate, "00:00", zone) : zonedToIso(startDate, startTime, zone);
  const endIso = allDay ? zonedToIso(endDate, "23:59", zone) : zonedToIso(endDate, endTime, zone);
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
      invitees: allInvitees,
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

  return (
    <View className="gap-4 px-4 pb-6 pt-3">
      {/* Apple Calendar's bar: close, the title, and a tick that fills in once the event can be saved. */}
      <View className="flex-row items-center justify-between">
        <RoundButton icon="close" label={t("events.cancel")} onPress={onClose} />
        <Text className="text-title font-semibold text-foreground" style={nepaliTextStyle(17)}>
          {t("events.new")}
        </Text>
        <RoundButton icon="checkmark" label={t("events.save")} onPress={() => void save()} filled={canSave} busy={saving} />
      </View>

      {error ? (
        <Text className="text-center text-caption text-destructive" style={nepaliTextStyle(13)}>
          {error}
        </Text>
      ) : null}

      {/* Optional: a साइत names the event and sets its day and window. */}
      <Group>
        <Row label={t("events.sait")} value={sait ? (lang === "en" ? SAIT_CATEGORY_LABELS[sait].en : SAIT_CATEGORY_LABELS[sait].ne) : t("events.sait_none")} onPress={() => toggle("sait")} chevron />
        {panel === "sait" ? (
          <View className="gap-3 pb-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-1">
              <Chip label={t("events.sait_none")} active={sait == null} onPress={() => { setSait(null); setSaitDay(null); }} />
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
                      label={`${d.bs_month_name_ne} ${digits(d.bs_day)} · ${lang === "en" ? d.weekday_en : d.weekday_ne}`}
                      detail={`${digits(d.window_start)}–${digits(d.window_end)}`}
                      active={saitDay?.gregorian === d.gregorian}
                      onPress={() => pickSaitDay(d)}
                    />
                  ))}
                </View>
              )
            ) : null}
          </View>
        ) : null}
      </Group>

      <Group>
        <Field value={title} onChange={setTitle} placeholder={t("events.title")} />
        <Divider />
        <Field value={place} onChange={setPlace} placeholder={t("events.location")} />
      </Group>

      <Group>
        <View className="min-h-12 flex-row items-center justify-between">
          <Text className="text-body text-foreground" style={nepaliTextStyle(16)}>{t("events.all_day")}</Text>
          <Switch value={allDay} onValueChange={setAllDay} trackColor={{ true: colors.secondary }} />
        </View>
        <Divider />
        <DateTimeRow
          label={t("events.starts")}
          date={dateLabel(startDate)}
          time={allDay ? null : digits(startTime)}
          onDate={() => toggle("startDate")}
          onTime={() => toggle("startTime")}
        />
        {panel === "startDate" ? (
          <BsDateTimePicker
            year={bsStart.year}
            month={bsStart.month}
            day={bsStart.day}
            yearOptions={years}
            onSelectDate={(y, m, d) => {
              const iso = bsIso(y, m, d);
              setStartDate(iso);
              if (endDate < iso) setEndDate(iso);
            }}
            monthAriaLabel={t("events.starts")}
            yearAriaLabel={t("events.starts")}
            showTime={false}
            live
            embeddedInSheet
            onDone={() => setPanel(null)}
          />
        ) : null}
        {panel === "startTime" ? (
          <TimeStepper
            value={startTime}
            onChange={(v) => {
              const length = toMinutes(endTime) - toMinutes(startTime);
              setStartTime(v);
              if (endDate === startDate) setEndTime(addMinutes(v, Math.max(length, 0)).time);
            }}
          />
        ) : null}
        <Divider />
        <DateTimeRow
          label={t("events.ends")}
          date={dateLabel(endDate)}
          time={allDay ? null : digits(endTime)}
          onDate={() => toggle("endDate")}
          onTime={() => toggle("endTime")}
        />
        {panel === "endDate" ? (
          <BsDateTimePicker
            year={bsEnd.year}
            month={bsEnd.month}
            day={bsEnd.day}
            yearOptions={years}
            onSelectDate={(y, m, d) => setEndDate(bsIso(y, m, d))}
            monthAriaLabel={t("events.ends")}
            yearAriaLabel={t("events.ends")}
            showTime={false}
            live
            embeddedInSheet
            onDone={() => setPanel(null)}
          />
        ) : null}
        {panel === "endTime" ? <TimeStepper value={endTime} onChange={setEndTime} /> : null}
        <Divider />
        <Row label={t("events.repeat")} value={t(`events.repeat_${repeat}`)} onPress={() => toggle("repeat")} updown />
        {panel === "repeat"
          ? EVENT_REPEATS.map((r) => (
              <Option key={r} label={t(`events.repeat_${r}`)} active={repeat === r} onPress={() => { setRepeat(r); setPanel(null); }} />
            ))
          : null}
      </Group>

      <Group>
        <Row label={t("events.alert")} value={alertLabel(alert1)} onPress={() => toggle("alert1")} updown />
        {panel === "alert1"
          ? EVENT_ALERTS.map((a) => (
              <Option key={String(a)} label={alertLabel(a)} active={alert1 === a} onPress={() => { setAlert1(a); setPanel(null); }} />
            ))
          : null}
        {alert1 != null ? (
          <>
            <Divider />
            <Row label={t("events.second_alert")} value={alertLabel(alert2)} onPress={() => toggle("alert2")} updown />
            {panel === "alert2"
              ? EVENT_ALERTS.map((a) => (
                  <Option key={String(a)} label={alertLabel(a)} active={alert2 === a} onPress={() => { setAlert2(a); setPanel(null); }} />
                ))
              : null}
          </>
        ) : null}
      </Group>

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
                start: digits(clash.start),
                end: digits(clash.end ?? ""),
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
                    start: digits(better.start),
                    end: digits(better.end ?? ""),
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

function Row({ label, value, onPress, chevron, updown }: { label: string; value: string; onPress: () => void; chevron?: boolean; updown?: boolean }) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="min-h-12 flex-row items-center justify-between gap-3 active:opacity-70">
      <Text className="text-body text-foreground" style={nepaliTextStyle(16)}>{label}</Text>
      <View className="min-w-0 flex-row items-center gap-1">
        <Text className="text-body text-muted-foreground" style={nepaliTextStyle(16)} numberOfLines={1}>{value}</Text>
        {chevron ? <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} /> : null}
        {updown ? <Ionicons name="chevron-expand" size={16} color={colors.mutedForeground} /> : null}
      </View>
    </Pressable>
  );
}

/** "Starts  [कात्तिक २०, २०८३] [१०:१५]" — the date and the time as separate pills, like Calendar's. */
function DateTimeRow({ label, date, time, onDate, onTime }: { label: string; date: string; time: string | null; onDate: () => void; onTime: () => void }) {
  return (
    <View className="min-h-12 flex-row items-center justify-between gap-2 py-1.5">
      <Text className="text-body text-foreground" style={nepaliTextStyle(16)}>{label}</Text>
      <View className="flex-row gap-2">
        <Pill label={date} onPress={onDate} />
        {time ? <Pill label={time} onPress={onTime} /> : null}
      </View>
    </View>
  );
}

function Pill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="rounded-full bg-background px-3 py-1.5 active:opacity-60">
      <Text className="text-body text-foreground" style={nepaliTextStyle(16)}>{label}</Text>
    </Pressable>
  );
}

function Option({ label, detail, active, onPress }: { label: string; detail?: string; active: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="menuitem" accessibilityState={{ selected: active }} className="min-h-11 flex-row items-center gap-3 active:opacity-60">
      <View className="w-5 items-center">{active ? <Ionicons name="checkmark" size={18} color={colors.secondary} /> : null}</View>
      <Text className="min-w-0 flex-1 text-body text-foreground" style={nepaliTextStyle(15)}>{label}</Text>
      {detail ? <Text className="text-caption text-muted-foreground">{detail}</Text> : null}
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptics.tick();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn("rounded-full border px-3 py-1.5 active:opacity-70", active ? "border-secondary bg-secondary" : "border-border bg-background")}
    >
      <Text className={cn("text-caption font-medium", active ? "text-secondary-foreground" : "text-foreground")} style={nepaliTextStyle(14)}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Hours and minutes (5-minute steps), each with up / down — the time pill's editor. */
function TimeStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { digits } = useLocale();
  const colors = useThemeColors();
  const [h, m] = value.split(":").map(Number);
  const set = (nh: number, nm: number) => onChange(`${pad(((nh % 24) + 24) % 24)}:${pad(((nm % 60) + 60) % 60)}`);
  const Step = ({ icon, onPress }: { icon: "chevron-up" | "chevron-down"; onPress: () => void }) => (
    <Pressable onPress={() => { haptics.tick(); onPress(); }} hitSlop={6} accessibilityRole="button" className="h-9 w-14 items-center justify-center rounded-xl bg-background active:opacity-60">
      <Ionicons name={icon} size={18} color={colors.foreground} />
    </Pressable>
  );
  return (
    <View className="flex-row items-center justify-center gap-6 py-3">
      <View className="items-center gap-1">
        <Step icon="chevron-up" onPress={() => set((h ?? 0) + 1, m ?? 0)} />
        <Text className="text-title font-semibold text-foreground">{digits(pad(h ?? 0))}</Text>
        <Step icon="chevron-down" onPress={() => set((h ?? 0) - 1, m ?? 0)} />
      </View>
      <Text className="text-title font-semibold text-foreground">:</Text>
      <View className="items-center gap-1">
        <Step icon="chevron-up" onPress={() => set(h ?? 0, (m ?? 0) + 5 - ((m ?? 0) % 5))} />
        <Text className="text-title font-semibold text-foreground">{digits(pad(m ?? 0))}</Text>
        <Step icon="chevron-down" onPress={() => set(h ?? 0, (m ?? 0) - ((m ?? 0) % 5 || 5))} />
      </View>
    </View>
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
