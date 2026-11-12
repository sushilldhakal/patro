import { useContext, type ComponentProps, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { isoToZoned } from "@vedic-patro/domain/calendar/event-time";
import { cn } from "@vedic-patro/design-tokens/cn";
import { PlannerPrimaryDateContext, daysBetween, personalDayCopy, useEventLabels, usePlannerText, type PersonalColumn } from "@vedic-patro/features/events";
import { haptics } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Text } from "@/components/ui/Text";
import { deleteEvent, type CalendarEvent } from "@/lib/events/api";
import { exportToPhoneCalendar } from "@/lib/events/device-calendars";
import { notifyRemindersChanged } from "@/lib/menu-request";
import { afterRemindersChanged } from "@/lib/notifications/triggers";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

/** What was tapped on the calendar: one of the user's events, or a day's festival or holiday. */
export type CalendarDetail =
  | { kind: "event"; event: CalendarEvent }
  | { kind: "mark"; date: string; name: string; holiday: boolean }
  | { kind: "personal"; date: string; column: PersonalColumn };

type IconName = ComponentProps<typeof Ionicons>["name"];

const KIND_STYLE = {
  event: { bar: "bg-primary", ink: "text-primary", chip: "bg-saffron/15" },
  task: { bar: "bg-success", ink: "text-success", chip: "bg-success/15" },
  appointment: { bar: "bg-warning", ink: "text-warning", chip: "bg-warning/20" },
  holiday: { bar: "bg-danger", ink: "text-danger", chip: "bg-vermilion/10" },
  festival: { bar: "bg-warning", ink: "text-warning", chip: "bg-warning/15" },
  good: { bar: "bg-success", ink: "text-success", chip: "bg-success/10" },
  neutral: { bar: "bg-muted-foreground", ink: "text-muted-foreground", chip: "bg-muted" },
  bad: { bar: "bg-warning", ink: "text-warning", chip: "bg-warning/15" },
  worst: { bar: "bg-danger", ink: "text-danger", chip: "bg-vermilion/10" },
} as const;

const TONE_STYLE = { best: "good", good: "good", neutral: "neutral", bad: "bad", worst: "worst" } as const;
const TONE_INK = { best: "text-success", good: "text-success", neutral: "text-muted-foreground", bad: "text-warning", worst: "text-danger" } as const;
const TONE_FILL = { best: "bg-success", good: "bg-success", neutral: "bg-muted-foreground", bad: "bg-warning", worst: "bg-danger" } as const;

const kindOf = (e: CalendarEvent): "event" | "task" | "appointment" =>
  e.kind === "task" || e.kind === "reminder" ? "task" : e.kind === "appointment" ? "appointment" : "event";

/**
 * Apple Calendar's event details: a colour bar and the title, a grouped card of when / where /
 * repeat / alerts, the notes, then Edit and Delete. A popover-sized card in the middle on a tablet,
 * a sheet from the bottom on a phone (BottomSheetModal picks). Festivals and holidays open the same
 * card, with the day's panchanga one tap away.
 */
export function EventDetailSheet({
  detail,
  todayAd,
  onClose,
  onEdit,
  onDismissed,
  primaryDate = "bs",
}: {
  detail: CalendarDetail | null;
  todayAd: string;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  /** The card has finished going away: safe to open the edit form (two sheets at once fight on iOS). */
  onDismissed?: () => void;
  /** The calendar the page leads with (वि.सं. / ई.सं.): the card's date follows it. */
  primaryDate?: "bs" | "ad";
}) {
  const insets = useSafeAreaInsets();
  return (
    /* The home-indicator inset goes inside the scroll, not under it, so the card scrolls to the
       bottom edge instead of stopping above an empty strip. */
    <BottomSheetModal visible={detail != null} onClose={onClose} onDismissed={onDismissed} maxHeight="88%" sheetStyle={{ paddingBottom: 0 }}>
      {detail ? (
        <PlannerPrimaryDateContext.Provider value={primaryDate}>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom }} bounces={false}>
            <DetailBody detail={detail} todayAd={todayAd} onClose={onClose} onEdit={onEdit} />
          </ScrollView>
        </PlannerPrimaryDateContext.Provider>
      ) : null}
    </BottomSheetModal>
  );
}

