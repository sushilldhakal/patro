/**
 * The time sheet over the 3D sky, shared by the website's and the app's
 * `components/sky3d/SkyTimeSheet.tsx`: the six wall-clock fields (Bikram
 * Samvat year / month / day by default, Gregorian when AD is on) with their
 * values, step and typed-entry handling, the speed line, previous / next
 * night and now, the daylight scrub and its day-part labels, and copy.
 * Each app draws the sheet, its sliders and its hold-to-repeat buttons.
 */
import { useState } from "react";
import { adToBS, bsToAdOrNull, getBSMonthLength, shiftBsMonth } from "@vedic-patro/domain/calendar/bs-calendar";
import { bilingualText } from "@vedic-patro/domain/locale";
import { civilGregorianToUtcMs } from "@vedic-patro/domain/calendar/patro-day";
import { PATRO_SIGNED_YEAR_MAX, PATRO_SIGNED_YEAR_MIN } from "@vedic-patro/domain/calendar/patro-year-axis";
import { DAY_PERIODS, periodIdAtHour, wallCivilUtc, wallPartsFromMs, type WallParts } from "@vedic-patro/domain/astronomy/sky3d/sky-time";
import { nearestStepIndex, TIME_STEPS } from "@vedic-patro/domain/astronomy/sky3d/time-steps";
import { useCalendarSystem, useLocale } from "@vedic-patro/i18n/react";

export type SkyTimeField = keyof WallParts;

export const SKY_TIME_FIELDS: SkyTimeField[] = ["year", "month", "day", "hour", "minute", "second"];

/** The daylight scrub starts at early morning (~04:00) so its labels read left to right. */
const DAY_ORIGIN_SEC = 4 * 3600;
const DAY_MS = 86_400_000;

function utcMsFromWall(p: WallParts): number {
  return civilGregorianToUtcMs(p.year, p.month, p.day) + p.hour * 3_600_000 + p.minute * 60_000 + p.second * 1000;
}

function applyBsYmd(p: WallParts, signedYear: number, month: number, day: number): WallParts | null {
  if (signedYear === 0) return null;
  if (signedYear < PATRO_SIGNED_YEAR_MIN || signedYear > PATRO_SIGNED_YEAR_MAX) return null;
  const m = ((month - 1 + 12) % 12) + 1;
  const length = getBSMonthLength(signedYear, m) || 30;
  const d = Math.min(Math.max(1, day), length);
  const ad = bsToAdOrNull(signedYear, m, d);
  if (ad) return { ...p, year: ad.getUTCFullYear(), month: ad.getUTCMonth() + 1, day: ad.getUTCDate() };
  const gMonthRaw = m + 3;
  const yearDelta = gMonthRaw > 12 ? 1 : 0;
  const gMonth = ((gMonthRaw - 1) % 12) + 1;
  return { ...p, year: signedYear - 57 + yearDelta, month: gMonth, day: Math.min(d, 28) };
}

/** Past the compiled table the Bikram year is the Gregorian one plus the standard offset. */
function nepaliYmd(p: WallParts): { year: number; month: number; day: number } {
  if (p.year >= 1643 && p.year <= 2144) {
    const bs = adToBS(wallCivilUtc(p));
    return { year: bs.year, month: bs.month, day: bs.day };
  }
  const signed = p.year + (p.month < 4 ? 56 : 57);
  const bsMonth = ((p.month - 4 + 12) % 12) + 1;
  return { year: signed === 0 ? -1 : signed, month: bsMonth, day: Math.min(Math.max(1, p.day), 32) };
}

function gregDisplayYear(astro: number): string {
  return astro > 0 ? String(astro) : `-${1 - astro}`;
}

function bsDisplayYear(signed: number): string {
  return signed > 0 ? String(signed) : `-${-signed}`;
}

/** Devanagari digits typed into a field read as ASCII ones. */
function asciiDigits(raw: string): string {
  return raw.replace(/[\u0966-\u096F]/g, (ch) => String(ch.charCodeAt(0) - 0x0966)); // copy-ok: digit range
}

function parseTyped(raw: string, allowMinus: boolean): { abs: number; neg: boolean } | null {
  let s = asciiDigits(raw.trim());
  if (allowMinus) {
    const neg = s.startsWith("-");
    s = s.replace(/-/g, "");
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) return null;
    return { abs: Math.trunc(n), neg };
  }
  s = s.replace(/\D/g, "");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return { abs: Math.trunc(n), neg: false };
}

function filterDraft(raw: string, allowMinus: boolean): string {
  let s = asciiDigits(raw);
  if (allowMinus) {
    const neg = s.startsWith("-") || s.startsWith("−");
    s = s.replace(/[-−]/g, "").replace(/\D/g, "");
    return (neg ? "-" : "") + s.slice(0, 6);
  }
  return s.replace(/\D/g, "").slice(0, 2);
}

