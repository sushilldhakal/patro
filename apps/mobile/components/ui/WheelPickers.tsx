import { memo, useMemo, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { adMonthLabel, bsMonthLabel, getBSMonthLength, getCurrentBs } from "@vedic-patro/domain/calendar/bs-calendar";
import { webTypeScale } from "@vedic-patro/design-tokens";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useClockStyle } from "@/lib/clock-pref";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

/**
 * Tap-to-pick fields for a birth date (year / month / day wheels, in BS or AD) and a time (hour /
 * minute wheels, 12- or 24-hour as the reader's clock), each in a bottom sheet with Cancel and Done.
 * Values stay in the form's own strings: "YYYY-MM-DD" and "HH:MM".
 */

const pad = (n: number) => String(n).padStart(2, "0");

function daysIn(era: string, year: number, month: number): number {
  if (era === "ad") return new Date(Date.UTC(year, month, 0)).getUTCDate();
  try {
    return getBSMonthLength(year, month);
  } catch {
    return 32; // outside the table: let the reader pick, the form checks the date
  }
}

export function DateField({ value, era, onChange, placeholder }: { value: string; era: string; onChange: (v: string) => void; placeholder: string }) {
  const { lang, digits } = useLocale();
  const nowYear = era === "ad" ? new Date().getFullYear() : getCurrentBs().year;
  const parsed = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const init = parsed
    ? { y: Number(parsed[1]), m: Number(parsed[2]), d: Number(parsed[3]) }
    : { y: nowYear - 25, m: 1, d: 1 };
  const [draft, setDraft] = useState(init);
  const [open, setOpen] = useState(false);
  const monthName = (m: number) => (era === "ad" ? adMonthLabel(m, lang) : bsMonthLabel(m, lang));
  const maxDay = daysIn(era, draft.y, draft.m);
  // Stable props: the native iOS picker reloads every column on any prop update, and a reload
  // while the reader is touching another column frees cells mid hit-test (Sentry PATRO-15).
  const dayItems = useMemo(() => Array.from({ length: maxDay }, (_, i) => ({ value: i + 1, label: digits(i + 1) })), [maxDay, digits]);
  const monthItems = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: era === "ad" ? adMonthLabel(i + 1, lang) : bsMonthLabel(i + 1, lang) })),
    [era, lang],
  );
  const yearItems = useMemo(
    () => Array.from({ length: 151 }, (_, i) => nowYear + 10 - i).map((y) => ({ value: y, label: digits(y) })),
    [nowYear, digits],
  );
  const setDay = useMemo(() => (d: number) => setDraft((prev) => ({ ...prev, d })), []);
  const setMonth = useMemo(() => (m: number) => setDraft((prev) => ({ ...prev, m })), []);
  const setYear = useMemo(() => (y: number) => setDraft((prev) => ({ ...prev, y })), []);
  const shown = parsed ? `${digits(init.d)} ${monthName(init.m)} ${digits(init.y)}` : "";

  return (
    <>
      <FieldButton
        icon="calendar-outline"
        label={shown || placeholder}
        empty={!shown}
        onPress={() => {
          setDraft(init);
          setOpen(true);
        }}
      />
      <WheelSheet
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => {
          onChange(`${draft.y}-${pad(draft.m)}-${pad(Math.min(draft.d, maxDay))}`);
          setOpen(false);
        }}
      >
        <Wheel value={draft.d} items={dayItems} onChange={setDay} />
        <Wheel flex={2} value={draft.m} items={monthItems} onChange={setMonth} />
        <Wheel value={draft.y} items={yearItems} onChange={setYear} />
      </WheelSheet>
    </>
  );
}

