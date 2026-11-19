/**
 * Figures for chapter 3 of the Surya Siddhanta (direction, place and time),
 * worked for Kathmandu (27°42′ N, equinoctial shadow about 6.3 digits):
 * finding the directions, the ayanāṃśa, the latitude triangle, the noon
 * shadow, the agrā, the shadow at any hour, the rising times of the signs
 * and the ascendant. copy-ok-file
 */
import { arrowHead, fr, grp, mark } from "./surya-classical";
import type { FigureDef } from "./surya-more-a";
import { arc, circle, dms, fmt, L, line, num, path, polar, suryaArc, suryaJya, text, TRIJYA, wrap, type FigureFrame, type Lang, type Shape, type Step, type Tone } from "./surya-kit";

const RAD = Math.PI / 180;
const KTM = 27.7;
const PALABHA = 12 * Math.tan(KTM * RAD);

/** The sun's declination by the text's rule (2.28), degrees, north +. */
export function sunDecl(lon: number): number {
  return suryaArc((suryaJya(lon) * 1397) / TRIJYA);
}

/** Altitude and azimuth (east of north) of the sun, degrees. */
function altAz(lat: number, dec: number, hour: number): { alt: number; east: number; north: number; up: number } {
  const p = lat * RAD;
  const d = dec * RAD;
  const h = hour * RAD;
  const east = -Math.cos(d) * Math.sin(h);
  const north = Math.cos(p) * Math.sin(d) - Math.sin(p) * Math.cos(d) * Math.cos(h);
  const up = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(h);
  return { alt: Math.asin(up) / RAD, east, north, up };
}

/** The shadow tip of a 12-digit gnomon, digits east and north of its foot. */
function shadowTip(lat: number, dec: number, hour: number): { x: number; y: number; up: number } {
  const s = altAz(lat, dec, hour);
  const k = -12 / Math.max(1e-6, s.up);
  return { x: s.east * k, y: s.north * k, up: s.up };
}

// ---------------------------------------------------------------- 3.1–5 finding the directions

function directionCircle(t: number, lang: Lang): FigureFrame {
  const dec = 15;
  const r = 18; // circle radius in digits
  const k = 3.6; // px per digit
  const cx = 110;
  const cy = 100;
  const X = (p: { x: number; y: number }) => ({ x: cx + p.x * k, y: cy - p.y * k });
  const shapes: Shape[] = [circle(cx, cy, r * k, { stroke: "muted", w: 1.2 })];
  // the shadow-tip path through the day, and where it crosses the circle
  let d = "";
  let west: { x: number; y: number } | null = null;
  let east: { x: number; y: number } | null = null;
  let prev: number | null = null;
  for (let h = -85; h <= 85; h += 1) {
    const p = shadowTip(KTM, dec, h);
    if (p.up < 0.2) continue;
    const q = X(p);
    d += `${d ? "L" : "M"} ${q.x.toFixed(1)} ${q.y.toFixed(1)} `;
    const len = Math.hypot(p.x, p.y);
    if (prev !== null && (prev - r) * (len - r) <= 0) {
      if (h < 0) west = q;
      else east = q;
    }
    prev = len;
  }
  shapes.push(path(d, { stroke: "faint", w: 1, dash: "3 2" }));
  const hour = -80 + t * 160;
  const tip = shadowTip(KTM, dec, hour);
  if (tip.up > 0.2) {
    const q = X(tip);
    const inside = Math.hypot(tip.x, tip.y) <= r;
    shapes.push(line(cx, cy, q.x, q.y, { stroke: "shadow", w: 3 }));
    shapes.push(circle(q.x, q.y, 3.5, { fill: inside ? "accent" : "ink" }));
  }
  if (west && hour > -40) mark(shapes, west, L(lang, "प", "W"), -10, 0, "accent", 3);
  if (east && hour > 40) mark(shapes, east, L(lang, "पू", "E"), 10, 0, "accent", 3);
  if (west && east && hour > 40) {
    shapes.push(line(west.x, west.y, east.x, east.y, { stroke: "accent", w: 1.4 }));
    // the fish: two arcs of equal radius from W and E, crossing above and below
    const mx = (west.x + east.x) / 2;
    const my = (west.y + east.y) / 2;
    const half = Math.hypot(east.x - west.x, east.y - west.y) / 2;
    const rr = half * 1.25;
    const off = Math.sqrt(rr * rr - half * half);
    const nx = -(east.y - west.y) / (2 * half);
    const ny = (east.x - west.x) / (2 * half);
    const n1 = { x: mx + nx * off, y: my + ny * off };
    const n2 = { x: mx - nx * off, y: my - ny * off };
    // short arcs of equal radius from W and from E, crossing at n1 and n2: the fish
    for (const c0 of [west, east]) {
      for (const n of [n1, n2]) {
        const a0 = (Math.atan2(-(n.y - c0.y), n.x - c0.x) * 180) / Math.PI;
        shapes.push(path(arc(c0.x, c0.y, rr, a0 - 14, a0 + 14), { stroke: "planet", w: 0.9 }));
      }
    }
    shapes.push(line(n1.x, n1.y, n2.x, n2.y, { stroke: "planet", w: 1.4 }));
    shapes.push(text(n1.x, n1.y - 6, L(lang, "मत्स्य", "fish"), "planet", 8.5));
  }
  shapes.push(circle(cx, cy, 3, { fill: "ink" }));
  const lx = 232;
  const legend: [string, Tone][] = [
    [L(lang, "१२ अङ्गुलको शङ्कु बीचमा", "12-digit gnomon at the centre"), "ink"],
    [L(lang, "छायाको टुप्पो वृत्तमा पस्दा: प", "Shadow tip enters: W"), "accent"],
    [L(lang, "निस्कँदा: पू", "Leaves: E"), "accent"],
    [L(lang, "दुईबाट मत्स्य: उत्तर–दक्षिण", "A fish from both: N–S"), "planet"],
  ];
  legend.forEach(([s, tone], i) => shapes.push(text(lx, 40 + i * 20, s, tone, 8.8, "start")));
  const len = Math.hypot(tip.x, tip.y);
  const steps: Step[] = [
    { say: L(lang, "समतल भुइँमा वृत्त, बीचमा १२ अङ्गुलको शङ्कु (३.१–२)", "A circle on level ground, a 12-digit gnomon at its centre (3.1–2)"), eq: [`${L(lang, "वृत्तको अर्धव्यास", "circle radius")} = ${num(lang, r)} ${L(lang, "अङ्गुल", "digits")}`] },
    { say: L(lang, "अहिले छायाको लम्बाइ = १२ × नतांशको स्पर्शज्या", "Shadow length now = 12 × tan(zenith distance)"), eq: [tip.up > 0.2 ? `${num(lang, 12)} × tan ${dms(lang, 90 - Math.asin(tip.up) / RAD)} = ${fmt(lang, len, 1)}` : L(lang, "सूर्य अस्त", "sun below")] },
    { say: L(lang, "बिहान छायाको टुप्पो वृत्तमा पस्ने बिन्दु पश्चिम, दिउँसो निस्कने बिन्दु पूर्व (३.२)", "Morning entry point is west, afternoon exit point east (3.2)"), eq: [`${L(lang, "छाया", "shadow")} = ${num(lang, r)} → ${hour < 0 ? L(lang, "प", "W") : L(lang, "पू", "E")}`] },
    { say: L(lang, "दुई बिन्दुबाट बराबर चापले मत्स्य बनाउँदा बीचको रेखा उत्तर–दक्षिण (३.३–४)", "Equal arcs from both points make a fish; its line is north–south (3.3–4)"), eq: [L(lang, "पूर्व–पश्चिम रेखा ⟂ उत्तर–दक्षिण रेखा", "E–W line ⟂ N–S line")] },
  ];
  return { shapes, readout: [`${L(lang, "मध्याह्नबाट", "from noon")} ${dms(lang, hour)} (${fmt(lang, hour / 6, 1)} ${L(lang, "घटी", "gh.")})`, tip.up > 0.2 ? `${L(lang, "छाया", "shadow")} ${fmt(lang, len, 1)} ${L(lang, "अङ्गुल", "digits")}` : ""], steps };
}

