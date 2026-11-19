/**
 * More figures for chapters 1 and 2 of the Surya Siddhanta: the kinds of
 * month, the planets' eastward lag, intercalary months and lost tithis,
 * the time correction, the planets' latitudes, the sine lookup, the order
 * of the four corrections, true daily motion, a planet's latitude and
 * declination, and the five limbs of the panchanga. Every figure moves with
 * t and carries its arithmetic. copy-ok-file
 */
import { arrowHead, box, fr, grp, mark, sighraParts } from "./surya-classical";
import { arc, circle, dms, fmt, L, line, num, path, polar, suryaArc, suryaJya, SURYA_SINES, text, TRIJYA, wrap, type FigureFrame, type Lang, type Shape, type Step, type Tone } from "./surya-kit";

export type FigureDef = {
  chapter: number;
  verse: number;
  title: [string, string];
  caption: [string, string];
  seconds: number;
  still: number;
  draw: (t: number, lang: Lang) => FigureFrame;
};

const MY = 4320000;
const CIVIL = 1577917828;
const SIDEREAL = 1582237828;
const TITHIS = 1603000080;
const LUNAR_MONTHS = 53433336;
const SOLAR_MONTHS = 51840000;

// ---------------------------------------------------------------- 1.12–14 kinds of month

function monthKinds(t: number, lang: Lang): FigureFrame {
  const days = t * 365.2588; // one solar year of civil days
  const x0 = 96;
  const w = 250;
  const tracks: { ne: string; en: string; per: number; tone: Tone }[] = [
    { ne: "नाक्षत्र मास", en: "sidereal month", per: 30 * (CIVIL / SIDEREAL), tone: "planet" },
    { ne: "सावन मास", en: "civil month", per: 30, tone: "earth" },
    { ne: "चान्द्र मास", en: "lunar month", per: CIVIL / LUNAR_MONTHS, tone: "accent" },
    { ne: "सौर मास", en: "solar month", per: CIVIL / SOLAR_MONTHS, tone: "sun" },
  ];
  const shapes: Shape[] = [text(180, 16, L(lang, "एक सौर वर्षमा कति मास?", "How many months in one solar year?"), "ink", 10, "middle", true)];
  tracks.forEach((tr, i) => {
    const y = 36 + i * 34;
    shapes.push(text(x0 - 6, y + 13, L(lang, tr.ne, tr.en), "ink", 9, "end"));
    const n = 365.2588 / tr.per;
    for (let k = 0; k < Math.ceil(n); k += 1) {
      const a = x0 + (k * tr.per * w) / 365.2588;
      const b = Math.min(x0 + w, x0 + ((k + 1) * tr.per * w) / 365.2588);
      const done = (k + 1) * tr.per <= days;
      shapes.push(path(`M ${a.toFixed(1)} ${y} H ${b.toFixed(1)} v 18 H ${a.toFixed(1)} Z`, { fill: tr.tone, opacity: done ? 0.45 : 0.12, stroke: "ink", w: 0.4 }));
    }
    shapes.push(text(x0 + w + 4, y + 13, fmt(lang, n, 2), "muted", 8.5, "start"));
  });
  const cx = x0 + (days / 365.2588) * w;
  shapes.push(line(cx, 30, cx, 176, { stroke: "accent", w: 1.8 }));
  shapes.push(text(x0, 192, L(lang, "दिव्य अहोरात्र = एक सौर वर्ष (१.१४)", "A day-and-night of the gods = one solar year (1.14)"), "muted", 8.5, "start"));
  const steps: Step[] = [
    { say: L(lang, "नाक्षत्र अहोरात्र: ६० घटी; ३० नाक्षत्र दिन = नाक्षत्र मास (१.१२)", "Sidereal day: 60 ghaṭī; 30 of them make a sidereal month (1.12)"), eq: [fr(grp(lang, SIDEREAL), grp(lang, MY)), ` = ${fmt(lang, SIDEREAL / MY, 4)} ${L(lang, "नाक्षत्र दिन प्रतिवर्ष", "sidereal days a year")}`] },
    { say: L(lang, "सावन दिन: सूर्योदयदेखि सूर्योदय; ३० सावन दिन = सावन मास", "Civil day: sunrise to sunrise; 30 make a civil month"), eq: [fr(grp(lang, CIVIL), grp(lang, MY)), ` = ${fmt(lang, CIVIL / MY, 4)} ${L(lang, "सावन दिन", "civil days")}`] },
    { say: L(lang, "चान्द्र मास: ३० तिथि (१.१३)", "Lunar month: 30 tithis (1.13)"), eq: [fr(grp(lang, LUNAR_MONTHS), grp(lang, MY)), ` = ${fmt(lang, LUNAR_MONTHS / MY, 4)} ${L(lang, "चान्द्र मास प्रतिवर्ष", "lunar months a year")}`] },
    { say: L(lang, "सौर मास: सूर्यको एक संक्रान्तिदेखि अर्कोसम्म; १२ सौर मास = वर्ष (१.१३)", "Solar month: one saṅkrānti to the next; 12 make the year (1.13)"), eq: [fr(`${grp(lang, CIVIL)}`, grp(lang, SOLAR_MONTHS)), ` = ${fmt(lang, CIVIL / SOLAR_MONTHS, 4)} ${L(lang, "दिन", "days")}`] },
    { say: L(lang, "चित्रको दिनमा", "At the drawing's day"), eq: [`${fmt(lang, days, 1)} ${L(lang, "दिन", "days")} → ${fmt(lang, days / (CIVIL / LUNAR_MONTHS), 2)} ${L(lang, "चान्द्र", "lunar")}, ${fmt(lang, days / (CIVIL / SOLAR_MONTHS), 2)} ${L(lang, "सौर", "solar")}`] },
  ];
  return { shapes, readout: [`${L(lang, "दिन", "day")} ${fmt(lang, days)}`, `${L(lang, "तिथि", "tithis")} ${fmt(lang, (days * TITHIS) / CIVIL, 1)} · ${L(lang, "नाक्षत्र दिन", "sidereal days")} ${fmt(lang, (days * SIDEREAL) / CIVIL, 1)}`], steps };
}

// ---------------------------------------------------------------- 1.25–28 the eastward lag

