/**
 * Figures for chapters 4–7 of the Surya Siddhanta: the sizes of the discs and
 * the shadow, when an eclipse can happen, the eclipse at a given moment,
 * the deflection (valana), parallax in time and in latitude, the rods of the
 * projection, the time of a conjunction, the correction for apparent
 * longitude, and the planets' discs. copy-ok-file
 */
import { fr, grp, mark, sighraParts } from "./surya-classical";
import type { FigureDef } from "./surya-more-a";
import { circle, dms, fmt, L, line, num, path, polar, suryaArc, suryaJya, text, TRIJYA, wrap, type FigureFrame, type Lang, type Shape, type Step, type Tone } from "./surya-kit";

const MOON_MEAN = 790 + 35 / 60;
const SUN_MEAN = 59 + 8 / 60;
const DIFF = MOON_MEAN - SUN_MEAN;
const KTM = 27.7;
const PALABHA = 12 * Math.tan((KTM * Math.PI) / 180);

/** 4.1–5: true diameters in yojanas and minutes for given true daily motions. */
export function discs(moonMotion: number, sunMotion: number) {
  const moonY = (480 * moonMotion) / MOON_MEAN;
  const sunY = (6500 * sunMotion) / SUN_MEAN;
  const sunInMoon = (sunY * 324000) / 4331500;
  const suci = (1600 * moonMotion) / MOON_MEAN;
  const shadowY = suci - ((sunY - 1600) * 480) / 6500;
  return { moonY, sunY, sunInMoon, suci, shadowY, moonM: moonY / 15, sunM: sunInMoon / 15, shadowM: shadowY / 15 };
}

// ---------------------------------------------------------------- 4.1–5 the sizes of discs and shadow

function eclipseDiscs(t: number, lang: Lang): FigureFrame {
  const mm = 720 + 140 * (1 - Math.abs(1 - 2 * t));
  const sm = 57.2 + 3.8 * Math.abs(1 - 2 * t);
  const d = discs(mm, sm);
  const shapes: Shape[] = [];
  const sy = 100;
  // the sun, the earth and the shadow cone, not to scale
  shapes.push(circle(40, sy, 30, { fill: "sun" }));
  shapes.push(circle(170, sy, 14, { fill: "earth" }));
  shapes.push(path(`M 40 ${sy - 30} L 170 ${sy - 14} L 330 ${sy} L 170 ${sy + 14} L 40 ${sy + 30}`, { stroke: "faint", w: 0.8 }));
  shapes.push(path(`M 170 ${sy - 14} L 330 ${sy} L 170 ${sy + 14} Z`, { fill: "shadow", opacity: 0.5 }));
  const mx = 236;
  const halfShadow = 14 * (1 - (mx - 170) / 160);
  shapes.push(line(mx, sy - halfShadow, mx, sy + halfShadow, { stroke: "accent", w: 2 }));
  shapes.push(circle(mx, sy - halfShadow - 8, 5, { fill: "moon", stroke: "muted", w: 0.6 }));
  shapes.push(text(40, sy + 46, L(lang, "सूर्य", "Sun"), "sun", 9), text(170, sy + 30, L(lang, "पृथ्वी", "Earth"), "earth", 9), text(mx, sy + 30, L(lang, "भूछाया", "shadow"), "accent", 9));
  shapes.push(text(180, 20, L(lang, "चन्द्रकक्षामा भूछायाको चौडाइ (नापमा होइन)", "The shadow's width at the moon's orbit (not to scale)"), "ink", 9.5, "middle", true));
  const steps: Step[] = [
    { say: L(lang, "मध्यम व्यास: सूर्य ६५०० योजन, चन्द्र ४८० योजन (४.१)", "Mean diameters: sun 6500, moon 480 yojanas (4.1)"), eq: [`${L(lang, "पृथ्वी", "earth")} ${num(lang, 1600)} ${L(lang, "योजन", "yojanas")} (${num(lang, "1.59")})`] },
    { say: L(lang, "स्पष्ट व्यास = मध्यम × स्पष्ट गति ÷ मध्यम गति (४.२)", "True diameter = mean × true motion ÷ mean motion (4.2)"), eq: [`${L(lang, "चन्द्र", "moon")}: `, fr(`${num(lang, 480)} × ${fmt(lang, mm, 1)}`, fmt(lang, MOON_MEAN, 1)), ` = ${fmt(lang, d.moonY, 1)} → ÷ ${num(lang, 15)} = ${fmt(lang, d.moonM, 1)}′`] },
    { say: L(lang, "सूर्यलाई चन्द्रकक्षामा: × चन्द्रकक्षा ÷ सूर्यकक्षा, अनि ÷ १५ (४.३)", "The sun on the moon's orbit: × moon's orbit ÷ sun's orbit, then ÷ 15 (4.3)"), eq: [fr(`${fmt(lang, d.sunY)} × ${grp(lang, 324000)}`, grp(lang, 4331500)), ` = ${fmt(lang, d.sunInMoon, 1)} → ${fmt(lang, d.sunM, 1)}′`] },
    { say: L(lang, "सूची = पृथ्वीको व्यास × चन्द्रको स्पष्ट गति ÷ मध्यम गति (४.४)", "Sūcī = earth's diameter × moon's true motion ÷ mean (4.4)"), eq: [fr(`${num(lang, 1600)} × ${fmt(lang, mm, 1)}`, fmt(lang, MOON_MEAN, 1)), ` = ${fmt(lang, d.suci, 1)}`] },
    { say: L(lang, "भूछाया = सूची − (सूर्य − पृथ्वी) × चन्द्र ÷ सूर्य (मध्यम) (४.५)", "Shadow = sūcī − (sun − earth) × moon ÷ sun, mean diameters (4.5)"), eq: [`${fmt(lang, d.suci, 1)} − `, fr(`(${fmt(lang, d.sunY)} − ${num(lang, 1600)}) × ${num(lang, 480)}`, num(lang, 6500)), ` = ${fmt(lang, d.shadowY, 1)} → ${fmt(lang, d.shadowM, 1)}′`] },
  ];
  return { shapes, readout: [`${L(lang, "चन्द्र गति", "moon's motion")} ${fmt(lang, mm, 1)}′ · ${L(lang, "सूर्य गति", "sun's")} ${fmt(lang, sm, 2)}′`, `${L(lang, "चन्द्र", "moon")} ${fmt(lang, d.moonM, 1)}′ · ${L(lang, "सूर्य", "sun")} ${fmt(lang, d.sunM, 1)}′ · ${L(lang, "छाया", "shadow")} ${fmt(lang, d.shadowM, 1)}′`], steps };
}

