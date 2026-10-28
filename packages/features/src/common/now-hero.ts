/**
 * The "now / next" card the calendar pages open with (abhijit, panchak,
 * adhik maas, suryakranti, dainik kranti, holidays): what is on now or comes
 * next, how far through it is, and how long until it changes. Each page
 * builds one; both apps draw it with the kit's `NowHero`.
 */
import { useEffect, useState } from "react";
import { parseHHMM } from "@vedic-patro/domain/panchanga/time-format";

type T = (key: string, values?: Record<string, unknown>) => string;
type Digits = (v: string | number) => string;

export type NowHeroTone = "good" | "bad" | "neutral" | "plain";

export type NowHeroView = {
  eyebrow: string;
  /** A pulsing dot: something is on right now. */
  live?: boolean;
  tone: NowHeroTone;
  title: string;
  subtitle?: string;
  /** 0..1 through what is on. */
  progress?: number;
  /** Under the progress line: usually the range left, the countdown right. */
  foot?: { left?: string; right?: string };
  facts?: { label: string; value: string; sub?: string }[];
  /** What follows, in a small card beside. */
  next?: { label: string; title: string; detail?: string };
};

/** `Date.now()`, again every 30 seconds while the page is open. */
export function useNowMs(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** `1 घण्टा 20 मिनेट` / `3 दिन` — minutes under a day, days beyond. */
export function spanText(ms: number, t: T, digits: Digits): string {
  const total = Math.max(1, Math.round(ms / 60_000));
  if (total >= 24 * 60) return t("now_hero.days", { count: digits(Math.round(total / (24 * 60))) });
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return t("choghadiya.minutes", { m: digits(m) });
  if (m === 0) return t("choghadiya.hours", { h: digits(h) });
  return t("choghadiya.hours_minutes", { h: digits(h), m: digits(m) });
}

/** Minutes after midnight on the clock of `timeZone`. */
export function clockMinutes(nowMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(nowMs));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** A window on today's clock (`HH:MM` anywhere in the strings): before, on (and how far) or over. */
export function clockWindow(start: string | undefined, end: string | undefined, nowMin: number) {
  const a = parseHHMM(start);
  const b = parseHHMM(end);
  if (a == null || b == null) return null;
  if (nowMin < a) return { state: "before" as const, minutes: a - nowMin };
  if (nowMin < b) return { state: "on" as const, minutes: b - nowMin, progress: (nowMin - a) / (b - a || 1) };
  return { state: "over" as const, minutes: 0 };
}