function eastwardLag(t: number, lang: Lang): FigureFrame {
  const days = t * 6;
  const cx = 104;
  const cy = 100;
  const R = 76;
  const shapes: Shape[] = [circle(cx, cy, R, { stroke: "faint", w: 1 }), circle(cx, cy, 5, { fill: "earth" })];
  // the sky turns westward (clockwise) once a sidereal day; a star at 90° to start
  const star = 90 - 360 * days * (SIDEREAL / CIVIL);
  const moon = star + (790.58 / 60) * days * (SIDEREAL / CIVIL);
  const sun = star + (59.14 / 60) * days * (SIDEREAL / CIVIL);
  const S = polar(cx, cy, R, star);
  const M = polar(cx, cy, R - 14, moon);
  const U = polar(cx, cy, R - 28, sun);
  shapes.push(line(cx, cy, S.x, S.y, { stroke: "faint", dash: "2 3" }));
  shapes.push(path(arc(cx, cy, R - 14, star, moon), { stroke: "muted", w: 3 }));
  mark(shapes, S, L(lang, "तारा", "star"), 0, -8, "planet", 3);
  shapes.push(circle(M.x, M.y, 5, { fill: "moon", stroke: "muted", w: 0.6 }));
  shapes.push(circle(U.x, U.y, 5.5, { fill: "sun" }));
  shapes.push(text(cx, cy + R + 16, L(lang, "आकाश पश्चिमतिर घुम्छ (घडीको दिशा)", "The sky turns west (clockwise)"), "muted", 8.5));
  const lx = 206;
  const lines: [string, Tone][] = [
    [L(lang, "चन्द्र ताराभन्दा पछि पर्छ", "The moon falls behind the star"), "muted"],
    [L(lang, "→ पूर्वतिर हिँडेको देखिन्छ", "→ so it seems to move east"), "ink"],
    [L(lang, "सूर्य दिनमा ५९′ मात्र पछि", "The sun lags only 59′ a day"), "sun"],
    [L(lang, "६० विकला = १ कला", "60 vikalā = 1 kalā"), "muted"],
    [L(lang, "६० कला = १ अंश, ३० अंश = १ राशि", "60 kalā = 1°, 30° = 1 sign"), "muted"],
    [L(lang, "१२ राशि = १ भगण (१.२८)", "12 signs = 1 revolution (1.28)"), "muted"],
  ];
  lines.forEach(([s, tone], i) => shapes.push(text(lx, 40 + i * 20, s, tone, 9, "start")));
  const lag = (790.58 / 60) * days;
  const steps: Step[] = [
    { say: L(lang, "तारामण्डल महायुगमा यति पटक घुम्छ (१.३४)", "The star sphere turns this many times in a mahāyuga (1.34)"), eq: [`${grp(lang, SIDEREAL)}`] },
    { say: L(lang, "चन्द्रले पूरा गर्ने फन्को: ताराको फन्को − आफ्नो भगण", "The moon's turns: the stars' turns − its own revolutions"), eq: [`${grp(lang, SIDEREAL)} − ${grp(lang, 57753336)} = ${grp(lang, SIDEREAL - 57753336)}`] },
    { say: L(lang, "त्यसैले चन्द्र दिनमा पछि पर्छ (१.२६–२७)", "So each day the moon lags (1.26–27)"), eq: [fr(`${grp(lang, 57753336)} × ${grp(lang, 21600)}′`, grp(lang, CIVIL)), ` = ${fmt(lang, 790.58, 1)}′`] },
    { say: L(lang, "चित्रका दिनमा जम्मा", "Total over the drawing's days"), eq: [`${fmt(lang, days, 2)} × ${fmt(lang, 790.58 / 60, 2)}° = ${dms(lang, lag)}`] },
    { say: L(lang, "एक भगण कलामा र विकलामा (१.२८)", "One revolution in minutes and seconds (1.28)"), eq: [`${num(lang, 12)} × ${num(lang, 30)} × ${num(lang, 60)} = ${grp(lang, 21600)}′ = ${grp(lang, 1296000)}″`] },
  ];
  return { shapes, readout: [`${L(lang, "दिन", "days")} ${fmt(lang, days, 2)}`, `${L(lang, "चन्द्र ताराभन्दा पछि", "moon behind the star")} ${dms(lang, wrap(lag))}`], steps };
}

// ---------------------------------------------------------------- 1.35–40 intercalary months and lost tithis

function adhimasa(t: number, lang: Lang): FigureFrame {
  const solarM = CIVIL / SOLAR_MONTHS;
  const lunarM = CIVIL / LUNAR_MONTHS;
  const span = 36 * solarM;
  const x0 = 16;
  const w = 328;
  const X = (d: number) => x0 + (d / span) * w;
  const start = 10; // first new moon, days after the first saṅkrānti
  const shapes: Shape[] = [
    text(x0, 40, L(lang, "संक्रान्ति", "saṅkrānti"), "sun", 9, "start", true),
    text(x0, 118, L(lang, "औंसी", "new moon"), "muted", 9, "start", true),
    line(x0, 70, x0 + w, 70, { stroke: "sun", w: 1 }),
    line(x0, 100, x0 + w, 100, { stroke: "muted", w: 1 }),
  ];
  const sank: number[] = [];
  for (let k = 0; k <= 36; k += 1) sank.push(k * solarM);
  for (const d of sank) shapes.push(line(X(d), 62, X(d), 78, { stroke: "sun", w: 1.4 }));
  let adhika = -1;
  const moons: number[] = [];
  for (let d = start; d <= span; d += lunarM) moons.push(d);
  for (let i = 0; i < moons.length; i += 1) {
    const a = moons[i]!;
    const b = moons[i + 1];
    shapes.push(line(X(a), 92, X(a), 108, { stroke: "muted", w: 1.4 }));
    if (b !== undefined && !sank.some((s) => s > a && s <= b)) {
      adhika = i;
      shapes.push(path(`M ${X(a).toFixed(1)} 92 H ${X(b).toFixed(1)} v 16 H ${X(a).toFixed(1)} Z`, { fill: "accent", opacity: 0.45 }));
      shapes.push(text((X(a) + X(b)) / 2, 128, L(lang, "अधिमास", "adhika"), "accent", 9.5, "middle", true));
    }
  }
  const now = t * span;
  shapes.push(line(X(now), 50, X(now), 140, { stroke: "ink", w: 1.4 }));
  shapes.push(text(180, 160, L(lang, "संक्रान्ति नपर्ने चान्द्र मास अधिमास हुन्छ", "A lunar month without a saṅkrānti is intercalary"), "muted", 9));
  shapes.push(text(180, 178, L(lang, "३ सौर वर्ष ≈ ३७ चान्द्र मास", "3 solar years ≈ 37 lunar months"), "muted", 9));
  const solarDone = Math.floor(now / solarM);
  const lunarDone = moons.filter((m) => m <= now).length;
  const steps: Step[] = [
    { say: L(lang, "चान्द्र मास = चन्द्र भगण − सूर्य भगण (१.३५)", "Lunar months = moon's revolutions − sun's (1.35)"), eq: [`${grp(lang, 57753336)} − ${grp(lang, MY)} = ${grp(lang, LUNAR_MONTHS)}`] },
    { say: L(lang, "अधिमास = चान्द्र मास − सौर मास (१.३५, १.३८)", "Intercalary months = lunar − solar months (1.35, 1.38)"), eq: [`${grp(lang, LUNAR_MONTHS)} − ${grp(lang, SOLAR_MONTHS)} = ${grp(lang, LUNAR_MONTHS - SOLAR_MONTHS)}`] },
    { say: L(lang, "औसतमा कति सौर मासमा एक अधिमास?", "On average, one in how many solar months?"), eq: [fr(grp(lang, SOLAR_MONTHS), grp(lang, LUNAR_MONTHS - SOLAR_MONTHS)), ` = ${fmt(lang, SOLAR_MONTHS / (LUNAR_MONTHS - SOLAR_MONTHS), 2)}`] },
    { say: L(lang, "तिथि = चान्द्र मास × ३० (१.३७)", "Tithis = lunar months × 30 (1.37)"), eq: [`${grp(lang, LUNAR_MONTHS)} × ${num(lang, 30)} = ${grp(lang, TITHIS)}`] },
    { say: L(lang, "क्षय तिथि (अवम) = तिथि − सावन दिन (१.३६, १.३८)", "Omitted tithis = tithis − civil days (1.36, 1.38)"), eq: [`${grp(lang, TITHIS)} − ${grp(lang, CIVIL)} = ${grp(lang, TITHIS - CIVIL)}`] },
    { say: L(lang, "औसतमा कति तिथिमा एक क्षय?", "On average, one in how many tithis?"), eq: [fr(grp(lang, TITHIS), grp(lang, TITHIS - CIVIL)), ` = ${fmt(lang, TITHIS / (TITHIS - CIVIL), 1)}`] },
  ];
  return {
    shapes,
    readout: [`${L(lang, "सौर मास", "solar months")} ${num(lang, solarDone)} · ${L(lang, "चान्द्र मास", "lunar months")} ${num(lang, Math.max(0, lunarDone - 1))}`, adhika >= 0 ? L(lang, "यो अवधिमा एउटा अधिमास परेको छ", "one intercalary month falls in this span") : ""],
    steps,
  };
}