// ---------------------------------------------------------------- 4.6–9 when an eclipse can happen

function eclipseLimits(t: number, lang: Lang): FigureFrame {
  const dNode = -20 + 40 * t; // the moon's distance from the node at full moon
  const beta = (270 * suryaJya(dNode)) / TRIJYA;
  const d = discs(MOON_MEAN, SUN_MEAN);
  const half = (d.moonM + d.shadowM) / 2;
  const k = 1.2;
  const cx = 180;
  const cy = 100;
  const shapes: Shape[] = [line(20, cy, 340, cy, { stroke: "sun", w: 1.2 }), text(340, cy - 4, L(lang, "क्रान्तिवृत्त", "ecliptic"), "sun", 8.5, "end")];
  // the moon's path crosses the ecliptic at the node, inclined (drawn steeper)
  const node = { x: cx - dNode * 6, y: cy };
  const slope = 0.35;
  shapes.push(line(node.x - 160, cy + 160 * slope, node.x + 160, cy - 160 * slope, { stroke: "muted", w: 1, dash: "4 3" }));
  mark(shapes, node, L(lang, "पात", "node"), 0, 64, "accent", 3);
  shapes.push(circle(cx, cy, (d.shadowM / 2) * k, { fill: "shadow", opacity: 0.45 }));
  shapes.push(circle(cx, cy - beta * k, (d.moonM / 2) * k, { fill: "moon", stroke: "muted", w: 0.8 }));
  shapes.push(line(cx + 60, cy, cx + 60, cy - beta * k, { stroke: "accent", w: 1.6 }), text(cx + 64, cy - (beta * k) / 2, L(lang, "शर", "lat."), "accent", 8.5, "start"));
  const eclipse = Math.abs(beta) < half;
  const limit = suryaArc((half * TRIJYA) / 270);
  const steps: Step[] = [
    { say: L(lang, "भूछाया सूर्यबाट ६ राशि टाढा हुन्छ (४.६)", "The shadow is six signs from the sun (4.6)"), eq: [`${L(lang, "पूर्णिमामा चन्द्र = सूर्य + १८०°", "at full moon, moon = sun + 180°")}`] },
    { say: L(lang, "चन्द्र पात नजिक भए मात्र ग्रहण: शर = २७०′ × ज्या(पातबाट दूरी) ÷ त्रिज्या", "Only near the node: latitude = 270′ × sine(distance from node) ÷ R"), eq: [fr(`${num(lang, 270)} × ${fmt(lang, suryaJya(dNode))}`, num(lang, TRIJYA)), ` = ${fmt(lang, beta, 1)}′`] },
    { say: L(lang, "मानार्धयोग (चन्द्र + छाया) ÷ २", "Half the sum of moon and shadow"), eq: [fr(`${fmt(lang, d.moonM, 1)} + ${fmt(lang, d.shadowM, 1)}`, num(lang, 2)), ` = ${fmt(lang, half, 1)}′`] },
    { say: L(lang, "शर मानार्धयोगभन्दा कम भए ग्रहण (४.१०)", "An eclipse when the latitude is less than that (4.10)"), eq: [`${fmt(lang, Math.abs(beta), 1)} ${eclipse ? "<" : ">"} ${fmt(lang, half, 1)} → ${eclipse ? L(lang, "ग्रहण", "eclipse") : L(lang, "ग्रहण छैन", "no eclipse")}`] },
    { say: L(lang, "सीमा: पातबाट कति अंशसम्म?", "The limit: how far from the node?"), eq: [`${L(lang, "ज्या", "sin")} d = `, fr(`${fmt(lang, half, 1)} × ${num(lang, TRIJYA)}`, num(lang, 270)), ` → d ≈ ${dms(lang, limit)}`] },
  ];
  return { shapes, readout: [`${L(lang, "पातबाट", "from the node")} ${dms(lang, dNode)} · ${L(lang, "शर", "latitude")} ${fmt(lang, beta, 1)}′`, eclipse ? L(lang, "ग्रहण हुन्छ", "eclipse") : L(lang, "ग्रहण हुँदैन", "no eclipse")], steps };
}

// ---------------------------------------------------------------- 4.18–23 the eclipse at a given moment