function stepBsField(p: WallParts, field: "year" | "month" | "day", delta: number): WallParts | null {
  const bs = nepaliYmd(p);
  if (field === "year") {
    let next = bs.year + delta;
    if (next === 0) next = delta < 0 ? -1 : 1;
    return applyBsYmd(p, next, bs.month, bs.day);
  }
  if (field === "month") {
    const next = shiftBsMonth(bs.year, bs.month, delta);
    const year = next.year === 0 ? (delta < 0 ? -1 : 1) : next.year;
    return applyBsYmd(p, year, next.month, bs.day);
  }
  let day = bs.day + delta;
  let { year, month } = bs;
  for (let i = 0; i < 24 && day > getBSMonthLength(year, month); i += 1) {
    day -= getBSMonthLength(year, month);
    const next = shiftBsMonth(year, month, 1);
    year = next.year;
    month = next.month;
  }
  for (let i = 0; i < 24 && day < 1; i += 1) {
    const prev = shiftBsMonth(year, month, -1);
    year = prev.year;
    month = prev.month;
    day += getBSMonthLength(year, month);
  }
  return applyBsYmd(p, year === 0 ? (delta < 0 ? -1 : 1) : year, month, day);
}

function addField(p: WallParts, field: SkyTimeField, delta: number): WallParts {
  const d = new Date(utcMsFromWall(p));
  if (p.year >= 0 && p.year <= 99) d.setUTCFullYear(p.year);
  if (field === "year") d.setUTCFullYear(d.getUTCFullYear() + delta);
  else if (field === "month") d.setUTCMonth(d.getUTCMonth() + delta);
  else if (field === "day") d.setUTCDate(d.getUTCDate() + delta);
  else if (field === "hour") d.setUTCHours(d.getUTCHours() + delta);
  else if (field === "minute") d.setUTCMinutes(d.getUTCMinutes() + delta);
  else d.setUTCSeconds(d.getUTCSeconds() + delta);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  };
}

function pad2(n: number): string {
  return String(Math.trunc(n)).padStart(2, "0");
}

export type SkyTimeFieldView = {
  field: SkyTimeField;
  /** The value as shown (locale digits), or the draft while it is being typed. */
  value: string;
  editing: boolean;
  label: string;
  upLabel: string;
  downLabel: string;
  wide: boolean;
  allowMinus: boolean;
  up: () => void;
  down: () => void;
};