// ---------------------------------------------------------------- 1.66–67 the time correction

function ishtaGhati(t: number, lang: Lang): FigureFrame {
  const gh = t * 60;
  const moon = (790.58 * gh) / 60;
  const sun = (59.14 * gh) / 60;
  const x0 = 30;
  const w = 300;
  const shapes: Shape[] = [
    text(180, 20, L(lang, "लङ्काको मध्यरातदेखि बितेको घटी", "Ghaṭīs since midnight at Laṅkā"), "ink", 10, "middle", true),
    line(x0, 60, x0 + w, 60, { stroke: "muted", w: 1 }),
    line(x0, 130, x0 + w, 130, { stroke: "muted", w: 1 }),
  ];
  for (let g = 0; g <= 60; g += 10) {
    const x = x0 + (g / 60) * w;
    shapes.push(line(x, 55, x, 65, { stroke: "muted" }), text(x, 76, num(lang, g), "muted", 8.5));
  }
  shapes.push(circle(x0 + (gh / 60) * w, 60, 5, { fill: "accent" }));
  shapes.push(text(x0, 112, L(lang, "चन्द्र (कला)", "Moon (′)"), "muted", 9, "start", true));
  shapes.push(path(`M ${x0} 124 H ${(x0 + (moon / 790.58) * w).toFixed(1)} v 12 H ${x0} Z`, { fill: "moon", stroke: "muted", w: 0.6 }));
  shapes.push(text(x0, 160, L(lang, "सूर्य (कला)", "Sun (′)"), "sun", 9, "start", true));
  shapes.push(path(`M ${x0} 168 H ${(x0 + (sun / 790.58) * w).toFixed(1)} v 12 H ${x0} Z`, { fill: "sun" }));
  const steps: Step[] = [
    { say: L(lang, "वार र गणना लङ्काको मध्यरातबाट सुरु (१.६६)", "Weekday and reckoning begin at Laṅkā midnight (1.66)"), eq: [`${L(lang, "इष्ट घटी", "ghaṭīs")} = ${fmt(lang, gh, 1)}`] },
    { say: L(lang, "चालन: दैनिक गति × इष्ट घटी ÷ ६० (१.६७)", "Correction: daily motion × ghaṭīs ÷ 60 (1.67)"), eq: [`${L(lang, "चन्द्र", "Moon")}: `, fr(`${fmt(lang, 790.58, 1)}′ × ${fmt(lang, gh, 1)}`, num(lang, 60)), ` = ${fmt(lang, moon, 1)}′`] },
    { say: L(lang, "सूर्यका लागि", "For the sun"), eq: [fr(`${fmt(lang, 59.14, 2)}′ × ${fmt(lang, gh, 1)}`, num(lang, 60)), ` = ${fmt(lang, sun, 2)}′`] },
    { say: L(lang, "मध्यरातपछिको समयमा जोड्ने, अघि भए घटाउने (१.६७)", "Added after midnight, subtracted before it (1.67)"), eq: [`+ ${fmt(lang, moon, 1)}′`] },
  ];
  return { shapes, readout: [`${fmt(lang, gh, 1)} ${L(lang, "घटी", "ghaṭī")}`, `${L(lang, "चन्द्र", "Moon")} +${fmt(lang, moon, 1)}′ · ${L(lang, "सूर्य", "Sun")} +${fmt(lang, sun, 1)}′`], steps };
}

// ---------------------------------------------------------------- 1.68–70 the planets' greatest latitudes

const LATS: { ne: string; en: string; max: number; tone: Tone }[] = [
  { ne: "चन्द्र", en: "Moon", max: 270, tone: "ink" },
  { ne: "मङ्गल", en: "Mars", max: 90, tone: "accent" },
  { ne: "बुध", en: "Mercury", max: 120, tone: "planet" },
  { ne: "बृहस्पति", en: "Jupiter", max: 60, tone: "sun" },
  { ne: "शुक्र", en: "Venus", max: 120, tone: "earth" },
  { ne: "शनि", en: "Saturn", max: 120, tone: "muted" },
];

