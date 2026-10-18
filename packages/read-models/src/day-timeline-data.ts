import type { ApiHoraSlot, CivilTimeline, PanchangaDay } from "@vedic-patro/api-client";
import { formatPakshaNepaliDisplay, getAuspiciousWindows, getInauspiciousWindows, getLagnaSpans, getHoraSlots, getMoonrise, getMoonset, getPanchangaDetail, getPlanetRows, getSunrise, getSunset } from "./panchanga-format";
import { type AngaBlock, type AshubhaSegment, type ChoghadiyaSegment, type CivilHourTick, type DayTimelineData, type EnResolver, G_MAX_PAD, type HoraSegment, type LagnaSpanBlock, SHUDDHI_DOSHAS, type ShubhaSegment, type TimelineRowData, type TimelineSegment, angaSegments, buildChoghadiyaFromApi, buildCivilHourTicks, clockToMinutes, computeGMin, ghatiToCivilClockLabel, grahaSegments, karanaEnOf, karanaSegments, lagnaSegments, minToG, minutesToGhati, nakEnOf, nextKarana, parseTimeToMinutes, tithiEnOf, yogaEnOf } from "@vedic-patro/domain/day-timeline-data";

export * from "@vedic-patro/domain/day-timeline-data";

/**
 * Convert one raw inauspicious window to a segment on the 0–60 axis, or null if
 * it is degenerate / off-axis. `tillFullNight` windows run to next sunrise.
 */
function windowToSpan(
  w: ReturnType<typeof getInauspiciousWindows>[number],
  toG: (minutes: number) => number,
): { startG: number; endG: number } | null {
  const sMin = clockToMinutes(w.start);
  if (sMin == null) return null;
  const startG = toG(sMin);
  if (startG < 0 || startG > 60) return null;
  let endG: number;
  if (w.tillFullNight) {
    endG = 60;
  } else {
    const eMin = clockToMinutes(w.end);
    if (eMin == null) return null;
    endG = toG(eMin);
    if (endG < startG) endG = 60; // window carried past the axis end
  }
  endG = Math.min(endG, 60);
  if (endG <= startG) return null;
  return { startG, endG };
}

/**
 * Chart-band अशुभ segments: only the Panchang-Shuddhi doshas, with overlapping
 * ones merged into drikpanchang-style bands ("नक्षत्र विष, तिथि"). Keeps the
 * timeline from turning solid red — the full list lives in the cards below.
 */
function buildAshubhaSegments(
  windows: ReturnType<typeof getInauspiciousWindows>,
  toG: (minutes: number) => number,
): AshubhaSegment[] {
  const parsed: { s: number; e: number; ne: string; en: string }[] = [];
  for (const w of windows) {
    const label = SHUDDHI_DOSHAS[w.key];
    if (!label) continue;
    const span = windowToSpan(w, toG);
    if (!span) continue;
    parsed.push({ s: span.startG, e: span.endG, ne: label.ne, en: label.en });
  }
  if (!parsed.length) return [];

  // Sweep line: cut the axis at every boundary, record the dosha *set* per slice.
  const bounds = new Set<number>();
  for (const iv of parsed) {
    bounds.add(Number(iv.s.toFixed(3)));
    bounds.add(Number(iv.e.toFixed(3)));
  }
  const pts = [...bounds].sort((a, b) => a - b);
  const slices: { s: number; e: number; ne: string[]; en: string[] }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const s = pts[i]!;
    const e = pts[i + 1]!;
    if (e - s < 0.02) continue;
    const mid = (s + e) / 2;
    const ne: string[] = [];
    const en: string[] = [];
    for (const iv of parsed) {
      if (iv.s <= mid && mid < iv.e && !ne.includes(iv.ne)) {
        ne.push(iv.ne);
        en.push(iv.en);
      }
    }
    if (!ne.length) continue;
    slices.push({ s, e, ne, en });
  }

  // Merge neighbouring slices carrying the identical dosha set.
  const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && a.every((x) => b.includes(x));
  const merged: { s: number; e: number; ne: string[]; en: string[] }[] = [];
  for (const sl of slices) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.e - sl.s) < 0.02 && sameSet(last.ne, sl.ne)) {
      last.e = sl.e;
    } else {
      merged.push({ s: sl.s, e: sl.e, ne: [...sl.ne], en: [...sl.en] });
    }
  }

  return merged.map((m) => ({
    name: m.ne.join(", "),
    nameEn: m.en.join(", "),
    detailNe: m.ne.join(", "),
    detailEn: m.en.join(", "),
    startG: m.s,
    endG: m.e,
  }));
}

/**
 * Full अशुभ list for the cards below the chart: one segment per inauspicious
 * window (Rahu, Yamaganda, Gulika, Varjyam, Dur Muhurtam, Aadal/Vidal, Baana,
 * tithi doshas …), sorted by start. Not shown on the chart band.
 */
