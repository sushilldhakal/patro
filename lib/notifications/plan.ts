import type { GuidanceDay, GuidanceRange, GuidanceWindow, ReminderRule, BriefingSettings } from "./types";
import { WINDOW_OPTIONS } from "./types";
import { weekdayOf, zonedInstant } from "./zoned";

/**
 * Pure planning: cached guidance + reminder rules + settings → the notifications
 * to schedule. No I/O, so it is the same on every platform and easy to reason
 * about; `scheduler.ts` is the thin layer that hands the result to the OS.
 */

export type NotificationChannel = "daily-guidance" | "reminders";

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
  /** The OS caps pending notifications (iOS: 64) — keep to the nearest `budget`. */
  budget: number;
}

const BODY_LIMIT = 230;

function clip(text: string): string {
  return text.length <= BODY_LIMIT ? text : `${text.slice(0, BODY_LIMIT - 1).trimEnd()}…`;
}

function pickLines(day: GuidanceDay, lang: "ne" | "en", field: "do" | "dont" | "careful"): string[] {
  return lang === "ne" ? day[`${field}_ne`] : day[`${field}_en`];
}

/** "Do / Don't / Careful" body — first line of each, which fits a collapsed notification. */
export function briefingBody(day: GuidanceDay, lang: "ne" | "en"): string {
  const labels =
    lang === "ne"
      ? { do: "गर्नुहोस्", dont: "नगर्नुहोस्", careful: "सावधानी" }
      : { do: "Do", dont: "Don't", careful: "Careful" };
  const parts: string[] = [];
  for (const field of ["do", "dont", "careful"] as const) {
    const first = pickLines(day, lang, field)[0];
    if (first) parts.push(`${labels[field]}: ${first}`);
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
      ? lang === "ne" ? "अहिलेदेखि" : "Starts now"
      : lang === "ne" ? `${lead} मिनेटमा सुरु` : `Starts in ${lead} min`;
  const advice =
    w.kind === "shubh"
      ? lang === "ne" ? "महत्त्वपूर्ण काम सुरु गर्न शुभ समय।" : "A good time to begin important work."
      : lang === "ne" ? "नयाँ काम, यात्रा वा खरिद सुरु नगर्नुहोस्।" : "Avoid starting new work, travel or purchases.";
  return { title: `${name} · ${when}`, body: `${range}\n${advice}` };
}

export function planNotifications(input: PlanInput): PlannedNotification[] {
  const { now, lang, profiles, guidance, reminders, briefing, budget } = input;
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
        body: briefingBody(day, lang),
        channel: "daily-guidance",
        data: { type: "briefing", profileId: profile.id, date: day.date },
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
            title: rule.label ? `${rule.label} · ${copy.title}` : copy.title,
            body: copy.body,
            channel: "reminders",
            data: { type: "reminder", ruleId: rule.id, date: day.date, windowKey: w.key },
          });
        });
    }
  }

  out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime() || a.id.localeCompare(b.id));
  return out.slice(0, Math.max(0, budget));
}