// ---------------------------------------------------------------- 3.9–11 the ayanāṃśa

export function ayanamshaAt(years: number): { rev: number; deg: number; bhuja: number; ayan: number } {
  const rev = (600 * years) / 4320000;
  const deg = (rev - Math.floor(rev)) * 360;
  const q = Math.floor(deg / 90);
  const into = deg % 90;
  const bhuja = q % 2 === 0 ? into : 90 - into;
  const ayan = ((q < 2 ? 1 : -1) * (bhuja * 3)) / 10;
  return { rev, deg, bhuja, ayan };
}

function ayanamsha(t: number, lang: Lang): FigureFrame {
  const years = t * 7200;
  const a = ayanamshaAt(years);
  const now = ayanamshaAt(5127);
  const cx = 100;
  const cy = 110;
  const R = 80;
  const shapes: Shape[] = [path(arc(cx, cy, R, 90 - 40, 90 + 40), { stroke: "muted", w: 1 }), line(cx, cy, cx, cy - R - 8, { stroke: "faint", dash: "3 3" }), text(cx, cy - R - 12, L(lang, "मेष ०°", "Aries 0°"), "muted", 9)];
  for (const s of [-27, 27]) {
    const p = polar(cx, cy, R, 90 - s);
    shapes.push(line(cx, cy, p.x, p.y, { stroke: "faint" }), text(p.x, p.y - 6, `${s > 0 ? "+" : "−"}${num(lang, 27)}°`, "muted", 8.5));
  }
  const p = polar(cx, cy, R - 4, 90 - a.ayan);
  shapes.push(line(cx, cy, p.x, p.y, { stroke: "accent", w: 2.4 }), arrowHead({ x: cx, y: cy }, p, "accent"));
  const pn = polar(cx, cy, R + 8, 90 - now.ayan);
  shapes.push(circle(pn.x, pn.y, 3, { fill: "ink" }), text(pn.x, pn.y + 16, L(lang, "आज", "now"), "ink", 8.5, "middle", true));
  shapes.push(circle(cx, cy, 4, { fill: "earth" }));
  const lx = 206;
  const legend: [string, Tone][] = [
    [L(lang, "भचक्र महायुगमा ६०० पटक", "The zodiac swings 600 times"), "ink"],
    [L(lang, "पूर्व–पश्चिम २७° सम्म डोलिन्छ", "a mahāyuga, up to 27° each way"), "ink"],
    [L(lang, "एक डोलाइ = ७२०० वर्ष", "One swing = 7200 years"), "muted"],
    [L(lang, "आधुनिक: अयन सधैँ एकतर्फ", "Modern: precession goes one way,"), "muted"],
    [L(lang, "करिब ५०.३″ प्रतिवर्ष", "about 50.3″ a year"), "muted"],
  ];
  legend.forEach(([s, tone], i) => shapes.push(text(lx, 46 + i * 20, s, tone, 8.8, "start")));
  const steps: Step[] = [
    { say: L(lang, "भचक्रका भगण: ३० × २० = ६०० प्रति महायुग (३.९–१०)", "Revolutions of the zodiac: 30 × 20 = 600 a mahāyuga (3.9–10)"), eq: [`${num(lang, 30)} × ${num(lang, 20)} = ${num(lang, 600)}`] },
    { say: L(lang, "कलि आरम्भदेखि वर्ष × ६०० ÷ युगवर्ष = भगण", "Years since Kali × 600 ÷ years in a yuga = revolutions"), eq: [fr(`${grp(lang, Math.round(years))} × ${num(lang, 600)}`, grp(lang, 4320000)), ` = ${fmt(lang, a.rev, 4)} → ${dms(lang, a.deg)}`] },
    { say: L(lang, "त्यसको भुज (पदअनुसार)", "Its bhuja, by quadrant"), eq: [`${dms(lang, a.bhuja)}`] },
    { say: L(lang, "भुज × ३ ÷ १० = अयनांश (३.१०)", "Bhuja × 3 ÷ 10 = ayanāṃśa (3.10)"), eq: [fr(`${dms(lang, a.bhuja)} × ${num(lang, 3)}`, num(lang, 10)), ` = ${dms(lang, Math.abs(a.ayan))}`] },
    { say: L(lang, "आज (कलि ५१२७): पाठको अयनांश र आधुनिक लाहिरी", "Now (Kali 5127): the text's ayanāṃśa against modern Lahiri"), eq: [`${dms(lang, Math.abs(now.ayan))} · ${L(lang, "लाहिरी", "Lahiri")} ≈ ${dms(lang, 24.2)}`] },
    { say: L(lang, "छायाबाट मापेको सूर्य र गणनाको सूर्यको अन्तरले अयनांश जाँच्ने (३.११)", "Check the ayanāṃśa by the gap between the shadow-sun and the computed sun (3.11)"), eq: [L(lang, "अयन = छायार्क − करणागत अर्क", "ayana = shadow sun − computed sun")] },
  ];
  return { shapes, readout: [`${L(lang, "कलिदेखि", "since Kali")} ${grp(lang, Math.round(years))} ${L(lang, "वर्ष", "years")}`, `${L(lang, "अयनांश", "ayanāṃśa")} ${a.ayan >= 0 ? "+" : "−"}${dms(lang, Math.abs(a.ayan))}`], steps };
}