function vikshepa(t: number, lang: Lang): FigureFrame {
  const x0 = 24;
  const w = 312;
  const mid = 96;
  const k = 0.26; // px per minute of latitude
  const d = t * 360; // distance from the node
  const shapes: Shape[] = [line(x0, mid, x0 + w, mid, { stroke: "ink", w: 1.2 }), text(x0 + w, mid - 4, L(lang, "क्रान्तिवृत्त", "ecliptic"), "muted", 8.5, "end")];
  for (const p of [...LATS].reverse()) {
    let dd = "";
    for (let i = 0; i <= 72; i += 1) {
      const a = i * 5;
      const y = mid - ((p.max * suryaJya(a)) / TRIJYA) * k;
      dd += `${i ? "L" : "M"} ${(x0 + (a / 360) * w).toFixed(1)} ${y.toFixed(1)} `;
    }
    shapes.push(path(dd, { stroke: p.tone, w: p.max === 270 ? 1.8 : 1 }));
  }
  const cx = x0 + (d / 360) * w;
  shapes.push(line(cx, 16, cx, 176, { stroke: "faint", dash: "3 3" }));
  const moonY = mid - ((270 * suryaJya(d)) / TRIJYA) * k;
  shapes.push(circle(cx, moonY, 4.5, { fill: "moon", stroke: "muted", w: 0.6 }));
  shapes.push(text(x0, mid + 14, L(lang, "पात", "node"), "accent", 9, "start", true));
  shapes.push(text(x0 + w / 2, mid + 14, L(lang, "पात", "node"), "accent", 9, "middle", true));
  shapes.push(text(x0, 190, L(lang, "रेखाहरू: चन्द्र २७०′, मङ्गल ९०′, बुध–शुक्र–शनि १२०′, बृहस्पति ६०′", "Curves: Moon 270′, Mars 90′, Mercury–Venus–Saturn 120′, Jupiter 60′"), "muted", 8.2, "start"));
  const lat = (270 * suryaJya(d)) / TRIJYA;
  const steps: Step[] = [
    { say: L(lang, "चन्द्रको परम शर: भचक्रको ८०औँ भाग (१.६८)", "The moon's greatest latitude: an eightieth of the circle (1.68)"), eq: [fr(`${grp(lang, 21600)}′`, num(lang, 80)), ` = ${num(lang, 270)}′ = ${num(lang, 4)}°${num(lang, 30)}′`] },
    { say: L(lang, "त्यसको नवौँ भाग, अनि गुणा (१.६९)", "Its ninth part, then multiples (1.69)"), eq: [fr(num(lang, 270), num(lang, 9)), ` = ${num(lang, 30)}′ → ${L(lang, "बृहस्पति", "Jupiter")} ×${num(lang, 2)} = ${num(lang, 60)}, ${L(lang, "मङ्गल", "Mars")} ×${num(lang, 3)} = ${num(lang, 90)}, ${L(lang, "बुध, शुक्र, शनि", "Mercury, Venus, Saturn")} ×${num(lang, 4)} = ${num(lang, 120)}`] },
    { say: L(lang, "१.७० ले पनि त्यही: २७, ९, १२, ६, १२, १२ लाई १० ले गुणा", "1.70 says the same: 27, 9, 12, 6, 12, 12 times ten"), eq: [`${num(lang, 270)}, ${num(lang, 90)}, ${num(lang, 120)}, ${num(lang, 60)}, ${num(lang, 120)}, ${num(lang, 120)}′`] },
    { say: L(lang, "पातबाट टाढा हुँदा चन्द्रको शर (२.५७)", "The moon's latitude at a distance from the node (2.57)"), eq: [fr(`${num(lang, 270)}′ × ${L(lang, "ज्या", "sin")} ${dms(lang, d)}`, num(lang, TRIJYA)), ` = ${fmt(lang, lat, 1)}′`] },
  ];
  return { shapes, readout: [`${L(lang, "पातबाट", "from the node")} ${dms(lang, d)}`, `${L(lang, "चन्द्रको शर", "moon's latitude")} ${fmt(lang, Math.abs(lat), 1)}′ ${lat >= 0 ? L(lang, "उत्तर", "N") : L(lang, "दक्षिण", "S")}`], steps };
}

// ---------------------------------------------------------------- 2.29–33 looking up a sine

function jyaLookup(t: number, lang: Lang): FigureFrame {
  const k = t * 360;
  const pada = Math.floor(k / 90) + 1;
  const into = k % 90;
  const bhuja = pada % 2 === 1 ? into : 90 - into;
  const koti = 90 - bhuja;
  const kala = bhuja * 60;
  const idx = Math.floor(kala / 225);
  const rem = kala - idx * 225;
  const lo = idx === 0 ? 0 : SURYA_SINES[idx - 1]!;
  const hi = SURYA_SINES[Math.min(23, idx)]!;
  const jya = lo + ((hi - lo) * rem) / 225;
  const cx = 96;
  const cy = 100;
  const R = 72;
  const shapes: Shape[] = [circle(cx, cy, R, { stroke: "muted", w: 1 }), line(cx - R - 6, cy, cx + R + 6, cy, { stroke: "faint" }), line(cx, cy - R - 6, cx, cy + R + 6, { stroke: "faint" })];
  const quadStart = (pada - 1) * 90;
  shapes.push(path(`M ${cx} ${cy} L ${polar(cx, cy, R, quadStart).x.toFixed(1)} ${polar(cx, cy, R, quadStart).y.toFixed(1)} ${arc(cx, cy, R, quadStart, quadStart + 90).replace(/^M [^A]+/, "")} Z`, { fill: "sun", opacity: 0.12 }));
  const P = polar(cx, cy, R, k);
  shapes.push(path(arc(cx, cy, 18, 0, k), { stroke: "accent", w: 1.2 }));
  shapes.push(line(cx, cy, P.x, P.y, { stroke: "ink", w: 1.2 }));
  shapes.push(line(P.x, P.y, P.x, cy, { stroke: "sun", w: 2.4 }));
  shapes.push(line(P.x, P.y, cx, P.y, { stroke: "planet", w: 2.4 }));
  mark(shapes, P, "", 0, 0, "accent", 3.5);
  shapes.push(text(cx + R + 2, cy - 4, L(lang, "उच्च", "apsis"), "muted", 8.5, "start"));
  ["१", "२", "३", "४"].forEach((q, i) => {
    const at = polar(cx, cy, R * 0.55, i * 90 + 45);
    shapes.push(text(at.x, at.y + 3, L(lang, q, String(i + 1)), i + 1 === pada ? "accent" : "faint", 11, "middle", true));
  });
  // a strip of the table with the bracketing entries
  const tx = 200;
  shapes.push(text(tx, 26, L(lang, "ज्यापिण्डको अंश", "Part of the sine table"), "ink", 9.5, "start", true));
  for (let j = Math.max(0, idx - 1); j <= Math.min(23, idx + 2); j += 1) {
    const y = 46 + (j - Math.max(0, idx - 1)) * 18;
    const on = j === idx || j === idx - 1;
    shapes.push(text(tx, y, `${num(lang, (j + 1) * 225)}′`, on ? "accent" : "muted", 9, "start"));
    shapes.push(text(tx + 90, y, num(lang, SURYA_SINES[j]!), on ? "accent" : "muted", 9, "start", on));
  }
  shapes.push(text(tx, 136, L(lang, "पीलो: भुजज्या · हरियो: कोटिज्या", "yellow: sine · green: cosine"), "muted", 8.5, "start"));
  const steps: Step[] = [
    { say: L(lang, "केन्द्र = ग्रह − उच्च (२.२९)", "Anomaly = planet − apsis (2.29)"), eq: [`κ = ${dms(lang, k)} → ${L(lang, "पद", "quadrant")} ${num(lang, pada)}`] },
    { say: L(lang, "विषम पदमा गत भाग, सम पदमा बाँकी भाग भुज (२.३०)", "Odd quadrant: the part passed; even: the part to come (2.30)"), eq: [`${L(lang, "भुज", "bhuja")} = ${dms(lang, bhuja)} · ${L(lang, "कोटि", "koṭi")} = ${dms(lang, koti)}`] },
    { say: L(lang, "कलालाई २२५ ले भाग (२.३१)", "Minutes ÷ 225 (2.31)"), eq: [fr(`${grp(lang, Math.round(kala))}′`, num(lang, 225)), ` = ${num(lang, idx)} ${L(lang, "शेष", "rem.")} ${fmt(lang, rem, 1)}′`] },
    { say: L(lang, "गत पिण्ड + शेष × खण्ड ÷ २२५ (२.३२)", "Passed sine + remainder × difference ÷ 225 (2.32)"), eq: [`${num(lang, lo)} + `, fr(`${fmt(lang, rem, 1)} × ${num(lang, hi - lo)}`, num(lang, 225)), ` = ${fmt(lang, jya, 1)}`] },
    { say: L(lang, "उल्टो: ज्याबाट चाप (२.३३)", "Back: the arc from a sine (2.33)"), eq: [`${num(lang, idx)} × ${num(lang, 225)} + `, fr(`(${fmt(lang, jya, 1)} − ${num(lang, lo)}) × ${num(lang, 225)}`, num(lang, hi - lo)), ` = ${grp(lang, Math.round(idx * 225 + ((jya - lo) * 225) / (hi - lo)))}′`] },
  ];
  return { shapes, readout: [`κ ${dms(lang, k)} · ${L(lang, "भुज", "bhuja")} ${dms(lang, bhuja)}`, `${L(lang, "भुजज्या", "sine")} ${fmt(lang, jya, 1)} · ${L(lang, "कोटिज्या", "cosine")} ${fmt(lang, suryaJya(koti), 1)}`], steps };
}

