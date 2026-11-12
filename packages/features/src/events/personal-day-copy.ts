/**
 * The words for a profile's personal day (the chip in the planner's all-day row and its details
 * dialog): the tone, why, and what to do, avoid and watch. Shared so the chip and the dialog read the
 * same. Nothing here draws.
 */
import { dashaNotes, strongestReason, type PersonalColumn, type SlotReason } from "./personal-slots";
import type { usePlannerText } from "./use-planner-text";

type Text = Pick<ReturnType<typeof usePlannerText>, "t" | "lang" | "digits">;

const TONE_KEY = {
  best: "calendar.personal_tone_best",
  good: "calendar.personal_tone_good",
  neutral: "calendar.personal_tone_neutral",
  bad: "calendar.personal_tone_bad",
  worst: "calendar.personal_tone_worst",
} as const;

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** "अष्टम चन्द्र", "from 14:20, Saturn retrograde"… one reason in the reader's language. */
export function personalReasonPhrase(reason: SlotReason, tx: Text): string {
  const name = tx.lang === "en" ? reason.nameEn : reason.nameNe;
  const lord = tx.lang === "en" ? reason.lordEn : reason.lordNe;
  const body =
    reason.code === "ashtama" ? tx.t("calendar.personal_ashtama")
    : reason.code === "tara" ? tx.t("calendar.personal_tara", { name: name ?? "" })
    : reason.code === "asta" ? tx.t("calendar.personal_asta", { lord: lord ?? "" })
    : reason.code === "vakri" ? tx.t("calendar.personal_vakri", { lord: lord ?? "" })
    : reason.code === "chandra" ? tx.t("calendar.personal_chandra")
    : reason.code === "weak" ? tx.t("calendar.personal_chandra_weak")
    : reason.code === "janma" ? tx.t("calendar.personal_janma")
    : tx.t("calendar.personal_remedy");
  if (reason.fromMin == null) return body;
  return tx.t("calendar.personal_from", { time: tx.digits(hhmm(reason.fromMin)), reason: body });
}

export type PersonalDayCopy = {
  tone: NonNullable<PersonalColumn["tone"]> | "neutral";
  /** "शुभ", "सामान्य"… */
  toneLabel: string;
  /** The strongest reason, or "" on a plain day. */
  reason: string;
  /** "व्यक्तिगत दिन" */
  heading: string;
  profileName: string;
  /** The running dasha's notes. */
  notes: string[];
  /** Do / don't / be careful, each only when it has lines. These are the day's general rules
   *  (weekday, tithi, Rahu kaal), the same for everyone — `generalHeading` says so. */
  sections: { label: string; lines: string[] }[];
  generalHeading: string;
  /** "राशिफल हेर्नुहोस्": the link to the rashifal page at the foot of the details. */
  viewRashifal: string;
  /** The profile's own reading, when the API sent one. */
  reading: {
    heading: string;
    percent: string | null;
    paragraph: string;
    dasha: string | null;
    areasHeading: string;
    areas: { key: string; label: string; tone: Tone; percent: number; percentText: string }[];
    gocharHeading: string;
    gochar: { key: string; graha: string; where: string; favourable: boolean; retrograde: boolean }[];
  } | null;
};

type Tone = "best" | "good" | "neutral" | "bad" | "worst";

export function personalDayCopy(column: PersonalColumn, tx: Text): PersonalDayCopy {
  const tone = column.tone ?? "neutral";
  const reason = strongestReason(column);
  const en = tx.lang === "en";
  const sections = [
    { label: tx.t("calendar.personal_do"), lines: en ? column.doEn : column.doNe },
    { label: tx.t("calendar.personal_dont"), lines: en ? column.dontEn : column.dontNe },
    { label: tx.t("calendar.personal_careful"), lines: en ? column.carefulEn : column.carefulNe },
  ].filter((section) => section.lines.length > 0);
  return {
    tone,
    toneLabel: tx.t(TONE_KEY[tone]),
    reason: reason ? personalReasonPhrase(reason, tx) : "",
    heading: tx.t("calendar.personal_day"),
    profileName: column.profileName,
    notes: dashaNotes(column).map((note) => personalReasonPhrase(note, tx)),
    sections,
    generalHeading: tx.t("calendar.personal_general"),
    viewRashifal: tx.t("calendar.personal_view_rashifal"),
    reading: readingCopy(column.reading, tx),
  };
}

function readingCopy(reading: PersonalColumn["reading"], tx: Text): PersonalDayCopy["reading"] {
  if (!reading) return null;
  const en = tx.lang === "en";
  const { maha, antar } = reading.dasha;
  return {
    heading: tx.t("calendar.personal_reading"),
    percent: reading.percent == null ? null : tx.digits(`${reading.percent}%`),
    paragraph: en ? reading.prediction_en : reading.prediction_ne,
    dasha: maha && antar ? tx.t("calendar.personal_dasha_line", { maha: en ? maha.lord_en : maha.lord_ne, antar: en ? antar.lord_en : antar.lord_ne }) : null,
    areasHeading: tx.t("calendar.personal_areas"),
    areas: reading.domains.map((d) => ({ key: d.key, label: en ? d.label_en : d.label_ne, tone: d.tone, percent: d.percent, percentText: tx.digits(`${d.percent}%`) })),
    gocharHeading: tx.t("calendar.personal_gochar"),
    gochar: reading.gochar.map((g) => ({
      key: g.graha,
      graha: en ? g.graha_en : g.graha_ne,
      where: `${en ? g.sign_en : g.sign_ne} · ${tx.t("calendar.personal_house", { n: tx.digits(g.house) })}${g.retrograde ? ` · ${tx.t("calendar.personal_retro")}` : ""}`,
      favourable: g.favourable,
      retrograde: g.retrograde,
    })),
  };
}