function buildAshubhaAllSegments(
  windows: ReturnType<typeof getInauspiciousWindows>,
  toG: (minutes: number) => number,
): AshubhaSegment[] {
  const segs: AshubhaSegment[] = [];
  for (const w of windows) {
    const span = windowToSpan(w, toG);
    if (!span) continue;
    segs.push({
      key: w.key,
      name: w.nameNe,
      nameEn: w.nameEn,
      detailNe: w.nameNe,
      detailEn: w.nameEn,
      startG: span.startG,
      endG: span.endG,
    });
  }
  segs.sort((a, b) => a.startG - b.startG);
  return segs;
}

/**
 * Convert raw auspicious windows (local clock ranges) into शुभ segments on the
 * shared 0–60 axis. Mirrors {@link buildAshubhaSegments} but keeps each muhurta
 * as its own named window (auspicious periods are distinct, not merged doshas),
 * sorted by start so the chart badge numbers match the list below.
 */
function buildShubhaSegments(
  windows: ReturnType<typeof getAuspiciousWindows>,
  toG: (minutes: number) => number,
): ShubhaSegment[] {
  const segs: ShubhaSegment[] = [];
  for (const w of windows) {
    const sMin = clockToMinutes(w.start);
    if (sMin == null) continue;
    const startG = toG(sMin);
    if (startG < 0 || startG > 60) continue;
    let endG: number;
    if (w.tillFullNight) {
      endG = 60;
    } else {
      const eMin = clockToMinutes(w.end);
      if (eMin == null) continue;
      endG = toG(eMin);
      if (endG < startG) endG = 60; // window carried past the axis end
    }
    endG = Math.min(endG, 60);
    if (endG <= startG) continue;
    segs.push({ key: w.key, name: w.nameNe, nameEn: w.nameEn, startG, endG });
  }
  segs.sort((a, b) => a.startG - b.startG);
  return segs;
}

function tithiSegments(tithi: AngaBlock | undefined, p: PanchangaDay): TimelineSegment[] {
  const paksha = formatPakshaNepaliDisplay(p);
  const pakshaEn = /कृष्ण/.test(paksha ?? "") ? "Krishna Paksha" : /शुक्ल/.test(paksha ?? "") ? "Shukla Paksha" : "";
  return angaSegments(tithi, tithiEnOf).map((seg, i) => ({
    ...seg,
    name: i === 0 && paksha ? `${seg.name}, ${paksha}` : seg.name,
    nameEn: i === 0 && pakshaEn ? `${seg.nameEn ?? seg.name}, ${pakshaEn}` : (seg.nameEn ?? seg.name),
  }));
}

/** Server hora slot from the daily panchanga payload. */
export type { ApiHoraSlot };

export function getApiHora(p: PanchangaDay): ApiHoraSlot[] {
  return getHoraSlots(p);
}

function buildHoraTimelineSegments(p: PanchangaDay): HoraSegment[] {
  return getApiHora(p).map((slot) => ({
    name: slot.planet_ne,
    nameEn: slot.planet_en,
    startG: slot.start_g,
    endG: Math.min(slot.end_g, 60),
    bad: slot.bad,
  }));
}