// ---------------------------------------------------------------- 2.43–45 the order of the four corrections

function mandaPhala(k: number, even: number, odd: number): number {
  const j = suryaJya(k);
  const p = even + ((odd - even) * Math.abs(j)) / TRIJYA;
  return suryaArc((j * p) / 360); // positive in the first half: to be subtracted
}

function correctionOrder(t: number, lang: Lang): FigureFrame {
  const mean = wrap(40 + t * 360);
  const apsis = 130; // Mars's mandocca, about 130°
  const sun = wrap(mean + 120 + 200 * t);
  const s1 = sighraParts(wrap(sun - mean), 235, 232).phala;
  const m1 = wrap(mean + s1 / 2);
  const p2 = mandaPhala(wrap(m1 - apsis), 75, 72);
  const m2 = wrap(m1 - p2 / 2);
  const p3 = mandaPhala(wrap(m2 - apsis), 75, 72);
  const m3 = wrap(mean - p3);
  const s4 = sighraParts(wrap(sun - m3), 235, 232).phala;
  const m4 = wrap(m3 + s4);
  const stages: { lab: [string, string]; v: number; tone: Tone }[] = [
    { lab: ["मध्यम", "mean"], v: mean, tone: "muted" },
    { lab: ["½ शीघ्र", "½ śīghra"], v: m1, tone: "planet" },
    { lab: ["½ मन्द", "½ manda"], v: m2, tone: "earth" },
    { lab: ["पूर्ण मन्द", "full manda"], v: m3, tone: "sun" },
    { lab: ["स्पष्ट", "true"], v: m4, tone: "accent" },
  ];
  const shapes: Shape[] = [text(180, 16, L(lang, "मङ्गल: चार संशोधन क्रमैसँग (२.४४)", "Mars: the four corrections in order (2.44)"), "ink", 10, "middle", true)];
  stages.forEach((s, i) => {
    box(shapes, 8 + i * 70, 40, 64, 42, L(lang, s.lab[0], s.lab[1]), dms(lang, s.v), s.tone);
    if (i) shapes.push(line(8 + i * 70 - 6, 61, 8 + i * 70, 61, { stroke: "muted" }), arrowHead({ x: 8 + i * 70 - 6, y: 61 }, { x: 8 + i * 70, y: 61 }, "muted"));
  });
  // a longitude strip ±40° around the mean
  const x0 = 20;
  const w = 320;
  const X = (v: number) => x0 + w / 2 + (((((v - mean) % 360) + 540) % 360) - 180) * (w / 80);
  shapes.push(line(x0, 140, x0 + w, 140, { stroke: "faint" }));
  stages.forEach((s, i) => {
    const x = Math.max(x0, Math.min(x0 + w, X(s.v)));
    shapes.push(circle(x, 140, i === 4 ? 5 : 3.5, { fill: s.tone }));
    shapes.push(line(x, 140, x, 140 + [-14, 14, -28, 28, -42][i]!, { stroke: s.tone, w: 0.6 }));
    shapes.push(text(x, 140 + [-17, 24, -31, 38, -45][i]!, L(lang, s.lab[0], s.lab[1]), s.tone === "muted" ? "ink" : s.tone, 8, "middle"));
  });
  const steps: Step[] = [
    { say: L(lang, "पहिले आधा शीघ्रफल मध्यम ग्रहमा (२.४४)", "First, half the śīghra equation on the mean planet (2.44)"), eq: [`${dms(lang, mean)} + ½ × ${dms(lang, s1)} = ${dms(lang, m1)}`] },
    { say: L(lang, "त्यसबाट मन्दफल, त्यसको आधा", "From that, the manda equation, half of it"), eq: [`${L(lang, "केन्द्र", "κ")} ${dms(lang, wrap(m1 - apsis))} → ${dms(lang, p2)} → ${dms(lang, m1)} − ½ × ${dms(lang, p2)} = ${dms(lang, m2)}`] },
    { say: L(lang, "त्यसबाट पूर्ण मन्दफल, मूल मध्यम ग्रहमा लगाउने", "From that, the whole manda equation, applied to the original mean planet"), eq: [`${dms(lang, mean)} − ${dms(lang, p3)} = ${dms(lang, m3)}`] },
    { say: L(lang, "अन्तमा त्यसबाट पूर्ण शीघ्रफल", "Last, the whole śīghra equation from that"), eq: [`${dms(lang, m3)} + ${dms(lang, s4)} = ${dms(lang, m4)}`] },
    { say: L(lang, "मेषादि केन्द्रमा मन्दफल ऋण, तुलादिमा धन (२.४५)", "Manda equation subtracted when κ is in Aries–Virgo, added in Libra–Pisces (2.45)"), eq: [`${L(lang, "मन्द परिधि", "manda epicycle")} ${num(lang, 75)}° / ${num(lang, 72)}° · ${L(lang, "शीघ्र", "śīghra")} ${num(lang, 235)}° / ${num(lang, 232)}°`] },
  ];
  return { shapes, readout: [`${L(lang, "मध्यम", "mean")} ${dms(lang, mean)} → ${L(lang, "स्पष्ट", "true")} ${dms(lang, m4)}`, `${L(lang, "जम्मा संशोधन", "total correction")} ${dms(lang, ((((m4 - mean) % 360) + 540) % 360) - 180)}`], steps };
}

// ---------------------------------------------------------------- 2.46–55 true daily motion and retrogression