function DetailBody({ detail, todayAd, onClose, onEdit }: { detail: CalendarDetail; todayAd: string; onClose: () => void; onEdit: (event: CalendarEvent) => void }) {
  const { t, lang } = useLocale();
  const labels = useEventLabels(todayAd);
  const router = useRouter();
  const queryClient = useQueryClient();
  const tx = usePlannerText();
  const fromToday = useFromToday(todayAd);
  const en = lang === "en";
  const colors = useThemeColors();
  const isAd = useContext(PlannerPrimaryDateContext) === "ad";
  /** The line under "आज" / "Fri, Kartik 21, 2083": the full date in the page's calendar when the
   *  first line is a word (today, tomorrow); the AD date only when the page leads with AD. */
  const dateSub = (iso: string) => {
    if (isAd) return adLong(iso, en);
    return labels.day(iso).includes(labels.bsDate(iso)) ? undefined : tx.dayHeading(iso);
  };

  if (detail.kind === "personal") {
    const copy = personalDayCopy(detail.column, tx);
    const style = KIND_STYLE[TONE_STYLE[copy.tone]];
    const { reading } = copy;
    return (
      <View className="gap-4 px-5 pb-6 pt-2">
        <Heading
          title={copy.reason ? `${copy.toneLabel} · ${copy.reason}` : copy.toneLabel}
          kindLabel={reading?.percent ? `${copy.heading} · ${reading.percent}` : copy.heading}
          style={style}
          onClose={onClose}
        />
        <Group>
          <Row icon="calendar-outline" primary={labels.day(detail.date)} secondary={dateSub(detail.date)} badge={fromToday(detail.date)} />
          <Row icon="person-outline" primary={copy.profileName} />
          {reading?.dasha ? <Row icon="planet-outline" primary={reading.dasha} /> : null}
          {copy.notes.map((note) => (
            <Row key={note} icon="alert-circle-outline" primary={note} />
          ))}
        </Group>

        {reading?.paragraph ? (
          <Group>
            <View className="gap-1.5 px-4 py-3">
              <Text className="text-caption font-semibold text-muted-foreground">{reading.heading}</Text>
              <Text selectable className="text-body leading-relaxed text-foreground" style={nepaliTextStyle(16)}>{reading.paragraph}</Text>
            </View>
          </Group>
        ) : null}

        {reading && reading.areas.length > 0 ? (
          <Group>
            <View className="gap-3 px-4 py-3">
              <Text className="text-caption font-semibold text-muted-foreground">{reading.areasHeading}</Text>
              {reading.areas.map((area) => (
                <View key={area.key} className="gap-1">
                  <View className="flex-row items-baseline justify-between">
                    <Text className="text-body text-foreground" style={nepaliTextStyle(15)}>{area.label}</Text>
                    <Text className={cn("font-num text-caption font-semibold", TONE_INK[area.tone])}>{area.percentText}</Text>
                  </View>
                  <View className="h-1.5 overflow-hidden rounded-full bg-background">
                    <View className={cn("h-full rounded-full", TONE_FILL[area.tone])} style={{ width: `${Math.max(4, Math.min(100, area.percent))}%` }} />
                  </View>
                </View>
              ))}
            </View>
          </Group>
        ) : null}

        {reading && reading.gochar.length > 0 ? (
          <Group>
            <View className="gap-2 px-4 py-3">
              <Text className="text-caption font-semibold text-muted-foreground">{reading.gocharHeading}</Text>
              {reading.gochar.map((g) => (
                <View key={g.key} className="flex-row items-center gap-2.5">
                  <View className={cn("h-2 w-2 rounded-full", g.favourable ? "bg-success" : "bg-danger")} />
                  <Text className="w-20 text-body font-medium text-foreground" style={nepaliTextStyle(15)}>{g.graha}</Text>
                  <Text className="min-w-0 flex-1 text-caption text-muted-foreground">{g.where}</Text>
                </View>
              ))}
            </View>
          </Group>
        ) : null}

        {copy.sections.length > 0 ? (
          <View className="gap-2">
            <Text className="px-1 text-caption font-semibold text-muted-foreground">{copy.generalHeading}</Text>
            {copy.sections.map((section) => (
              <Group key={section.label}>
                <View className="gap-1.5 px-4 py-3">
                  <Text className="text-caption font-semibold text-muted-foreground">{section.label}</Text>
                  {section.lines.map((line) => (
                    <View key={line} className="flex-row gap-2">
                      <Text className="text-body text-muted-foreground">•</Text>
                      <Text selectable className="min-w-0 flex-1 text-body text-foreground" style={nepaliTextStyle(16)}>{line}</Text>
                    </View>
                  ))}
                </View>
              </Group>
            ))}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="link"
          onPress={() => {
            haptics.tick();
            onClose();
            router.push("/rashifal" as never);
          }}
          className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-muted active:opacity-70"
          style={{ borderCurve: "continuous" }}
        >
          <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(16)}>{copy.viewRashifal}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
        </Pressable>
      </View>
    );
  }

  if (detail.kind === "mark") {
    const style = KIND_STYLE[detail.holiday ? "holiday" : "festival"];
    return (
      <View className="gap-4 px-5 pb-6 pt-2">
        <Heading title={detail.name} kindLabel={t(detail.holiday ? "sections.public_holiday" : "holidays.festival")} style={style} onClose={onClose} />
        <Group>
          <Row icon="calendar-outline" primary={labels.day(detail.date)} secondary={dateSub(detail.date)} badge={fromToday(detail.date)} />
          <Row icon="sunny-outline" primary={t("events.all_day")} />
        </Group>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.tick();
            onClose();
            router.push(`/day/${detail.date}` as never);
          }}
          className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-muted active:opacity-70"
          style={{ borderCurve: "continuous" }}
        >
          <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(16)}>{t("events.open_day")}</Text>
        </Pressable>
      </View>
    );
  }

  const { event } = detail;
  const kind = kindOf(event);
  const style = KIND_STYLE[kind];
  const start = isoToZoned(event.starts_at, event.timezone);
  const end = isoToZoned(event.ends_at, event.timezone);
  const multiDay = end.date !== start.date;
  const timeLine = event.all_day
    ? t("events.all_day")
    : event.ends_at && event.ends_at !== event.starts_at
      ? `${labels.clock(start.time)} – ${labels.clock(end.time)}`
      : labels.clock(start.time);

  const remove = () =>
    Alert.alert(event.title, undefined, [
      { text: t("events.cancel"), style: "cancel" },
      {
        text: t("events.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteEvent(event.id);
          onClose();
          void queryClient.invalidateQueries({ queryKey: ["events"] });
          void afterRemindersChanged(en ? "en" : "ne", true);
          notifyRemindersChanged();
          void exportToPhoneCalendar().catch(() => 0);
        },
      },
    ]);

  return (
    <View className="gap-4 px-5 pb-6 pt-2">
      <Heading title={event.title} kindLabel={t(`events.kind_${kind}`)} style={style} onClose={onClose} />

      <Group>
        <Row
          icon="calendar-outline"
          primary={multiDay ? `${labels.day(start.date)} – ${labels.day(end.date)}` : labels.day(start.date)}
          secondary={multiDay ? (isAd ? `${adLong(start.date, en)} – ${adLong(end.date, en)}` : undefined) : dateSub(start.date)}
          badge={fromToday(start.date)}
        />
        <Row icon="time-outline" primary={timeLine} secondary={event.all_day ? undefined : labels.zone(event.timezone)} />
        {event.repeat !== "never" ? <Row icon="repeat-outline" primary={t(`events.repeat_${event.repeat}`)} /> : null}
        {event.location ? <Row icon="location-outline" primary={event.location} selectable /> : null}
        {event.alerts.length > 0 ? <Row icon="notifications-outline" primary={event.alerts.map((m) => labels.alert(m)).join(" · ")} /> : null}
        {event.invitees.length > 0 ? <Row icon="people-outline" primary={event.invitees.join(", ")} selectable /> : null}
      </Group>

      {event.notes ? (
        <Group>
          <View className="gap-1 px-4 py-3">
            <Text className="text-caption font-medium text-muted-foreground">{t("events.notes")}</Text>
            <Text selectable className="text-body text-foreground" style={nepaliTextStyle(16)}>{event.notes}</Text>
          </View>
        </Group>
      ) : null}

      <View className="flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.tick();
            onEdit(event);
          }}
          className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-secondary active:opacity-80"
          style={{ borderCurve: "continuous" }}
        >
          <Text className="text-body font-semibold text-secondary-foreground" style={nepaliTextStyle(16)}>{t("events.edit")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={remove}
          className="min-h-12 flex-1 items-center justify-center rounded-2xl bg-destructive/10 active:opacity-70"
          style={{ borderCurve: "continuous" }}
        >
          <Text className="text-body font-semibold text-destructive" style={nepaliTextStyle(16)}>{t("events.delete")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * "In 12 days", "3 days ago": how far the date is from today. Nothing for today, tomorrow and
 * yesterday — the date line already says those words.
 */
function useFromToday(todayAd: string) {
  const { t, digits } = useLocale();
  return (iso: string) => {
    const n = daysBetween(todayAd, iso);
    if (Math.abs(n) <= 1) return undefined;
    return n > 0 ? t("events.in_days", { count: digits(n) }) : t("events.days_ago", { count: digits(-n) });
  };
}

/** "7 November 2026" beside the BS date. */
function adLong(iso: string, en: boolean) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(en ? "en-GB" : "ne-NP", { day: "numeric", month: "long", year: "numeric" });
}

function Heading({ title, kindLabel, style, onClose }: { title: string; kindLabel: string; style: (typeof KIND_STYLE)[keyof typeof KIND_STYLE]; onClose: () => void }) {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <View className="flex-row items-start gap-3">
      <View className={cn("mt-1 w-1.5 self-stretch rounded-full", style.bar)} />
      <View className="min-w-0 flex-1 gap-1.5">
        <Text selectable className="text-2xl font-bold leading-tight text-foreground" style={nepaliTextStyle(24)}>{title}</Text>
        <View className={cn("self-start rounded-full px-2.5 py-0.5", style.chip)}>
          <Text className={cn("text-caption font-semibold", style.ink)}>{kindLabel}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.close")}
        onPress={onClose}
        hitSlop={8}
        className="h-8 w-8 items-center justify-center rounded-full bg-muted active:opacity-70"
      >
        <Ionicons name="close" size={18} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

function Group({ children }: { children: ReactNode }) {
  return (
    <View className="overflow-hidden rounded-2xl bg-muted" style={{ borderCurve: "continuous" }}>
      {children}
    </View>
  );
}

function Row({ icon, primary, secondary, selectable, badge }: { icon: IconName; primary: string; secondary?: string; selectable?: boolean; badge?: string }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-start gap-3 px-4 py-3">
      <Ionicons name={icon} size={20} color={colors.mutedForeground} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text selectable={selectable} className="text-body text-foreground" style={nepaliTextStyle(16)}>{primary}</Text>
        {secondary ? <Text className="text-caption text-muted-foreground">{secondary}</Text> : null}
      </View>
      {badge ? (
        <View className="rounded-full bg-background px-2.5 py-1">
          <Text className="font-num text-caption font-semibold text-foreground">{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}
