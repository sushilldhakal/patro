import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { AddReminderForm } from "@/components/reminders/AddReminderForm";
import { useReminderPrep, type ReminderTarget } from "@/components/reminders/use-window-reminder";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import type { PanchangaDay } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { resolveWindowKey } from "@/lib/notifications/window-key";
import { useThemeColors } from "@/lib/theme-context";
import { getMuhurtaRows } from "@vedic-patro/read-models/panchanga/panchanga-format";
import { illustration } from "@vedic-patro/design-tokens";

const GOOD = illustration.green36;
const BAD = illustration.red46;

type Row = { label: string; value: string };

function TimesGroup({
  title,
  rows,
  color,
  onRemind,
}: {
  title: string;
  rows: Row[];
  color: string;
  onRemind: (row: Row) => void;
}) {
  const { t, digits } = useLocale();
  if (rows.length === 0) return null;
  return (
    <View className="overflow-hidden rounded-xl border border-border bg-card">
      <View className="border-b border-border px-4 py-2.5" style={{ borderTopWidth: 3, borderTopColor: color }}>
        <Text className="text-body font-bold" style={[nepaliTextStyle(15), { color }]}>
          {title}
        </Text>
      </View>
      {rows.map((row, i) => (
        <View
          key={`${row.label}-${row.value}`}
          className={i < rows.length - 1 ? "flex-row items-center gap-3 border-b border-border px-4 py-2.5" : "flex-row items-center gap-3 px-4 py-2.5"}
        >
          <Text className="text-caption w-5 text-muted-foreground">{digits(i + 1)}</Text>
          <View className="min-w-0 flex-1">
            <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(14)}>
              {row.label}
            </Text>
            <Text className="text-body font-num" style={[nepaliTextStyle(13), { color }]}>
              {row.value}
            </Text>
          </View>
          <Pressable
            onPress={() => onRemind(row)}
            accessibilityRole="button"
            accessibilityLabel={`${t("ui.home.set_a_reminder")} · ${row.label}`}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full border border-border active:opacity-70"
          >
            <Ionicons name="alarm-outline" size={20} color={color} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

/**
 * "Set a reminder / alarm" card under the Veda mantra. It opens a sheet listing the day's
 * शुभ / अशुभ times; the alarm on a time turns the same sheet into the new-reminder form
 * (one sheet, not one on top of another).
 */
export function HomeReminderCard({ p }: { p: PanchangaDay | undefined }) {
  const { t, lang } = useLocale();
  const colors = useThemeColors();
  const prep = useReminderPrep();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ReminderTarget | null>(null);

  const rows = p ? getMuhurtaRows(p, lang) : [];
  const bad = rows.filter((r) => !r.auspicious);
  const good = rows.filter((r) => r.auspicious);

  const close = () => {
    setOpen(false);
    setTarget(null);
  };

  const remind = async (row: Row) => {
    if (!(await prep.prepare())) {
      setOpen(false);
      return;
    }
    setTarget({
      windowKey: resolveWindowKey({ ne: row.label, en: row.label }),
      subtitle: `${row.label} · ${row.value.split("\n")[0]}`,
    });
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("ui.home.reminder_card_title")}
        className="active:opacity-80"
      >
        <Card className="flex-row items-center gap-3 px-4 py-3.5">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-secondary/10">
            <Ionicons name="alarm-outline" size={22} color={colors.secondary} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(15)}>
              {t("ui.home.reminder_card_title")}
            </Text>
            <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(13)}>
              {t("ui.home.reminder_card_body")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
        </Card>
      </Pressable>

      <BottomSheetModal visible={open} onClose={close} maxHeight="88%">
        {target ? (
          <View>
            <Pressable
              onPress={() => setTarget(null)}
              accessibilityRole="button"
              accessibilityLabel={t("ui.home.reminder_sheet_title")}
              hitSlop={8}
              className="flex-row items-center gap-1 px-4 pt-3"
            >
              <Ionicons name="chevron-back" size={18} color={colors.secondary} />
              <Text className="text-body font-semibold text-secondary" style={nepaliTextStyle(14)}>
                {t("ui.home.reminder_sheet_title")}
              </Text>
            </Pressable>
            <AddReminderForm
              active={target != null}
              profiles={prep.profiles}
              online={prep.online}
              initialKey={target.windowKey}
              subtitle={target.subtitle}
              onCreated={async () => {
                close();
                await prep.created();
              }}
            />
          </View>
        ) : (
          <ScrollView contentContainerClassName="gap-4 p-4">
            <View className="gap-0.5">
              <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(18)}>
                {t("ui.home.reminder_sheet_title")}
              </Text>
              <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
                {t("ui.home.reminder_sheet_hint")}
              </Text>
            </View>
            {rows.length === 0 ? (
              <Text className="text-body py-6 text-center text-muted-foreground">
                {t("ui.home.muhurta_details_unavailable")}
              </Text>
            ) : (
              <>
                <TimesGroup title={t("ui.home.ashubh_times")} rows={bad} color={BAD} onRemind={(r) => void remind(r)} />
                <TimesGroup title={t("ui.home.shubh_times")} rows={good} color={GOOD} onRemind={(r) => void remind(r)} />
              </>
            )}
          </ScrollView>
        )}
      </BottomSheetModal>
      {prep.authDialog}
    </>
  );
}