function trueMotion(t: number, lang: Lang): FigureFrame {
  const meanRate = 31.44 / 60; // Mars, degrees a day
  const sunRate = 59.14 / 60;
  const kRate = sunRate - meanRate;
  const motionAt = (k: number) => {
    const a = sighraParts(k, 235, 232).phala;
    const b = sighraParts(k + kRate, 235, 232).phala;
    return (meanRate + (b - a)) * 60; // minutes a day
  };
  const x0 = 30;
  const w = 310;
  const mid = 100;
  const sc = 0.9;
  const shapes: Shape[] = [line(x0, mid, x0 + w, mid, { stroke: "faint" }), text(x0 - 4, mid + 3, "0", "muted", 8, "end")];
  let d = "";
  for (let i = 0; i <= 72; i += 1) {
    const k = i * 5;
    d += `${i ? "L" : "M"} ${(x0 + (k / 360) * w).toFixed(1)} ${(mid - motionAt(k) * sc).toFixed(1)} `;
  }
  shapes.push(path(d, { stroke: "accent", w: 1.6 }));
  for (const st of [164, 196]) {
    const x = x0 + (st / 360) * w;
    shapes.push(line(x, 30, x, 170, { stroke: "planet", dash: "3 3" }), text(x, 182, `${num(lang, st)}°`, "planet", 8.5));
  }
  const k = t * 360;
  const v = motionAt(k);
  shapes.push(circle(x0 + (k / 360) * w, mid - v * sc, 4.5, { fill: v < 0 ? "accent" : "ink" }));
  shapes.push(text(x0, 20, L(lang, "मङ्गलको स्पष्ट दैनिक गति (कला) — शीघ्रकेन्द्रअनुसार", "Mars's true daily motion (′) against the śīghra anomaly"), "ink", 9.5, "start", true));
  shapes.push(text(x0 + w / 2, 192, L(lang, "शून्यमुनि = वक्री", "below zero = retrograde"), "muted", 8.5));
  const a = sighraParts(k, 235, 232).phala;
  const b = sighraParts(k + kRate, 235, 232).phala;
  const steps: Step[] = [
    { say: L(lang, "मध्यम गति: मङ्गल ३१′२६″, सूर्य (शीघ्रोच्च) ५९′८″", "Mean motions: Mars 31′26″, the sun (śīghrocca) 59′8″"), eq: [`${L(lang, "केन्द्रगति", "anomaly's motion")} = ${fmt(lang, 59.14, 2)} − ${fmt(lang, 31.44, 2)} = ${fmt(lang, 27.7, 2)}′`] },
    { say: L(lang, "आजको र भोलिको शीघ्रफल", "Today's and tomorrow's śīghra equation"), eq: [`${dms(lang, a)} → ${dms(lang, b)} (${fmt(lang, (b - a) * 60, 2)}′)`] },
    { say: L(lang, "स्पष्ट गति = मध्यम गति + शीघ्रफलको परिवर्तन (२.४६–५१ यही गति दिन्छ)", "True motion = mean + change in the equation (2.46–51 give this motion)"), eq: [`${fmt(lang, 31.44, 2)} + ${fmt(lang, (b - a) * 60, 2)} = ${fmt(lang, v, 2)}′`] },
    { say: L(lang, "ऋणात्मक भए वक्री: मङ्गल केन्द्र १६४° मा वक्री, १९६° मा मार्गी (२.५३–५४)", "Negative means retrograde: Mars at κ 164°, direct again at 196° (2.53–54)"), eq: [v < 0 ? L(lang, "अहिले वक्री", "now retrograde") : L(lang, "अहिले मार्गी", "now direct")] },
  ];
  return { shapes, readout: [`κ ${dms(lang, k)}`, `${L(lang, "दैनिक गति", "daily motion")} ${fmt(lang, v, 1)}′ ${v < 0 ? L(lang, "वक्री", "retrograde") : ""}`], steps };
}

// ---------------------------------------------------------------- 2.56–58 a planet's latitude and true declination

function planetLatitude(t: number, lang: Lang): FigureFrame {
  const lon = t * 360;
  const node = 40; // Mars's node, roughly
  const k = wrap(lon - (lon * 0.53 + 200)); // a sample śīghra anomaly
  const karna = sighraParts(k, 235, 232).karna;
  const shara = (90 * suryaJya(lon - node)) / karna;
  const krJ = (suryaJya(lon) * 1397) / TRIJYA;
  const kr = suryaArc(krJ);
  const decl = kr + shara / 60;
  const x0 = 24;
  const w = 312;
  const mid = 100;
  const sc = 2.4;
  const shapes: Shape[] = [line(x0, mid, x0 + w, mid, { stroke: "earth", w: 1.2 }), text(x0 + w, mid - 4, L(lang, "विषुव", "equator"), "earth", 8.5, "end")];
  let d = "";
  for (let i = 0; i <= 72; i += 1) {
    const a = i * 5;
    d += `${i ? "L" : "M"} ${(x0 + (a / 360) * w).toFixed(1)} ${(mid - suryaArc((suryaJya(a) * 1397) / TRIJYA) * sc).toFixed(1)} `;
  }
  shapes.push(path(d, { stroke: "sun", w: 1.4 }));
  const x = x0 + (lon / 360) * w;
  const ye = mid - kr * sc;
  shapes.push(line(x, mid, x, ye, { stroke: "sun", w: 1, dash: "2 2" }));
  // the latitude drawn five times larger so it shows
  const yp10 = mid - (kr + (shara / 60) * 5) * sc;
  shapes.push(line(x, ye, x, yp10, { stroke: "accent", w: 2.4 }));
  shapes.push(circle(x, yp10, 4.5, { fill: "accent" }));
  shapes.push(text(x0, 20, L(lang, "पीलो: क्रान्तिवृत्त · सुन्तला: शर (५ गुणा ठूलो)", "Yellow: ecliptic · orange: latitude (drawn 5× larger)"), "muted", 8.5, "start"));
  const steps: Step[] = [
    { say: L(lang, "मङ्गलको परम शर ९०′; ग्रह − पातको ज्या (२.५६–५७)", "Mars's greatest latitude 90′; sine of planet − node (2.56–57)"), eq: [`${L(lang, "ज्या", "sin")}(${dms(lang, lon)} − ${dms(lang, node)}) = ${fmt(lang, suryaJya(lon - node))}`] },
    { say: L(lang, "शर = परम शर × ज्या ÷ शीघ्रकर्ण (२.५७)", "Latitude = greatest × sine ÷ śīghra hypotenuse (2.57)"), eq: [fr(`${num(lang, 90)}′ × ${fmt(lang, suryaJya(lon - node))}`, fmt(lang, karna)), ` = ${fmt(lang, shara, 1)}′`] },
    { say: L(lang, "ग्रहको क्रान्ति (२.२८)", "The planet's declination (2.28)"), eq: [fr(`${fmt(lang, suryaJya(lon))} × ${num(lang, 1397)}`, num(lang, TRIJYA)), ` = ${fmt(lang, krJ)} → ${dms(lang, kr)}`] },
    { say: L(lang, "एकै दिशा भए जोड्ने, फरक भए घटाउने: स्पष्ट क्रान्ति (२.५८)", "Same direction: add; opposite: subtract — the true declination (2.58)"), eq: [`${dms(lang, kr)} ${shara >= 0 ? "+" : "−"} ${fmt(lang, Math.abs(shara), 1)}′ = ${dms(lang, decl)}`] },
  ];
  return { shapes, readout: [`${L(lang, "भोग", "longitude")} ${dms(lang, lon)} · ${L(lang, "शर", "latitude")} ${fmt(lang, shara, 1)}′`, `${L(lang, "स्पष्ट क्रान्ति", "true declination")} ${dms(lang, decl)}`], steps };
}

