import { Platform } from "react-native";
import { fetchPatroMonth, type PatroDay } from "@vedic-patro/api-client";
import { bsFromCivilIso, formatDigits } from "@vedic-patro/domain/calendar/bs-calendar";
import { tFor } from "@vedic-patro/i18n/runtime";
import { requireOptionalNativeModule } from "expo";
import type { TodayWidgetProps } from "@/widgets/today-widget-props";

type Widget = { updateSnapshot(props: TodayWidgetProps): void };
let widget: Widget | null | undefined;

/**
 * The widget, loaded only when this build has expo-widgets' native module. A top-level import
 * would throw in builds made before the widget was added (app updates reach those too).
 */
function todayWidget(): Widget | null {
  if (widget !== undefined) return widget;
  widget = null;
  if (Platform.OS === "web" || !requireOptionalNativeModule("ExpoWidgets")) return widget;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    widget = (require("../../widgets/TodayWidget") as { default: Widget }).default;
  } catch {
    widget = null;
  }
  return widget;
}
import { occurrences } from "@/lib/events/alerts";
import type { CalendarEvent } from "@/lib/events/api";
import { isoToZoned, shiftDate, todayIn } from "@/lib/events/time";


/**
 * Refresh the home-screen widget: today's BS date, weekday and tithi, the next festival (this
 * month or the next) and the user's next event. Called on each notification sync; a failure only
 * leaves the last snapshot in place.
 */
export async function refreshTodayWidget(options: {
  lang: "ne" | "en";
  timezone: string;
  events: CalendarEvent[];
}): Promise<void> {
  const TodayWidget = todayWidget();
  if (!TodayWidget) return;
  const { lang, timezone, events } = options;
  const digits = (s: string | number) => formatDigits(s, lang);
  const today = todayIn(timezone);
  const bs = bsFromCivilIso(today);
  const next = bs.month === 12 ? { year: bs.year + 1, month: 1 } : { year: bs.year, month: bs.month + 1 };
  const months = await Promise.all([
    fetchPatroMonth(bs.year, bs.month).catch(() => null),
    fetchPatroMonth(next.year, next.month).catch(() => null),
  ]);
  const days: PatroDay[] = months.flatMap((m) => m?.days ?? []);
  const todayRow = days.find((d) => d.date === today);

  const bsLabel = (iso: string) => {
    const b = bsFromCivilIso(iso);
    return `${b.monthName} ${digits(b.day)}`;
  };
  const whenLabel = (iso: string) =>
    iso === today ? tFor(lang, "widgets.today") : iso === shiftDate(today, 1) ? tFor(lang, "widgets.tomorrow") : bsLabel(iso);

  const festivalDay = days.find((d) => d.date >= today && d.festivals.length > 0);
  const festival = festivalDay?.festivals[0];

  const now = Date.now();
  let nextEvent: { title: string; at: number } | null = null;
  for (const event of events) {
    const at = occurrences(event, now, now + 30 * 86_400_000)[0];
    if (at != null && (!nextEvent || at < nextEvent.at)) nextEvent = { title: event.title, at };
  }

  const props: TodayWidgetProps = {
    bsDate: `${bs.monthName} ${digits(bs.day)}, ${digits(bs.year)}`,
    weekday: (lang === "en" ? todayRow?.weekday : todayRow?.weekday_ne) ?? "",
    tithi: (lang === "en" ? todayRow?.tithi : todayRow?.tithi_ne) ?? "",
    festival: festival ? ((lang === "en" ? festival.name_en : festival.name_ne) ?? festival.name ?? "") : "",
    festivalWhen: festivalDay ? whenLabel(festivalDay.date) : "",
    event: nextEvent?.title ?? "",
    eventWhen: nextEvent
      ? (() => {
          const z = isoToZoned(new Date(nextEvent.at).toISOString(), timezone);
          return `${whenLabel(z.date)} ${digits(z.time)}`;
        })()
      : "",
  };
  try {
    TodayWidget.updateSnapshot(props);
  } catch {
    /* no widget support (Expo Go, old build) */
  }
}