export function TimeField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const { t, digits } = useLocale();
  const twelve = useClockStyle() === "12";
  const parsed = /^(\d{1,2}):(\d{2})$/.exec(value);
  const init = parsed ? { h: Number(parsed[1]), m: Number(parsed[2]) } : { h: 6, m: 0 };
  const [draft, setDraft] = useState(init);
  const [open, setOpen] = useState(false);
  const am = [t("ui.time.am"), t("ui.time.pm")];
  const amPm = am.join("|");
  const hour12Items = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: digits(i + 1) })), [digits]);
  const hour24Items = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ value: i, label: digits(pad(i)) })), [digits]);
  const minuteItems = useMemo(() => Array.from({ length: 60 }, (_, i) => ({ value: i, label: digits(pad(i)) })), [digits]);
  const amPmItems = useMemo(() => amPm.split("|").map((label, i) => ({ value: i, label })), [amPm]);
  const setHour12 = useMemo(() => (h12: number) => setDraft((prev) => ({ ...prev, h: (h12 % 12) + (prev.h >= 12 ? 12 : 0) })), []);
  const setPm = useMemo(() => (pm: number) => setDraft((prev) => ({ ...prev, h: (prev.h % 12) + (pm ? 12 : 0) })), []);
  const setHour = useMemo(() => (h: number) => setDraft((prev) => ({ ...prev, h })), []);
  const setMinute = useMemo(() => (m: number) => setDraft((prev) => ({ ...prev, m })), []);
  const shown = parsed
    ? twelve
      ? `${digits(init.h % 12 || 12)}:${digits(pad(init.m))} ${am[init.h < 12 ? 0 : 1]}`
      : digits(`${pad(init.h)}:${pad(init.m)}`)
    : "";

  return (
    <>
      <FieldButton
        icon="time-outline"
        label={shown || placeholder}
        empty={!shown}
        onPress={() => {
          setDraft(init);
          setOpen(true);
        }}
      />
      <WheelSheet
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => {
          onChange(`${pad(draft.h)}:${pad(draft.m)}`);
          setOpen(false);
        }}
      >
        {twelve ? (
          <>
            <Wheel value={draft.h % 12 || 12} items={hour12Items} onChange={setHour12} />
            <Wheel value={draft.m} items={minuteItems} onChange={setMinute} />
            <Wheel value={draft.h >= 12 ? 1 : 0} items={amPmItems} onChange={setPm} />
          </>
        ) : (
          <>
            <Wheel value={draft.h} items={hour24Items} onChange={setHour} />
            <Wheel value={draft.m} items={minuteItems} onChange={setMinute} />
          </>
        )}
      </WheelSheet>
    </>
  );
}

function FieldButton({ icon, label, empty, onPress }: { icon: "calendar-outline" | "time-outline"; label: string; empty: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="h-12 flex-row items-center gap-3 rounded-xl border border-border bg-card px-4 active:bg-muted"
    >
      <Text className={empty ? "flex-1 text-base text-muted-foreground" : "flex-1 text-base text-foreground"} style={nepaliTextStyle(16)}>
        {label}
      </Text>
      <Ionicons name={icon} size={20} color={colors.mutedForeground} />
    </Pressable>
  );
}

function WheelSheet({ open, onClose, onDone, children }: { open: boolean; onClose: () => void; onDone: () => void; children: ReactNode }) {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <BottomSheetModal visible={open} onClose={onClose} variant="bottom" sheetStyle={{ backgroundColor: colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Pressable onPress={onClose} hitSlop={8}>
          <Text className="text-lg text-muted-foreground">{t("common.cancel")}</Text>
        </Pressable>
        <Pressable onPress={onDone} hitSlop={8}>
          <Text className="text-lg font-semibold text-secondary">{t("common.done")}</Text>
        </Pressable>
      </View>
      <View className="flex-row px-2 pb-6">{children}</View>
    </BottomSheetModal>
  );
}

const Wheel = memo(function Wheel({ value, items, onChange, flex = 1 }: { value: number; items: { value: number; label: string }[]; onChange: (v: number) => void; flex?: number }) {
  const colors = useThemeColors();
  return (
    <View style={{ flex }}>
      <Picker selectedValue={value} onValueChange={(v) => onChange(Number(v))} itemStyle={{ color: colors.foreground, fontSize: webTypeScale.xl.size }}>
        {items.map((it) => (
          <Picker.Item key={it.value} label={it.label} value={it.value} color={colors.foreground} />
        ))}
      </Picker>
    </View>
  );
});
