/**
 * षड्बल made on the device: `jyotish::shadbala` in apps/rust (`compute_shadbala` in the Python
 * reference), the sixfold strength of the seven grahas in virupas, with graha-yuddha.
 */
import type { Sky } from "../../astronomy/sky";
import { ayanamshaAt, lagnaAt } from "../../astronomy/siddhanta-offline";
import { drikFrame } from "../../astronomy/drik-source";
import { dayTimes, varaAt } from "../../panchanga/engine/blocks";
import { spashtaGrahas } from "../../panchanga/engine/lagna-blocks";
import { wallIn } from "../../panchanga/engine/instant";
import { pyFloorDiv, pyInt, pyMod, pyRound } from "../../panchanga/engine/py";

type Json = Record<string, unknown>;
type G = "sun" | "moon" | "mars" | "mercury" | "jupiter" | "venus" | "saturn" | "rahu" | "ketu";
const ALL: G[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];
const SEVEN: G[] = ALL.slice(0, 7);
const I = (g: G) => ALL.indexOf(g);
const EN: Record<G, string> = { sun: "Sun", moon: "Moon", mars: "Mars", mercury: "Mercury", jupiter: "Jupiter", venus: "Venus", saturn: "Saturn", rahu: "Rahu", ketu: "Ketu" };
const NE: Record<G, string> = { sun: "सूर्य", moon: "चन्द्र", mars: "मंगल", mercury: "बुध", jupiter: "बृहस्पति", venus: "शुक्र", saturn: "शनि", rahu: "राहु", ketu: "केतु" };
const VARA_LORD: G[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];
const CHALDEAN: G[] = ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"];
const SIGN_LORD: G[] = ["mars", "venus", "mercury", "moon", "sun", "mercury", "venus", "mars", "jupiter", "saturn", "saturn", "jupiter"];
const BALA_LABELS: [string, string][] = [["sthana", "Sthana"], ["dig", "Dig"], ["kala", "Kala"], ["cheshta", "Cheshta"], ["naisargika", "Naisargika"], ["drik", "Drik"]];
const REQUIRED: Record<string, number> = { sun: 390, jupiter: 390, moon: 360, mars: 300, saturn: 300, mercury: 420, venus: 330 };
const EXALT_DEG: Record<string, number> = { sun: 10, moon: 33, mars: 298, mercury: 165, jupiter: 95, venus: 357 };
const MOOLA: Record<string, [number, number, number]> = { sun: [4, 0, 20], moon: [1, 4, 30], mars: [0, 0, 12], mercury: [5, 16, 20], jupiter: [8, 0, 10], venus: [6, 0, 15], saturn: [10, 0, 20] };
const FRIENDS: Record<G, G[]> = { sun: ["moon", "mars", "jupiter"], moon: ["sun", "mercury"], mars: ["sun", "moon", "jupiter"], mercury: ["sun", "venus"], jupiter: ["sun", "moon", "mars"], venus: ["mercury", "saturn"], saturn: ["mercury", "venus"], rahu: [], ketu: [] };
const ENEMIES: Record<G, G[]> = { sun: ["venus", "saturn"], mars: ["mercury"], mercury: ["moon"], jupiter: ["mercury", "venus"], venus: ["sun", "moon"], saturn: ["sun", "moon", "mars"], moon: [], rahu: [], ketu: [] };
const NAISARGIKA: Record<string, number> = { sun: 60, moon: 51.43, venus: 42.86, jupiter: 34.29, mercury: 25.71, mars: 17.14, saturn: 8.57 };

const exaltDeg = (p: G) => EXALT_DEG[p] ?? 200;
const signOf = (lon: number) => pyInt(pyFloorDiv(pyMod(lon, 360), 30)) % 12;
const idx = (x: number) => Math.max(0, pyInt(x));