// ---------------------------------------------------------------- 3.12–17 the latitude triangle

function akshaTriangle(t: number, lang: Lang): FigureFrame {
  const lat = 26.4 + 4 * (1 - Math.abs(1 - 2 * t));
  const pal = 12 * Math.tan(lat * RAD);
  const karna = Math.sqrt(144 + pal * pal);
  const lamba = (12 * TRIJYA) / karna;
  const aksha = (pal * TRIJYA) / karna;
  const k = 9;
  const bx = 60;
  const by = 170;
  const top = { x: bx, y: by - 12 * k };
  const tip = { x: bx + pal * k, y: by };
  const shapes: Shape[] = [
    line(20, by, 330, by, { stroke: "muted" }),
    line(bx, by, top.x, top.y, { stroke: "ink", w: 3 }),
    line(bx, by, tip.x, tip.y, { stroke: "shadow", w: 4 }),
    line(top.x, top.y, tip.x, tip.y, { stroke: "sun", w: 1.4, dash: "4 3" }),
    path(arc(top.x, top.y, 20, -90, -90 + lat), { stroke: "accent", w: 1.2 }),
    text(top.x + 10, top.y + 30, dms(lang, lat), "accent", 9, "start", true),
    text(bx - 8, by - 6 * k, L(lang, "१२", "12"), "ink", 10, "end", true),
    text((bx + tip.x) / 2, by + 14, L(lang, `पलभा ${fmt(lang, pal, 2)}`, `shadow ${pal.toFixed(2)}`), "muted", 9),
    text((top.x + tip.x) / 2 + 8, (top.y + tip.y) / 2 - 4, L(lang, `पलकर्ण ${fmt(lang, karna, 2)}`, `hyp. ${karna.toFixed(2)}`), "sun", 9, "start"),
  ];
  shapes.push(text(200, 30, L(lang, "विषुव दिनको मध्याह्न छाया", "Noon shadow on an equinox"), "ink", 9.5, "start", true));
  shapes.push(text(200, 48, L(lang, "शङ्कु = कोटि, पलभा = भुज", "gnomon = koṭi, shadow = bhuja"), "muted", 8.8, "start"));
  shapes.push(text(200, 64, L(lang, "शिरबिन्दुको कोण = अक्षांश", "angle at the top = latitude"), "muted", 8.8, "start"));
  const steps: Step[] = [
    { say: L(lang, "विषुव मध्याह्नको छाया नै पलभा (३.१२)", "The equinox noon shadow is the palabhā (3.12)"), eq: [`${num(lang, 12)} × tan ${dms(lang, lat)} = ${fmt(lang, pal, 2)} ${L(lang, "अङ्गुल", "digits")}`] },
    { say: L(lang, "पलकर्ण = √(१४४ + पलभा²) (३.८)", "Hypotenuse = √(144 + shadow²) (3.8)"), eq: [`√(${num(lang, 144)} + ${fmt(lang, pal, 2)}²) = ${fmt(lang, karna, 2)}`] },
    { say: L(lang, "लम्बज्या = शङ्कु × त्रिज्या ÷ पलकर्ण (३.१३)", "Co-latitude sine = gnomon × R ÷ hypotenuse (3.13)"), eq: [fr(`${num(lang, 12)} × ${num(lang, TRIJYA)}`, fmt(lang, karna, 2)), ` = ${fmt(lang, lamba)}`] },
    { say: L(lang, "अक्षज्या = पलभा × त्रिज्या ÷ पलकर्ण (३.१३)", "Latitude sine = shadow × R ÷ hypotenuse (3.13)"), eq: [fr(`${fmt(lang, pal, 2)} × ${num(lang, TRIJYA)}`, fmt(lang, karna, 2)), ` = ${fmt(lang, aksha)} → ${dms(lang, suryaArc(aksha))}`] },
    { say: L(lang, "उल्टो: अक्षांशबाट पलभा (३.१६–१७)", "Back: the shadow from the latitude (3.16–17)"), eq: [`√(${num(lang, TRIJYA)}² − ${fmt(lang, aksha)}²) = ${fmt(lang, Math.sqrt(TRIJYA ** 2 - aksha ** 2))} → `, fr(`${num(lang, 12)} × ${fmt(lang, aksha)}`, fmt(lang, Math.sqrt(TRIJYA ** 2 - aksha ** 2))), ` = ${fmt(lang, pal, 2)}`] },
  ];
  return { shapes, readout: [`${L(lang, "अक्षांश", "latitude")} ${dms(lang, lat)}`, `${L(lang, "पलभा", "palabhā")} ${fmt(lang, pal, 2)} · ${L(lang, "पलकर्ण", "hyp.")} ${fmt(lang, karna, 2)}`], steps };
}

// ---------------------------------------------------------------- 3.18–21 the noon shadow through the year

