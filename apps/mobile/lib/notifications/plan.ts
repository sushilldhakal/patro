import type {
  GuidanceDay,
  GuidanceRange,
  GuidanceWindow,
  ReminderRule,
  BriefingSettings,
  RashifalCache,
  RashifalSettings,
} from "./types";
import { WINDOW_OPTIONS, decodeReminderLabel } from "./types";
import { weekdayOf, zonedInstant } from "./zoned";

import { formatDigits } from "@vedic-patro/domain/calendar/bs-calendar";
import { tFor } from "@vedic-patro/i18n/runtime";
/**
 * Pure planning: cached guidance + reminder rules + settings → the notifications
 * to schedule. No I/O, so it is the same on every platform and easy to reason
 * about; `scheduler.ts` is the thin layer that hands the result to the OS.
 */

export type NotificationChannel = "daily-guidance" | "reminders" | "rashifal";

export interface PlannedNotification {
  id: string;
  fireAt: Date;
  title: string;
  body: string;
  channel: NotificationChannel;
  data: Record<string, string>;
}

export interface PlanProfile {
  id: string;
  name: string;
}

export interface PlanInput {
  now: Date;
  lang: "ne" | "en";
  profiles: PlanProfile[];
  guidance: Record<string, GuidanceRange | null | undefined>;
  reminders: ReminderRule[];
  briefing: BriefingSettings;
  rashifal?: { settings: RashifalSettings; cache: RashifalCache | null };
  /** The OS caps pending notifications (iOS: 64) — keep to the nearest `budget`. */
  budget: number;
}

/* Room for the profile's own lines and one shared line; the OS shows the rest when the
   notification is expanded. */
const BODY_LIMIT = 320;

function clip(text: string): string {
  return text.length <= BODY_LIMIT ? text : `${text.slice(0, BODY_LIMIT - 1).trimEnd()}…`;
}

function pickLines(day: GuidanceDay, lang: "ne" | "en", field: "do" | "dont" | "careful"): string[] {
  return lang === "ne" ? day[`${field}_ne`] : day[`${field}_en`];
}

function localDigits(value: number, lang: "ne" | "en"): string {
  return formatDigits(Math.round(value), lang);
}

/**
 * The line that is this profile's own: set by its birth chart read against the day (the tone).
 * The API sends it as `personal_*`; a copy cached before that has it as the last line of "do"
 * (good days) or "careful" (bad days), which is where the API has always appended it.
 */
export function personalLine(day: GuidanceDay, lang: "ne" | "en"): string | null {
  const explicit = lang === "ne" ? day.personal_ne : day.personal_en;
  if (explicit && explicit.length > 0) return explicit[0];
  if (!day.personal_tone) return null;
  const field = day.personal_tone === "bad" || day.personal_tone === "worst" ? "careful" : "do";
  const lines = pickLines(day, lang, field);
  return lines.length > 0 ? lines[lines.length - 1] : null;
}