function ishtaGrasa(t: number, lang: Lang): FigureFrame {
  const d = discs(MOON_MEAN, SUN_MEAN);
  const beta = 22;
  const half = (d.moonM + d.shadowM) / 2;
  const sthiti = (60 * Math.sqrt(half * half - beta * beta)) / DIFF;
  const fromMid = (t * 2 - 1) * sthiti; // ghaṭīs from the middle
  const koti = (Math.abs(fromMid) * DIFF) / 60;
  const karna = Math.hypot(koti, beta);
  const grasa = Math.max(0, half - karna);
  const k = 1.4;
  const cx = 160;
  const cy = 112;
  const mx = cx + (fromMid >= 0 ? 1 : -1) * koti * k;
  const my = cy - beta * k;
  const shapes: Shape[] = [
    circle(cx, cy, (d.shadowM / 2) * k, { fill: "shadow", opacity: 0.5 }),
    line(cx - 150, my, cx + 150, my, { stroke: "faint", dash: "3 3" }),
    circle(mx, my, (d.moonM / 2) * k, { fill: "moon", stroke: "muted", w: 0.8, opacity: 0.9 }),
    line(cx, cy, cx, my, { stroke: "planet", w: 2 }),
    line(cx, my, mx, my, { stroke: "sun", w: 2 }),
    line(cx, cy, mx, my, { stroke: "accent", w: 1.8 }),
    text(cx - 6, (cy + my) / 2, L(lang, "भुज (शर)", "bhuja"), "planet", 8.5, "end"),
    text((cx + mx) / 2, my - 6, L(lang, "कोटि", "koṭi"), "sun", 8.5),
    text((cx + mx) / 2 + 10, (cy + my) / 2 + 12, L(lang, "कर्ण", "karṇa"), "accent", 9),
  ];
  const steps: Step[] = [
    { say: L(lang, "इष्ट समय मध्यबाट कति घटी?", "How many ghaṭīs from the middle?"), eq: [`${fmt(lang, Math.abs(fromMid), 2)} ${L(lang, "घटी", "gh.")} ${fromMid < 0 ? L(lang, "पहिले", "before") : L(lang, "पछि", "after")}`] },
    { say: L(lang, "कोटि = घटी × गत्यन्तर ÷ ६० (४.१८)", "Koṭi = ghaṭīs × motion difference ÷ 60 (4.18)"), eq: [fr(`${fmt(lang, Math.abs(fromMid), 2)} × ${fmt(lang, DIFF, 1)}`, num(lang, 60)), ` = ${fmt(lang, koti, 1)}′`] },
    { say: L(lang, "कर्ण = √(कोटि² + शर²) (४.२०)", "Hypotenuse = √(koṭi² + latitude²) (4.20)"), eq: [`√(${fmt(lang, koti, 1)}² + ${num(lang, beta)}²) = ${fmt(lang, karna, 1)}′`] },
    { say: L(lang, "ग्रास = मानार्धयोग − कर्ण (४.२०–२१)", "Covered = half-sum − hypotenuse (4.20–21)"), eq: [`${fmt(lang, half, 1)} − ${fmt(lang, karna, 1)} = ${fmt(lang, grasa, 1)}′`] },
    { say: L(lang, "उल्टो: ग्रासबाट समय (४.२२–२३)", "Back: the time from the covered part (4.22–23)"), eq: [`√((${fmt(lang, half, 1)} − ${fmt(lang, grasa, 1)})² − ${num(lang, beta)}²) × `, fr(num(lang, 60), fmt(lang, DIFF, 1)), ` = ${fmt(lang, Math.abs(fromMid), 2)} ${L(lang, "घटी", "gh.")}`] },
  ];
  return { shapes, readout: [`${L(lang, "मध्यबाट", "from the middle")} ${fmt(lang, fromMid, 2)} ${L(lang, "घटी", "gh.")}`, `${L(lang, "ग्रास", "covered")} ${fmt(lang, grasa, 1)}′`], steps };
}

// ---------------------------------------------------------------- 4.24–26 the deflection (valana)

function valana(t: number, lang: Lang): FigureFrame {
  const hour = -80 + 160 * t; // hour angle, degrees
  const lon = 330;
  const akshaJ = suryaJya(KTM);
  const aksha = suryaArc((suryaJya(Math.abs(hour)) * akshaJ) / TRIJYA) * (hour < 0 ? 1 : -1); // north in the east
  const ayana = suryaArc((suryaJya(lon + 90) * 1397) / TRIJYA);
  const total = aksha + ayana;
  const cx = 130;
  const cy = 100;
  const R = 62;
  const shapes: Shape[] = [circle(cx, cy, R, { fill: "moon", opacity: 0.5, stroke: "muted" }), line(cx - R - 20, cy, cx + R + 20, cy, { stroke: "faint", dash: "3 3" }), text(cx + R + 22, cy + 3, L(lang, "पूर्व", "E"), "muted", 8.5, "start"), text(cx - R - 22, cy + 3, L(lang, "पश्चिम", "W"), "muted", 8.5, "end")];
  const a = polar(cx, cy, R + 16, total);
  const b = polar(cx, cy, R + 16, total + 180);
  shapes.push(line(b.x, b.y, a.x, a.y, { stroke: "accent", w: 2 }));
  shapes.push(text(a.x + 4, a.y, L(lang, "क्रान्तिवृत्तको दिशा", "ecliptic direction"), "accent", 8.5, "start"));
  shapes.push(text(250, 150, L(lang, "बिम्बको पूर्व–पश्चिम रेखा", "the disc's east–west line"), "muted", 8.5));
  shapes.push(text(250, 166, L(lang, "क्रान्तिवृत्तबाट वलन जति ढल्किन्छ", "leans from the ecliptic by the valana"), "muted", 8.5));
  const steps: Step[] = [
    { say: L(lang, "नतकाल (मध्याह्नबाट) अंशमा", "Hour angle from the meridian, in degrees"), eq: [`${dms(lang, Math.abs(hour))} ${hour < 0 ? L(lang, "पूर्व", "east") : L(lang, "पश्चिम", "west")}`] },
    { say: L(lang, "आक्षवलन = नतज्या × अक्षज्या ÷ त्रिज्या; पूर्वमा उत्तर, पश्चिममा दक्षिण (४.२४)", "Latitude valana = sine of hour × latitude sine ÷ R; north in the east (4.24)"), eq: [fr(`${fmt(lang, suryaJya(Math.abs(hour)))} × ${fmt(lang, akshaJ)}`, num(lang, TRIJYA)), ` → ${dms(lang, Math.abs(aksha))}`] },
    { say: L(lang, "आयनवलन: ग्रह + ३ राशिको क्रान्ति (४.२५)", "Solstitial valana: the declination of the body + 3 signs (4.25)"), eq: [`${L(lang, "क्रान्ति", "decl.")}(${dms(lang, wrap(lon + 90))}) = ${dms(lang, ayana)}`] },
    { say: L(lang, "एकै दिशा भए जोड्ने, फरक भए घटाउने", "Add if alike, subtract if unlike"), eq: [`${dms(lang, aksha)} + ${dms(lang, ayana)} = ${dms(lang, total)}`] },
    { say: L(lang, "छेद्यक कोर्दा शर, बिम्ब र वलनलाई एउटै नापमा घटाउने (४.२६)", "For the projection, reduce latitude, discs and valana to one scale (4.26)"), eq: [`${L(lang, "वलनज्या", "valana sine")} = ${fmt(lang, suryaJya(Math.abs(total)))}`] },
  ];
  return { shapes, readout: [`${L(lang, "नत", "hour")} ${dms(lang, hour)}`, `${L(lang, "वलन", "valana")} ${dms(lang, total)}`], steps };
}