const d2Hora = (lon: number) => ((signOf(lon) % 2 === 0) === (pyMod(lon, 30) < 15) ? 4 : 3);
const d3 = (lon: number) => (signOf(lon) + idx(pyFloorDiv(pyMod(lon, 30), 10)) * 4) % 12;
const d7 = (lon: number) => {
  const s = signOf(lon);
  return ((s % 2 === 0 ? s : s + 6) + idx(pyFloorDiv(pyMod(lon, 30), 30 / 7))) % 12;
};
const d9 = (lon: number) => idx(pyFloorDiv(pyMod(lon, 360) * 9, 30)) % 12;
const d12 = (lon: number) => (signOf(lon) + idx(pyFloorDiv(pyMod(lon, 30), 2.5))) % 12;
function d30Lord(lon: number): G {
  const within = pyMod(lon, 30);
  const bounds: [number, G][] =
    signOf(lon) % 2 === 0
      ? [[5, "mars"], [10, "saturn"], [18, "jupiter"], [25, "mercury"], [30, "venus"]]
      : [[5, "venus"], [12, "mercury"], [18, "jupiter"], [25, "saturn"], [30, "mars"]];
  return (bounds.find(([limit]) => within < limit) ?? bounds[4])[1];
}

const naturalRel = (p: G, o: G) => (FRIENDS[p].includes(o) ? 1 : ENEMIES[p].includes(o) ? -1 : 0);
const temporalRel = (p: G, o: G, d1: number[]) => ([2, 3, 4, 10, 11, 12].includes(((d1[I(o)] + 12 - d1[I(p)]) % 12) + 1) ? 1 : -1);
const compound = (score: number) => (score === 2 ? 20 : score === 1 ? 15 : score === 0 ? 10 : score === -1 ? 4 : 2);

function dignity(p: G, sign: number, d1: number[], rashi: boolean, lon: number): number {
  if (sign === signOf(exaltDeg(p))) return 45;
  const lord = SIGN_LORD[sign];
  if (lord === p) {
    const m = MOOLA[p];
    if (rashi && m) {
      const within = pyMod(lon, 30);
      if (sign === m[0] && m[1] <= within && within < m[2]) return 45;
    }
    return 30;
  }
  return compound(naturalRel(p, lord) + temporalRel(p, lord, d1));
}

function saptavargaja(p: G, lon: number, d1: number[]): number {
  let total = 0;
  [signOf(lon), d2Hora(lon), d3(lon), d7(lon), d9(lon), d12(lon)].forEach((sign, i) => {
    total += dignity(p, sign, d1, i === 0, lon);
  });
  const lord30 = d30Lord(lon);
  return total + (lord30 === p ? 30 : compound(naturalRel(p, lord30) + temporalRel(p, lord30, d1)));
}