// ---------------------------------------------------------------- 2.64–69 tithi, nakshatra, yoga, karaṇa

export const NAKSHATRA27: [string, string][] = [
  ["अश्विनी", "Aśvinī"], ["भरणी", "Bharaṇī"], ["कृत्तिका", "Kṛttikā"], ["रोहिणी", "Rohiṇī"], ["मृगशिरा", "Mṛgaśiras"], ["आर्द्रा", "Ārdrā"], ["पुनर्वसु", "Punarvasu"], ["पुष्य", "Puṣya"], ["आश्लेषा", "Āśleṣā"],
  ["मघा", "Maghā"], ["पूर्वफाल्गुनी", "P. Phalgunī"], ["उत्तरफाल्गुनी", "U. Phalgunī"], ["हस्त", "Hasta"], ["चित्रा", "Citrā"], ["स्वाती", "Svātī"], ["विशाखा", "Viśākhā"], ["अनुराधा", "Anurādhā"], ["ज्येष्ठा", "Jyeṣṭhā"],
  ["मूल", "Mūla"], ["पूर्वाषाढा", "P. Āṣāḍhā"], ["उत्तराषाढा", "U. Āṣāḍhā"], ["श्रवण", "Śravaṇa"], ["धनिष्ठा", "Dhaniṣṭhā"], ["शतभिषा", "Śatabhiṣaj"], ["पूर्वभाद्रपदा", "P. Bhādrapadā"], ["उत्तरभाद्रपदा", "U. Bhādrapadā"], ["रेवती", "Revatī"],
];
const YOGA27: [string, string][] = [
  ["विष्कम्भ", "Viṣkambha"], ["प्रीति", "Prīti"], ["आयुष्मान्", "Āyuṣmān"], ["सौभाग्य", "Saubhāgya"], ["शोभन", "Śobhana"], ["अतिगण्ड", "Atigaṇḍa"], ["सुकर्मा", "Sukarman"], ["धृति", "Dhṛti"], ["शूल", "Śūla"],
  ["गण्ड", "Gaṇḍa"], ["वृद्धि", "Vṛddhi"], ["ध्रुव", "Dhruva"], ["व्याघात", "Vyāghāta"], ["हर्षण", "Harṣaṇa"], ["वज्र", "Vajra"], ["सिद्धि", "Siddhi"], ["व्यतीपात", "Vyatīpāta"], ["वरीयान्", "Varīyān"],
  ["परिघ", "Parigha"], ["शिव", "Śiva"], ["सिद्ध", "Siddha"], ["साध्य", "Sādhya"], ["शुभ", "Śubha"], ["शुक्ल", "Śukla"], ["ब्रह्म", "Brahman"], ["ऐन्द्र", "Aindra"], ["वैधृति", "Vaidhṛti"],
];
const TITHI15: [string, string][] = [
  ["प्रतिपदा", "Pratipadā"], ["द्वितीया", "Dvitīyā"], ["तृतीया", "Tṛtīyā"], ["चतुर्थी", "Caturthī"], ["पञ्चमी", "Pañcamī"], ["षष्ठी", "Ṣaṣṭhī"], ["सप्तमी", "Saptamī"], ["अष्टमी", "Aṣṭamī"],
  ["नवमी", "Navamī"], ["दशमी", "Daśamī"], ["एकादशी", "Ekādaśī"], ["द्वादशी", "Dvādaśī"], ["त्रयोदशी", "Trayodaśī"], ["चतुर्दशी", "Caturdaśī"], ["पूर्णिमा", "Pūrṇimā"],
];
const KARANA_MOVE: [string, string][] = [["बव", "Bava"], ["बालव", "Bālava"], ["कौलव", "Kaulava"], ["तैतिल", "Taitila"], ["गर", "Gara"], ["वणिज", "Vaṇij"], ["विष्टि", "Viṣṭi"]];

function karanaName(i: number): [string, string] {
  if (i === 0) return ["किंस्तुघ्न", "Kiṃstughna"];
  if (i === 57) return ["शकुनि", "Śakuni"];
  if (i === 58) return ["चतुष्पद", "Catuṣpada"];
  if (i === 59) return ["नाग", "Nāga"];
  return KARANA_MOVE[(i - 1) % 7]!;
}

export function panchangaAt(sun: number, moon: number) {
  const e = wrap(moon - sun);
  const tithi = Math.floor(e / 12); // 0..29
  const nak = Math.floor((wrap(moon) * 60) / 800);
  const yoga = Math.floor((wrap(sun + moon) * 60) / 800);
  const karana = Math.floor(e / 6);
  return { e, tithi, nak, yoga, karana };
}