// ---------------------------------------------------------------- 5.4–9 parallax in time

function lambanaTime(t: number, lang: Lang): FigureFrame {
  const gap = -90 + 180 * t; // sun − meridian ecliptic point
  const zm = 20; // zenith distance of the meridian ecliptic point
  const drggati = suryaJya(90 - zm);
  const cheda = (1719 * 1719) / drggati;
  const lam = suryaJya(gap) / cheda;
  const cx = 180;
  const cy = 170;
  const R = 140;
  const shapes: Shape[] = [line(cx - R - 10, cy, cx + R + 10, cy, { stroke: "muted" }), path(`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`, { stroke: "faint" }), line(cx, cy, cx, cy - R, { stroke: "faint", dash: "3 3" })];
  shapes.push(text(cx, cy - R - 6, L(lang, "मध्यलग्न", "meridian point"), "muted", 8.5));
  const S = polar(cx, cy, R, 90 - gap);
  shapes.push(circle(S.x, S.y, 7, { fill: "sun" }));
  const M = polar(cx, cy, R - 2, 90 - gap + lam * 3);
  shapes.push(circle(M.x, M.y, 5.5, { fill: "shadow", opacity: 0.9 }));
  shapes.push(text(cx - R, cy + 14, L(lang, "पूर्व", "E"), "muted", 8.5, "start"), text(cx + R, cy + 14, L(lang, "पश्चिम", "W"), "muted", 8.5, "end"));
  const steps: Step[] = [
    { say: L(lang, "मध्यलग्नको नतांश र दृग्गतिज्या (५.४–६)", "Zenith distance of the meridian point and its altitude sine (5.4–6)"), eq: [`${dms(lang, zm)} → ${L(lang, "दृग्गति", "dṛggati")} = ${L(lang, "ज्या", "sin")} ${dms(lang, 90 - zm)} = ${fmt(lang, drggati)}`] },
    { say: L(lang, "छेद = (एक राशिको ज्या)² ÷ दृग्गतिज्या (५.७)", "Divisor = (sine of one sign)² ÷ altitude sine (5.7)"), eq: [fr(`${num(lang, 1719)}²`, fmt(lang, drggati)), ` = ${fmt(lang, cheda, 1)}`] },
    { say: L(lang, "सूर्य र मध्यलग्नको अन्तर", "Sun less the meridian point"), eq: [`${dms(lang, gap)} → ${L(lang, "ज्या", "sin")} ${fmt(lang, suryaJya(gap))}`] },
    { say: L(lang, "लम्बन (नाडी) = अन्तरज्या ÷ छेद (५.८)", "Parallax (nāḍī) = that sine ÷ divisor (5.8)"), eq: [fr(fmt(lang, suryaJya(gap)), fmt(lang, cheda, 1)), ` = ${fmt(lang, lam, 2)} ${L(lang, "नाडी", "nāḍī")}`] },
    { say: L(lang, "सूर्य मध्यलग्नभन्दा अगाडि भए तिथ्यन्तबाट घटाउने, पछाडि भए जोड्ने; बारम्बार दोहोर्याउने (५.९)", "Sun ahead of the meridian point: subtract from the tithi end; behind: add; repeat (5.9)"), eq: [`${L(lang, "परम लम्बन", "greatest")} = ${num(lang, TRIJYA)} ÷ ${fmt(lang, (1719 * 1719) / TRIJYA, 1)} = ${num(lang, 4)} ${L(lang, "नाडी", "nāḍī")}`] },
  ];
  return { shapes, readout: [`${L(lang, "सूर्य − मध्यलग्न", "sun − meridian point")} ${dms(lang, gap)}`, `${L(lang, "लम्बन", "parallax")} ${fmt(lang, lam, 2)} ${L(lang, "नाडी", "nāḍī")}`], steps };
}

