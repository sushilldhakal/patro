/**
 * Stellarium-style time sheet over the 3D sky: wall-clock steppers, a bipolar
 * ×10000 rate slider, previous/next night, jump-to-now, and a daylight scrub.
 *
 * Drawn in-tree (not portalled) so it still paints inside the Fullscreen API
 * layer — the same constraint {@link SkyDateTimePicker} was written around.
 *
 * Nepali UI steps विक्रम संवत् year / month / day. English UI keeps Gregorian.
 */

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  History,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import {
  adToBS,
  bsToAdOrNull,
  getBSMonthLength,
  shiftBsMonth,
} from "@/lib/bs-calendar";
import { civilGregorianToUtcMs } from "@/lib/patro-day";
import { PATRO_SIGNED_YEAR_MAX, PATRO_SIGNED_YEAR_MIN } from "@/lib/patro-year-axis";
import { nearestStepIndex, TIME_STEPS } from "@/lib/sky3d/time-steps";
import { RATE_NOTCHES, rateToSlider, sliderToRate } from "@/lib/sky3d/rate-slider";
import { useLocale, bilingualText } from "@/i18n/locale";
import { cn } from "@/lib/utils";

/** Starts at बिहान (~04:00) so the labels read left → right as named. */
const DAY_ORIGIN_SEC = 4 * 3600;

/** बिहान → दिउँसो → सन्ध्या → जूनकिरण → मध्यरात. */
const DAYLIGHT_GRADIENT =
  "linear-gradient(90deg," +
  "#f6c56a 0%," +
  "#9bd4ff 14%," +
  "#5eb6ff 28%," +
  "#87c8f8 40%," +
  "#f4a04a 50%," +
  "#e85d2c 58%," +
  "#6b3278 66%," +
  "#1a2848 74%," +
  "#8eb8dc 80%," +
  "#0a1020 88%," +
  "#05070f 96%," +
  "#3a2458 100%)";

const DAY_PERIODS = [
  { id: "morning", at: 6, ne: "बिहान", en: "Morning" },
  { id: "afternoon", at: 30, ne: "दिउँसो", en: "Afternoon" },
  { id: "evening", at: 52, ne: "सन्ध्या", en: "Evening" },
  { id: "moonlight", at: 74, ne: "जूनकिरण", en: "Moonlight" },
  { id: "midnight", at: 92, ne: "मध्यरात", en: "Midnight" },
] as const;

function daySecToSlider(daySec: number): number {
  return (daySec - DAY_ORIGIN_SEC + 86_400) % 86_400;
}

function sliderToDaySec(slider: number): number {
  return (slider + DAY_ORIGIN_SEC) % 86_400;
}

export type WallParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function wallPartsFromMs(timeMs: number, zoneOffsetMs: number): WallParts {
  const local = new Date(timeMs + zoneOffsetMs);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
    second: local.getUTCSeconds(),
  };
}

function utcMsFromWall(p: WallParts): number {
  return (
    civilGregorianToUtcMs(p.year, p.month, p.day) +
    p.hour * 3_600_000 +
    p.minute * 60_000 +
    p.second * 1000
  );
}

function instantFromWall(p: WallParts, zoneOffsetMs: number): number {
  return utcMsFromWall(p) - zoneOffsetMs;
}

