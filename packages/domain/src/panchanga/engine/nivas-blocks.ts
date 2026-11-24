// Nivas and shool: directional abodes and homa indicators (`panchanga::blocks_nivas`).
import type { Sky } from "../../astronomy/sky";
import { nakshatraAt, sunMoon, tithiInfo, type Json } from "./blocks";
import { pyInt } from "./py";
import { addSeconds, utcIso, wallIn } from "./instant";
import { AGNIVASA, BHADRA_LOKA, DIRECTIONS, HOMAHUTI_GRAHAS, KUMBHACHAKRA_PARTS, RAHU_VASA, SHIVAVASA } from "./tables.generated";

const NAKSHATRA_SPAN = 360 / 27;
/** Disha shool direction index (0 E, 1 W, 2 N, 3 S) by Python weekday (Monday first). */
const DISHA_SHOOLA = [0, 2, 2, 3, 1, 0, 1];

const direction = (i: number): Json => {
  const [key, en, ne] = DIRECTIONS[i % 4];
  return { direction_key: key, name_en: en, name_ne: ne };
};

function dishaShool(weekday: number): Json {
  const i = DISHA_SHOOLA[weekday % 7];
  return { ...direction(i), auspicious_directions: [0, 1, 2, 3].filter((j) => j !== i).map(direction) };
}

function agnivasa(tithiAbsolute: number, weekday: number): Json {
  const vaara = [2, 3, 4, 5, 6, 7, 1][weekday % 7];
  const [en, ne, sen, sne, good] = AGNIVASA[[0, 1, 2, 0][(tithiAbsolute + vaara + 1) % 4]];
  return { name_en: en, name_ne: ne, subtitle_en: sen, subtitle_ne: sne, is_auspicious: good };
}
function shivavasa(tithiAbsolute: number): Json {
  const pt = ((tithiAbsolute - 1) % 15) + 1;
  const [en, ne, good] = SHIVAVASA[[6, 0, 1, 2, 3, 4, 5][(pt * 2 + 5) % 7]];
  return { name_en: en, name_ne: ne, is_auspicious: good };
}
function kumbha(paksha: number, weekday: number): Json {
  const index = (weekday + paksha) % 7;
  const [en, ne, good] = KUMBHACHAKRA_PARTS[index];
  return { name_en: en, name_ne: ne, is_auspicious: good, index };
}

const moonRashiNumber = (sky: Sky, jd: number) => (pyInt(sunMoon(sky, jd)[1] / 30) % 12) + 1;

function homahuti(sky: Sky, jd: number): Json {
  let sunNak = pyInt(sunMoon(sky, jd)[0] / NAKSHATRA_SPAN) + 1;
  if (sunNak > 27) sunNak = 1;
  const moonNak = nakshatraAt(sky, jd).number;
  const distance = (((moonNak - sunNak) % 27) + 27) % 27;
  const [key, symbol, en, ne, good] = HOMAHUTI_GRAHAS[Math.floor(distance / 3) % 9];
  return { key, symbol, name_en: en, name_ne: ne, is_auspicious: good };
}

const chandraVasa = (sky: Sky, jd: number): Json => direction([2, 0, 3, 1][moonRashiNumber(sky, jd) % 4]);

export function nivasShool(sky: Sky, sunrise: number, nextSunrise: number, weekday: number, zone: string): Json {
  const endOf = (kind: "tithi" | "nakshatra" | "moonRashi" | "karana", jd: number) => {
    const b = sky.nextBoundary(kind, jd);
    if (!b) throw new Error("no boundary");
    return b.jd;
  };
  const spanEnd = (end: number): Json =>
    end >= nextSunrise ? { until_full_night: true } : { end_time: utcIso(end), end_local_time: wallIn(end, zone).hms, end_local_time_short: wallIn(end, zone).hm };
  const span = (start: number, end: number, value: Json): Json => ({ start_time: utcIso(start), start_local_time_short: wallIn(start, zone).hm, ...value, ...spanEnd(end) });
  const boundaries = (kind: "tithi" | "nakshatra" | "moonRashi") => {
    const points = [sunrise];
    let cursor = sunrise;
    while (cursor < nextSunrise) {
      const end = Math.min(endOf(kind, cursor), nextSunrise);
      if (end < nextSunrise && !points.includes(end)) points.push(end);
      if (end >= nextSunrise) break;
      cursor = addSeconds(end, 90);
    }
    return points;
  };
  const timed = (bounds: number[], value: (at: number) => Json): Json[] => bounds.map((start, i) => span(start, bounds[i + 1] ?? nextSunrise, value(i === 0 ? start : addSeconds(start, 1))));
  const spans = (segments: Json[], fallback: () => Json): Json => ({ current: segments[0] ?? fallback(), segments });

  const tithiBounds = boundaries("tithi");
  const nakBounds = boundaries("nakshatra");
  const rashiBounds = boundaries("moonRashi");
  const homaBounds = [...new Set([...tithiBounds, ...nakBounds])].sort((a, b) => a - b);
  const agni = timed(tithiBounds, (at) => agnivasa(tithiInfo(sky, at).number, weekday));
  const shiva = timed(tithiBounds, (at) => shivavasa(tithiInfo(sky, at).number));
  const kumbh = timed(tithiBounds, (at) => kumbha(tithiInfo(sky, at).display, weekday));
  const homa = timed(homaBounds, (at) => homahuti(sky, at));
  const chandra = timed(rashiBounds, (at) => chandraVasa(sky, at));

  const bhadra: Json[] = [];
  let cursor = sunrise;
  while (cursor < nextSunrise) {
    const kEnd = endOf("karana", cursor);
    const k = Math.floor((((sunMoon(sky, cursor)[1] - sunMoon(sky, cursor)[0]) % 360) + 360) % 360 / 6);
    const isVishti = k !== 0 && k < 57 && (k - 1) % 7 === 6;
    if (!isVishti) {
      cursor = addSeconds(kEnd, 90);
      continue;
    }
    const end = Math.min(kEnd, nextSunrise);
    const rashi = moonRashiNumber(sky, cursor);
    const [li, loka] = [1, 2, 3, 8].includes(rashi) ? [0, "swarga"] : [6, 7, 9, 10].includes(rashi) ? [2, "patala"] : [1, "prithvi"];
    const [en, ne, sen, sne, good] = BHADRA_LOKA[li as number];
    bhadra.push(span(cursor, end, { name_en: en, name_ne: ne, subtitle_en: sen, subtitle_ne: sne, is_auspicious: good, loka }));
    cursor = addSeconds(end, 90);
  }
  const [rkey, ren, rne] = RAHU_VASA[weekday % 7];
  return {
    homahuti: spans(homa, () => homahuti(sky, sunrise)),
    disha_shool: dishaShool(weekday),
    rahu_vasa: { direction_key: rkey, name_en: ren, name_ne: rne },
    agnivasa: spans(agni, () => agnivasa(tithiInfo(sky, sunrise).number, weekday)),
    shivavasa: spans(shiva, () => shivavasa(tithiInfo(sky, sunrise).number)),
    chandra_vasa: spans(chandra, () => chandraVasa(sky, sunrise)),
    bhadravasa: { active: bhadra.length > 0, segments: bhadra },
    kumbha_chakra: spans(kumbh, () => kumbha(tithiInfo(sky, sunrise).display, weekday)),
  };
}