// ---------------------------------------------------------------- 5.10–12 parallax in latitude (nati)

function nati(t: number, lang: Lang): FigureFrame {
  const zk = 90 * t; // zenith distance of the nonagesimal
  const drk = suryaJya(zk);
  const n = (drk * DIFF) / (15 * TRIJYA);
  const beta = 12;
  const trueShara = beta - n;
  const k = 1.8;
  const cx = 160;
  const cy = 96;
  const shapes: Shape[] = [circle(cx, cy, 16.2 * k, { fill: "sun" }), circle(cx, cy - beta * k, 15.8 * k, { stroke: "muted", w: 1, dash: "3 3" }), circle(cx, cy - trueShara * k, 15.8 * k, { fill: "shadow", opacity: 0.75 })];
  shapes.push(line(cx + 70, cy - beta * k, cx + 70, cy - trueShara * k, { stroke: "accent", w: 2 }), text(cx + 74, cy - ((beta + trueShara) / 2) * k, L(lang, "नति", "nati"), "accent", 8.5, "start"));
  shapes.push(text(14, 20, L(lang, "थोप्ला: केन्द्रबाट देखिने चन्द्र · कालो: सतहबाट", "Dotted: moon from the centre · dark: from the surface"), "muted", 8.5, "start"));
  const steps: Step[] = [
    { say: L(lang, "दृक्क्षेप: वित्रिभको नतांशको ज्या (५.६)", "Dṛkkṣepa: sine of the nonagesimal's zenith distance (5.6)"), eq: [`${L(lang, "ज्या", "sin")} ${dms(lang, zk)} = ${fmt(lang, drk)}`] },
    { say: L(lang, "नति = दृक्क्षेप × गत्यन्तर ÷ (१५ × त्रिज्या) (५.१०–११)", "Nati = dṛkkṣepa × motion difference ÷ (15 × R) (5.10–11)"), eq: [fr(`${fmt(lang, drk)} × ${fmt(lang, DIFF, 1)}`, `${num(lang, 15)} × ${num(lang, TRIJYA)}`), ` = ${fmt(lang, n, 1)}′`] },
    { say: L(lang, "नति र शर एकै दिशा भए जोड्ने, फरक भए घटाउने: स्पष्ट शर (५.१२)", "Same direction: add; opposite: subtract — the true latitude (5.12)"), eq: [`${num(lang, beta)} − ${fmt(lang, n, 1)} = ${fmt(lang, trueShara, 1)}′`] },
    { say: L(lang, "यही स्पष्ट शरले स्थिति, विमर्द र ग्रास (५.१३)", "This true latitude gives the durations and the covered part (5.13)"), eq: [`${L(lang, "ग्रास", "covered")} = ${fmt(lang, 32, 1)} − ${fmt(lang, Math.abs(trueShara), 1)} = ${fmt(lang, Math.max(0, 32 - Math.abs(trueShara)), 1)}′`] },
  ];
  return { shapes, readout: [`${L(lang, "दृक्क्षेप", "dṛkkṣepa")} ${fmt(lang, drk)} · ${L(lang, "नति", "nati")} ${fmt(lang, n, 1)}′`, `${L(lang, "स्पष्ट शर", "true latitude")} ${fmt(lang, trueShara, 1)}′`], steps };
}

// ---------------------------------------------------------------- 6.17–22 the rods of the projection

function shalaka(t: number, lang: Lang): FigureFrame {
  const sun = 32.4;
  const moon = 31.6;
  const half = (sun + moon) / 2;
  const halfDiff = (sun - moon) / 2;
  const beta = 8;
  const maxGrasa = half - beta;
  const grasa = maxGrasa * t;
  const rod = half - grasa;
  const along = Math.sqrt(Math.max(0, rod * rod - beta * beta));
  const k = 2.6;
  const cx = 150;
  const cy = 110;
  const shapes: Shape[] = [circle(cx, cy, (sun / 2) * k, { fill: "sun", opacity: 0.85 }), circle(cx, cy, half * k, { stroke: "faint", w: 1, dash: "3 3" }), line(cx - 120, cy - beta * k, cx + 120, cy - beta * k, { stroke: "muted", dash: "4 3" })];
  const P = { x: cx - along * k, y: cy - beta * k };
  shapes.push(line(cx, cy, P.x, P.y, { stroke: "accent", w: 2.4 }));
  shapes.push(circle(P.x, P.y, (moon / 2) * k, { fill: "shadow", opacity: 0.55 }));
  mark(shapes, P, "", 0, 0, "accent", 2.5);
  shapes.push(text(cx + 122, cy - beta * k + 3, L(lang, "ग्राहकको मार्ग", "eclipser's path"), "muted", 8.5, "start"));
  shapes.push(text(14, 190, L(lang, "सुन्तला शलाका = मानार्धयोग − इष्ट ग्रास", "Orange rod = half-sum − chosen covered part"), "accent", 8.8, "start"));
  const steps: Step[] = [
    { say: L(lang, "चन्द्रबिम्बको १२औँ भाग ढाकिँदा पनि देखिन्छ, सूर्यको ३ कला ढाकिँदा देखिँदैन (६.१३)", "A twelfth of the moon covered can be seen; three minutes of the sun cannot (6.13)"), eq: [`${L(lang, "मानार्धयोग", "half-sum")} = `, fr(`${fmt(lang, sun, 1)} + ${fmt(lang, moon, 1)}`, num(lang, 2)), ` = ${fmt(lang, half, 1)}′`] },
    { say: L(lang, "शलाका = मानार्धयोग − इष्ट ग्रास (६.१७, ६.१९)", "Rod = half-sum − chosen covered part (6.17, 6.19)"), eq: [`${fmt(lang, half, 1)} − ${fmt(lang, grasa, 1)} = ${fmt(lang, rod, 1)}′`] },
    { say: L(lang, "शलाका ग्राहकको मार्ग छुने बिन्दुमा ग्राहकको केन्द्र", "Where the rod meets the path is the eclipser's centre"), eq: [`√(${fmt(lang, rod, 1)}² − ${num(lang, beta)}²) = ${fmt(lang, along, 1)}′ ${L(lang, "पश्चिम", "west")}`] },
    { say: L(lang, "पूर्ण ग्रहणको आरम्भ र अन्त्य: शलाका = मानान्तरार्ध (६.२०–२२)", "Start and end of totality: rod = half the difference (6.20–22)"), eq: [fr(`${fmt(lang, sun, 1)} − ${fmt(lang, moon, 1)}`, num(lang, 2)), ` = ${fmt(lang, halfDiff, 1)}′ ${halfDiff < beta ? L(lang, "< शर: पूर्णग्रास हुँदैन", "< latitude: no totality") : ""}`] },
  ];
  return { shapes, readout: [`${L(lang, "इष्ट ग्रास", "covered part")} ${fmt(lang, grasa, 1)}′`, `${L(lang, "शलाका", "rod")} ${fmt(lang, rod, 1)}′`], steps };
}