function panchangaElements(t: number, lang: Lang): FigureFrame {
  const sun = wrap(20 + 29.1 * t);
  const moon = wrap(sun + 360 * t);
  const p = panchangaAt(sun, moon);
  const cx = 100;
  const cy = 100;
  const R = 80;
  const shapes: Shape[] = [circle(cx, cy, R, { stroke: "muted", w: 1 }), circle(cx, cy, 4, { fill: "earth" })];
  for (let i = 0; i < 27; i += 1) {
    const a = (i * 360) / 27;
    const q = polar(cx, cy, R, a);
    const r = polar(cx, cy, R - 6, a);
    shapes.push(line(q.x, q.y, r.x, r.y, { stroke: i === p.nak ? "accent" : "faint", w: i === p.nak ? 2 : 1 }));
  }
  shapes.push(path(arc(cx, cy, R - 22, sun, sun + p.e), { stroke: "muted", w: 4, opacity: 0.6 }));
  const S = polar(cx, cy, R - 22, sun);
  const M = polar(cx, cy, R - 22, moon);
  shapes.push(line(cx, cy, S.x, S.y, { stroke: "sun", w: 1 }), line(cx, cy, M.x, M.y, { stroke: "muted", w: 1 }));
  shapes.push(circle(S.x, S.y, 6, { fill: "sun" }), circle(M.x, M.y, 5, { fill: "moon", stroke: "muted", w: 0.6 }));
  const paksha = p.tithi < 15 ? L(lang, "शुक्ल", "Śukla") : L(lang, "कृष्ण", "Kṛṣṇa");
  const tn = p.tithi === 29 ? L(lang, "औंसी", "Amāvāsyā") : L(lang, TITHI15[p.tithi % 15]![0], TITHI15[p.tithi % 15]![1]);
  const nk = NAKSHATRA27[p.nak]!;
  const yg = YOGA27[p.yoga]!;
  const kr = karanaName(p.karana);
  const lx = 200;
  const rows: [string, string, Tone][] = [
    [L(lang, "तिथि", "Tithi"), `${paksha} ${tn}`, "muted"],
    [L(lang, "नक्षत्र", "Nakshatra"), L(lang, nk[0], nk[1]), "accent"],
    [L(lang, "योग", "Yoga"), L(lang, yg[0], yg[1]), "planet"],
    [L(lang, "करण", "Karaṇa"), L(lang, kr[0], kr[1]), "earth"],
  ];
  rows.forEach(([k2, v, tone], i) => {
    shapes.push(text(lx, 44 + i * 34, k2, "muted", 9, "start"));
    shapes.push(text(lx, 58 + i * 34, v, tone, 11, "start", true));
  });
  const steps: Step[] = [
    { say: L(lang, "तिथि: (चन्द्र − सूर्य) ÷ ७२०′ (२.६६)", "Tithi: (moon − sun) ÷ 720′ (2.66)"), eq: [fr(`${grp(lang, Math.round(p.e * 60))}′`, `${num(lang, 720)}′`), ` = ${fmt(lang, (p.e * 60) / 720, 2)} → ${num(lang, p.tithi + 1)}${L(lang, "औँ", "th")}`] },
    { say: L(lang, "नक्षत्र: चन्द्र ÷ ८००′ (२.६४)", "Nakshatra: moon ÷ 800′ (2.64)"), eq: [fr(`${grp(lang, Math.round(moon * 60))}′`, `${num(lang, 800)}′`), ` = ${fmt(lang, (moon * 60) / 800, 2)} → ${L(lang, nk[0], nk[1])}`] },
    { say: L(lang, "योग: (सूर्य + चन्द्र) ÷ ८००′ (२.६५)", "Yoga: (sun + moon) ÷ 800′ (2.65)"), eq: [fr(`${grp(lang, Math.round(wrap(sun + moon) * 60))}′`, `${num(lang, 800)}′`), ` = ${fmt(lang, (wrap(sun + moon) * 60) / 800, 2)} → ${L(lang, yg[0], yg[1])}`] },
    { say: L(lang, "करण: आधा तिथि; ७ चर करण ८ पटक, ४ स्थिर करण (२.६७–६९)", "Karaṇa: half a tithi; 7 movable ones eight times, 4 fixed (2.67–69)"), eq: [fr(dms(lang, p.e), `${num(lang, 6)}°`), ` = ${num(lang, p.karana + 1)}${L(lang, "औँ करण", "th karaṇa")} → ${L(lang, kr[0], kr[1])}`] },
    { say: L(lang, "जाँच: ३० तिथि × ७२०′ = २७ नक्षत्र × ८००′ = भचक्र", "Check: 30 × 720′ = 27 × 800′ = the full circle"), eq: [`${num(lang, 30)} × ${num(lang, 720)} = ${num(lang, 27)} × ${num(lang, 800)} = ${grp(lang, 21600)}′`] },
  ];
  return { shapes, readout: [`${L(lang, "सूर्य", "Sun")} ${dms(lang, sun)} · ${L(lang, "चन्द्र", "Moon")} ${dms(lang, moon)}`, `${L(lang, "भोगान्तर", "moon − sun")} ${dms(lang, p.e)}`], steps };
}

export const MORE_A = {
  "month-kinds": { chapter: 1, verse: 12, title: ["मासका प्रकार", "The kinds of month"], caption: ["नाक्षत्र, सावन, चान्द्र र सौर मास एउटै वर्षमा फरक संख्यामा पर्छन्।", "Sidereal, civil, lunar and solar months fit a year in different numbers."], seconds: 30, still: 0.5, draw: monthKinds },
  "eastward-lag": { chapter: 1, verse: 25, title: ["ग्रह पूर्वतिर किन चल्छन्?", "Why the planets move east"], caption: ["आकाश पश्चिमतिर घुम्दा ग्रह पछि पर्छन्; त्यही पछि पर्नु नै उनीहरूको पूर्वगति हो।", "As the sky turns west the planets lag; that lag is their eastward motion."], seconds: 24, still: 0.35, draw: eastwardLag },
  adhimasa: { chapter: 1, verse: 35, title: ["अधिमास र क्षय तिथि", "Intercalary months and lost tithis"], caption: ["संक्रान्ति नपर्ने चान्द्र मास अधिमास; तिथि सावन दिनभन्दा छोटो भएकाले कहिलेकाहीँ तिथि क्षय।", "A lunar month with no saṅkrānti is intercalary; tithis are shorter than days, so one is sometimes lost."], seconds: 30, still: 0.6, draw: adhimasa },
  "ishta-ghati": { chapter: 1, verse: 66, title: ["इष्टकालको चालन", "Correcting to the moment"], caption: ["मध्यरातको ग्रहमा दैनिक गति × घटी ÷ ६० जोडेर इच्छित समयको ग्रह।", "Add daily motion × ghaṭīs ÷ 60 to the midnight planet for any moment."], seconds: 20, still: 0.4, draw: ishtaGhati },
  vikshepa: { chapter: 1, verse: 68, title: ["ग्रहहरूको शर", "The planets' latitudes"], caption: ["चन्द्र ४°३०′ सम्म, अरू ग्रह १°–२° सम्म क्रान्तिवृत्तबाट उत्तर–दक्षिण जान्छन्।", "The moon strays up to 4°30′ from the ecliptic, the others 1°–2°."], seconds: 24, still: 0.25, draw: vikshepa },
  "jya-lookup": { chapter: 2, verse: 29, title: ["केन्द्र, पद र ज्या निकाल्ने तरिका", "Anomaly, quadrant and finding the sine"], caption: ["केन्द्रको पद हेरेर भुज लिने, अनि ज्यापिण्डबाट अनुपातले ज्या।", "Find the quadrant, take the bhuja, then interpolate the sine table."], seconds: 24, still: 0.36, draw: jyaLookup },
  "correction-order": { chapter: 2, verse: 43, title: ["चार संशोधनको क्रम", "The order of the four corrections"], caption: ["मङ्गलदेखि पाँच ग्रहमा: आधा शीघ्र, आधा मन्द, पूर्ण मन्द, पूर्ण शीघ्र।", "For the five planets: half śīghra, half manda, whole manda, whole śīghra."], seconds: 30, still: 0.12, draw: correctionOrder },
  "true-motion": { chapter: 2, verse: 46, title: ["स्पष्ट गति र वक्रगति", "True motion and retrogression"], caption: ["शीघ्रफल घट्दा स्पष्ट गति शून्यमुनि जान्छ: ग्रह वक्री।", "When the śīghra equation falls fast enough, true motion goes below zero: retrograde."], seconds: 24, still: 0.47, draw: trueMotion },
  "planet-latitude": { chapter: 2, verse: 56, title: ["ग्रहको शर र स्पष्ट क्रान्ति", "A planet's latitude and true declination"], caption: ["शरलाई क्रान्तिमा जोडेर वा घटाएर ग्रहको स्पष्ट क्रान्ति।", "Add or subtract the latitude to the declination for the true declination."], seconds: 24, still: 0.3, draw: planetLatitude },
  "panchanga-elements": { chapter: 2, verse: 64, title: ["तिथि, नक्षत्र, योग, करण", "Tithi, nakshatra, yoga, karaṇa"], caption: ["सूर्य र चन्द्रको भोगबाट पञ्चाङ्गका अङ्ग।", "The limbs of the panchanga from the sun's and moon's longitudes."], seconds: 30, still: 0.32, draw: panchangaElements },
} satisfies Record<string, FigureDef>;