const arc180 = (x: number) => {
  const arc = Math.abs(pyMod(x, 360));
  return arc > 180 ? 360 - arc : arc;
};
const uchcha = (p: G, lon: number) => arc180(lon - pyMod(exaltDeg(p) + 180, 360)) / 3;
function oja(p: G, lon: number): number {
  const prefOdd = !(p === "moon" || p === "venus");
  return ((signOf(lon) % 2 === 0) === prefOdd ? 15 : 0) + ((d9(lon) % 2 === 0) === prefOdd ? 15 : 0);
}
const kendradi = (sign: number, lagna: number) => {
  const h = ((sign + 12 - lagna) % 12) + 1;
  return [1, 4, 7, 10].includes(h) ? 60 : [2, 5, 8, 11].includes(h) ? 30 : 15;
};
function drekkana(p: G, lon: number): number {
  const i = idx(pyFloorDiv(pyMod(lon, 30), 10));
  const hit = ["sun", "mars", "jupiter"].includes(p) ? i === 0 : ["mercury", "saturn"].includes(p) ? i === 1 : ["moon", "venus"].includes(p) ? i === 2 : false;
  return hit ? 15 : 0;
}
function dig(p: G, lon: number, lagna: number): number {
  const offset = p === "sun" || p === "mars" ? 270 : p === "saturn" ? 180 : p === "moon" || p === "venus" ? 90 : 0;
  return (180 - arc180(lon - pyMod(lagna + offset, 360))) / 3;
}
function nathonnatha(p: G, birth: number, noon: number): number {
  const day = 60 * (1 - Math.min(Math.abs(birth - noon), 720) / 720);
  return p === "mercury" ? 60 : ["sun", "jupiter", "venus"].includes(p) ? day : 60 - day;
}
const benefic = (p: G) => ["moon", "mercury", "jupiter", "venus"].includes(p);
function paksha(p: G, sun: number, moon: number): number {
  let sep = pyMod(moon - sun, 360);
  if (sep > 180) sep = 360 - sep;
  return benefic(p) ? sep / 3 : 60 - sep / 3;
}
function tribhaga(p: G, birth: number, sunrise: number, sunset: number): number {
  const jup = p === "jupiter" ? 60 : 0;
  let third: number;
  let lords: G[];
  if (sunrise <= birth && birth < sunset) {
    const length = (sunset - sunrise) / 3;
    third = length === 0 ? 0 : Math.min(idx((birth - sunrise) / length), 2);
    lords = ["mercury", "sun", "saturn"];
  } else {
    const elapsed = birth >= sunset ? birth - sunset : birth + (1440 - sunset);
    const length = (1440 - sunset + sunrise) / 3;
    third = length === 0 ? 0 : Math.min(idx(elapsed / length), 2);
    lords = ["moon", "mars", "venus"];
  }
  return (lords[third] === p ? 60 : 0) + jup;
}
function hora(p: G, birth: number, sunrise: number, weekday: number): number {
  const i = idx(pyFloorDiv(pyMod(birth - sunrise, 1440), 60));
  const start = Math.max(0, CHALDEAN.indexOf(VARA_LORD[weekday]));
  return CHALDEAN[(start + i) % 7] === p ? 60 : 0;
}
function ayana(p: G, lon: number, ayan: number, eps: number): number {
  const rad = Math.PI / 180;
  const trop = pyMod(lon + ayan, 360);
  let decl = Math.asin(Math.sin(eps * rad) * Math.sin(trop * rad)) / rad;
  let value: number;
  if (p === "mercury") value = Math.min(60, Math.max(0, (Math.abs(decl) / eps) * 60));
  else {
    if (p === "moon" || p === "saturn") decl = -decl;
    value = Math.min(60, Math.max(0, ((decl + eps) / (2 * eps)) * 60));
  }
  return p === "sun" ? value * 2 : value;
}
function cheshta(p: G, speed: number): number {
  const mean = ({ mars: 0.524, mercury: 1.383, jupiter: 0.083, venus: 1.2, saturn: 0.033 } as Record<string, number>)[p] ?? 1;
  if (speed < 0) return 60;
  const ratio = speed / mean;
  return ratio <= 1 ? 45 - 15 * ratio : Math.max(15, 30 - 15 * (ratio - 1));
}
function baseDrishti(x0: number): number {
  const x = pyMod(x0, 360);
  if (x <= 30 || x >= 300) return x <= 30 ? 0 : baseDrishti(360 - x);
  if (x <= 60) return (x - 30) / 2;
  if (x <= 90) return x - 60 + 15;
  if (x <= 120) return 45 - (x - 90) / 2;
  if (x <= 180) return 30 + (x - 120) / 2;
  return baseDrishti(360 - x);
}
function specialFull(planet: G, x0: number): number {
  const x = pyMod(x0, 360);
  const centres = planet === "mars" ? [90, 210] : planet === "jupiter" ? [120, 240] : planet === "saturn" ? [60, 270] : [];
  return centres.some((c) => Math.abs(pyMod(x - c + 180, 360) - 180) <= 15) ? 60 : 0;
}
function drik(p: G, lons: number[]): number {
  let total = 0;
  for (const o of SEVEN) {
    if (o === p) continue;
    const angle = pyMod(lons[I(p)] - lons[I(o)], 360);
    const d = Math.max(baseDrishti(angle), specialFull(o, angle));
    total += benefic(o) ? d : -d;
  }
  return total / 4;
}
const status = (r: number) => (r >= 1.5 ? "Exceptional" : r >= 1.2 ? "Strong" : r >= 1 ? "Adequate" : r >= 0.9 ? "Borderline" : "Weak");
const minutes = (hms: string) => {
  const [h, m, s] = hms.split(":").map(Number);
  return h * 60 + m + (s ?? 0) / 60;
};

interface Row {
  p: G;
  breakdown: number[];
  uchcha: number;
  cheshta: number;
  sthana: number[];
  kala: number[];
}