function noonSun(t: number, lang: Lang): FigureFrame {
  const lon = t * 360;
  const dec = sunDecl(lon);
  const z = KTM - dec;
  const jz = suryaJya(Math.abs(z));
  const jc = suryaJya(90 - Math.abs(z));
  const sh = (12 * jz) / jc;
  const k = 9;
  const bx = 120;
  const by = 160;
  const top = { x: bx, y: by - 12 * k };
  const tipX = bx + sh * k * (z >= 0 ? 1 : -1);
  const shapes: Shape[] = [
    line(14, by, 346, by, { stroke: "muted" }),
    line(bx, by, top.x, top.y, { stroke: "ink", w: 3 }),
    line(bx, by, tipX, by, { stroke: "shadow", w: 4 }),
    line(top.x, top.y, tipX, by, { stroke: "sun", w: 1, dash: "4 3" }),
    text(346, by + 14, L(lang, "उत्तर →", "north →"), "muted", 8.5, "end"),
  ];
  const ray = Math.hypot(tipX - bx, 12 * k) || 1;
  const sunP = { x: top.x - ((tipX - bx) / ray) * 46, y: Math.max(40, top.y - ((12 * k) / ray) * 46) };
  shapes.push(circle(sunP.x, sunP.y, 7, { fill: "sun" }));
  shapes.push(text(14, 22, L(lang, "काठमाडौँ, मध्याह्नको छाया वर्षभरि", "Kathmandu, the noon shadow through the year"), "ink", 9.5, "start", true));
  const lj = (dec >= 0 ? 1 : -1) * ((suryaJya(Math.abs(dec)) * TRIJYA) / 1397);
  const steps: Step[] = [
    { say: L(lang, "मध्याह्न छायाबाट नतांश (३.१४–१५)", "Zenith distance from the noon shadow (3.14–15)"), eq: [`${L(lang, "ज्या", "sin")} z = `, fr(`${fmt(lang, sh, 2)} × ${num(lang, TRIJYA)}`, `√(${num(lang, 144)} + ${fmt(lang, sh, 2)}²)`), ` = ${fmt(lang, jz)} → z = ${dms(lang, Math.abs(z))}`] },
    { say: L(lang, "क्रान्ति = अक्षांश − नतांश (एकै दिशा) (३.१८)", "Declination = latitude − zenith distance, same direction (3.18)"), eq: [`${dms(lang, KTM)} − ${dms(lang, z)} = ${dms(lang, dec)}`] },
    { say: L(lang, "क्रान्तिबाट सूर्यको भुज: क्रान्तिज्या × त्रिज्या ÷ १३९७ (३.१९)", "The sun's longitude from it: decl. sine × R ÷ 1397 (3.19)"), eq: [fr(`${fmt(lang, suryaJya(Math.abs(dec)))} × ${num(lang, TRIJYA)}`, num(lang, 1397)), ` = ${fmt(lang, Math.abs(lj))} → ${dms(lang, suryaArc(Math.abs(lj)))}`] },
    { say: L(lang, "उल्टो: सूर्यबाट मध्याह्न छाया (३.२०–२१)", "Back: the noon shadow from the sun (3.20–21)"), eq: [fr(`${num(lang, 12)} × ${fmt(lang, jz)}`, fmt(lang, jc)), ` = ${fmt(lang, sh, 2)} ${L(lang, "अङ्गुल", "digits")}`] },
  ];
  return { shapes, readout: [`${L(lang, "सूर्य", "sun")} ${dms(lang, lon)} · ${L(lang, "क्रान्ति", "decl.")} ${dms(lang, dec)}`, `${L(lang, "मध्याह्न छाया", "noon shadow")} ${fmt(lang, sh, 2)} ${L(lang, "अङ्गुल", "digits")} ${z >= 0 ? L(lang, "उत्तरतिर", "to the north") : L(lang, "दक्षिणतिर", "to the south")}`], steps };
}

// ---------------------------------------------------------------- 3.22–27 the agrā (sunrise amplitude)

function agra(t: number, lang: Lang): FigureFrame {
  const lon = t * 360;
  const dec = sunDecl(lon);
  const kj = (suryaJya(lon) * 1397) / TRIJYA;
  const lamba = Math.sqrt(TRIJYA ** 2 - suryaJya(KTM) ** 2);
  const agj = (kj * TRIJYA) / lamba;
  const ag = suryaArc(agj);
  const cx = 110;
  const cy = 150;
  const shapes: Shape[] = [line(14, cy, 230, cy, { stroke: "muted", w: 1.2 }), text(14, cy + 14, L(lang, "पूर्वी क्षितिज", "eastern horizon"), "muted", 8.5, "start")];
  const E = { x: cx, y: cy };
  mark(shapes, E, L(lang, "पू", "E"), 0, 14, "ink", 3);
  const rise = { x: cx - ag * 2.4, y: cy };
  shapes.push(circle(rise.x, rise.y, 7, { fill: "sun" }));
  shapes.push(line(rise.x, rise.y, rise.x + 70 * Math.cos((90 - KTM) * RAD) * (1), rise.y - 70 * Math.sin((90 - KTM) * RAD), { stroke: "sun", w: 1, dash: "3 3" }));
  shapes.push(path(`M ${E.x} ${cy + 3} L ${rise.x} ${cy + 3}`, { stroke: "accent", w: 3 }));
  shapes.push(text(14, 22, L(lang, "पूर्वतिर हेर्दा: बायाँ उत्तर, दायाँ दक्षिण", "Facing east: north to the left, south to the right"), "ink", 9, "start", true));
  for (const s of [-1, 1]) {
    const x = cx - s * 24 * 2.4;
    shapes.push(line(x, cy - 4, x, cy + 4, { stroke: "faint" }), text(x, cy + 24, `${num(lang, 24)}° ${s > 0 ? L(lang, "उ", "N") : L(lang, "द", "S")}`, "faint", 8));
  }
  const samaJ = dec > 0 && dec < KTM ? (kj * TRIJYA) / suryaJya(KTM) : null;
  const steps: Step[] = [
    { say: L(lang, "सूर्यको क्रान्तिज्या", "The sun's declination sine"), eq: [fr(`${fmt(lang, suryaJya(lon))} × ${num(lang, 1397)}`, num(lang, TRIJYA)), ` = ${fmt(lang, kj)}`] },
    { say: L(lang, "अग्राज्या = क्रान्तिज्या × त्रिज्या ÷ लम्बज्या (३.२२, ३.२७)", "Sine of agrā = decl. sine × R ÷ co-latitude sine (3.22, 3.27)"), eq: [fr(`${fmt(lang, kj)} × ${num(lang, TRIJYA)}`, fmt(lang, lamba)), ` = ${fmt(lang, agj)} → ${dms(lang, ag)}`] },
    { say: L(lang, "सूर्य पूर्व बिन्दुबाट यति उत्तर वा दक्षिण उदाउँछ", "The sun rises this far north or south of east"), eq: [`${dms(lang, Math.abs(ag))} ${ag >= 0 ? L(lang, "उत्तर", "north") : L(lang, "दक्षिण", "south")}`] },
    { say: L(lang, "कर्णाग्रा = अग्रा × छायाकर्ण ÷ त्रिज्या: छायाको टुप्पो पूर्व–पश्चिम रेखाबाट (३.२२–२४)", "Shadow agrā = agrā × shadow hypotenuse ÷ R: the tip's distance from the E–W line (3.22–24)"), eq: [L(lang, "भुज = पलभा ± कर्णाग्रा", "bhuja = palabhā ± shadow agrā")] },
    {
      say: L(lang, "उत्तर क्रान्ति अक्षांशभन्दा कम हुँदा सूर्य सम–मण्डल (ठीक पूर्व–पश्चिम) पार गर्छ (३.२५–२६)", "With north declination below the latitude the sun crosses the prime vertical (3.25–26)"),
      eq: [samaJ === null ? L(lang, "आज पार गर्दैन", "not today") : `${L(lang, "सम–शङ्कुज्या", "prime-vertical altitude sine")} = `, ...(samaJ === null ? [] : [fr(`${fmt(lang, kj)} × ${num(lang, TRIJYA)}`, fmt(lang, suryaJya(KTM))), ` = ${fmt(lang, samaJ)}`])],
    },
  ];
  return { shapes, readout: [`${L(lang, "सूर्य", "sun")} ${dms(lang, lon)} · ${L(lang, "क्रान्ति", "decl.")} ${dms(lang, dec)}`, `${L(lang, "अग्रा", "agrā")} ${dms(lang, Math.abs(ag))} ${ag >= 0 ? L(lang, "उत्तर", "N") : L(lang, "दक्षिण", "S")}`], steps };
}

