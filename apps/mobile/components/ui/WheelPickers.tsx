import { useState, type ReactNode } from "react";
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
  const years = Array.from({ length: 151 }, (_, i) => nowYear - 140 + i).reverse();
  const maxDay = daysIn(era, draft.y, draft.m);
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
        <Wheel value={draft.d} items={Array.from({ length: maxDay }, (_, i) => ({ value: i + 1, label: digits(i + 1) }))} onChange={(d) => setDraft({ ...draft, d })} />
        <Wheel flex={2} value={draft.m} items={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: monthName(i + 1) }))} onChange={(m) => setDraft({ ...draft, m })} />
        <Wheel value={draft.y} items={years.map((y) => ({ value: y, label: digits(y) }))} onChange={(y) => setDraft({ ...draft, y })} />
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
            <Wheel
              value={draft.h % 12 || 12}
              items={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: digits(i + 1) }))}
              onChange={(h12) => setDraft({ ...draft, h: (h12 % 12) + (draft.h >= 12 ? 12 : 0) })}
            />
            <Wheel value={draft.m} items={Array.from({ length: 60 }, (_, i) => ({ value: i, label: digits(pad(i)) }))} onChange={(m) => setDraft({ ...draft, m })} />
            <Wheel
              value={draft.h >= 12 ? 1 : 0}
              items={am.map((label, i) => ({ value: i, label }))}
              onChange={(pm) => setDraft({ ...draft, h: (draft.h % 12) + (pm ? 12 : 0) })}
            />
          </>
        ) : (
          <>
            <Wheel value={draft.h} items={Array.from({ length: 24 }, (_, i) => ({ value: i, label: digits(pad(i)) }))} onChange={(h) => setDraft({ ...draft, h })} />
            <Wheel value={draft.m} items={Array.from({ length: 60 }, (_, i) => ({ value: i, label: digits(pad(i)) }))} onChange={(m) => setDraft({ ...draft, m })} />
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

function Wheel({ value, items, onChange, flex = 1 }: { value: number; items: { value: number; label: string }[]; onChange: (v: number) => void; flex?: number }) {
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
}