export function useSkyTimeSheet({
  timeMs,
  zoneOffsetMs,
  timeRate,
  onApplyMs,
}: {
  timeMs: number;
  zoneOffsetMs: number;
  /** Simulated seconds per real second; 0 is paused, negative runs backwards. */
  timeRate: number;
  onApplyMs: (ms: number) => void;
}) {
  const { t, lang, digits } = useLocale();
  const { calendar } = useCalendarSystem();
  /** The calendar preference (not the language) decides BS vs Gregorian fields. */
  const nepaliCal = calendar === "bs";
  const parts = wallPartsFromMs(timeMs, zoneOffsetMs);
  const ne = nepaliCal ? nepaliYmd(parts) : null;
  const paused = timeRate === 0;
  const daySec = parts.hour * 3600 + parts.minute * 60 + parts.second;
  const activePeriod = periodIdAtHour(parts.hour);
  const [edit, setEdit] = useState<SkyTimeField | null>(null);
  const [draft, setDraftRaw] = useState("");

  const apply = (next: WallParts) => onApplyMs(utcMsFromWall(next) - zoneOffsetMs);
  const step = (field: SkyTimeField, delta: number) => {
    setEdit(null);
    if (nepaliCal && (field === "year" || field === "month" || field === "day")) {
      const next = stepBsField(parts, field, delta);
      if (next) apply(next);
      return;
    }
    apply(addField(parts, field, delta));
  };

  const plain = (field: SkyTimeField): string => {
    if (field === "year") return ne ? bsDisplayYear(ne.year) : gregDisplayYear(parts.year);
    if (field === "month") return pad2(ne ? ne.month : parts.month);
    if (field === "day") return pad2(ne ? ne.day : parts.day);
    if (field === "hour") return pad2(parts.hour);
    if (field === "minute") return pad2(parts.minute);
    return pad2(parts.second);
  };

  /** Apply a typed value; an unreadable one just ends the edit. */
  const commitField = (field: SkyTimeField, raw: string) => {
    const parsed = parseTyped(raw, field === "year");
    if (parsed) {
      if (field === "year") {
        if (nepaliCal) {
          const signed = parsed.neg ? -parsed.abs : parsed.abs;
          const next = applyBsYmd(parts, signed, ne?.month ?? parts.month, ne?.day ?? parts.day);
          if (next) apply(next);
        } else {
          const astro = parsed.neg ? 1 - Math.max(1, parsed.abs) : Math.max(1, parsed.abs);
          apply({ ...parts, year: astro });
        }
      } else if (field === "month") {
        const month = Math.min(12, Math.max(1, parsed.abs));
        if (nepaliCal) {
          const next = applyBsYmd(parts, ne?.year ?? 1, month, ne?.day ?? 1);
          if (next) apply(next);
        } else apply({ ...parts, month });
      } else if (field === "day") {
        const day = Math.max(1, parsed.abs);
        if (nepaliCal) {
          const next = applyBsYmd(parts, ne?.year ?? 1, ne?.month ?? 1, day);
          if (next) apply(next);
        } else {
          const nextMonth = parts.month === 12 ? 1 : parts.month + 1;
          const nextYear = parts.month === 12 ? parts.year + 1 : parts.year;
          const dim = (civilGregorianToUtcMs(nextYear, nextMonth, 1) - civilGregorianToUtcMs(parts.year, parts.month, 1)) / DAY_MS;
          apply({ ...parts, day: Math.min(day, dim) });
        }
      } else if (field === "hour") apply({ ...parts, hour: Math.min(23, parsed.abs) });
      else if (field === "minute") apply({ ...parts, minute: Math.min(59, parsed.abs) });
      else apply({ ...parts, second: Math.min(59, parsed.abs) });
    }
    setEdit((cur) => (cur === field ? null : cur));
  };

  /** Applies a half-typed field before the sheet closes, so a year typed without return is not lost. */
  const flush = () => {
    if (edit) commitField(edit, draft);
  };

  const startEdit = (field: SkyTimeField) => {
    setEdit(field);
    setDraftRaw(plain(field));
  };

  const FIELD_COPY: Record<SkyTimeField, { label: string; up: string; down: string }> = {
    year: { label: t("ui.sky3d.year"), up: t("ui.sky3d.increase_year"), down: t("ui.sky3d.decrease_year") },
    month: { label: t("ui.sky3d.month"), up: t("ui.sky3d.increase_month"), down: t("ui.sky3d.decrease_month") },
    day: { label: t("common.day"), up: t("ui.sky3d.increase_day"), down: t("ui.sky3d.decrease_day") },
    hour: { label: t("ui.sky3d.hour"), up: t("ui.sky3d.increase_hour"), down: t("ui.sky3d.decrease_hour") },
    minute: { label: t("ui.sky3d.minute"), up: t("ui.sky3d.increase_minute"), down: t("ui.sky3d.decrease_minute") },
    second: { label: t("ui.sky3d.second"), up: t("ui.sky3d.increase_second"), down: t("ui.sky3d.decrease_second") },
  };

  const fields: SkyTimeFieldView[] = SKY_TIME_FIELDS.map((field) => ({
    field,
    value: edit === field ? draft : digits(plain(field)),
    editing: edit === field,
    label: FIELD_COPY[field].label,
    upLabel: FIELD_COPY[field].up,
    downLabel: FIELD_COPY[field].down,
    wide: field === "year",
    allowMinus: field === "year",
    up: () => step(field, 1),
    down: () => step(field, -1),
  }));

  /* Named in the units the step is actually in ("1d / 1s"), not a bare multiplier. */
  const activeStep = TIME_STEPS[nearestStepIndex(timeRate)]!;
  const speedLabel = paused
    ? t("ui.sky3d.paused")
    : `${timeRate < 0 ? "◀◀ " : "▶▶ "}${bilingualText(lang, activeStep.ne, activeStep.en)}`;

  return {
    /** Date fields (year / month / day) then clock fields (hour / minute / second). */
    dateFields: fields.slice(0, 3),
    clockFields: fields.slice(3),
    edit,
    startEdit,
    flush,
    endEdit: () => setEdit(null),
    setDraft: (field: SkyTimeField, raw: string) => setDraftRaw(filterDraft(raw, field === "year")),
    draft,
    commitField,
    step,
    speedLabel,
    playing: !paused,
    /** The daylight scrub, 0..86 399 seconds from early morning. */
    daySlider: (daySec - DAY_ORIGIN_SEC + 86_400) % 86_400,
    setDaySlider: (value: number) => {
      const sec = (Math.round(value) + DAY_ORIGIN_SEC) % 86_400;
      apply({ ...parts, hour: Math.floor(sec / 3600), minute: Math.floor((sec % 3600) / 60), second: sec % 60 });
    },
    dayPeriods: DAY_PERIODS.map((band) => ({
      id: band.id,
      at: band.at,
      label: bilingualText(lang, band.ne, band.en),
      active: band.id === activePeriod,
    })),
    jumps: [
      { id: "prev" as const, label: t("ui.sky3d.previous_night"), run: () => onApplyMs(timeMs - DAY_MS) },
      { id: "now" as const, label: t("ui.sky3d.set_time_to_now"), run: () => onApplyMs(Date.now()) },
      { id: "next" as const, label: t("ui.sky3d.next_night"), run: () => onApplyMs(timeMs + DAY_MS) },
    ],
    labels: {
      close: t("ui.common.close"),
      play: t("panchanga.hora.play"),
      pause: t("panchanga.hora.pause"),
      rate: t("learn.diagrams.orbit_speed"),
      realtime: t("ui.sky3d.realtime_speed"),
      daylight: t("ui.sky3d.daylight"),
    },
  };
}