// ---------------------------------------------------------------- 3.28–40 the shadow at any hour

function ishtaShadow(t: number, lang: Lang): FigureFrame {
  const lon = 60;
  const kj = (suryaJya(lon) * 1397) / TRIJYA;
  const dec = suryaArc(kj);
  const dyu = Math.sqrt(TRIJYA ** 2 - kj ** 2);
  const kujya = (kj * PALABHA) / 12;
  const charaJ = (kujya * TRIJYA) / dyu;
  const antya = TRIJYA + charaJ;
  const lamba = Math.sqrt(TRIJYA ** 2 - suryaJya(KTM) ** 2);
  const chara = suryaArc(charaJ);
  const halfDay = 90 + chara;
  const H = (t * 2 - 1) * (halfDay - 4);
  const utk = TRIJYA - suryaJya(90 - Math.abs(H));
  const cheda = ((antya - utk) * dyu) / TRIJYA;
  const shanku = (cheda * lamba) / TRIJYA;
  const drig = Math.sqrt(Math.max(0, TRIJYA ** 2 - shanku ** 2));
  const sh = (12 * drig) / Math.max(1, shanku);
  const tip = shadowTip(KTM, dec, H);
  const k = 5;
  const cx = 120;
  const cy = 110;
  const shapes: Shape[] = [line(cx - 100, cy, cx + 100, cy, { stroke: "faint" }), line(cx, cy - 90, cx, cy + 70, { stroke: "faint" })];
  shapes.push(text(cx + 102, cy + 3, L(lang, "पू", "E"), "muted", 9, "start"), text(cx - 102, cy + 3, L(lang, "प", "W"), "muted", 9, "end"), text(cx, cy - 94, L(lang, "उ", "N"), "muted", 9), text(cx, cy + 82, L(lang, "द", "S"), "muted", 9));
  let d = "";
  for (let h = -halfDay + 6; h <= halfDay - 6; h += 2) {
    const p = shadowTip(KTM, dec, h);
    if (p.up < 0.12 || Math.abs(p.x) > 20 || Math.abs(p.y) > 15) continue;
    const q = { x: cx + p.x * k, y: cy - p.y * k };
    d += `${d ? "L" : "M"} ${q.x.toFixed(1)} ${q.y.toFixed(1)} `;
  }
  shapes.push(path(d, { stroke: "faint", dash: "3 2" }));
  const q = { x: cx + Math.max(-20, Math.min(20, tip.x)) * k, y: cy - Math.max(-16, Math.min(16, tip.y)) * k };
  shapes.push(line(cx, cy, q.x, q.y, { stroke: "shadow", w: 3.5 }), circle(q.x, q.y, 3.5, { fill: "accent" }), circle(cx, cy, 3, { fill: "ink" }));
  shapes.push(text(236, 30, L(lang, "सूर्य वृष १° (क्रान्ति +२०°)", "Sun at Taurus 0° (decl. +20°)"), "ink", 8.8, "start", true));
  shapes.push(text(236, 48, L(lang, "माथिबाट हेर्दा छायाको बाटो", "The shadow's path seen from above"), "muted", 8.5, "start"));
  const steps: Step[] = [
    { say: L(lang, "चरज्या: क्रान्तिज्या × पलभा ÷ १२ = कुज्या; × त्रिज्या ÷ द्युज्या (२.६१)", "Ascensional sine: decl. sine × shadow ÷ 12, then × R ÷ day-radius (2.61)"), eq: [fr(`${fmt(lang, kujya, 1)} × ${num(lang, TRIJYA)}`, fmt(lang, dyu)), ` = ${fmt(lang, charaJ, 1)}`] },
    { say: L(lang, "अन्त्या = त्रिज्या + चरज्या (उत्तर क्रान्ति) (३.३४)", "Antyā = R + ascensional sine for north declination (3.34)"), eq: [`${num(lang, TRIJYA)} + ${fmt(lang, charaJ, 1)} = ${fmt(lang, antya, 1)}`] },
    { say: L(lang, "नतकाल (मध्याह्नबाट) को उत्क्रमज्या", "Versed sine of the hour angle from noon"), eq: [`${L(lang, "नत", "H")} = ${dms(lang, Math.abs(H))} (${fmt(lang, Math.abs(H) / 6, 2)} ${L(lang, "घटी", "gh.")}) → ${fmt(lang, utk, 1)}`] },
    { say: L(lang, "छेद = (अन्त्या − उत्क्रमज्या) × द्युज्या ÷ त्रिज्या (३.३५)", "Divisor = (antyā − versed sine) × day-radius ÷ R (3.35)"), eq: [fr(`(${fmt(lang, antya, 1)} − ${fmt(lang, utk, 1)}) × ${fmt(lang, dyu)}`, num(lang, TRIJYA)), ` = ${fmt(lang, cheda, 1)}`] },
    { say: L(lang, "शङ्कु = छेद × लम्बज्या ÷ त्रिज्या (३.३५, ३.३८)", "Altitude sine = divisor × co-latitude sine ÷ R (3.35, 3.38)"), eq: [fr(`${fmt(lang, cheda, 1)} × ${fmt(lang, lamba)}`, num(lang, TRIJYA)), ` = ${fmt(lang, shanku, 1)}`] },
    { say: L(lang, "दृग्ज्या = √(त्रिज्या² − शङ्कु²) (३.३६)", "Zenith sine = √(R² − altitude sine²) (3.36)"), eq: [`√(${num(lang, TRIJYA)}² − ${fmt(lang, shanku, 1)}²) = ${fmt(lang, drig, 1)}`] },
    { say: L(lang, "छाया = १२ × दृग्ज्या ÷ शङ्कु; कर्ण = १२ × त्रिज्या ÷ शङ्कु (३.३३)", "Shadow = 12 × zenith sine ÷ altitude sine; hypotenuse = 12 × R ÷ altitude sine (3.33)"), eq: [fr(`${num(lang, 12)} × ${fmt(lang, drig, 1)}`, fmt(lang, shanku, 1)), ` = ${fmt(lang, sh, 2)} · `, fr(`${num(lang, 12)} × ${num(lang, TRIJYA)}`, fmt(lang, shanku, 1)), ` = ${fmt(lang, (12 * TRIJYA) / Math.max(1, shanku), 2)}`] },
    { say: L(lang, "कोणशङ्कु: सूर्य ठीक कुनामा (आग्नेय, नैर्ऋत्य…) हुँदाको शङ्कु; त्रिज्या² ÷ २ बाट (३.२८–३३)", "Corner gnomon: the altitude when the sun stands in a corner direction, from R² ÷ 2 (3.28–33)"), eq: [`√(${num(lang, TRIJYA)}² ÷ ${num(lang, 2)}) = ${fmt(lang, TRIJYA / Math.SQRT2)} ${L(lang, "(कुनाको दिशाको ज्या)", "(sine of 45°)")}`] },
    { say: L(lang, "उल्टो: छायाबाट शङ्कु र नतकाल (३.३७–३९)", "Back: from the shadow, the altitude and the hour (3.37–39)"), eq: [L(lang, "दृग्ज्या = त्रिज्या × छाया ÷ कर्ण → शङ्कु → छेद → नत", "zenith sine = R × shadow ÷ hyp. → altitude → divisor → hour")] },
  ];
  return { shapes, readout: [`${L(lang, "मध्याह्नबाट", "from noon")} ${fmt(lang, H / 6, 2)} ${L(lang, "घटी", "gh.")}`, `${L(lang, "छाया", "shadow")} ${fmt(lang, sh, 2)} ${L(lang, "अङ्गुल", "digits")}`], steps };
}