export function buildDayTimelineData(p: PanchangaDay): DayTimelineData | null {
  const detail = getPanchangaDetail(p);
  const sunrise = getSunrise(p);
  const sunset = getSunset(p);
  const sunriseMin = parseTimeToMinutes(sunrise);
  const sunsetMin = parseTimeToMinutes(sunset);
  if (sunriseMin == null || sunsetMin == null) return null;

  const dayG =
    (detail?.day_ghati as number | undefined) ??
    minutesToGhati(sunsetMin, sunriseMin);
  const gMin = computeGMin(sunriseMin);
  const gMax = 60 + G_MAX_PAD;
  const moonriseMin = parseTimeToMinutes(getMoonrise(p));
  const moonsetMin = parseTimeToMinutes(getMoonset(p));
  const moonriseG = moonriseMin != null ? minutesToGhati(moonriseMin, sunriseMin) : null;
  const moonsetG = moonsetMin != null ? minutesToGhati(moonsetMin, sunriseMin) : null;

  const vaara = (detail?.vaara ?? {}) as {
    name_ne?: string;
    name_english?: string;
    number?: number;
  };
  const weekdayNe = vaara.name_ne ?? p.weekday ?? "—";
  const weekdayEn = vaara.name_english ?? p.weekday ?? "—";

  const tithi = (detail?.tithi ?? p.tithi) as AngaBlock | undefined;
  const nakshatra = (detail?.nakshatra ?? p.nakshatra) as AngaBlock | undefined;
  const yoga = (detail?.yoga ?? p.yoga) as AngaBlock | undefined;
  const karana = (detail?.karana ?? p.karana) as AngaBlock | undefined;

  const apiChoghadiya = detail?.choghadiya as
    | Array<{ name_ne: string; start_g: number; end_g: number; bad?: boolean }>
    | undefined;
  // Both choghadiya and hora come pre-computed from the API daily payload.
  const cho = apiChoghadiya?.length ? buildChoghadiyaFromApi(apiChoghadiya) : [];
  const hora = buildHoraTimelineSegments(p);
  const inauspiciousWindows = getInauspiciousWindows(p);
  const ashubha = buildAshubhaSegments(inauspiciousWindows, (min) =>
    minutesToGhati(min, sunriseMin),
  );
  const ashubhaAll = buildAshubhaAllSegments(inauspiciousWindows, (min) =>
    minutesToGhati(min, sunriseMin),
  );
  const shubha = buildShubhaSegments(getAuspiciousWindows(p), (min) =>
    minutesToGhati(min, sunriseMin),
  );
  const lagnaSpans = (getLagnaSpans(p) ?? []) as LagnaSpanBlock[];
  const grahaSpashta = getPlanetRows(p).map(({ label, rashiNe, coords }) => ({
    label,
    rashiNe,
    coords,
  }));

  return {
    dayG,
    gMin,
    gMax,
    moonriseG,
    moonsetG,
    weekdayNe,
    weekdayEn,
    sunriseMin,
    sunriseLabel: sunrise ?? "",
    sunsetLabel: sunset ?? "",
    moonriseLabel: getMoonrise(p) ?? null,
    moonsetLabel: getMoonset(p) ?? null,
    grahaSpashta,
    civilHourTicks: buildCivilHourTicks(sunriseMin, gMin, gMax),
    rows: [
      { label: "तिथि", en: "Tithi", items: tithiSegments(tithi, p) },
      { label: "नक्षत्र", en: "Nakshatra", items: angaSegments(nakshatra, nakEnOf) },
      { label: "योग", en: "Yoga", items: angaSegments(yoga, yogaEnOf) },
      { label: "करण", en: "Karana", items: karanaSegments(karana) },
      {
        label: "चौघडिया",
        en: "Choghadiya",
        kind: "choghadiya",
        items: cho.map((c) => ({
          name: c.name,
          endG: c.endG,
          bad: c.bad,
        })),
      },
      {
        label: "होरा",
        en: "Hora",
        kind: "hora",
        items: hora.map((h) => ({
          name: h.name,
          nameEn: h.nameEn,
          endG: h.endG,
          bad: h.bad,
        })),
      },
      ...(lagnaSpans.length > 0
        ? [
            {
              label: "लग्न",
              en: "Lagna",
              kind: "lagna" as const,
              items: lagnaSegments(lagnaSpans),
            },
          ]
        : []),
      ...(ashubha.length > 0
        ? [{ label: "अशुभ", en: "Inauspicious", kind: "ashubha" as const, items: [] }]
        : []),
      ...(shubha.length > 0
        ? [{ label: "शुभ", en: "Auspicious", kind: "shubha" as const, items: [] }]
        : []),
      ...(grahaSpashta.length > 0
        ? [
            {
              label: "ग्रह",
              en: "Planets",
              kind: "graha" as const,
              items: grahaSegments(grahaSpashta),
            },
          ]
        : []),
    ],
    choghadiya: cho,
    badChoghadiya: cho.filter((c) => c.bad),
    hora,
    ashubha,
    ashubhaAll,
    shubha,
  };
}

/**
 * Civil-day (midnight→midnight) timeline built from the backend `civil_timeline`
 * block. Reuses the same 0–60 axis as the sunrise chart by treating position as
 * `minutes / 24`, so `dualTimeAtGhati(g, 0)` yields civil clock labels directly.
 */
