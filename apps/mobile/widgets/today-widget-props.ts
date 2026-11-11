/**
 * What the home-screen widgets show, already in the reader's language and digits.
 * One snapshot feeds both widgets (Today and Month) on both platforms.
 */

/** One row of a day's list. */
export type WidgetItem = {
  /** "१०:१५", "१०:१५–११:००" or "" for all-day */
  time: string;
  title: string;
  /** Colour and icon: a public holiday, a festival, the user's own entries, or a muhurta window. */
  kind: "holiday" | "festival" | "event" | "task" | "appointment" | "shubh" | "ashubh" | "sun";
};

export type WidgetDay = {
  /** "आज" / "भोलि" */
  title: string;
  /** "कार्तिक २५ · बुधबार" */
  sub: string;
  items: WidgetItem[];
};

/** One limb of the day's panchanga: "नक्षत्र" · "अनुराधा" · "११:५३ सम्म". */
export type WidgetAnga = { label: string; value: string; until: string };

/** Labels the layouts print, in the reader's language. */
export type WidgetLabels = {
  allDay: string;
  shubh: string;
  ashubh: string;
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  noEntries: string;
};

/** One square of the month grid. `k` holds flags: t today, h holiday, s Saturday, o outside the month, f festival, e the user's event. */
export type WidgetCell = { d: string; a: string; k: string };

export type TodayWidgetProps = {
  /** Bumps on every refresh; old snapshots without it draw the empty state. */
  v: number;
  /** "कार्तिक २५, २०८३" (kept for builds that still run the first widget layout) */
  bsDate: string;
  weekday: string;
  /** "पञ्चमी" */
  tithi: string;
  /** "कार्तिक शुक्ल द्वितीया" — the lunar month, the paksha and the tithi */
  tithiFull: string;
  /** "१६:०८ सम्म" — when today's tithi ends, or "" */
  tithiUntil: string;
  /** SF Symbol for the moon's phase ("moonphase.waxing.crescent") */
  moonSymbol: string;
  /** The same phase as an emoji, for Android */
  moonEmoji: string;
  /** नक्षत्र, योग, करण, चन्द्र राशि */
  angas: WidgetAnga[];
  moonrise: string;
  moonset: string;
  /** "हेमन्त ऋतु" */
  ritu: string;
  /** The user's events, tasks and appointments (and holidays / a festival) for the coming week, by day. */
  agenda: WidgetDay[];
  labels: WidgetLabels;
  /** "शुक्ल पक्ष" */
  paksha: string;
  /** "२५" */
  day: string;
  /** "कार्तिक" */
  month: string;
  /** "२०८३" */
  year: string;
  /** "Nov 11, 2026" or "११ नोभेम्बर" */
  adDate: string;
  sunrise: string;
  sunset: string;
  /** "कार्तिक २०८३" */
  monthTitle: string;
  /** "Oct – Nov 2026" */
  monthSub: string;
  /** Sunday first: "आ", "सो" … */
  heads: string[];
  /** Whole weeks, Sunday first: 35 or 42 squares. */
  cells: WidgetCell[];
  /** Today, then tomorrow. */
  days: WidgetDay[];
  /** Festivals and holidays to come this month and next, with a date: for the month widget's list. */
  upcoming: WidgetItem[];
  /** "केही छैन" */
  empty: string;
  /** Opens the app on today. */
  url: string;
  /** Old layout fields */
  festival: string;
  festivalWhen: string;
  event: string;
  eventWhen: string;
};

export const EMPTY_WIDGET_PROPS: TodayWidgetProps = {
  v: 0,
  bsDate: "",
  weekday: "",
  tithi: "",
  tithiFull: "",
  tithiUntil: "",
  moonSymbol: "moonphase.waxing.crescent",
  moonEmoji: "",
  angas: [],
  moonrise: "",
  moonset: "",
  ritu: "",
  agenda: [],
  labels: { allDay: "", shubh: "", ashubh: "", sunrise: "", sunset: "", moonrise: "", moonset: "", noEntries: "" },
  paksha: "",
  day: "",
  month: "",
  year: "",
  adDate: "",
  sunrise: "",
  sunset: "",
  monthTitle: "",
  monthSub: "",
  heads: [],
  cells: [],
  days: [],
  upcoming: [],
  empty: "",
  url: "vedicpatro://",
  festival: "",
  festivalWhen: "",
  event: "",
  eventWhen: "",
};