// ---------------------------------------------------------------- 3.43–48 the rising times of the signs

export const RASHI: [string, string][] = [
  ["मेष", "Aries"], ["वृष", "Taurus"], ["मिथुन", "Gemini"], ["कर्क", "Cancer"], ["सिंह", "Leo"], ["कन्या", "Virgo"],
  ["तुला", "Libra"], ["वृश्चिक", "Scorpio"], ["धनु", "Sagittarius"], ["मकर", "Capricorn"], ["कुम्भ", "Aquarius"], ["मीन", "Pisces"],
];
const LANKA = [1670, 1795, 1935];

/** Kathmandu's ascensional differences for the first three signs, in asus. */
export function charaKhanda(palabha = PALABHA): number[] {
  const out: number[] = [];
  let prev = 0;
  for (const lon of [30, 60, 90]) {
    const kj = (suryaJya(lon) * 1397) / TRIJYA;
    const dyu = Math.sqrt(TRIJYA ** 2 - kj ** 2);
    const c = suryaArc((((kj * palabha) / 12) * TRIJYA) / dyu) * 60; // minutes = asus
    out.push(c - prev);
    prev = c;
  }
  return out;
}

function rashiUdaya(t: number, lang: Lang): FigureFrame {
  const r = risingAsusClean();
  const total = r.reduce((a, b) => a + b, 0);
  const x0 = 16;
  const w = 328;
  const shapes: Shape[] = [text(180, 16, L(lang, "काठमाडौँमा राशिहरू उदाउन लाग्ने समय (असु)", "Time for each sign to rise at Kathmandu (asus)"), "ink", 9.5, "middle", true)];
  let x = x0;
  const at = t * total;
  let acc = 0;
  let which = 0;
  r.forEach((v, i) => {
    const ww = (v / total) * w;
    if (at >= acc && at < acc + v) which = i;
    shapes.push(path(`M ${x.toFixed(1)} 60 h ${ww.toFixed(1)} v 40 h ${(-ww).toFixed(1)} Z`, { fill: i < 6 ? "sun" : "planet", opacity: i === which ? 0.6 : 0.18, stroke: "ink", w: 0.5 }));
    shapes.push(text(x + ww / 2, 84, L(lang, RASHI[i]![0], RASHI[i]![1].slice(0, 3)), "ink", 8, "middle"));
    shapes.push(text(x + ww / 2, 116, grp(lang, Math.round(v)), "muted", 7.5));
    x += ww;
    acc += v;
  });
  const cx = x0 + (at / total) * w;
  shapes.push(line(cx, 52, cx, 108, { stroke: "accent", w: 2 }));
  shapes.push(text(180, 146, L(lang, "मेष–मीन जस्ता छोटा, कर्क–धनु जस्ता लामा: जम्मा २१६०० असु = ६० घटी", "Short signs near Aries, long ones near Libra: 21,600 asus = 60 ghaṭī in all"), "muted", 8.5));
  const c = charaKhanda();
  const i3 = which % 6;
  const lankaIdx = i3 < 3 ? i3 : 5 - i3;
  const steps: Step[] = [
    { say: L(lang, "लङ्का (निरक्ष) का उदयासु: मेष १६७०, वृष १७९५, मिथुन १९३५ (३.४४)", "At Laṅkā: Aries 1670, Taurus 1795, Gemini 1935 asus (3.44)"), eq: [`${num(lang, 1670)} + ${num(lang, 1795)} + ${num(lang, 1935)} = ${grp(lang, 5400)} = ${num(lang, 90)}°`] },
    { say: L(lang, "यी कसरी आए: एक, दुई, तीन राशिको ज्या × परम–अल्प द्युज्या ÷ आफ्नो द्युज्या (३.४३)", "How: sines of 1, 2, 3 signs × the least day-radius ÷ their own (3.43)"), eq: [`${L(lang, "मेष", "Aries")}: `, fr(`${num(lang, 1719)} × ${num(lang, 3141)}`, fmt(lang, Math.sqrt(TRIJYA ** 2 - ((1719 * 1397) / TRIJYA) ** 2))), ` → ${L(lang, "चाप", "arc")} ≈ ${num(lang, 1670)}′`] },
    { say: L(lang, "काठमाडौँका चरखण्ड (पलभा ६.३)", "Kathmandu's ascensional parts (shadow 6.3)"), eq: [`${fmt(lang, c[0]!)}, ${fmt(lang, c[1]!)}, ${fmt(lang, c[2]!)} ${L(lang, "असु", "asus")}`] },
    { say: L(lang, "मेष–मिथुन: लङ्का − चरखण्ड; कर्क–कन्या: उल्टो क्रममा + चरखण्ड (३.४४–४५)", "Aries–Gemini: Laṅkā − part; Cancer–Virgo: reversed + part (3.44–45)"), eq: [`${L(lang, RASHI[which]![0], RASHI[which]![1])}: ${num(lang, LANKA[lankaIdx]!)} ${(which < 3 || which >= 9) ? "−" : "+"} ${fmt(lang, c[lankaIdx]!)} = ${grp(lang, Math.round(r[which]!))} ${L(lang, "असु", "asus")}`] },
    { say: L(lang, "तुला–मीन: मेष–कन्याकै उल्टो क्रम (३.४५)", "Libra–Pisces: the same six in reverse (3.45)"), eq: [`${grp(lang, Math.round(r[which]!))} ÷ ${num(lang, 360)} = ${fmt(lang, r[which]! / 360, 2)} ${L(lang, "घटी", "ghaṭī")}`] },
  ];
  return { shapes, readout: [`${L(lang, "उदाउँदै", "rising")}: ${L(lang, RASHI[which]![0], RASHI[which]![1])}`, `${grp(lang, Math.round(r[which]!))} ${L(lang, "असु", "asus")} = ${fmt(lang, r[which]! / 360, 2)} ${L(lang, "घटी", "gh.")}`], steps };
}

