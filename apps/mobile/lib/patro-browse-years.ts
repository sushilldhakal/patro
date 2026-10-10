import { type Era } from "@vedic-patro/domain/era";
import { clampBrowseYear, maxBrowseYearForEraOrDefault } from "@vedic-patro/domain/patro-browse-range";
import { applyPatroApiLimits as applyDomainLimits } from "@vedic-patro/domain/patro-year-axis";

/** Bootstrap until `GET /meta/capabilities` brings `offline_max_span_years`. */
export const OFFLINE_MAX_SPAN_BOOTSTRAP = 90;

let offlineMaxSpan = OFFLINE_MAX_SPAN_BOOTSTRAP;

/**
 * Apply host-owned bounds from `/meta/capabilities` or a month `limits` block:
 * the year limits go to the shared axis, the offline-download span is the app's.
 */
export function applyPatroApiLimits(
  c: Parameters<typeof applyDomainLimits>[0] & { offline_max_span_years?: number },
): void {
  applyDomainLimits(c);
  offlineMaxSpan = c.offline_max_span_years ?? offlineMaxSpan;
}

/** Widest BS-year window the host allows for an offline download. */
export function maxOfflineSpanYears(): number {
  return offlineMaxSpan;
}

const NATIVE_SELECT_YEAR_RADIUS = 100;

/** Windowed year list for pickers (~201 years around selection). */
export function windowedBrowseYears(
  era: Era,
  currentYear: number,
  radius = NATIVE_SELECT_YEAR_RADIUS,
): number[] {
  const max = maxBrowseYearForEraOrDefault(era);
  const y = clampBrowseYear(era, currentYear);
  const start = Math.max(1, y - radius);
  const end = Math.min(max, y + radius);
  const out: number[] = [];
  for (let i = start; i <= end; i += 1) out.push(i);
  return out;
}

export function browseYearSelectOptions(
  era: Era,
  currentYear: number,
  digits: (n: number) => string,
): { value: number; label: string }[] {
  return windowedBrowseYears(era, currentYear).map((y) => ({
    value: y,
    label: digits(y),
  }));
}
