/** Shared by apps/web/src/components/panchanga/DayTimeline.tsx and apps/mobile/components/panchanga/DayTimeline.web.tsx (moved here from both, unchanged). */
import type { TimelineRowData } from "@vedic-patro/domain/panchanga/day-timeline-data";

export interface ChartSegment {
  ne: string;
  en: string;
  fromG: number;
  toG: number;
  bad?: boolean;
  cut?: boolean;
  transitionLocal?: string;
  detailNe?: string;
  detailEn?: string;
  lane?: number;
  laneCount?: number;
}

/** Greedy interval partition: assign each segment the first lane free at its start. */
export function assignLanes(segs: ChartSegment[]): ChartSegment[] {
  const laneEnds: number[] = [];
  for (const seg of segs) {
    let lane = laneEnds.findIndex((end) => seg.fromG >= end - 0.001);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(seg.toG);
    } else {
      laneEnds[lane] = seg.toG;
    }
    seg.lane = lane;
  }
  const laneCount = Math.max(1, laneEnds.length);
  for (const seg of segs) seg.laneCount = laneCount;
  return segs;
}

export function segmentsFromRow(row: TimelineRowData): ChartSegment[] {
  let prev = 0;
  return row.items.map((it) => {
    const toG = it.endG != null ? Math.min(it.endG, 60) : 60;
    const seg: ChartSegment = {
      ne: it.name,
      en: it.nameEn ?? it.name,
      fromG: prev,
      toG,
      bad: it.bad,
      cut: it.endG != null && it.endG < 60,
      transitionLocal: it.transitionLocal,
    };
    prev = toG;
    return seg;
  });
}

export function minutesOnVedicChart(
  queryInstantLocal: string | undefined,
  anchorDateAd: string,
  needleClock: string | undefined
): number | null {
  if (needleClock) {
    const [hh, mm] = needleClock.split(":").map(Number);
    if (!Number.isNaN(hh) && !Number.isNaN(mm)) return hh * 60 + mm;
  }
  if (queryInstantLocal) {
    const [datePart, timePart] = queryInstantLocal.split(" ");
    if (!timePart) return null;
    const [hh, mm] = timePart.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    const mins = hh * 60 + mm;
    if (datePart === anchorDateAd) return mins;
    return 24 * 60 + mins;
  }
  return null;
}