/** `compute_shadbala` at `jd` (UT) for a place, or null when the day's sunrise or sunset is missing. */
export function shadbala(sky: Sky, jd: number, place: { latitude: number; longitude: number; timeZone: string }): Json | null {
  const lons = new Array<number>(9).fill(0);
  const speeds = new Array<number>(9).fill(0);
  for (const g of spashtaGrahas(sky, jd)) {
    const i = ALL.indexOf(g.key as G);
    if (i >= 0) {
      lons[i] = g.longitude;
      speeds[i] = g.speed;
    }
  }
  const drikSky = sky.system === "drik";
  const ayan = drikSky ? (sky.positionsAt(jd, 1, false)?.ayanamsha ?? 0) : ayanamshaAt(jd);
  const eps = drikSky ? drikFrame.obliquityAt(jd) : 24;
  const d1 = lons.map(signOf);
  const lagnaLon = lagnaAt(sky.source, jd, place.latitude, place.longitude);
  if (lagnaLon === null) return null;
  const lagnaSign = signOf(lagnaLon);
  const zone = place.timeZone;
  const local = wallIn(jd, zone);
  const times = dayTimes(sky, local.jdn, place);
  if (!times) return null;
  const birth = minutes(local.hms);
  const sunrise = minutes(wallIn(times.sunrise, zone).hms);
  const sunset = minutes(wallIn(times.sunset, zone).hms);
  const noon = (sunrise + sunset) / 2;
  const weekday = varaAt(times.sunrise, zone);
  const sunAt = (t: number) => sky.positionsAt(t, 1, false)?.longitude[0] ?? 0;
  /** `_ingress_weekday`: the weekday the Sun last crossed `target`. */
  const ingressWeekday = (target: number, maxDays: number) => {
    let day = jd;
    for (let k = 0; k < maxDays; k += 1) {
      const prev = day - 1;
      if (pyMod(sunAt(prev) - target, 360) > 300 && pyMod(sunAt(day) - target, 360) < 60) break;
      day = prev;
    }
    return varaAt(day, zone);
  };
  const masa = ingressWeekday(d1[0] * 30, 40);
  const varsha = ingressWeekday(0, 400);
  const r2 = (x: number) => pyRound(x, 2);

  const rows: Row[] = SEVEN.map((p) => {
    const lp = lons[I(p)];
    const [u, sv, oj, ke, dr] = [uchcha(p, lp), saptavargaja(p, lp, d1), oja(p, lp), kendradi(d1[I(p)], lagnaSign), drekkana(p, lp)];
    const sthana = u + sv + oj + ke + dr;
    const dg = dig(p, lp, lagnaLon);
    const na = nathonnatha(p, birth, noon);
    const pa = paksha(p, lons[0], lons[1]);
    const tr = tribhaga(p, birth, sunrise, sunset);
    const varaB = VARA_LORD[weekday] === p ? 45 : 0;
    const masaB = VARA_LORD[masa] === p ? 30 : 0;
    const varshaB = VARA_LORD[varsha] === p ? 15 : 0;
    const ho = hora(p, birth, sunrise, weekday);
    const ay = ayana(p, lp, ayan, eps);
    const kala = na + pa + tr + varaB + masaB + varshaB + ho + ay + 0;
    const ch = p === "sun" ? ay : p === "moon" ? pa : cheshta(p, speeds[I(p)]);
    return {
      p,
      breakdown: [r2(sthana), r2(dg), r2(kala), r2(ch), r2(NAISARGIKA[p] ?? 0), r2(drik(p, lons))],
      uchcha: u,
      cheshta: ch,
      sthana: [r2(u), r2(sv), r2(oj), r2(ke), r2(dr)],
      kala: [r2(na), r2(pa), r2(tr), r2(varshaB), r2(masaB), r2(varaB), r2(ho), r2(ay), 0],
    };
  });

  // `compute_yuddha_bala`: wars between tara grahas within 1°.
  const TARA: G[] = ["mars", "mercury", "jupiter", "venus", "saturn"];
  const DISC: Record<string, number> = { mars: 9.4, mercury: 6.6, jupiter: 190.4, venus: 16.6, saturn: 158 };
  const tri = (g: G) => {
    const r = rows.find((x) => x.p === g);
    return r ? r.breakdown[0] + r.breakdown[1] + r.kala.slice(0, 7).reduce((a, b) => a + b, 0) : 0;
  };
  const wars: Json[] = [];
  const by: [G, number][] = [];
  const add = (g: G, v: number) => {
    const e = by.find((x) => x[0] === g);
    if (e) e[1] = pyRound(e[1] + v, 2);
    else by.push([g, pyRound(v, 2)]);
  };
  TARA.forEach((a, i) => {
    for (const b of TARA.slice(i + 1)) {
      const [la, lb] = [lons[I(a)], lons[I(b)]];
      let sep = pyMod(Math.abs(la - lb), 360);
      if (sep > 180) sep = 360 - sep;
      if (sep >= 1) continue;
      const [winner, loser] = la <= lb ? [a, b] : [b, a];
      const discDiff = Math.abs(DISC[winner] - DISC[loser]);
      const virupas = discDiff > 0 ? Math.abs(tri(winner) - tri(loser)) / discDiff : 0;
      wars.push({ winner, loser, yuddhaVirupas: pyRound(virupas, 2), separationDeg: pyRound(sep, 4) });
      add(winner, virupas);
      add(loser, -virupas);
    }
  });
  for (const row of rows) {
    const e = by.find((x) => x[0] === row.p);
    if (e && e[1] !== 0) {
      row.kala[8] = pyRound(e[1], 2);
      row.breakdown[2] = pyRound(row.breakdown[2] + e[1], 2);
    }
  }

  const out = rows.map((r) => {
    const total = r.breakdown.reduce((a, b) => a + b, 0);
    const req = REQUIRED[r.p];
    const touched = by.some(([g, d]) => g === r.p && d !== 0);
    const totalVirupas = pyRound(total, 2);
    const ratioRaw = touched ? pyRound(totalVirupas / req, 4) : total / req;
    const ratio = pyRound(ratioRaw, 4);
    const st = status(touched ? ratio : ratioRaw);
    let top = 0;
    let low = 0;
    r.breakdown.forEach((v, i) => {
      if (v > r.breakdown[top]) top = i;
      if (v < r.breakdown[low]) low = i;
    });
    const u = Math.min(60, Math.max(0, r.uchcha));
    const c = Math.min(60, Math.max(0, r.cheshta));
    const [s, k] = [r.sthana, r.kala];
    return {
      ratio,
      status: st,
      totalVirupas,
      value: {
        key: r.p,
        name: EN[r.p],
        name_ne: NE[r.p],
        total_virupas: totalVirupas,
        rupas: touched ? pyRound(totalVirupas / 60, 2) : pyRound(total / 60, 2),
        required: req,
        ratio,
        status: st,
        top_bala: BALA_LABELS[top][1],
        weakest_bala: BALA_LABELS[low][1],
        breakdown: Object.fromEntries(BALA_LABELS.map(([key], i) => [key, r.breakdown[i]])),
        ishta_phala: pyRound(Math.sqrt(u * c), 2),
        kashta_phala: pyRound(Math.sqrt((60 - u) * (60 - c)), 2),
        sub_balas: {
          sthana: { uchcha: s[0], saptavargaja: s[1], oja_yugma: s[2], kendradi: s[3], drekkana: s[4] },
          kala: { nathonnatha: k[0], paksha: k[1], tribhaga: k[2], varshadhipati: k[3], masadhipati: k[4], varadhipati: k[5], horadhipati: k[6], ayana: k[7], yuddha: k[8] },
        },
      } as Json,
    };
  });
  out.sort((a, b) => b.ratio - a.ratio);
  const counts = Object.fromEntries(["Exceptional", "Strong", "Adequate", "Borderline", "Weak"].map((k) => [k, out.filter((r) => r.status === k).length]));
  const avg = out.reduce((a, r) => a + r.totalVirupas, 0) / out.length;
  const ref = (v: Json) => ({ key: v.key, name: v.name, name_ne: v.name_ne, status: v.status, ratio: v.ratio });
  return {
    planets: out.map((r) => r.value),
    summary: {
      strongest: ref(out[0].value),
      weakest: ref(out[out.length - 1].value),
      average_rupas: pyRound(avg / 60, 2),
      average_virupas: pyRound(avg, 2),
      meeting_threshold: out.filter((r) => r.ratio >= 1).length,
      total_planets: 7,
      counts,
    },
    method: "Parashari Shadbala (Surya Siddhanta sidereal longitudes)",
    yuddha: { wars, byPlanet: Object.fromEntries(by) },
  };
}