/** The twelve rising times, Aries first. */
export function risingAsusClean(palabha = PALABHA): number[] {
  const c = charaKhanda(palabha);
  const a = [LANKA[0]! - c[0]!, LANKA[1]! - c[1]!, LANKA[2]! - c[2]!];
  const b = [LANKA[2]! + c[2]!, LANKA[1]! + c[1]!, LANKA[0]! + c[0]!];
  return [...a, ...b, ...[...b].reverse(), ...[...a].reverse()];
}

// ---------------------------------------------------------------- 3.46–51 the ascendant

function lagna(t: number, lang: Lang): FigureFrame {
  const r = risingAsusClean();
  const sun = 222; // the sun in the middle of November, sāyana
  const gh = t * 60; // ghaṭīs since sunrise
  const asus = gh * 360;
  const si = Math.floor(sun / 30);
  const inSign = sun - si * 30;
  const bhogya = (r[si]! * (30 - inSign)) / 30;
  let rem = asus;
  let lg = sun;
  const passed: number[] = [];
  if (rem < bhogya) lg = sun + (rem * 30) / r[si]!;
  else {
    rem -= bhogya;
    let s = (si + 1) % 12;
    while (rem >= r[s]!) {
      rem -= r[s]!;
      passed.push(s);
      s = (s + 1) % 12;
    }
    lg = s * 30 + (rem * 30) / r[s]!;
  }
  lg = wrap(lg);
  const cx = 100;
  const cy = 104;
  const R = 78;
  const shapes: Shape[] = [circle(cx, cy, R, { stroke: "muted", w: 1 }), line(cx - R - 10, cy, cx + R + 10, cy, { stroke: "earth", w: 1.4 }), text(8, cy + 28, L(lang, "पूर्व क्षितिज", "east horizon"), "earth", 8, "start")];
  // the zodiac drawn so that the ascendant sits on the eastern horizon (left)
  const rot = (lon: number) => 180 + (lon - lg);
  for (let i = 0; i < 12; i += 1) {
    const a = polar(cx, cy, R, rot(i * 30));
    const b = polar(cx, cy, R - 8, rot(i * 30));
    shapes.push(line(a.x, a.y, b.x, b.y, { stroke: "faint" }));
    const lab = polar(cx, cy, R - 18, rot(i * 30 + 15));
    shapes.push(text(lab.x, lab.y + 3, L(lang, RASHI[i]![0], RASHI[i]![1].slice(0, 3)), "muted", 7.5));
  }
  const S = polar(cx, cy, R, rot(sun));
  shapes.push(circle(S.x, S.y, 6, { fill: "sun" }));
  const A = polar(cx, cy, R, rot(lg));
  shapes.push(circle(A.x, A.y, 4.5, { fill: "accent" }), text(A.x - 6, A.y - 8, L(lang, "लग्न", "asc."), "accent", 9.5, "end", true));
  shapes.push(text(214, 30, L(lang, "सूर्य वृश्चिक १२° (सायन)", "Sun at Scorpio 12° (tropical)"), "ink", 8.8, "start", true));
  shapes.push(text(214, 48, L(lang, "सूर्योदयदेखिको समयबाट लग्न", "The ascendant from time since sunrise"), "muted", 8.5, "start"));
  const steps: Step[] = [
    { say: L(lang, "सूर्योदयदेखि बितेको समय असुमा (३.४७)", "Time since sunrise in asus (3.47)"), eq: [`${fmt(lang, gh, 1)} ${L(lang, "घटी", "gh.")} × ${num(lang, 360)} = ${grp(lang, Math.round(asus))}`] },
    { say: L(lang, "सूर्यको राशिको भोग्य असु: उदयासु × बाँकी अंश ÷ ३० (३.४६)", "Remaining asus of the sun's sign: rising × degrees left ÷ 30 (3.46)"), eq: [fr(`${grp(lang, Math.round(r[si]!))} × ${fmt(lang, 30 - inSign, 1)}`, num(lang, 30)), ` = ${grp(lang, Math.round(bhogya))}`] },
    { say: L(lang, "त्यसपछि आउने राशिका उदयासु क्रमैसँग घटाउने (३.४७–४८)", "Then subtract the following signs' rising times in turn (3.47–48)"), eq: [passed.length ? passed.map((s) => L(lang, RASHI[s]![0], RASHI[s]![1])).join(", ") : L(lang, "कुनै पूरा राशि छैन", "no whole sign")] },
    { say: L(lang, "शेष × ३० ÷ अशुद्ध राशिको उदयासु = अंश (३.४८)", "Remainder × 30 ÷ that sign's rising time = degrees (3.48)"), eq: [`${L(lang, "लग्न", "ascendant")} = ${L(lang, RASHI[Math.floor(lg / 30)]![0], RASHI[Math.floor(lg / 30)]![1])} ${dms(lang, lg % 30)}`] },
    { say: L(lang, "लग्न सूर्यभन्दा पछि भए रात, अगाडि भए दिन (३.५०–५१)", "Ascendant behind the sun: night; ahead: day (3.50–51)"), eq: [L(lang, "समय = सूर्य र लग्नबीचका असु ÷ ३६० घटी", "time = asus between sun and ascendant ÷ 360 ghaṭī")] },
  ];
  return { shapes, readout: [`${L(lang, "सूर्योदयदेखि", "since sunrise")} ${fmt(lang, gh, 1)} ${L(lang, "घटी", "gh.")}`, `${L(lang, "लग्न", "ascendant")} ${L(lang, RASHI[Math.floor(lg / 30)]![0], RASHI[Math.floor(lg / 30)]![1])} ${dms(lang, lg % 30)}`], steps };
}