// ---------------------------------------------------------------- 7.2–6 the time of a conjunction

function yutiTime(t: number, lang: Lang): FigureFrame {
  const days = t * 12;
  const venus = { lon: 100 + (74 / 60) * days, v: 74 };
  const mars = { lon: 108 + (-12 / 60) * days, v: -12 };
  const gap0 = 8 * 60;
  const tYuti = gap0 / (74 + 12);
  const x0 = 20;
  const w = 320;
  const X = (lon: number) => x0 + ((lon - 98) / 16) * w;
  const shapes: Shape[] = [line(x0, 100, x0 + w, 100, { stroke: "faint" })];
  for (let d = 98; d <= 114; d += 2) shapes.push(line(X(d), 96, X(d), 104, { stroke: "faint" }), text(X(d), 118, `${num(lang, d)}°`, "muted", 8));
  shapes.push(circle(X(venus.lon), 84, 6, { fill: "earth" }), text(X(venus.lon), 70, L(lang, "शुक्र", "Venus"), "earth", 9));
  shapes.push(circle(X(mars.lon), 84, 5, { fill: "accent" }), text(X(mars.lon), 140, L(lang, "मङ्गल (वक्री)", "Mars (retro.)"), "accent", 9));
  const gap = mars.lon - venus.lon;
  const steps: Step[] = [
    { say: L(lang, "छिटो ग्रह ढिलोभन्दा अगाडि भए युति भइसक्यो, पछाडि भए हुन बाँकी (७.२)", "If the faster is ahead, the conjunction is past; if behind, to come (7.2)"), eq: [gap > 0 ? L(lang, "हुन बाँकी (गम्य)", "to come") : L(lang, "भइसक्यो (गत)", "past")] },
    { say: L(lang, "भोगान्तर कलामा", "Gap in minutes"), eq: [`${fmt(lang, Math.abs(gap) * 60, 1)}′`] },
    { say: L(lang, "एउटा वक्री भएकाले गतियोगले भाग; दुवै एकै दिशा भए गत्यन्तरले (७.४)", "One is retrograde, so divide by the sum of motions; alike, by the difference (7.4)"), eq: [fr(`${fmt(lang, Math.abs(gap) * 60, 1)}′`, `${num(lang, 74)} + ${num(lang, 12)}`), ` = ${fmt(lang, Math.abs(gap * 60) / 86, 2)} ${L(lang, "दिन", "days")}`] },
    { say: L(lang, "युतिको दिन (सुरुदेखि)", "Day of conjunction from the start"), eq: [fr(`${num(lang, 480)}′`, `${num(lang, 86)}′`), ` = ${fmt(lang, tYuti, 2)} ${L(lang, "दिन", "days")}`] },
    { say: L(lang, "त्यति दिनको गति जोडेर दुवै ग्रह बराबर भोगमा (७.५–६)", "Moving each by that many days brings them to equal longitude (7.5–6)"), eq: [`${num(lang, 100)}° + ${fmt(lang, (74 / 60) * tYuti, 2)}° = ${num(lang, 108)}° − ${fmt(lang, (12 / 60) * tYuti, 2)}° = ${fmt(lang, 100 + (74 / 60) * tYuti, 2)}°`] },
  ];
  return { shapes, readout: [`${L(lang, "दिन", "day")} ${fmt(lang, days, 1)}`, `${L(lang, "भोगान्तर", "gap")} ${dms(lang, gap)}`], steps };
}

// ---------------------------------------------------------------- 7.7–10 the correction for apparent longitude (dṛkkarman)

