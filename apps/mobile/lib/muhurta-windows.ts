import type { PanchangaDay } from "@/lib/api";

/** Auspicious muhurta window with local clock range. */
export interface AuspiciousWindow {
  key: string;
  nameNe: string;
  nameEn: string;
  start: string;
  end: string;
  tillFullNight?: boolean;
}

/**
 * Raw auspicious day-periods for the day-cycle timeline's शुभ row.
 * Lives in its own module so `day-timeline-data` does not circular-import
 * `panchanga-format` through `tithi-wheel-data`.
 */
export function getAuspiciousWindows(p: PanchangaDay): AuspiciousWindow[] {
  const detail = p.detail;
  const m = (detail?.muhurta ?? p.muhurta) as {
    auspicious_timings?: Array<{
      key?: string;
      name_ne?: string;
      name_en?: string;
      segments?: Array<{
        start_local_time_short?: string;
        end_local_time_short?: string;
        until_full_night?: boolean;
      }>;
    }>;
  } | undefined;
  if (!m) return [];

  const out: AuspiciousWindow[] = [];
  for (const entry of m.auspicious_timings ?? []) {
    const key = entry.key || "shubha";
    const ne = entry.name_ne || entry.name_en || entry.key || "शुभ";
    const en = entry.name_en || entry.name_ne || entry.key || "Shubha";
    for (const seg of entry.segments ?? []) {
      if (!seg.start_local_time_short) continue;
      if (seg.until_full_night && !seg.end_local_time_short) {
        out.push({
          key,
          nameNe: ne,
          nameEn: en,
          start: seg.start_local_time_short,
          end: "",
          tillFullNight: true,
        });
      } else if (seg.end_local_time_short) {
        out.push({
          key,
          nameNe: ne,
          nameEn: en,
          start: seg.start_local_time_short,
          end: seg.end_local_time_short,
        });
      }
    }
  }

  return out;
}