export function buildCivilTimelineData(
  civil: CivilTimeline,
  p?: PanchangaDay,
): DayTimelineData {
  const sunriseG = minToG(civil.sunrise_min);
  const sunsetG = civil.sunset_min != null ? minToG(civil.sunset_min) : 60;
  const pakshaNe = civil.paksha_ne ?? "";
  const pakshaEn = /कृष्ण/.test(pakshaNe) ? "Krishna Paksha" : /शुक्ल/.test(pakshaNe) ? "Shukla Paksha" : "";

  const angaItems = (
    segs: CivilTimeline["rows"]["tithi"],
    opts?: { paksha?: boolean; karana?: boolean; toEn?: EnResolver },
  ): TimelineSegment[] => {
    const toEn: EnResolver = opts?.toEn ?? ((ne, apiEn) => apiEn ?? ne);
    const items: TimelineSegment[] = segs.map((s, i) => {
      const ne = s.name_ne ?? s.name ?? "";
      const en = toEn(ne, s.name);
      return {
        name: opts?.paksha && i === 0 && pakshaNe ? `${ne}, ${pakshaNe}` : ne,
        nameEn: opts?.paksha && i === 0 && pakshaEn ? `${en}, ${pakshaEn}` : en,
        endG: minToG(s.end_min),
      };
    });
    const last = items[items.length - 1];
    if (last) {
      // A segment that reaches the end of the day is open-ended (fills to 24:00).
      if (last.endG != null && last.endG >= 59.9) {
        last.endG = null;
      } else if (opts?.karana && last.endG != null) {
        // Karana chain stops short of midnight — continue with the correct
        // successor (handles the month-end fixed karanas, not just movable).
        const nk = nextKarana(last.name);
        items.push({ name: nk.ne, nameEn: nk.en, endG: null });
      }
    }
    return items;
  };

  const choghadiya: ChoghadiyaSegment[] = civil.choghadiya.map((c) => ({
    name: c.name_ne ?? "",
    startG: minToG(c.start_min),
    endG: minToG(c.end_min),
    bad: Boolean(c.bad),
  }));
  const hora: HoraSegment[] = civil.hora.map((h) => ({
    name: h.planet_ne ?? "",
    nameEn: h.planet_en ?? h.planet_ne ?? "",
    startG: minToG(h.start_min),
    endG: minToG(h.end_min),
    bad: Boolean(h.bad),
  }));

  const lagnaItems: TimelineSegment[] = civil.lagna.map((s, i, arr) => ({
    name: s.name_ne ?? s.name ?? "",
    nameEn: s.name ?? s.name_ne ?? "",
    endG: i < arr.length - 1 ? minToG(s.end_min) : null,
    transitionLocal:
      i < arr.length - 1 ? ghatiToCivilClockLabel(minToG(s.end_min), 0) : undefined,
  }));

  // Civil hours 0…24 across the axis (0–60), one tick per hour.
  const civilHourTicks: CivilHourTick[] = Array.from({ length: 25 }, (_, i) => ({
    hour: i,
    g: i * 2.5,
  }));

  const civilWindows = p ? getInauspiciousWindows(p) : [];
  const ashubha = buildAshubhaSegments(civilWindows, (min) => minToG(min));
  const ashubhaAll = buildAshubhaAllSegments(civilWindows, (min) => minToG(min));
  const shubha = p
    ? buildShubhaSegments(getAuspiciousWindows(p), (min) => minToG(min))
    : [];

  const rows: TimelineRowData[] = [
    { label: "तिथि", en: "Tithi", items: angaItems(civil.rows.tithi, { paksha: true, toEn: tithiEnOf }) },
    { label: "नक्षत्र", en: "Nakshatra", items: angaItems(civil.rows.nakshatra, { toEn: nakEnOf }) },
    { label: "योग", en: "Yoga", items: angaItems(civil.rows.yoga, { toEn: yogaEnOf }) },
    { label: "करण", en: "Karana", items: angaItems(civil.rows.karana, { karana: true, toEn: karanaEnOf }) },
    { label: "चौघडिया", en: "Choghadiya", kind: "choghadiya", items: [] },
    { label: "होरा", en: "Hora", kind: "hora", items: [] },
    ...(lagnaItems.length > 0
      ? [{ label: "लग्न", en: "Lagna", kind: "lagna" as const, items: lagnaItems }]
      : []),
    ...(ashubha.length > 0
      ? [{ label: "अशुभ", en: "Inauspicious", kind: "ashubha" as const, items: [] }]
      : []),
    ...(shubha.length > 0
      ? [{ label: "शुभ", en: "Auspicious", kind: "shubha" as const, items: [] }]
      : []),
  ];

  return {
    mode: "civil",
    sunriseG,
    sunsetG,
    nightBands: [
      [0, sunriseG],
      [sunsetG, 60],
    ],
    dayG: sunsetG,
    gMin: 0,
    gMax: 60,
    moonriseG: civil.moonrise_min != null ? minToG(civil.moonrise_min) : null,
    moonsetG: civil.moonset_min != null ? minToG(civil.moonset_min) : null,
    weekdayNe: civil.weekday_ne ?? "—",
    weekdayEn: civil.weekday_en ?? "—",
    sunriseMin: 0,
    sunriseLabel: ghatiToCivilClockLabel(sunriseG, 0),
    sunsetLabel: civil.sunset_min != null ? ghatiToCivilClockLabel(sunsetG, 0) : "",
    moonriseLabel: null,
    moonsetLabel: null,
    grahaSpashta: [],
    civilHourTicks,
    rows,
    choghadiya,
    badChoghadiya: choghadiya.filter((c) => c.bad),
    hora,
    ashubha,
    ashubhaAll,
    shubha,
  };
}