function drikKarma(t: number, lang: Lang): FigureFrame {
  const halfDay = 15;
  const nata = (t * 2 - 1) * halfDay; // ghaṭīs from the meridian
  const lat = 90; // planet's latitude in minutes, north
  const aksha = ((lat * PALABHA) / 12) * (Math.abs(nata) / halfDay);
  const lon = 120;
  const krAms = suryaArc((suryaJya(lon + 90) * 1397) / TRIJYA);
  const ayana = lat * krAms; // seconds
  const x0 = 20;
  const w = 320;
  const shapes: Shape[] = [line(x0, 120, x0 + w, 120, { stroke: "muted" }), text(x0, 136, L(lang, "पूर्व क्षितिज", "east horizon"), "muted", 8.5, "start"), text(x0 + w, 136, L(lang, "पश्चिम क्षितिज", "west horizon"), "muted", 8.5, "end"), line(x0 + w / 2, 120, x0 + w / 2, 30, { stroke: "faint", dash: "3 3" }), text(x0 + w / 2, 24, L(lang, "याम्योत्तर", "meridian"), "muted", 8.5)];
  const x = x0 + w / 2 + (nata / halfDay) * (w / 2 - 10);
  const y = 120 - 80 * Math.cos(((nata / halfDay) * Math.PI) / 2);
  shapes.push(circle(x, y, 5, { fill: "accent" }));
  const sign = nata < 0 ? -1 : 1;
  shapes.push(line(x, y, x + sign * aksha * 0.6, y, { stroke: "planet", w: 2 }));
  const steps: Step[] = [
    { say: L(lang, "दिनमान, शर र नत–उन्नत घटी पहिले निकाल्ने (७.७)", "First the day length, the latitude and the hour from the meridian (7.7)"), eq: [`${L(lang, "नत", "hour")} = ${fmt(lang, Math.abs(nata), 1)} ${L(lang, "घटी", "gh.")} · ${L(lang, "दिनार्ध", "half-day")} = ${num(lang, halfDay)}`] },
    { say: L(lang, "आक्ष दृक्कर्म = शर × पलभा ÷ १२ × नत ÷ दिनार्ध (७.८)", "Latitude correction = latitude × shadow ÷ 12 × hour ÷ half-day (7.8)"), eq: [fr(`${num(lang, lat)} × ${fmt(lang, PALABHA, 2)}`, num(lang, 12)), ` × `, fr(fmt(lang, Math.abs(nata), 1), num(lang, halfDay)), ` = ${fmt(lang, aksha, 1)}′`] },
    { say: L(lang, "उत्तर शरमा पूर्व कपालमा घटाउने, पश्चिममा जोड्ने (७.९)", "North latitude: subtract in the east, add in the west (7.9)"), eq: [`${nata < 0 ? "−" : "+"}${fmt(lang, aksha, 1)}′`] },
    { say: L(lang, "आयन दृक्कर्म = शर (कला) × (ग्रह + ३ राशि) को क्रान्ति (अंश) = विकला (७.१०)", "Solstitial correction = latitude (′) × declination of planet + 3 signs (°) = seconds (7.10)"), eq: [`${num(lang, lat)} × ${fmt(lang, krAms, 2)} = ${fmt(lang, ayana)}″ = ${fmt(lang, ayana / 60, 1)}′`] },
    { say: L(lang, "नक्षत्रयोग, उदयास्त र शृङ्गोन्नतिमा यो पहिले लगाउने (७.११)", "Apply this first for star conjunctions, risings and the moon's horns (7.11)"), eq: [L(lang, "दृक्–स्पष्ट ग्रह", "apparent planet")] },
  ];
  return { shapes, readout: [`${L(lang, "नत", "hour")} ${fmt(lang, nata, 1)} ${L(lang, "घटी", "gh.")}`, `${L(lang, "आक्ष दृक्कर्म", "latitude corr.")} ${nata < 0 ? "−" : "+"}${fmt(lang, aksha, 1)}′`], steps };
}

// ---------------------------------------------------------------- 7.13–14 the planets' discs

const DISCS: { ne: string; en: string; y: number; even: number; odd: number; tone: Tone }[] = [
  { ne: "मङ्गल", en: "Mars", y: 30, even: 235, odd: 232, tone: "accent" },
  { ne: "शनि", en: "Saturn", y: 37.5, even: 39, odd: 40, tone: "muted" },
  { ne: "बुध", en: "Mercury", y: 45, even: 133, odd: 132, tone: "planet" },
  { ne: "बृहस्पति", en: "Jupiter", y: 52.5, even: 70, odd: 72, tone: "sun" },
  { ne: "शुक्र", en: "Venus", y: 60, even: 262, odd: 260, tone: "earth" },
];