export const MORE_B = {
  "direction-circle": { chapter: 3, verse: 1, title: ["दिशा पत्ता लगाउने", "Finding the directions"], caption: ["छायाको टुप्पो वृत्तमा पस्ने र निस्कने बिन्दुले पूर्व–पश्चिम; मत्स्यले उत्तर–दक्षिण।", "Where the shadow tip enters and leaves the circle gives east–west; the fish gives north–south."], seconds: 24, still: 0.85, draw: directionCircle },
  ayanamsha: { chapter: 3, verse: 9, title: ["अयनांश", "The ayanāṃśa"], caption: ["पाठमा भचक्र २७° सम्म डोलिन्छ; ७२०० वर्षमा एक डोलाइ।", "In the text the zodiac swings up to 27°; one swing in 7200 years."], seconds: 24, still: 0.71, draw: ayanamsha },
  "aksha-triangle": { chapter: 3, verse: 12, title: ["अक्षक्षेत्र: पलभाबाट अक्षांश", "The latitude triangle"], caption: ["विषुव दिनको मध्याह्न छायाले बनेको त्रिभुजबाट ठाउँको अक्षांश।", "The triangle of the equinox noon shadow gives the place's latitude."], seconds: 20, still: 0.33, draw: akshaTriangle },
  "noon-sun": { chapter: 3, verse: 18, title: ["मध्याह्न छाया र सूर्य", "The noon shadow and the sun"], caption: ["मध्याह्न छायाबाट क्रान्ति र सूर्यको स्थान; सूर्यबाट छाया।", "From the noon shadow, the declination and the sun's place; and back."], seconds: 30, still: 0.75, draw: noonSun },
  agra: { chapter: 3, verse: 22, title: ["अग्रा: सूर्योदयको दिशा", "Agrā: where the sun rises"], caption: ["गर्मीमा सूर्य पूर्वभन्दा उत्तर, जाडोमा दक्षिण उदाउँछ।", "In summer the sun rises north of east, in winter south."], seconds: 30, still: 0.2, draw: agra },
  "ishta-shadow": { chapter: 3, verse: 28, title: ["कुनै पनि समयको छाया", "The shadow at any hour"], caption: ["अन्त्या, छेद, शङ्कु र दृग्ज्याबाट इष्ट समयको छाया।", "From antyā, divisor, altitude sine and zenith sine, the shadow at any time."], seconds: 24, still: 0.35, draw: ishtaShadow },
  "rashi-udaya": { chapter: 3, verse: 43, title: ["राशिहरूको उदयकाल", "Rising times of the signs"], caption: ["लङ्कामा ३ मान, आफ्नो ठाउँमा चरखण्डले घटबढ।", "Three values at Laṅkā, adjusted for one's own place by the ascensional parts."], seconds: 30, still: 0.1, draw: rashiUdaya },
  lagna: { chapter: 3, verse: 46, title: ["लग्न निकाल्ने तरिका", "Finding the ascendant"], caption: ["सूर्य र सूर्योदयदेखिको समयबाट पूर्व क्षितिजमा उदाउँदै गरेको बिन्दु।", "From the sun and the time since sunrise, the point rising on the eastern horizon."], seconds: 30, still: 0.15, draw: lagna },
} satisfies Record<string, FigureDef>;
