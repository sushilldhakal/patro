import type {
  NakshatraPadaSpan,
  NavataraRow,
  NavataraTableBlock,
  PanchangaDay,
  UdayaLagnaRow,
} from "@/lib/api";
import {
  formatShortClock,
  getChandrabalamTable,
  getNakshatraPadaSpans,
  getSunrise,
  getTarabalaTable,
  getUdayaLagna,
} from "@/lib/panchanga-format";

export type BalamCardItem = {
  key: string;
  number: number;
  name: string;
  nameEn?: string;
  tara: string;
  quality: string;
  tone: NavataraRow["tone"];
  timeRange?: string;
  startMin: number | null;
  endMin: number | null;
};

function parseClockToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatBalamTimeRange(start?: string | null, end?: string | null): string | undefined {
  const a = formatShortClock(start);
  const b = formatShortClock(end);
  if (!a || !b) return undefined;
  return `${a}-${b}`;
}

function tableRowForNumber(table: NavataraTableBlock | undefined, num: number): NavataraRow | undefined {
  return table?.rows.find((r) => r.index === num - 1);
}

function cardFromRow(
  row: NavataraRow,
  span: { start?: string; end?: string },
  prefix: string,
): BalamCardItem {
  const num = row.index + 1;
  const startMin = parseClockToMinutes(span.start);
  const endMin = parseClockToMinutes(span.end);
  return {
    key: `${prefix}-${num}-${startMin ?? "x"}`,
    number: num,
    name: row.name,
    nameEn: row.name_en ?? row.name,
    tara: row.tara,
    quality: row.quality,
    tone: row.tone,
    timeRange: formatBalamTimeRange(span.start, span.end),
    startMin,
    endMin,
  };
}

/** Full चन्द्रबल table: every udaya lagna span with API navatara row. */
export function getChandraBalamCards(p: PanchangaDay): BalamCardItem[] {
  const table = getChandrabalamTable(p);
  if (!table?.rows.length) return [];

  const lagna = getUdayaLagna(p) ?? [];
  const items: BalamCardItem[] = [];

  for (const lg of lagna) {
    const num = lg.number;
    if (!num) continue;
    const row = tableRowForNumber(table, num);
    if (!row) continue;
    items.push(
      cardFromRow(row, {
        start: lg.start_local_time_short ?? lg.start_local_time,
        end: lg.end_local_time_short ?? lg.end_local_time,
      }, "chandra"),
    );
  }

  return items;
}

function nakshatraSpansFromPada(padaSpans: NakshatraPadaSpan[], sunriseShort?: string) {
  const list: Array<{ number: number; start?: string; end?: string }> = [];
  let cursor = sunriseShort;

  for (const span of padaSpans) {
    const num = span.nakshatra_number;
    if (!num) continue;
    const end = span.end_local_time_short ?? span.end_local_time;
    const last = list[list.length - 1];
    if (last && last.number === num) {
      last.end = end;
    } else {
      list.push({ number: num, start: cursor, end });
    }
    cursor = end;
  }

  return list;
}

/** Full ताराबल table: every moon nakshatra span with API navatara row. */
export function getTaraBalamCards(p: PanchangaDay): BalamCardItem[] {
  const table = getTarabalaTable(p);
  if (!table?.rows.length) return [];

  const sunrise = getSunrise(p);
  const spans = nakshatraSpansFromPada(getNakshatraPadaSpans(p) ?? [], sunrise);
  const items: BalamCardItem[] = [];

  for (const span of spans) {
    const row = tableRowForNumber(table, span.number);
    if (!row) continue;
    items.push(cardFromRow(row, span, "tara"));
  }

  return items;
}

export function isClockInRange(clockMin: number, startMin: number | null, endMin: number | null): boolean {
  if (startMin == null || endMin == null) return false;
  if (endMin > startMin) return clockMin >= startMin && clockMin < endMin;
  return clockMin >= startMin || clockMin < endMin;
}

export function findCurrentBalamCard(cards: BalamCardItem[], clock?: string): BalamCardItem | undefined {
  const clockMin = parseClockToMinutes(clock);
  if (clockMin == null) return undefined;
  return cards.find((c) => isClockInRange(clockMin, c.startMin, c.endMin));
}

export function findCurrentUdayaLagna(
  rows: UdayaLagnaRow[],
  clock?: string,
): UdayaLagnaRow | undefined {
  const clockMin = parseClockToMinutes(clock);
  if (clockMin == null) return undefined;
  return rows.find((row) =>
    isClockInRange(
      clockMin,
      parseClockToMinutes(row.start_local_time_short ?? row.start_local_time),
      parseClockToMinutes(row.end_local_time_short ?? row.end_local_time),
    ),
  );
}