function planetDiscs(t: number, lang: Lang): FigureFrame {
  const k = t * 360;
  const shapes: Shape[] = [text(180, 18, L(lang, "शीघ्रकेन्द्रअनुसार ग्रहबिम्ब (कला)", "The planets' discs (′) by śīghra anomaly"), "ink", 9.5, "middle", true)];
  const rows = DISCS.map((p) => {
    const K = sighraParts(k, p.even, p.odd).karna;
    const sp = (p.y * 2 * TRIJYA) / (TRIJYA + K);
    return { p, K, sp, m: sp / 15 };
  });
  rows.forEach((r, i) => {
    const x = 40 + i * 70;
    shapes.push(circle(x, 90, Math.max(2, Math.min(30, r.m * 4.6)), { fill: r.p.tone, opacity: 0.85 }));
    shapes.push(text(x, 150, L(lang, r.p.ne, r.p.en), r.p.tone, 9, "middle", true));
    shapes.push(text(x, 166, `${fmt(lang, r.m, 2)}′`, "muted", 8.5));
  });
  const v = rows[4]!;
  const steps: Step[] = [
    { say: L(lang, "चन्द्रकक्षामा मध्यम व्यास: ३० योजनमा क्रमैले आधाको आधा थप्दै; शुक्र ६० (७.१३)", "Mean diameters on the moon's orbit: 30, each next adding half of half; Venus 60 (7.13)"), eq: [`${num(lang, 30)}, ${fmt(lang, 37.5, 1)}, ${num(lang, 45)}, ${fmt(lang, 52.5, 1)}, ${num(lang, 60)}`] },
    { say: L(lang, "स्पष्ट = मध्यम × २ × त्रिज्या ÷ (त्रिज्या + शीघ्रकर्ण) (७.१४)", "True = mean × 2 × R ÷ (R + śīghra hypotenuse) (7.14)"), eq: [`${L(lang, "शुक्र", "Venus")}: `, fr(`${num(lang, 60)} × ${num(lang, 2)} × ${num(lang, TRIJYA)}`, `${num(lang, TRIJYA)} + ${fmt(lang, v.K)}`), ` = ${fmt(lang, v.sp, 1)}`] },
    { say: L(lang, "कलामा: ÷ १५ (७.१४)", "In minutes: ÷ 15 (7.14)"), eq: [`${fmt(lang, v.sp, 1)} ÷ ${num(lang, 15)} = ${fmt(lang, v.m, 2)}′`] },
    { say: L(lang, "ग्रह पृथ्वी नजिक (कर्ण सानो) हुँदा बिम्ब ठूलो", "Nearer the earth (small hypotenuse) the disc is larger"), eq: [`${L(lang, "केन्द्र", "κ")} ${dms(lang, k)}`] },
  ];
  return { shapes, readout: [`κ ${dms(lang, k)}`, `${L(lang, "शुक्र", "Venus")} ${fmt(lang, v.m, 2)}′ · ${L(lang, "मङ्गल", "Mars")} ${fmt(lang, rows[0]!.m, 2)}′`], steps };
}

export const MORE_C = {
  "eclipse-discs": { chapter: 4, verse: 1, title: ["बिम्ब र भूछायाको नाप", "The sizes of the discs and the shadow"], caption: ["गति बढ्दा बिम्ब ठूलो; भूछाया सूची र सूर्य–पृथ्वीको अन्तरबाट।", "Faster motion, larger disc; the shadow from the sūcī and the sun–earth difference."], seconds: 24, still: 0.5, draw: eclipseDiscs },
  "eclipse-limits": { chapter: 4, verse: 6, title: ["ग्रहण कहिले हुन्छ?", "When can an eclipse happen?"], caption: ["पूर्णिमा पात नजिक परे मात्र चन्द्रमा भूछायामा पस्छ।", "Only a full moon near the node enters the shadow."], seconds: 24, still: 0.55, draw: eclipseLimits },
  "ishta-grasa": { chapter: 4, verse: 18, title: ["इष्ट समयको ग्रास", "The covered part at a chosen time"], caption: ["कोटि, शर र कर्णको त्रिभुजबाट कुनै पनि क्षणको ग्रास।", "The triangle of koṭi, latitude and hypotenuse gives the covered part at any moment."], seconds: 24, still: 0.3, draw: ishtaGrasa },
  valana: { chapter: 4, verse: 24, title: ["वलन: बिम्बको ढल्काइ", "Valana: the tilt of the disc"], caption: ["आक्ष र आयन वलनले ग्रहणको स्पर्श कुन दिशाबाट हुन्छ भन्ने देखाउँछ।", "The latitude and solstitial valana show from which side contact comes."], seconds: 24, still: 0.25, draw: valana },
  "lambana-time": { chapter: 5, verse: 4, title: ["लम्बन: समयमा", "Parallax in time"], caption: ["सूर्यग्रहणमा चन्द्र सतहबाट सरेको देखिन्छ; त्यसले ग्रहणको समय सार्छ।", "Seen from the surface the moon shifts, moving the eclipse in time."], seconds: 24, still: 0.75, draw: lambanaTime },
  nati: { chapter: 5, verse: 10, title: ["नति: शरमा लम्बन", "Nati: parallax in latitude"], caption: ["सतहबाट चन्द्र तल देखिन्छ; त्यसले स्पष्ट शर र ग्रास बदल्छ।", "From the surface the moon sits lower, changing the true latitude and the covered part."], seconds: 20, still: 0.35, draw: nati },
  shalaka: { chapter: 6, verse: 17, title: ["शलाका: इष्ट ग्रासको ठाउँ", "The rod: where a given phase falls"], caption: ["मानार्धयोग − ग्रास लम्बाइको शलाकाले ग्राहकको केन्द्र देखाउँछ।", "A rod of half-sum less the covered part finds the eclipser's centre."], seconds: 20, still: 0.6, draw: shalaka },
  "yuti-time": { chapter: 7, verse: 2, title: ["युतिको समय", "The time of a conjunction"], caption: ["भोगान्तरलाई गत्यन्तर (वा वक्री भए गतियोग) ले भाग।", "Divide the gap by the difference of motions, or the sum if one is retrograde."], seconds: 20, still: 0.3, draw: yutiTime },
  "drik-karma": { chapter: 7, verse: 7, title: ["दृक्कर्म", "The correction for apparent longitude"], caption: ["शर भएको ग्रह क्षितिज नजिक हुँदा भोगमा सरेको देखिन्छ।", "A planet off the ecliptic seems shifted in longitude away from the meridian."], seconds: 20, still: 0.2, draw: drikKarma },
  "planet-discs": { chapter: 7, verse: 13, title: ["ग्रहबिम्बको नाप", "The planets' discs"], caption: ["मध्यम व्यासलाई शीघ्रकर्णले सुधारेर कलामा बिम्ब।", "The mean diameter, corrected by the śīghra hypotenuse, gives the disc in minutes."], seconds: 24, still: 0.5, draw: planetDiscs },
} satisfies Record<string, FigureDef>;