function wallCivilUtc(p: WallParts): Date {
  const d = new Date(0);
  d.setUTCFullYear(p.year, p.month - 1, p.day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function applyBsYmd(p: WallParts, signedYear: number, month: number, day: number): WallParts | null {
  if (signedYear === 0) return null;
  if (signedYear < PATRO_SIGNED_YEAR_MIN || signedYear > PATRO_SIGNED_YEAR_MAX) return null;
  const m = ((month - 1 + 12) % 12) + 1;
  const length = getBSMonthLength(signedYear, m) || 30;
  const d = Math.min(Math.max(1, day), length);
  const ad = bsToAdOrNull(signedYear, m, d);
  if (ad) {
    return {
      ...p,
      year: ad.getUTCFullYear(),
      month: ad.getUTCMonth() + 1,
      day: ad.getUTCDate(),
    };
  }
  const gMonthRaw = m + 3;
  const yearDelta = gMonthRaw > 12 ? 1 : 0;
  const gMonth = ((gMonthRaw - 1) % 12) + 1;
  return { ...p, year: signedYear - 57 + yearDelta, month: gMonth, day: Math.min(d, 28) };
}

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

const NE_DIGIT = "०१२३४५६७८९";

function parseTyped(raw: string, allowMinus: boolean): { abs: number; neg: boolean } | null {
  let s = raw.trim().replace(/[०-९]/g, (ch) => String(NE_DIGIT.indexOf(ch)));
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
  let s = raw.replace(/[०-९]/g, (ch) => String(NE_DIGIT.indexOf(ch)));
  if (allowMinus) {
    const neg = s.startsWith("-") || s.startsWith("−");
    s = s.replace(/[-−]/g, "").replace(/\D/g, "");
    return (neg ? "-" : "") + s.slice(0, 6);
  }
  return s.replace(/\D/g, "").slice(0, 2);
}

type Field = keyof WallParts;

const FIELD_ORDER: Field[] = ["year", "month", "day", "hour", "minute", "second"];

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

function addField(p: WallParts, field: Field, delta: number): WallParts {
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

function periodIdAtHour(hour: number): (typeof DAY_PERIODS)[number]["id"] {
  if (hour >= 4 && hour < 10) return "morning";
  if (hour >= 10 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 19) return "evening";
  if (hour >= 19) return "moonlight";
  return "midnight";
}

type Props = {
  timeMs: number;
  zoneOffsetMs: number;
  timeRate: number;
  onClose: () => void;
  onApplyMs: (ms: number) => void;
  onTimeRate: (rate: number) => void;
  onTogglePlay: () => void;
  onResetRate: () => void;
};

export function SkyTimeSheet({
  timeMs,
  zoneOffsetMs,
  timeRate,
  onClose,
  onApplyMs,
  onTimeRate,
  onTogglePlay,
  onResetRate,
}: Props) {
  const { lang, digits } = useLocale();
  const pick = (ne: string, en: string) => bilingualText(lang, ne, en);
  const nepaliCal = lang !== "en";
  const parts = wallPartsFromMs(timeMs, zoneOffsetMs);
  const ne = nepaliCal ? nepaliYmd(parts) : null;
  const paused = timeRate === 0;
  const playing = !paused;
  const daySec = parts.hour * 3600 + parts.minute * 60 + parts.second;
  const activePeriod = periodIdAtHour(parts.hour);
  const [edit, setEdit] = useState<Field | null>(null);
  const [draft, setDraft] = useState("");
  const editRef = useRef<Field | null>(null);
  const inputRefs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  const apply = (next: WallParts) => onApplyMs(instantFromWall(next, zoneOffsetMs));
  const step = (field: Field, delta: number) => {
    editRef.current = null;
    setEdit(null);
    if (nepaliCal && (field === "year" || field === "month" || field === "day")) {
      const next = stepBsField(parts, field, delta);
      if (next) apply(next);
      return;
    }
    apply(addField(parts, field, delta));
  };

  const plain = (field: Field): string => {
    if (field === "year") return ne ? bsDisplayYear(ne.year) : gregDisplayYear(parts.year);
    if (field === "month") return pad2(ne ? ne.month : parts.month);
    if (field === "day") return pad2(ne ? ne.day : parts.day);
    if (field === "hour") return pad2(parts.hour);
    if (field === "minute") return pad2(parts.minute);
    return pad2(parts.second);
  };

  const commitField = (field: Field, raw: string) => {
    const parsed = parseTyped(raw, field === "year");
    if (!parsed) {
      if (editRef.current === field) {
        editRef.current = null;
        setEdit(null);
      }
      return;
    }
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
        const dim =
          (civilGregorianToUtcMs(nextYear, nextMonth, 1) -
            civilGregorianToUtcMs(parts.year, parts.month, 1)) /
          86_400_000;
        apply({ ...parts, day: Math.min(day, dim) });
      }
    } else if (field === "hour") apply({ ...parts, hour: Math.min(23, parsed.abs) });
    else if (field === "minute") apply({ ...parts, minute: Math.min(59, parsed.abs) });
    else apply({ ...parts, second: Math.min(59, parsed.abs) });
    if (editRef.current === field) {
      editRef.current = null;
      setEdit(null);
    }
  };

  const focusField = (field: Field) => {
    editRef.current = field;
    setEdit(field);
    setDraft(plain(field));
    requestAnimationFrame(() => inputRefs.current[field]?.select());
  };

  const onFieldKey = (field: Field, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitField(field, draft);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setEdit(null);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      step(field, 1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      step(field, -1);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      commitField(field, draft);
      const i = FIELD_ORDER.indexOf(field);
      const next = FIELD_ORDER[i + (e.shiftKey ? -1 : 1)];
      if (next) focusField(next);
    }
  };

  /* Named in the units the step is actually in — "१ दिन/से", not "×86400". */
  const activeStep = TIME_STEPS[nearestStepIndex(timeRate)];
  const speedLabel = paused
    ? pick("रोकिएको", "Paused")
    : `${timeRate < 0 ? "◀◀ " : "▶▶ "}${pick(activeStep.ne, activeStep.en)}`;

  const stepper = (
    field: Field,
    upLabel: string,
    downLabel: string,
    wide?: boolean,
  ) => (
    <Stepper
      field={field}
      display={digits(plain(field))}
      editing={edit === field}
      draft={edit === field ? draft : digits(plain(field))}
      allowMinus={field === "year"}
      wide={wide}
      inputRef={(el) => {
        inputRefs.current[field] = el;
      }}
      onUp={() => step(field, 1)}
      onDown={() => step(field, -1)}
      upLabel={upLabel}
      downLabel={downLabel}
      onStartEdit={() => focusField(field)}
      onDraft={(v) => setDraft(filterDraft(v, field === "year"))}
      onCommit={(v) => commitField(field, v)}
      onKey={onFieldKey}
    />
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label={pick("बन्द गर्नुहोस्", "Close")}
        className="absolute inset-0 cursor-default bg-black/40"
        onClick={onClose}
      />
      <div
        data-sky-controls
        className="relative mx-auto w-full max-w-lg rounded-t-3xl border border-white/12 bg-[#1c1c1e]/88 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-white shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/30" />

        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-0.5">
            {stepper(
              "year",
              pick("वर्ष बढाउनुहोस्", "Increase year"),
              pick("वर्ष घटाउनुहोस्", "Decrease year"),
              true,
            )}
            <Sep>/</Sep>
            {stepper(
              "month",
              pick("महिना बढाउनुहोस्", "Increase month"),
              pick("महिना घटाउनुहोस्", "Decrease month"),
            )}
            <Sep>/</Sep>
            {stepper(
              "day",
              pick("दिन बढाउनुहोस्", "Increase day"),
              pick("दिन घटाउनुहोस्", "Decrease day"),
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {stepper(
              "hour",
              pick("घण्टा बढाउनुहोस्", "Increase hour"),
              pick("घण्टा घटाउनुहोस्", "Decrease hour"),
            )}
            <Sep>:</Sep>
            {stepper(
              "minute",
              pick("मिनेट बढाउनुहोस्", "Increase minute"),
              pick("मिनेट घटाउनुहोस्", "Decrease minute"),
            )}
            <Sep>:</Sep>
            {stepper(
              "second",
              pick("सेकेन्ड बढाउनुहोस्", "Increase second"),
              pick("सेकेन्ड घटाउनुहोस्", "Decrease second"),
            )}
          </div>
        </div>

        <p className="mt-4 mb-1 text-center text-sm font-semibold tracking-wide text-white/90">
          {speedLabel}
        </p>
        <div className="flex items-center gap-2">
          <IconRound
            label={playing ? pick("रोक्नुहोस्", "Pause") : pick("चलाउनुहोस्", "Play")}
            onPress={onTogglePlay}
          >
            {playing ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white" />}
          </IconRound>
          <input
            type="range"
            min={-RATE_NOTCHES}
            max={RATE_NOTCHES}
            step={1}
            value={Math.round(rateToSlider(timeRate))}
            aria-label={pick("गति", "Speed")}
            className="sky-time-slider sky-time-slider--thin min-w-0 flex-1"
            onChange={(e) => onTimeRate(sliderToRate(Number(e.target.value)))}
          />
          <IconRound label={pick("वास्तविक गति", "Realtime speed")} onPress={onResetRate}>
            <RotateCcw className="size-5" />
          </IconRound>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <NavAction
            icon={<SkipBack className="size-6" />}
            label={pick("अघिल्लो रात", "Previous night")}
            onPress={() => onApplyMs(timeMs - 86_400_000)}
          />
          <NavAction
            icon={<History className="size-6" />}
            label={pick("अहिलेको समय", "Set time to now")}
            onPress={() => onApplyMs(Date.now())}
          />
          <NavAction
            icon={<SkipForward className="size-6" />}
            label={pick("अर्को रात", "Next night")}
            onPress={() => onApplyMs(timeMs + 86_400_000)}
          />
        </div>

        <div className="mt-4">
          <input
            type="range"
            min={0}
            max={86_399}
            step={1}
            value={daySecToSlider(daySec)}
            aria-label={pick("दिनको उज्यालो", "Daylight")}
            className="sky-time-slider sky-time-slider--day w-full"
            onChange={(e) => {
              const sec = sliderToDaySec(Number(e.target.value));
              apply({
                ...parts,
                hour: Math.floor(sec / 3600),
                minute: Math.floor((sec % 3600) / 60),
                second: sec % 60,
              });
            }}
          />
          <div className="relative mt-1.5 h-4">
            {DAY_PERIODS.map((band) => {
              const active = band.id === activePeriod;
              const edge = band.at <= 8 ? "left" : band.at >= 88 ? "right" : "center";
              return (
                <span
                  key={band.id}
                  className={cn(
                    "absolute top-0 text-[10px] leading-none whitespace-nowrap",
                    active ? "font-semibold text-white" : "font-medium text-white/55",
                    edge === "left" && "left-0",
                    edge === "right" && "right-0",
                    edge === "center" && "-translate-x-1/2",
                  )}
                  style={edge === "center" ? { left: `${band.at}%` } : undefined}
                >
                  {pick(band.ne, band.en)}
                </span>
              );
            })}
          </div>
        </div>

        <style>{`
          .sky-time-slider--day {
            height: 32px;
          }
          .sky-time-slider--day::-webkit-slider-runnable-track {
            height: 14px;
            border-radius: 999px;
            background: ${DAYLIGHT_GRADIENT};
          }
          .sky-time-slider--day::-moz-range-track {
            height: 14px;
            border-radius: 999px;
            background: ${DAYLIGHT_GRADIENT};
          }
          .sky-time-slider--day::-webkit-slider-thumb {
            margin-top: -2px;
            background: #fff6e0;
            box-shadow: 0 0 0 2px rgba(0,0,0,0.35);
          }
          .sky-time-slider--day::-moz-range-thumb {
            background: #fff6e0;
          }
        `}</style>
      </div>
    </div>
  );
}

function Sep({ children }: { children: string }) {
  return (
    <span className="pointer-events-none w-2.5 shrink-0 text-center text-lg font-semibold leading-none text-white/80 xs:text-xl">
      {children}
    </span>
  );
}

function Stepper({
  field,
  display,
  editing,
  draft,
  allowMinus,
  wide,
  inputRef,
  onUp,
  onDown,
  upLabel,
  downLabel,
  onStartEdit,
  onDraft,
  onCommit,
  onKey,
}: {
  field: Field;
  display: string;
  editing: boolean;
  draft: string;
  allowMinus: boolean;
  wide?: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onUp: () => void;
  onDown: () => void;
  upLabel: string;
  downLabel: string;
  onStartEdit: () => void;
  onDraft: (v: string) => void;
  onCommit: (value: string) => void;
  onKey: (field: Field, e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className={cn("flex flex-col items-center", wide ? "w-12" : "w-8")}>
      <HoldButton label={upLabel} onStep={onUp}>
        <ChevronUp className="size-4 text-white" strokeWidth={2.5} />
      </HoldButton>
      <input
        ref={inputRef}
        value={editing ? draft : display}
        inputMode={allowMinus ? "text" : "numeric"}
        enterKeyHint="next"
        autoComplete="off"
        aria-label={upLabel.replace(/बढाउनुहोस्|Increase /, "")}
        className="w-full bg-transparent p-0 text-center text-lg font-semibold tabular-nums leading-none text-white outline-none xs:text-xl caret-white"
        onFocus={onStartEdit}
        onChange={(e) => onDraft(e.target.value)}
        onBlur={(e) => onCommit(e.currentTarget.value)}
        onKeyDown={(e) => onKey(field, e)}
      />
      <HoldButton label={downLabel} onStep={onDown}>
        <ChevronDown className="size-4 text-white" strokeWidth={2.5} />
      </HoldButton>
    </div>
  );
}

function HoldButton({
  label,
  onStep,
  children,
}: {
  label: string;
  onStep: () => void;
  children: ReactNode;
}) {
  const hold = useRef(0);
  const repeat = useRef(0);
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  const stop = () => {
    window.clearTimeout(hold.current);
    window.clearInterval(repeat.current);
    hold.current = 0;
    repeat.current = 0;
  };

  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-6 items-center justify-center rounded-md text-white/90 hover:bg-white/10 active:bg-white/20"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onStepRef.current();
        hold.current = window.setTimeout(() => {
          repeat.current = window.setInterval(() => onStepRef.current(), 70);
        }, 380);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
    >
      {children}
    </button>
  );
}

function IconRound({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10"
    >
      {children}
    </button>
  );
}

function NavAction({
  icon,
  label,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-white hover:bg-white/8"
    >
      {icon}
      <span className="text-center text-[11px] font-medium leading-tight text-white/90">{label}</span>
    </button>
  );
}
