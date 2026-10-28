/**
 * The panchanga wheel's date + time dialog is the sky's time sheet
 * (`SkyTimeSheet`): this hook turns the wheel's calendar day and clock into
 * the instant the sheet edits, holds the edit as a draft, and turns the draft
 * back into a calendar day and clock when the sheet closes. The website and
 * the app both draw the sheet and call this.
 */
import { useRef, useState } from "react";
import { adToBS, bsToAdOrNull } from "@vedic-patro/domain/calendar/bs-calendar";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { civilGregorianToUtcMs } from "@vedic-patro/domain/calendar/patro-day";
import { signedPatroYearFromBrowse } from "@vedic-patro/domain/calendar/patro-year-axis";
import { wallCivilUtc, wallPartsFromMs } from "@vedic-patro/domain/astronomy/sky3d/sky-time";
import { getZonedTimeParts } from "@vedic-patro/domain/calendar/zoned-time";

/** The place's offset from UT at the given instant (one offset, applied throughout the edit). */
function zoneOffsetMsAt(date: Date, timeZone: string | undefined): number {
  const zoned = getZonedTimeParts(date, timeZone ?? "Asia/Kathmandu");
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  let delta = zoned.hour * 60 + zoned.minute - utcMinutes;
  if (delta > 840) delta -= 1440;
  if (delta <= -720) delta += 1440;
  return delta * 60000;
}

function clockMs(clock: string): number {
  const [h, m, s] = clock.split(":").map((v) => Number(v));
  return ((Number.isFinite(h) ? h! : 0) * 3600 + (Number.isFinite(m) ? m! : 0) * 60 + (Number.isFinite(s) ? s! : 0)) * 1000;
}

export function useWheelTimeSheet({
  era,
  year,
  month,
  day,
  clock,
  timeZone,
  onCommit,
}: {
  era: Era;
  year: number;
  month: number;
  day: number;
  /** "HH:MM" (or "HH:MM:SS") on the place's wall clock. */
  clock: string;
  timeZone?: string;
  /** The edited day in the era (Gregorian pages stay Gregorian, every other page gets Bikram Sambat) and its clock "HH:MM". */
  onCommit: (era: Era, year: number, month: number, day: number, clock: string) => void;
}) {
  const gregorian = era === "ad";
  const ad = gregorian ? new Date(Date.UTC(year, month - 1, day, 12)) : bsToAdOrNull(signedPatroYearFromBrowse(era, year), month, day);
  const civil = ad ?? new Date();
  const civilMs = civilGregorianToUtcMs(civil.getUTCFullYear(), civil.getUTCMonth() + 1, civil.getUTCDate());
  const zoneOffsetMs = zoneOffsetMsAt(new Date(civilMs + 12 * 3_600_000), timeZone);
  const committedMs = civilMs + clockMs(clock) - zoneOffsetMs;

  const [draftMs, setDraftMs] = useState<number | null>(null);
  /** The same draft, readable at once: a field flushed on close is applied in the same tick as `commit`. */
  const draftRef = useRef<number | null>(null);

  return {
    timeMs: draftMs ?? committedMs,
    zoneOffsetMs,
    /** Each stepper, typed field or jump of the sheet lands here; nothing is applied until `commit`. */
    apply: (ms: number) => {
      draftRef.current = ms;
      setDraftMs(ms);
    },
    /** Applies the edit (if any) through `onCommit`. */
    commit: () => {
      const draft = draftRef.current;
      if (draft == null || draft === committedMs) return;
      const p = wallPartsFromMs(draft, zoneOffsetMs);
      const hh = String(p.hour).padStart(2, "0");
      const mm = String(p.minute).padStart(2, "0");
      if (gregorian) {
        onCommit("ad", p.year, p.month, p.day, `${hh}:${mm}`);
        return;
      }
      const bs = adToBS(wallCivilUtc(p));
      onCommit("bs", bs.year, bs.month, bs.day, `${hh}:${mm}`);
    },
  };
}