/** A stable small number from a string, so the pick is the same every time the schedule is rebuilt. */
function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tarabala and chandrabala at sunrise: read from this profile's own janma nakshatra and rashi. */
function balaLine(day: GuidanceDay, lang: "ne" | "en"): string | null {
  const seg = day.personal?.segments?.[0];
  if (!seg) return null;
  const parts: string[] = [];
  if (seg.tara) {
    parts.push(
      tFor(lang, "ui.notifications.tarabala", {
        name: lang === "ne" ? seg.tara.name_ne : seg.tara.name_en,
        state: tFor(lang, `ui.notifications.state_${seg.tara.state}`),
      }),
    );
  }
  if (seg.chandra) {
    parts.push(
      tFor(lang, "ui.notifications.chandrabala", {
        house: localDigits(seg.chandra.house, lang),
        state: tFor(lang, `ui.notifications.state_${seg.chandra.state}`),
      }),
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** The strongest and weakest life area of this profile's day. */
function areasLine(day: GuidanceDay, lang: "ne" | "en"): string | null {
  const scored = (day.reading?.domains ?? []).filter(
    (d): d is typeof d & { percent: number } => typeof d.percent === "number" && !!(lang === "ne" ? d.label_ne : d.label_en),
  );
  if (scored.length < 2) return null;
  const sorted = [...scored].sort((a, b) => b.percent - a.percent);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  if (best.percent === worst.percent) return null;
  const area = (d: typeof best) => `${lang === "ne" ? d.label_ne : d.label_en} ${localDigits(d.percent, lang)}%`;
  return `${tFor(lang, "ui.notifications.strong_area", { area: area(best) })} · ${tFor(lang, "ui.notifications.weak_area", { area: area(worst) })}`;
}

/**
 * What each profile's briefing says: its own day score and tone line, its tarabala and chandrabala,
 * its strongest and weakest life area, then ONE of the day's shared Do / Don't / Careful lines.
 *
 * The shared lines come from the weekday, tithi and day windows, so every profile has the same ones
 * and the weekday line comes back every week. Showing all three first made six profiles read the
 * same, and the same as last Tuesday. Which shared line is shown is picked from the profile and the
 * date, so two profiles on one day, or one profile on two Tuesdays, usually get different ones.
 */
export function briefingBody(day: GuidanceDay, lang: "ne" | "en", profileId = ""): string {
  const labels =
    lang === "ne"
      ? { do: tFor("ne", "ui.reminders.do"), dont: tFor("ne", "ui.reminders.don_t"), careful: tFor("ne", "kundali.caution") }
      : { do: "Do", dont: "Don't", careful: "Careful" };
  const parts: string[] = [];
  const own = personalLine(day, lang);
  if (own) {
    const percent = day.reading?.percent;
    parts.push(typeof percent === "number" ? `${localDigits(percent, lang)}% · ${own}` : own);
  }
  const bala = balaLine(day, lang);
  if (bala) parts.push(bala);
  const areas = areasLine(day, lang);
  if (areas) parts.push(areas);

  const shared: string[] = [];
  for (const field of ["do", "dont", "careful"] as const) {
    for (const line of pickLines(day, lang, field)) {
      if (line !== own) shared.push(`${labels[field]}: ${line}`);
    }
  }
  if (shared.length > 0) {
    // With nothing personal to show (no birth chart), fall back to the first line of each kind.
    if (parts.length === 0) {
      for (const field of ["do", "dont", "careful"] as const) {
        const first = shared.find((line) => line.startsWith(`${labels[field]}: `));
        if (first) parts.push(first);
      }
    } else {
      parts.push(shared[seedOf(`${profileId}|${day.date}`) % shared.length]);
    }
  }
  return clip(parts.length > 0 ? parts.join("\n") : lang === "ne" ? day.summary_ne : day.summary_en);
}

function windowName(w: GuidanceWindow, lang: "ne" | "en"): string {
  const fromOptions = WINDOW_OPTIONS.find((o) => o.key === w.key);
  if (lang === "ne") return w.name_ne ?? fromOptions?.ne ?? w.key;
  return w.name_en ?? fromOptions?.en ?? w.key;
}

function reminderCopy(
  w: GuidanceWindow,
  lead: number,
  lang: "ne" | "en",
): { title: string; body: string } {
  const name = windowName(w, lang);
  const range = w.end ? `${w.start}–${w.end}` : w.start;
  const when =
    lead === 0
      ? tFor(lang, "ui.notifications.starts_now")
      : tFor(lang, "ui.notifications.starts_in_lead_min", { lead });
  const advice =
    w.kind === "shubh"
      ? tFor(lang, "ui.notifications.a_good_time_to_begin_important")
      : tFor(lang, "ui.notifications.avoid_starting_new_work_travel_or");
  return { title: `${name} · ${when}`, body: `${range}\n${advice}` };
}

export function planNotifications(input: PlanInput): PlannedNotification[] {
  const { now, lang, profiles, guidance, reminders, briefing, rashifal, budget } = input;
  const out: PlannedNotification[] = [];

  for (const profile of profiles) {
    const range = guidance[profile.id];
    if (!range) continue;
    if (briefing.enabled[profile.id] === false) continue;
    const tz = range.location.timezone;
    for (const day of range.days) {
      const fireAt = zonedInstant(day.date, briefing.time, tz);
      if (fireAt.getTime() <= now.getTime()) continue;
      out.push({
        id: `brief:${profile.id}:${day.date}`,
        fireAt,
        title: `${profile.name} · ${lang === "ne" ? day.weekday_ne ?? "" : day.weekday_en ?? ""}`.replace(/ · $/, ""),
        body: briefingBody(day, lang, profile.id),
        channel: "daily-guidance",
        data: { type: "briefing", profileId: profile.id, date: day.date },
      });
    }
  }

  if (rashifal?.settings.enabled && rashifal.cache) {
    const { cache, settings } = rashifal;
    for (const [date, entry] of Object.entries(cache.days)) {
      const fireAt = zonedInstant(date, settings.time, cache.timezone);
      if (fireAt.getTime() <= now.getTime()) continue;
      const sign = lang === "ne" ? entry.sign_ne : entry.sign_en;
      const head = tFor(lang, "ui.notifications.today_s_rashifal");
      const text = lang === "ne" ? entry.text_ne || entry.text_en : entry.text_en || entry.text_ne;
      out.push({
        id: `rashifal:${date}`,
        fireAt,
        title: sign ? `${head} · ${sign}` : head,
        body: clip(text),
        channel: "rashifal",
        data: { type: "rashifal", date },
      });
    }
  }

  // Window times are location-based, not person-based, so a rule with no
  // profile reads the first profile's cached days.
  const fallback = profiles.map((p) => guidance[p.id]).find(Boolean) ?? null;
  for (const rule of reminders) {
    if (!rule.enabled) continue;
    const range = (rule.profile_id ? guidance[rule.profile_id] : null) ?? fallback;
    if (!range) continue;
    const tz = range.location.timezone;
    const { name, note } = decodeReminderLabel(rule.label);
    for (const day of range.days) {
      if (rule.weekdays.length > 0 && !rule.weekdays.includes(weekdayOf(day.date))) continue;
      day.windows
        .filter((w) => w.key === rule.window_key && w.kind === rule.window_kind)
        .forEach((w, index) => {
          const start = zonedInstant(day.date, w.start, tz);
          const fireAt = new Date(start.getTime() - rule.lead_minutes * 60_000);
          if (fireAt.getTime() <= now.getTime()) return;
          const copy = reminderCopy(w, rule.lead_minutes, lang);
          out.push({
            id: `rem:${rule.id}:${day.date}:${index}`,
            fireAt,
            title: name ? `${name} · ${copy.title}` : copy.title,
            body: note ? `${note}\n${copy.body}` : copy.body,
            channel: "reminders",
            data: { type: "reminder", ruleId: rule.id, date: day.date, windowKey: w.key },
          });
        });
    }
  }

  out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime() || a.id.localeCompare(b.id));
  return out.slice(0, Math.max(0, budget));
}
