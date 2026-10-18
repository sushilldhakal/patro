import type { CalendarDay, PanchangaDay } from "@vedic-patro/api-client";
import { getPanchangaDetail } from "./panchanga-format";
import { WHEEL_TITHIS, normalizeTithiName } from "@vedic-patro/domain/tithi-wheel-data";

export * from "@vedic-patro/domain/tithi-wheel-data";

function isKrishnaPaksha(p: PanchangaDay): boolean {
  const detail = getPanchangaDetail(p);
  const paksha = detail?.paksha ?? p.paksha;
  const label =
    typeof paksha === "object" && paksha !== null
      ? String((paksha as { name_ne?: string; name?: string }).name_ne ??
          (paksha as { name?: string }).name ??
          "")
      : String(paksha ?? "");
  return /कृष्ण|krishna/i.test(label);
}

export function tithiIndexFromPanchanga(p: PanchangaDay): number {
  const detail = getPanchangaDetail(p);
  const tithi = detail?.tithi ?? p.tithi;
  const raw =
    typeof tithi === "object" && tithi !== null
      ? ((tithi as { name_ne?: string; name?: string }).name_ne ??
        (tithi as { name?: string }).name)
      : undefined;
  const nameNe = normalizeTithiName(raw);

  if (/पूर्णिमा|purnima/i.test(nameNe)) return 14;
  if (/औंसी|औंसी|aunsi|Aaushi/i.test(nameNe)) return 29;

  const krishna = isKrishnaPaksha(p);
  const rangeStart = krishna ? 15 : 0;
  const rangeEnd = krishna ? 29 : 14;

  for (let i = rangeStart; i < rangeEnd; i++) {
    if (WHEEL_TITHIS[i]!.ne === nameNe) return i;
  }

  for (let i = 0; i < 30; i++) {
    if (WHEEL_TITHIS[i]!.ne === nameNe) return i;
  }

  return krishna ? 15 : 0;
}

function calendarDayKrishna(day: CalendarDay): boolean {
  if (day.paksha === "krishna" || day.paksha_ne?.includes("कृष्ण")) return true;
  if (day.paksha === "shukla" || day.paksha_ne?.includes("शुक्ल")) return false;
  return /कृष्ण|krishna/i.test(day.paksha_ne ?? day.paksha ?? "");
}

/** Wheel tithi index 0–29 from a month-grid {@link CalendarDay}. */
export function tithiIndexFromCalendarDay(day: CalendarDay): number | undefined {
  const nameNe = normalizeTithiName(day.tithi_ne ?? day.tithi);
  if (!nameNe) return undefined;

  if (/पूर्णिमा|purnima/i.test(nameNe)) return 14;
  if (/औंसी|aunsi|aaushi/i.test(nameNe)) return 29;

  const krishna = calendarDayKrishna(day);
  const rangeStart = krishna ? 15 : 0;
  const rangeEnd = krishna ? 29 : 14;

  for (let i = rangeStart; i < rangeEnd; i++) {
    if (WHEEL_TITHIS[i]!.ne === nameNe) return i;
  }

  const nameEn = normalizeTithiName(day.tithi);
  for (let i = rangeStart; i < rangeEnd; i++) {
    if (WHEEL_TITHIS[i]!.en.toLowerCase() === nameEn.toLowerCase()) return i;
  }

  for (let i = 0; i < 30; i++) {
    if (WHEEL_TITHIS[i]!.ne === nameNe || WHEEL_TITHIS[i]!.en.toLowerCase() === nameEn.toLowerCase()) {
      return i;
    }
  }

  return undefined;
}
