/**
 * Figures for chapters 8–14 of the Surya Siddhanta: a planet among the
 * nakshatras and Rohiṇī's cart, the arithmetic of heliacal visibility, the
 * moon's setting and the elevation of its horns, the time of a pāta, the
 * gaṇḍānta junctions, the zones of the earth, the lords of the hours, days,
 * months and years, the distances of the orbits, the diurnal circles of the
 * armillary sphere, the water clock, the eighty-six-day gates and the
 * saṅkrānti window. copy-ok-file
 */
import { fr, grp, mark } from "./surya-classical";
import { NAKSHATRA27, type FigureDef } from "./surya-more-a";
import { RASHI, risingAsusClean, sunDecl } from "./surya-more-b";
import { arc, circle, dms, fmt, initial, key, L, line, num, path, polar, suryaArc, suryaJya, text, TRIJYA, wrap, type FigureFrame, type Lang, type Shape, type Step, type Tone } from "./surya-kit";

const CIVIL = 1577917828;
const RAD = Math.PI / 180;

// ---------------------------------------------------------------- 8.13–16 a planet among the nakshatras

/** Rohiṇī's five stars, drawn as a cart around its junction star (49°30′, 5° S). */
const CART: [number, number][] = [
  [46.5, -2.5],
  [49.5, -5],
  [52.5, -5.5],
  [53, -2],
  [47.5, -0.5],
];

function nakshatraYuti(t: number, lang: Lang): FigureFrame {
  const lon = 38 + 22 * t;
  const lat = -3.2;
  const x0 = 20;
  const w = 320;
  const X = (l: number) => x0 + ((l - 38) / 22) * w;
  const Y = (b: number) => 70 - b * 14;
  const shapes: Shape[] = [line(x0, Y(0), x0 + w, Y(0), { stroke: "sun", w: 1 }), text(x0 + w, Y(0) - 4, L(lang, "क्रान्तिवृत्त", "ecliptic"), "sun", 8.5, "end")];
  shapes.push(path(`M ${CART.map(([l, b]) => `${X(l).toFixed(1)} ${Y(b).toFixed(1)}`).join(" L ")} Z`, { stroke: "planet", w: 1, fill: "planet", opacity: 0.12 }));
  CART.forEach(([l, b], i) => shapes.push(circle(X(l), Y(b), i === 1 ? 3.5 : 2.5, { fill: "planet" })));
  shapes.push(text(X(49.5), Y(-5) + 18, L(lang, "रो", "R"), "planet", 10.5, "middle", true));
  shapes.push(line(X(47), Y(0) - 6, X(47), Y(-7), { stroke: "faint", dash: "2 2" }), text(X(47), Y(-7) + 14, L(lang, "१७°", "17°"), "muted", 10.5));
  shapes.push(line(x0, Y(lat), x0 + w, Y(lat), { stroke: "accent", w: 0.8, dash: "4 3" }));
  shapes.push(circle(X(lon), Y(lat), 5, { fill: "accent" }), text(X(lon), Y(lat) - 9, L(lang, "ग", "P"), "accent", 10.5, "middle", true));
  const inside = lon > 46.5 && lon < 53;
  const gap = 49.5 - lon;
  const motion = 31.44; // Mars, minutes a day
  const steps: Step[] = [
    { say: L(lang, "वृष १७° मा दक्षिण शर २° भन्दा बढी भए ग्रहले रोहिणीको शकट भेद्छ (८.१३)", "At Taurus 17° with south latitude above 2° a planet pierces Rohiṇī's cart (8.13)"), eq: [`${L(lang, "शर", "latitude")} = ${dms(lang, Math.abs(lat))} ${L(lang, "दक्षिण", "S")} > ${num(lang, 2)}° → ${L(lang, "शकटभेद", "piercing")}`] },
    { say: L(lang, "ग्रह ध्रुवकभन्दा कम भए युति हुन बाँकी, बढी भए भइसक्यो (८.१५)", "Planet below the star's polar longitude: conjunction to come; above: past (8.15)"), eq: [`${dms(lang, lon)} ${gap > 0 ? "<" : ">"} ${dms(lang, 49.5)} → ${gap > 0 ? L(lang, "गम्य", "to come") : L(lang, "गत", "past")}`] },
    { say: L(lang, "बाँकी दिन = अन्तर ÷ ग्रहको दैनिक गति (८.१६); मङ्गल ३१′२६″", "Days = gap ÷ the planet's daily motion (8.16); Mars 31′26″"), eq: [fr(`${fmt(lang, Math.abs(gap) * 60, 1)}′`, `${fmt(lang, motion, 2)}′`), ` = ${fmt(lang, (Math.abs(gap) * 60) / motion, 1)} ${L(lang, "दिन", "days")}`] },
    { say: L(lang, "ताराको पनि दिनमान र दृक्कर्म ग्रहकै जस्तो (८.१४)", "The star's day length and apparent-longitude correction as for a planet (8.14)"), eq: [L(lang, "दृक्–स्पष्ट तारा र ग्रह तुलना गर्ने", "compare apparent star and planet")] },
  ];
  return { shapes, key: [key("planet", L(lang, "रो", "R"), L(lang, "रोहिणीको योगतारा; नीलो आकार: रोहिणी शकट (५ तारा)", "Rohiṇī's junction star; blue shape: its cart of five stars")), key("accent", L(lang, "ग", "P"), L(lang, "ग्रह (शर ३°१२′ दक्षिण)", "A planet, 3°12′ south")), key("sun", "", L(lang, "क्रान्तिवृत्त", "Ecliptic"), "line"), key("muted", L(lang, "१७°", "17°"), L(lang, "वृष १७°: यहाँ २° भन्दा दक्षिणको ग्रहले शकट भेद्छ", "Taurus 17°: a planet more than 2° south here pierces the cart"), "line")], readout: [`${L(lang, "ग्रह", "planet")} ${dms(lang, lon)} · ${L(lang, "शर", "lat.")} ${dms(lang, Math.abs(lat))} ${L(lang, "द", "S")}`, inside ? L(lang, "शकटभित्र", "inside the cart") : ""], steps };
}

// ---------------------------------------------------------------- 9.5–16 the arithmetic of heliacal setting

function kalamshaCalc(t: number, lang: Lang): FigureFrame {
  const r = risingAsusClean();
  const sun = 250 + 30 * t;
  const jup = 268;
  const sign = Math.floor(jup / 30);
  const asusPerDeg = r[sign]! / 30;
  const gapDeg = jup - sun;
  const kala = (gapDeg * asusPerDeg) / 60; // degrees of time
  const limit = 11;
  const visible = kala > limit;
  const sunKalagati = (59.14 * r[Math.floor(sun / 30) % 12]!) / 1800;
  const jupKalagati = (5 * r[sign]!) / 1800;
  const days = (kala - limit) * 60 / (sunKalagati - jupKalagati);
  const cx = 110;
  const cy = 150;
  const shapes: Shape[] = [line(14, cy, 230, cy, { stroke: "muted" }), text(14, cy + 14, L(lang, "पश्चिम क्षितिज, सूर्यास्तपछि", "western horizon after sunset"), "muted", 8.5, "start")];
  const sx = cx + 60;
  shapes.push(circle(sx, cy + 10, 9, { fill: "sun", opacity: 0.6 }));
  const jx = sx - gapDeg * 3.4;
  const jy = cy - gapDeg * 2.2;
  shapes.push(circle(jx, jy, 4.5, { fill: visible ? "sun" : "faint", stroke: "muted", w: 0.6 }));
  shapes.push(text(jx, jy - 9, L(lang, "बृ", "J"), "ink", 10.5, "middle", true), text(sx, cy + 30, L(lang, "सू", "Su"), "sun", 10.5, "middle", true));
  const steps: Step[] = [
    { say: L(lang, "ग्रह र सूर्यको भोगान्तरलाई उदयासुमा: अंश × राशिको उदयासु ÷ ३०", "The gap turned into asus: degrees × the sign's rising time ÷ 30"), eq: [fr(`${dms(lang, gapDeg)} × ${grp(lang, Math.round(r[sign]!))}`, num(lang, 30)), ` = ${grp(lang, Math.round(gapDeg * asusPerDeg))} ${L(lang, "असु", "asus")}`] },
    { say: L(lang, "कालांश = असु ÷ ६० (९.५)", "Time-degrees = asus ÷ 60 (9.5)"), eq: [fr(grp(lang, Math.round(gapDeg * asusPerDeg)), num(lang, 60)), ` = ${fmt(lang, kala, 2)}°`] },
    { say: L(lang, "बृहस्पतिको कालांश ११: बढी भए उदित, कम भए अस्त (९.६, ९.९)", "Jupiter's limit 11: above, visible; below, set (9.6, 9.9)"), eq: [`${fmt(lang, kala, 2)} ${visible ? ">" : "<"} ${num(lang, limit)}`] },
    { say: L(lang, "कालगति = गति × उदयासु ÷ १८०० (९.११)", "Time-motion = daily motion × rising asus ÷ 1800 (9.11)"), eq: [`${L(lang, "सूर्य", "sun")} `, fr(`${fmt(lang, 59.14, 1)} × ${grp(lang, Math.round(r[Math.floor(sun / 30) % 12]!))}`, grp(lang, 1800)), ` = ${fmt(lang, sunKalagati, 1)}′`] },
    { say: L(lang, "अस्तसम्म बाँकी दिन = (कालांश − सीमा) ÷ कालगतिको अन्तर (९.१०)", "Days left = (time-degrees − limit) ÷ difference of time-motions (9.10)"), eq: [visible ? `${fmt(lang, Math.max(0, days), 1)} ${L(lang, "दिन", "days")}` : L(lang, "अस्त भइसक्यो", "already set")] },
    { say: L(lang, "उल्टो: कालांश × १८०० ÷ उदयासु = क्षेत्रांश (९.१६)", "Back: time-degrees × 1800 ÷ rising asus = ecliptic degrees (9.16)"), eq: [fr(`${num(lang, limit)} × ${grp(lang, 1800)}`, grp(lang, Math.round(r[sign]!))), ` = ${dms(lang, (limit * 1800) / r[sign]!)}`] },
  ];
  return { shapes, key: [key("sun", L(lang, "सू", "Su"), L(lang, "सूर्य, क्षितिजमुनि", "Sun, below the horizon")), key("sun", L(lang, "बृ", "J"), L(lang, visible ? "बृहस्पति: अझै देखिन्छ" : "बृहस्पति: सूर्यको तेजमा हरायो", visible ? "Jupiter: still visible" : "Jupiter: lost in the glare")), key("muted", "", L(lang, "बृहस्पति सूर्यबाट ११ कालांशभन्दा नजिक आउँदा अस्त", "Jupiter sets once closer than 11 time-degrees to the sun"), "line")], readout: [`${L(lang, "सूर्यबाट", "from the sun")} ${dms(lang, gapDeg)} · ${fmt(lang, kala, 2)} ${L(lang, "कालांश", "time-deg.")}`, visible ? L(lang, "उदित", "visible") : L(lang, "अस्त", "set")], steps };
}

/** Asus for the ecliptic arc from a to b (b ahead of a) at Kathmandu. */
function asusBetween(a: number, b: number): number {
  const r = risingAsusClean();
  let total = 0;
  let x = wrap(a);
  let left = wrap(b - a);
  while (left > 1e-9) {
    const s = Math.floor(x / 30) % 12;
    const toEnd = 30 - (x % 30);
    const step = Math.min(toEnd, left);
    total += (r[s]! * step) / 30;
    x = wrap(x + step);
    left -= step;
  }
  return total;
}

// ---------------------------------------------------------------- 10.1–6 the moon's setting after sunset

function moonSetting(t: number, lang: Lang): FigureFrame {
  const sun = 222;
  const e = 4 + 40 * t; // elongation
  const moon = sun + e;
  // after sunset in the west: use the points six signs on (10.4)
  const asus = asusBetween(sun + 180, moon + 180);
  const kala = asus / 60;
  const visible = kala >= 12;
  const cx = 110;
  const cy = 150;
  const shapes: Shape[] = [line(14, cy, 230, cy, { stroke: "muted" }), text(14, cy + 14, L(lang, "पश्चिम क्षितिज", "western horizon"), "muted", 8.5, "start")];
  shapes.push(circle(cx + 50, cy + 12, 10, { fill: "sun", opacity: 0.6 }));
  const mx = cx + 50 - e * 1.8;
  const my = cy - e * 2.4;
  shapes.push(circle(mx, my, 7, { fill: visible ? "moon" : "faint", stroke: "muted", w: 0.6 }), text(mx + 12, my + 4, L(lang, "च", "Mo"), "ink", 10.5, "start", true), text(cx + 50, cy + 32, L(lang, "सू", "Su"), "sun", 10.5, "middle", true));
  shapes.push(path(`M ${mx + 7} ${my} A 7 7 0 0 1 ${mx - 7} ${my}`, { stroke: "sun", w: 2 }));
  const steps: Step[] = [
    { say: L(lang, "सूर्यबाट १२ कालांश टाढा भएपछि चन्द्र पश्चिममा देखिन्छ (१०.१)", "At 12 time-degrees from the sun the moon becomes visible in the west (10.1)"), eq: [`${L(lang, "भोगान्तर", "elongation")} = ${dms(lang, e)}`] },
    { say: L(lang, "शुक्ल पक्षमा सूर्य र चन्द्र दुवैमा ६ राशि जोडेर तिनको लग्नान्तर असु (१०.२–४)", "In the bright half, add six signs to both and take the asus between (10.2–4)"), eq: [`${L(lang, "असु", "asus")} (${dms(lang, wrap(sun + 180))} → ${dms(lang, wrap(moon + 180))}) = ${grp(lang, Math.round(asus))}`] },
    { say: L(lang, "कालांश = असु ÷ ६०; सूर्यास्तपछि चन्द्र अस्त हुने समय = असु ÷ ३६० घटी", "Time-degrees = asus ÷ 60; the moon sets after the sun by asus ÷ 360 ghaṭī"), eq: [`${fmt(lang, kala, 1)}° · ${fmt(lang, asus / 360, 2)} ${L(lang, "घटी", "gh.")} = ${fmt(lang, (asus / 360) * 24, 0)} ${L(lang, "मिनेट", "min")}`] },
    { say: L(lang, "कृष्ण पक्षमा सूर्यमा मात्र ६ राशि जोड्ने (१०.५–६)", "In the dark half, add six signs to the sun only (10.5–6)"), eq: [visible ? L(lang, "आज चन्द्र देखिन्छ", "the moon is seen today") : L(lang, "अझै देखिँदैन", "not yet seen")] },
  ];
  return { shapes, key: [key("sun", L(lang, "सू", "Su"), L(lang, "भर्खर अस्त भएको सूर्य", "The sun, just set")), key("moon", L(lang, "च", "Mo"), L(lang, "नयाँ चन्द्र: १२ कालांश टाढिएपछि देखिन्छ", "The new moon: seen once 12 time-degrees away")), key("muted", "", L(lang, "पश्चिम क्षितिज", "Western horizon"), "line")], readout: [`${L(lang, "भोगान्तर", "elongation")} ${dms(lang, e)} · ${fmt(lang, kala, 1)} ${L(lang, "कालांश", "time-deg.")}`, visible ? L(lang, "देखिन्छ", "visible") : L(lang, "देखिँदैन", "not visible")], steps };
}

// ---------------------------------------------------------------- 10.7–15 the elevation of the moon's horns

function shringonnati(t: number, lang: Lang): FigureFrame {
  const day = 2 + 12 * t; // days after new moon, at sunset
  const sun = 222;
  const moon = sun + day * 12.19;
  const ds = sunDecl(sun);
  const dm = sunDecl(moon);
  // at sunset: the moon's north–south offset from the sun, in gnomon units (10.7–8)
  const p = 27.7 * RAD;
  const bhuja = ((Math.sin(dm * RAD) - Math.sin(ds * RAD)) / Math.cos(p)) * 12;
  const kotiG = 12;
  const karna = Math.hypot(bhuja, kotiG);
  const tilt = Math.atan2(bhuja, kotiG) / RAD;
  const lit = (1 - Math.cos((moon - sun) * RAD)) / 2;
  const shukla = ((moon - sun) * 60) / 900;
  const cx = 120;
  const cy = 100;
  const r = 44;
  const shapes: Shape[] = [circle(cx, cy, r, { fill: "shadow", opacity: 0.35 })];
  // the bright limb faces the sun (down and to the right, west), rotated by the tilt
  const rot = -tilt;
  const tx = r * (1 - 2 * lit);
  const d = `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${Math.abs(tx).toFixed(1)} ${r} 0 0 ${tx > 0 ? 0 : 1} ${cx} ${cy - r} Z`;
  shapes.push({ k: "path", d, fill: "moon", stroke: "muted", w: 0.6 });
  const hornA = polar(cx, cy, r + 12, 90 + rot);
  const hornB = polar(cx, cy, r + 12, -90 + rot);
  shapes.push(line(hornA.x, hornA.y, hornB.x, hornB.y, { stroke: "accent", w: 1.4, dash: "4 3" }));
    const steps: Step[] = [
    { say: L(lang, "सूर्यास्तमा सूर्य र चन्द्रको क्रान्ति", "Declinations of sun and moon at sunset"), eq: [`${L(lang, "सूर्य", "sun")} ${dms(lang, ds)} · ${L(lang, "चन्द्र", "moon")} ${dms(lang, dm)}`] },
    { say: L(lang, "भुज: चन्द्र सूर्यभन्दा कति उत्तर–दक्षिण (लम्बज्याले भाग) (१०.७–८)", "Bhuja: how far north or south of the sun, divided by the co-latitude sine (10.7–8)"), eq: [`${L(lang, "भुज", "bhuja")} = ${fmt(lang, bhuja, 2)} ${L(lang, "अङ्गुल", "digits")}`] },
    { say: L(lang, "कोटि = १२ अङ्गुलको शङ्कु; कर्ण = √(भुज² + कोटि²) (१०.८)", "Koṭi = the 12-digit gnomon; karṇa = √(bhuja² + koṭi²) (10.8)"), eq: [`√(${fmt(lang, bhuja, 2)}² + ${num(lang, 12)}²) = ${fmt(lang, karna, 2)}`] },
    { say: L(lang, "शुक्ल अङ्गुल = (चन्द्र − सूर्य) कला ÷ ९०० (१०.९)", "Bright digits = (moon − sun) in minutes ÷ 900 (10.9)"), eq: [fr(`${grp(lang, Math.round((moon - sun) * 60))}′`, num(lang, 900)), ` = ${fmt(lang, shukla, 2)} ${L(lang, "अङ्गुल", "digits")}`] },
    { say: L(lang, "चित्र: सूर्यबाट भुज, अनि कोटि, कर्णमा चन्द्रबिम्ब; सिङ कर्णको लम्ब दिशामा (१०.१०–१४)", "Drawing: bhuja from the sun, then koṭi; the disc on the karṇa; horns at right angles to it (10.10–14)"), eq: [`${L(lang, "ढल्काइ", "tilt")} = ${L(lang, "चाप", "atan")}(`, fr(fmt(lang, Math.abs(bhuja), 2), num(lang, 12)), `) = ${dms(lang, Math.abs(tilt))}`] },
  ];
  return { shapes, key: [key("moon", "", L(lang, `औंसीपछि ${fmt(lang, day, 1)} दिनको उज्यालो भाग`, `The lit part, ${day.toFixed(1)} days after new moon`)), key("shadow", "", L(lang, "अँध्यारो भाग", "The dark part")), key("accent", "", L(lang, tilt > 0 ? "सिङ जोड्ने रेखा: उत्तरको सिङ उठेको" : "सिङ जोड्ने रेखा: दक्षिणको सिङ उठेको", tilt > 0 ? "Line of the horns: the northern horn raised" : "Line of the horns: the southern horn raised"), "line")], readout: [`${L(lang, "भोगान्तर", "elongation")} ${dms(lang, moon - sun)} · ${fmt(lang, lit * 100)}%`, `${L(lang, "सिङको ढल्काइ", "horn tilt")} ${dms(lang, Math.abs(tilt))}`], steps };
}

// ---------------------------------------------------------------- 11.9–15 the time of a pāta

function pataTime(t: number, lang: Lang): FigureFrame {
  const base = 0.5; // days around the moment
  const sunAt = (d: number) => 95 + (59.14 / 60) * d;
  const moonAt = (d: number) => 83 + (790.58 / 60) * d;
  const decl = (l: number) => sunDecl(l);
  // vyatīpāta: sun + moon = 180°, declinations equal and opposite in ayana: compare |decl|
  const x0 = 30;
  const w = 300;
  const span = 1.4;
  const X = (d: number) => x0 + ((d + span / 2 - base + 0.5) / span) * w;
  const samples: { d: number; a: number; b: number }[] = [];
  for (let i = 0; i <= 60; i += 1) {
    const d = -span / 2 + base - 0.5 + (i / 60) * span;
    samples.push({ d, a: Math.abs(decl(sunAt(d))), b: Math.abs(decl(moonAt(d))) });
  }
  const lo = Math.min(...samples.map((q) => Math.min(q.a, q.b)));
  const hi = Math.max(...samples.map((q) => Math.max(q.a, q.b)));
  const Y = (v: number) => 170 - ((v - lo) / Math.max(0.01, hi - lo)) * 130;
  const shapes: Shape[] = [text(x0 - 4, Y(hi) + 3, dms(lang, hi), "muted", 8, "end"), text(x0 - 4, Y(lo) + 3, dms(lang, lo), "muted", 8, "end")];
  let ds = "";
  let dm = "";
  let cross = 0;
  let prev: number | null = null;
  samples.forEach((q, i) => {
    ds += `${i ? "L" : "M"} ${X(q.d).toFixed(1)} ${Y(q.a).toFixed(1)} `;
    dm += `${i ? "L" : "M"} ${X(q.d).toFixed(1)} ${Y(q.b).toFixed(1)} `;
    if (prev !== null && prev * (q.a - q.b) <= 0) cross = q.d;
    prev = q.a - q.b;
  });
  shapes.push(path(ds, { stroke: "sun", w: 1.6 }), path(dm, { stroke: "muted", w: 1.6 }));
  shapes.push(line(X(cross), 20, X(cross), 180, { stroke: "accent", dash: "3 3" }), text(X(cross) + 4, 192, L(lang, "सा", "Eq"), "accent", 10.5, "start", true));
  const now = -span / 2 + base - 0.5 + t * span;
  shapes.push(line(X(now), 30, X(now), 170, { stroke: "ink", w: 1 }));
  const half = ((32.4 + 31.6) / 2) * 60 / (59.14 + 790.58);
  const steps: Step[] = [
    { say: L(lang, "चन्द्रको क्रान्ति शरले सुधार्ने; विषम पदमा सूर्यभन्दा बढी भए पात भइसक्यो (११.७–८)", "Correct the moon's declination for latitude; odd quadrant and greater than the sun's: the pāta is past (11.7–8)"), eq: [`${L(lang, "सूर्य", "sun")} ${dms(lang, decl(sunAt(now)))} · ${L(lang, "चन्द्र", "moon")} ${dms(lang, decl(moonAt(now)))}`] },
    { say: L(lang, "क्रान्तिअन्तरलाई गतिले भाग गरी समय, बारम्बार दोहोर्याएर साम्य निकाल्ने (११.९–१३)", "Divide the declination gap by the motions for a time; repeat until equal (11.9–13)"), eq: [`${L(lang, "साम्य", "equality")} ≈ ${fmt(lang, (cross - (base - 0.5)) * 60, 1)} ${L(lang, "घटी", "gh.")}`] },
    { say: L(lang, "स्थित्यर्ध = मानार्धयोग × ६० ÷ गतियोग (११.१४)", "Half-duration = half-sum of discs × 60 ÷ sum of motions (11.14)"), eq: [fr(`${fmt(lang, 32, 1)} × ${num(lang, 60)}`, `${fmt(lang, 59.14, 1)} + ${fmt(lang, 790.58, 1)}`), ` = ${fmt(lang, half, 2)} ${L(lang, "घटी", "gh.")}`] },
    { say: L(lang, "मध्य − स्थित्यर्ध = आरम्भ, मध्य + स्थित्यर्ध = अन्त्य (११.१५)", "Middle − half = start, middle + half = end (11.15)"), eq: [`${L(lang, "पातकाल", "pāta lasts")} ≈ ${fmt(lang, 2 * half, 2)} ${L(lang, "घटी", "gh.")}`] },
  ];
  return { shapes, key: [key("sun", "", L(lang, "सूर्यको क्रान्ति (अंश)", "Sun's declination (degrees)"), "line"), key("muted", "", L(lang, "चन्द्रको क्रान्ति", "Moon's declination"), "line"), key("accent", L(lang, "सा", "Eq"), L(lang, "क्रान्तिसाम्य: पातको मध्य", "Equal declination: the middle of the pāta"), "line"), key("ink", "", L(lang, "कर्सर: इष्ट समय", "Cursor: the chosen time"), "line")], readout: [`${L(lang, "सूर्य + चन्द्र", "sun + moon")} ${dms(lang, wrap(sunAt(now) + moonAt(now)))}`, `${L(lang, "क्रान्ति", "decl.")} ${dms(lang, Math.abs(decl(sunAt(now))))} / ${dms(lang, Math.abs(decl(moonAt(now))))}`], steps };
}

// ---------------------------------------------------------------- 11.20–22 gaṇḍānta and bha-sandhi

function gandanta(t: number, lang: Lang): FigureFrame {
  const moon = wrap(t * 360);
  const cx = 104;
  const cy = 100;
  const R = 80;
  const shapes: Shape[] = [circle(cx, cy, R, { stroke: "muted" }), circle(cx, cy, 4, { fill: "earth" })];
  for (const j of [0, 120, 240]) shapes.push(path(arc(cx, cy, R - 6, j - 200 / 60, j + 200 / 60), { stroke: "accent", w: 10, opacity: 0.6 }));
  for (let i = 0; i < 27; i += 1) {
    const a = (i * 360) / 27;
    const p = polar(cx, cy, R, a);
    const q = polar(cx, cy, R - 4, a);
    shapes.push(line(p.x, p.y, q.x, q.y, { stroke: "faint" }));
  }
  const M = polar(cx, cy, R - 6, moon);
  shapes.push(circle(M.x, M.y, 5.5, { fill: "moon", stroke: "muted", w: 0.6 }), circle(cx, cy, 0.1, { fill: "earth" }));
  for (const [j, ne, en] of [[0, "रे|अ", "Re|Aś"], [120, "आ|म", "Ās|Ma"], [240, "ज्ये|मू", "Jy|Mū"]] as [number, string, string][]) {
    const lp = polar(cx, cy, R + 14, j);
    shapes.push(text(lp.x, lp.y + 4, L(lang, ne, en), "accent", 10.5, "middle", true));
  }
  const nak = Math.floor((moon * 60) / 800);
  const into = (moon * 60) % 800;
  const near = [0, 120, 240].some((j) => Math.abs(((moon - j + 540) % 360) - 180) < 200 / 60);
  const steps: Step[] = [
    { say: L(lang, "नक्षत्र = चन्द्र ÷ ८००′; एक चरण = २००′", "Nakshatra = moon ÷ 800′; one quarter = 200′"), eq: [fr(`${grp(lang, Math.round(moon * 60))}′`, `${num(lang, 800)}′`), ` = ${L(lang, NAKSHATRA27[nak]![0], NAKSHATRA27[nak]![1])}, ${L(lang, "चरण", "quarter")} ${num(lang, Math.floor(into / 200) + 1)}`] },
    { say: L(lang, "आश्लेषा, ज्येष्ठा, रेवतीको चौथो चरण र अर्को नक्षत्रको पहिलो चरण: भसन्धि (११.२१)", "The last quarter of Āśleṣā, Jyeṣṭhā, Revatī and the first of the next: bha-sandhi (11.21)"), eq: [`${num(lang, 120)}°, ${num(lang, 240)}°, ${num(lang, 360)}° ± ${dms(lang, 200 / 60)}`] },
    { say: L(lang, "योग (सूर्य + चन्द्र) ÷ ८००′: १७औँ व्यतीपात, २७औँ वैधृति (११.२०)", "Yoga (sun + moon) ÷ 800′: the 17th is Vyatīpāta, the 27th Vaidhṛti (11.20)"), eq: [`${num(lang, 16)} × ${num(lang, 800)}′ = ${grp(lang, 12800)}′ = ${dms(lang, 12800 / 60)}`] },
    { say: L(lang, "तीन व्यतीपात, तीन गण्डान्त, तीन भसन्धि शुभ काममा वर्जित (११.२२)", "Three vyatīpātas, gaṇḍāntas and bha-sandhis are avoided in good work (11.22)"), eq: [near ? L(lang, "चन्द्र अहिले सन्धिमा", "the moon is in a junction now") : L(lang, "सन्धिबाहिर", "outside the junctions")] },
  ];
  return { shapes, key: [key("accent", "", L(lang, "गण्डान्त / भसन्धि: नक्षत्रको अन्तिम चरण र अर्कोको पहिलो", "Gaṇḍānta / bha-sandhi: last quarter of one nakshatra and first of the next"), "line"), key("accent", L(lang, "रे|अ", "Re|Aś"), L(lang, "रेवती | अश्विनी", "Revatī | Aśvinī")), key("accent", L(lang, "आ|म", "Ās|Ma"), L(lang, "आश्लेषा | मघा", "Āśleṣā | Maghā")), key("accent", L(lang, "ज्ये|मू", "Jy|Mū"), L(lang, "ज्येष्ठा | मूल", "Jyeṣṭhā | Mūla")), key("moon", "", L(lang, "चन्द्र", "Moon"))], readout: [`${L(lang, "चन्द्र", "moon")} ${dms(lang, moon)} · ${L(lang, NAKSHATRA27[nak]![0], NAKSHATRA27[nak]![1])}`, near ? L(lang, "गण्डान्त", "gaṇḍānta") : ""], steps };
}

// ---------------------------------------------------------------- 12.56–69 the zones of the earth

function earthZones(t: number, lang: Lang): FigureFrame {
  const lat = t * 90;
  const yoj = (5059 * lat) / 360;
  const pal = 12 * Math.tan(Math.min(89, lat) * RAD);
  const kj = (TRIJYA * Math.sin(24 * RAD));
  const dyu = Math.sqrt(TRIJYA ** 2 - kj ** 2);
  const cj = Math.min(TRIJYA, (((kj * pal) / 12) * TRIJYA) / dyu);
  const chara = suryaArc(cj);
  const day = Math.min(60, 30 + (2 * chara) / 6);
  const cx = 104;
  const cy = 100;
  const R = 80;
  const shapes: Shape[] = [circle(cx, cy, R, { fill: "earth", opacity: 0.12, stroke: "earth" })];
  for (const [b, tone] of [[24, "sun"], [-24, "sun"], [66, "planet"], [-66, "planet"], [0, "ink"]] as [number, Tone][]) {
    const y = cy - R * Math.sin(b * RAD);
    const x = R * Math.cos(b * RAD);
    shapes.push(line(cx - x, y, cx + x, y, { stroke: tone, w: b === 0 ? 1.2 : 0.8, dash: b === 0 ? undefined : "3 3" }));
  }
  const py = cy - R * Math.sin(lat * RAD);
  const px = cx + R * Math.cos(lat * RAD);
  mark(shapes, { x: px, y: py }, L(lang, "ठा", "P"), 12, 4, "accent", 3.5);
  shapes.push(text(cx, cy - R - 6, L(lang, "मेरु", "Meru"), "muted", 8.5), text(cx, cy + R + 12, L(lang, "बडवामुख", "south pole"), "muted", 8.5));
  const steps: Step[] = [
    { say: L(lang, "भूमध्यरेखाबाट दूरी = परिधि × अंश ÷ ३६० (१२.५९)", "Distance from the equator = girth × degrees ÷ 360 (12.59)"), eq: [fr(`${num(lang, 5059)} × ${dms(lang, lat)}`, num(lang, 360)), ` = ${fmt(lang, yoj, 1)} ${L(lang, "योजन", "yojanas")}`] },
    { say: L(lang, "सूर्य सिधै माथि आउने पट्टी: परिधिको १५औँ भाग (१२.६८–६९)", "The overhead-sun band: a fifteenth of the girth (12.68–69)"), eq: [fr(num(lang, 5059), num(lang, 15)), ` = ${fmt(lang, 5059 / 15, 1)} ${L(lang, "योजन", "yojanas")} ≈ ${num(lang, 24)}°`] },
    { say: L(lang, "चौथाइ परिधिबाट त्यो घटाउँदा: त्यहाँ ग्रीष्ममा सूर्य अस्त हुँदैन (१२.६३–६५)", "A quarter girth less that: there the summer sun never sets (12.63–65)"), eq: [`${fmt(lang, 5059 / 4, 1)} − ${fmt(lang, 5059 / 15, 1)} = ${fmt(lang, 5059 / 4 - 5059 / 15, 1)} ${L(lang, "योजन", "yojanas")}`] },
    { say: L(lang, "यस अक्षांशमा सबैभन्दा लामो दिन (चरखण्डले)", "The longest day at this latitude (by the ascensional difference)"), eq: [`${num(lang, 30)} + `, fr(`${num(lang, 2)} × ${dms(lang, chara)}`, num(lang, 6)), ` = ${fmt(lang, day, 1)} ${L(lang, "घटी", "gh.")}`] },
    { say: L(lang, "मेरुमा छ महिना दिन, छ महिना रात (१२.६७)", "At Meru six months of day, six of night (12.67)"), eq: [lat > 66 ? L(lang, "ग्रीष्ममा सूर्य अस्त हुँदैन", "the summer sun does not set") : L(lang, "हरेक दिन उदयास्त", "it rises and sets daily")] },
  ];
  return { shapes, key: [key("accent", L(lang, "ठा", "P"), L(lang, `ठाउँ: अक्षांश ${dms(lang, lat)}`, `Place: latitude ${dms(lang, lat)}`)), key("ink", "", L(lang, "भूमध्यरेखा", "Equator"), "line"), key("sun", "", L(lang, "२४°: सूर्य सिधै माथि आउने सीमा", "24°: limit of the overhead sun"), "line"), key("planet", "", L(lang, "६६°: ग्रीष्ममा ६० घटीको दिन हुने सीमा", "66°: limit of the 60-ghaṭī summer day"), "line")], readout: [`${L(lang, "अक्षांश", "latitude")} ${dms(lang, lat)} = ${fmt(lang, yoj)} ${L(lang, "योजन", "yojanas")}`, `${L(lang, "सबैभन्दा लामो दिन", "longest day")} ${fmt(lang, day, 1)} ${L(lang, "घटी", "gh.")}`], steps };
}

// ---------------------------------------------------------------- 12.78–79 the lords of hours, days, months and years

const ORDER: [string, string, Tone][] = [
  ["शनि", "Saturn", "muted"],
  ["बृहस्पति", "Jupiter", "sun"],
  ["मङ्गल", "Mars", "accent"],
  ["सूर्य", "Sun", "sun"],
  ["शुक्र", "Venus", "earth"],
  ["बुध", "Mercury", "planet"],
  ["चन्द्र", "Moon", "muted"],
];

function lords(t: number, lang: Lang): FigureFrame {
  const hours = t * 168; // seven days of hours, sweeping smoothly
  const hora = Math.floor(hours);
  const dayIdx = Math.floor(hora / 24);
  const cx = 104;
  const cy = 100;
  const R = 74;
  const pts = ORDER.map((_, i) => polar(cx, cy, R, 90 - (i * 360) / 7));
  const shapes: Shape[] = [];
  // the weekday star: every third step downward
  let d = "";
  for (let i = 0; i <= 7; i += 1) {
    const p = pts[(i * 3) % 7]!;
    d += `${i ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
  }
  shapes.push(path(d, { stroke: "faint", w: 1 }));
  const horaLord = (3 + hora) % 7; // the first hour of the count belongs to the Sun
  // a pointer that sweeps from one hour lord to the next through the hour
  const sweep = 90 - ((3 + hours) % 7) * (360 / 7);
  const tip = polar(cx, cy, R - 12, sweep);
  shapes.push(line(cx, cy, tip.x, tip.y, { stroke: "accent", w: 2 }), circle(cx, cy, 3, { fill: "accent" }));
  const dayLord = (3 + dayIdx * 3) % 7;
  ORDER.forEach(([ne, en, tone], i) => {
    const p = pts[i]!;
    shapes.push(circle(p.x, p.y, i === horaLord ? 9 : 6, { fill: tone, stroke: i === dayLord ? "ink" : undefined, w: 2 }));
    const lab = polar(cx, cy, R + 18, 90 - (i * 360) / 7);
    shapes.push(text(lab.x, lab.y + 4, initial(lang, ne, en), i === dayLord ? "ink" : "muted", 10.5, "middle", true));
  });
  const steps: Step[] = [
    { say: L(lang, "कक्षाको क्रम शनिदेखि तल: शनि, बृहस्पति, मङ्गल, सूर्य, शुक्र, बुध, चन्द्र (१२.३१)", "Orbits from Saturn down: Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon (12.31)"), eq: [L(lang, "होरापति यही क्रममा एकएक घण्टा (१२.७९)", "hour lords follow this order hour by hour (12.79)")] },
    { say: L(lang, "एक दिन = २४ होरा; २४ ÷ ७ को शेष ३ → दिनपति चौथो (१२.७८)", "A day = 24 hours; 24 mod 7 = 3 → the day lord is the fourth (12.78)"), eq: [`${num(lang, 24)} = ${num(lang, 3)} × ${num(lang, 7)} + ${num(lang, 3)}`] },
    { say: L(lang, "एक मास = ३० दिन = ७२० होरा; शेष ६ → मासपति एक माथि (१२.७९)", "A month = 30 days = 720 hours; remainder 6 → the month lord one step up (12.79)"), eq: [`${num(lang, 720)} = ${num(lang, 102)} × ${num(lang, 7)} + ${num(lang, 6)}`] },
    { say: L(lang, "एक वर्ष = ३६० दिन = ८६४० होरा; शेष २ → वर्षपति तेस्रो (१२.७८)", "A year = 360 days = 8640 hours; remainder 2 → the year lord is the third (12.78)"), eq: [`${grp(lang, 8640)} = ${grp(lang, 1234)} × ${num(lang, 7)} + ${num(lang, 2)}`] },
    { say: L(lang, "चित्रको होरा", "The drawing's hour"), eq: [`${L(lang, "होरा", "hour")} ${num(lang, hora + 1)} → ${L(lang, ORDER[horaLord]![0], ORDER[horaLord]![1])} · ${L(lang, "दिनपति", "day lord")} ${L(lang, ORDER[dayLord]![0], ORDER[dayLord]![1])}`] },
  ];
  return { shapes, key: [...ORDER.map(([ne, en, tone]) => key(tone, initial(lang, ne, en), L(lang, ne, en))), key("ink", "", L(lang, "ठूलो थोप्लो: होराधिपति; कालो घेरा: दिनपति; रेखा: वारको क्रम", "Large dot: lord of the hour; black ring: lord of the day; lines: the weekday order"), "line")], readout: [`${L(lang, "दिन", "day")} ${num(lang, dayIdx + 1)} · ${L(lang, "होरा", "hour")} ${num(lang, (hora % 24) + 1)}`, `${L(lang, "दिनपति", "day lord")} ${L(lang, ORDER[dayLord]![0], ORDER[dayLord]![1])}`], steps };
}

// ---------------------------------------------------------------- 12.82–85 motions and distances of the orbits

const ORBITS: [string, string, number][] = [
  ["चन्द्र", "Moon", 324000],
  ["बुध", "Mercury", 1043209],
  ["शुक्र", "Venus", 2664637],
  ["सूर्य", "Sun", 4331500],
  ["मङ्गल", "Mars", 8146909],
  ["बृहस्पति", "Jupiter", 51375764],
  ["शनि", "Saturn", 127668255],
];

function orbitDistance(t: number, lang: Lang): FigureFrame {
  const u = t * 7;
  const i = Math.min(6, Math.floor(u));
  const f = u - Math.floor(u);
  const ease = i < 6 && f > 0.7 ? 0.5 - 0.5 * Math.cos(((f - 0.7) / 0.3) * Math.PI) : 0;
  const [ne, en, orb] = ORBITS[i]!;
  const daily = (324000 * 57753336) / CIVIL;
  const kala = (daily * 21600) / orb;
  const diam = (orb * 1600) / 5059;
  const dist = (diam - 1600) / 2;
  const cx = 104;
  const cy = 100;
  const shapes: Shape[] = [];
  ORBITS.forEach(([n2, e2], j) => {
    const r = 12 + j * 12;
    shapes.push(circle(cx, cy, r, { stroke: "faint", w: 1 }));
    const lab = polar(cx, cy, r, 135);
    shapes.push(text(lab.x - 3, lab.y + 4, initial(lang, n2, e2), j === i ? "accent" : "muted", 10.5, "end", j === i));
  });
  // the highlight slides out to the next orbit
  const hr = 12 + (i + ease) * 12;
  shapes.push(circle(cx, cy, hr, { stroke: "accent", w: 2.4 }));
  shapes.push(circle(cx, cy, 4, { fill: "earth" }));
  const steps: Step[] = [
    { say: L(lang, "सबै ग्रह दिनमा बराबर योजन हिँड्छन् (१२.८२)", "Every planet travels the same yojanas a day (12.82)"), eq: [`${fmt(lang, daily, 1)} ${L(lang, "योजन", "yojanas")}`] },
    { say: L(lang, `${ne}को दैनिक गति कलामा = योजन × २१६०० ÷ कक्षा (१२.८३)`, `${en}'s daily motion in minutes = yojanas × 21600 ÷ orbit (12.83)`), eq: [fr(`${fmt(lang, daily, 1)} × ${grp(lang, 21600)}`, grp(lang, orb)), ` = ${fmt(lang, kala, 2)}′`] },
    { say: L(lang, "कक्षाको व्यास = कक्षा × १६०० ÷ ५०५९ (१२.८४)", "Orbit's diameter = orbit × 1600 ÷ 5059 (12.84)"), eq: [fr(`${grp(lang, orb)} × ${num(lang, 1600)}`, num(lang, 5059)), ` = ${grp(lang, diam)}`] },
    { say: L(lang, "पृथ्वीको सतहबाट दूरी = (व्यास − १६००) ÷ २ (१२.८५)", "Distance from the earth's surface = (diameter − 1600) ÷ 2 (12.85)"), eq: [fr(`${grp(lang, diam)} − ${num(lang, 1600)}`, num(lang, 2)), ` = ${grp(lang, dist)} ${L(lang, "योजन", "yojanas")}`] },
  ];
  return { shapes, key: [key("earth", "", L(lang, "पृथ्वी (केन्द्रमा)", "Earth, at the centre")), key("accent", initial(lang, ne, en), L(lang, `${ne}को कक्षा`, `${en}'s orbit`), "ring"), key("muted", "", L(lang, "भित्रबाट: चन्द्र, बुध, शुक्र, सूर्य, मङ्गल, बृहस्पति, शनि", "From inside: Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn"), "ring")], readout: [`${L(lang, ne, en)}: ${grp(lang, orb)} ${L(lang, "योजन", "yojanas")}`, `${L(lang, "दैनिक गति", "daily motion")} ${fmt(lang, kala, 2)}′ · ${L(lang, "दूरी", "distance")} ${grp(lang, dist)}`], steps };
}

// ---------------------------------------------------------------- 13.7–9 the diurnal circles of the armillary sphere

function diurnalCircles(t: number, lang: Lang): FigureFrame {
  // one loop is one year: the sun's longitude goes round once, and the sky turns it round its
  // day circle six times so the daily motion shows too
  const lon = wrap(t * 360);
  const kj = (suryaJya(lon) * 1397) / TRIJYA;
  const dec = suryaArc(kj);
  const dyu = Math.sqrt(TRIJYA ** 2 - kj ** 2);
  const cx = 150;
  const cy = 100;
  const R = 80;
  const tilt = 18 * RAD; // seen a little from above the equator
  const ring = (d: number) => ({ y: cy - R * Math.sin(d * RAD) * Math.cos(tilt), rx: R * Math.cos(d * RAD), ry: R * Math.cos(d * RAD) * Math.sin(tilt) });
  const half = (d: number, front: boolean) => {
    const r = ring(d);
    // front half: the lower arc of the ellipse; back half: the upper arc
    return `M ${(cx - r.rx).toFixed(1)} ${r.y.toFixed(1)} A ${r.rx.toFixed(1)} ${Math.max(0.1, r.ry).toFixed(1)} 0 0 ${front ? 0 : 1} ${(cx + r.rx).toFixed(1)} ${r.y.toFixed(1)}`;
  };
  const shapes: Shape[] = [circle(cx, cy, R, { stroke: "muted", w: 1.2 }), line(cx, cy - R - 10, cx, cy + R + 10, { stroke: "muted", w: 1, dash: "3 3" })];
  shapes.push(text(cx, cy - R - 14, L(lang, "उ", "N"), "muted", 10.5, "middle", true), text(cx, cy + R + 24, L(lang, "द", "S"), "muted", 10.5, "middle", true));
  // the fixed circles at the ends of the signs (13.7–8): faint
  for (const end of [30, 60, 90]) {
    const d = sunDecl(end);
    for (const sgn of [1, -1]) {
      shapes.push(path(half(sgn * d, false), { stroke: "faint", w: 0.8, dash: "2 3" }), path(half(sgn * d, true), { stroke: "faint", w: 1 }));
    }
  }
  // the equator
  shapes.push(path(half(0, false), { stroke: "earth", w: 1, dash: "3 3" }), path(half(0, true), { stroke: "earth", w: 1.6 }));
  // the sun's own day circle today, gliding north and south through the year
  shapes.push(path(half(dec, false), { stroke: "accent", w: 1.2, dash: "3 3" }), path(half(dec, true), { stroke: "accent", w: 2.4 }));
  const r = ring(dec);
  const spin = t * 360 * 6;
  const sx = cx + r.rx * Math.cos(spin * RAD);
  const sy = r.y + r.ry * Math.sin(spin * RAD);
  const front = Math.sin(spin * RAD) >= 0;
  shapes.push(circle(sx, sy, 6, { fill: "sun", opacity: front ? 1 : 0.45 }));
  shapes.push(text(cx + r.rx + 8, r.y + 4, `${dec >= 0 ? "+" : "−"}${dms(lang, Math.abs(dec))}`, "accent", 10.5, "start", true));
  shapes.push(text(cx - R - 8, cy + 4, L(lang, "वि", "Eq"), "earth", 10.5, "end", true));
  const sign = Math.floor(lon / 30);
  const steps: Step[] = [
    { say: L(lang, "सूर्यको भोग र क्रान्तिज्या (२.२८)", "The sun's longitude and declination sine (2.28)"), eq: [`${dms(lang, lon)} (${L(lang, RASHI[sign]![0], RASHI[sign]![1])}) → `, fr(`${fmt(lang, suryaJya(lon))} × ${num(lang, 1397)}`, num(lang, TRIJYA)), ` = ${fmt(lang, kj)} → ${dms(lang, dec)}`] },
    { say: L(lang, "अहोरात्रवृत्तको अर्धव्यास = द्युज्या = √(त्रिज्या² − क्रान्तिज्या²)", "Radius of the day circle = √(R² − decl. sine²)"), eq: [`√(${num(lang, TRIJYA)}² − ${fmt(lang, Math.abs(kj))}²) = ${fmt(lang, dyu)}`] },
    { say: L(lang, "मेष, वृष, मिथुनको अन्त्यका वृत्त; कर्क, सिंह, कन्याका पनि तिनै (१३.७)", "Circles at the ends of Aries, Taurus, Gemini; Cancer, Leo, Virgo share them (13.7)"), eq: [`${dms(lang, sunDecl(30))}, ${dms(lang, sunDecl(60))}, ${dms(lang, sunDecl(90))}`] },
    { say: L(lang, "दक्षिणका राशिका वृत्त विषुवभन्दा त्यति नै दक्षिण (१३.८)", "The southern signs' circles lie as far south (13.8)"), eq: [`± ${dms(lang, sunDecl(90))} ${L(lang, "सम्म", "at most")}`] },
    { say: L(lang, "सप्तर्षि, अगस्त्य, ब्रह्महृदय आदि ताराका पनि आफ्नो क्रान्तिअनुसार वृत्त (१३.९)", "The Seven Sages, Agastya, Brahmahṛdaya and others get circles by their declinations (13.9)"), eq: [L(lang, "अर्धव्यास = द्युज्या", "radius = day-radius")] },
  ];
  return {
    shapes,
    key: [
      key("sun", "", L(lang, "सूर्य: आकाशसँगै आफ्नो अहोरात्रवृत्तमा घुम्छ (धमिलो = पछाडिपट्टि)", "The sun, carried round its day circle by the sky (faded = far side)")),
      key("accent", "", L(lang, "आजको अहोरात्रवृत्त: वर्षभरि उत्तर–दक्षिण सर्छ", "Today's day circle: it slides north and south through the year"), "line"),
      key("earth", L(lang, "वि", "Eq"), L(lang, "विषुव", "Equator"), "line"),
      key("faint", "", L(lang, "राशि–अन्त्यका स्थिर वृत्त (मेष, वृष, मिथुन र दक्षिणतिर)", "Fixed circles at the sign ends, north and south"), "line"),
      key("muted", L(lang, "उ–द", "N–S"), L(lang, "ध्रुव–अक्ष; गोल अलि माथिबाट हेरेको", "Polar axis; the sphere seen a little from above"), "line"),
    ],
    readout: [`${L(lang, "सूर्य", "sun")} ${dms(lang, lon)} · ${L(lang, "क्रान्ति", "decl.")} ${dms(lang, dec)}`, `${L(lang, "द्युज्या", "day-radius")} ${fmt(lang, dyu)}`],
    steps,
  };
}

// ---------------------------------------------------------------- 13.23 the water clock

function waterClock(t: number, lang: Lang): FigureFrame {
  // one loop is one ghaṭī; the last frame (bowl full, on the floor) is the first frame,
  // so the loop repeats without a jump
  const smooth = (x: number) => 0.5 - 0.5 * Math.cos(Math.max(0, Math.min(1, x)) * Math.PI);
  const pala = t * 60;
  const vx0 = 20;
  const vx1 = 200;
  const surface = 70; // water line in the big vessel
  const floor = 172;
  const bw = 86; // bowl width
  const bh = 32; // bowl depth
  const cx = (vx0 + vx1) / 2;
  let rimY: number; // where the bowl's rim is
  let inner: number; // how full the bowl is, 0..1
  if (t < 0.14) {
    // lifted from the floor to the surface, emptied on the way
    const u = smooth(t / 0.14);
    rimY = floor - bh - u * (floor - bh - (surface - 8));
    inner = 1 - u;
  } else if (t < 0.86) {
    // floating: water seeps in through the hole and the bowl rides lower
    const u = (t - 0.14) / 0.72;
    inner = u;
    rimY = surface - 8 + u * 8;
  } else {
    // full: it slips under and sinks to the floor
    const u = smooth((t - 0.86) / 0.14);
    inner = 1;
    rimY = surface + u * (floor - bh - surface);
  }
  const shapes: Shape[] = [];
  // the big vessel and its water
  shapes.push(path(`M ${vx0} ${surface} H ${vx1} V ${floor + 4} H ${vx0} Z`, { fill: "earth", opacity: 0.16 }));
  shapes.push(path(`M ${vx0} 40 V ${floor + 4} H ${vx1} V 40`, { stroke: "muted", w: 2 }));
  shapes.push(line(vx0, surface, vx1, surface, { stroke: "earth", w: 1, dash: "4 3" }));
  // the bowl: a half-ellipse below its rim
  const bowl = `M ${cx - bw / 2} ${rimY.toFixed(1)} A ${bw / 2} ${bh} 0 0 0 ${cx + bw / 2} ${rimY.toFixed(1)} Z`;
  shapes.push(path(bowl, { fill: "sun", opacity: 0.85, stroke: "ink", w: 1.2 }));
  // the water inside, rising from the bottom of the bowl
  if (inner > 0.02) {
    const depth = bh * inner;
    const wy = rimY + bh - depth;
    const half = (bw / 2) * Math.sqrt(Math.max(0, 1 - ((wy - rimY) / bh) ** 2));
    shapes.push(path(`M ${(cx - half).toFixed(1)} ${wy.toFixed(1)} A ${bw / 2} ${bh} 0 0 0 ${(cx + half).toFixed(1)} ${wy.toFixed(1)} Z`, { fill: "earth", opacity: 0.55 }));
  }
  // drops rising into the hole while it floats
  if (t > 0.14 && t < 0.86) {
    for (let k = 0; k < 3; k += 1) {
      const ph = (t * 40 + k / 3) % 1;
      shapes.push(circle(cx, rimY + bh + 10 - ph * 10, 1.6, { fill: "earth" }));
    }
  }
  shapes.push(text(cx, rimY + bh + 22, L(lang, "क", "B"), "ink", 10.5, "middle", true));
  // the pala dial: one turn per ghaṭī
  const dx = 280;
  const dy = 106;
  const dr = 52;
  shapes.push(circle(dx, dy, dr, { stroke: "muted", w: 1.2 }));
  for (let p2 = 0; p2 < 60; p2 += 5) {
    const o = polar(dx, dy, dr, 90 - p2 * 6);
    const i2 = polar(dx, dy, dr - (p2 % 15 === 0 ? 9 : 5), 90 - p2 * 6);
    shapes.push(line(o.x, o.y, i2.x, i2.y, { stroke: "muted", w: 1 }));
  }
  for (const [p2, ox, oy] of [[0, 0, -dr - 8], [15, dr + 10, 4], [30, 0, dr + 16], [45, -dr - 10, 4]] as [number, number, number][]) shapes.push(text(dx + ox, dy + oy, num(lang, p2), "muted", 10.5));
  const hand = polar(dx, dy, dr - 8, 90 - pala * 6);
  shapes.push(line(dx, dy, hand.x, hand.y, { stroke: "accent", w: 2.4 }), circle(dx, dy, 3, { fill: "accent" }));
  const steps: Step[] = [
    { say: L(lang, "तामाको कटौरा, फेदमा सानो प्वाल, ठूलो भाँडोको सफा पानीमा राख्ने (१३.२३)", "A copper bowl with a small hole in its base, set on clear water in a large vessel (13.23)"), eq: [L(lang, "प्वालबाट पानी पस्छ, कटौरा बिस्तारै डुब्छ", "water enters by the hole; the bowl slowly sinks")] },
    { say: L(lang, "अहोरात्रमा ६० पटक डुब्ने गरी प्वाल मिलाउने", "Size the hole so it sinks sixty times a day"), eq: [`${num(lang, 60)} ${L(lang, "पटक", "times")} = ${num(lang, 60)} ${L(lang, "घटी", "ghaṭī")}`] },
    { say: L(lang, "एक डुबाइ = एक घटी = ६० पल", "One sinking = one ghaṭī = 60 pala"), eq: [fr(`${num(lang, 24)} × ${num(lang, 60)} ${L(lang, "मिनेट", "min")}`, num(lang, 60)), ` = ${num(lang, 24)} ${L(lang, "मिनेट", "minutes")} = ${num(lang, 360)} ${L(lang, "असु", "asus")}`] },
    { say: L(lang, "चित्रको क्षण", "The drawing's moment"), eq: [`${fmt(lang, pala, 1)} ${L(lang, "पल", "pala")} = ${fmt(lang, pala * 24, 0)} ${L(lang, "सेकेन्ड", "seconds")}`] },
    { say: L(lang, "दिउँसो घाम लागेको बेला १२ अङ्गुलको नरयन्त्र (शङ्कु) पनि (१३.२४)", "In clear daylight the 12-digit gnomon (nara) serves too (13.24)"), eq: [L(lang, "छायाबाट समय: ३.३४–३९", "time from the shadow: 3.34–39")] },
  ];
  return {
    shapes,
    key: [
      key("sun", L(lang, "क", "B"), L(lang, "तामाको कटौरा, फेदमा प्वाल", "The copper bowl, a hole in its base")),
      key("earth", "", L(lang, "ठूलो भाँडोको पानी; प्वालबाट कटौरामा पस्दै", "Water in the big vessel, seeping into the bowl")),
      key("accent", "", L(lang, "पल घडी: कटौरा एक पटक डुब्दा सुई एक फन्को (६० पल = १ घटी)", "Pala dial: one turn while the bowl sinks once (60 pala = 1 ghaṭī)"), "line"),
    ],
    readout: [`${fmt(lang, pala, 1)} ${L(lang, "पल", "pala")}`, t < 0.14 ? L(lang, "कटौरा उठाएर खाली गर्दै", "lifting and emptying the bowl") : t < 0.86 ? L(lang, "पानी पस्दै, कटौरा बिस्तारै डुब्दै", "filling, riding lower") : L(lang, "भरियो: डुब्दै", "full: sinking")],
    steps,
  };
}

// ---------------------------------------------------------------- 14.3–10 the 86-day gates and the saṅkrāntis

function shadashiti(t: number, lang: Lang): FigureFrame {
  const sun = wrap(180 + t * 360);
  const cx = 104;
  const cy = 100;
  const R = 78;
  const shapes: Shape[] = [circle(cx, cy, R, { stroke: "muted" }), circle(cx, cy, 4, { fill: "earth" })];
  for (let i = 0; i < 12; i += 1) {
    const a = polar(cx, cy, R, i * 30);
    const b = polar(cx, cy, R - 6, i * 30);
    shapes.push(line(a.x, a.y, b.x, b.y, { stroke: "faint" }));
    const lab = polar(cx, cy, R - 16, i * 30 + 15);
    shapes.push(text(lab.x, lab.y + 4, num(lang, i + 1), "muted", 10.5));
  }
  const gates = [266, 352, 78, 164];
  for (const g of gates) {
    const p = polar(cx, cy, R + 6, g);
    shapes.push(circle(p.x, p.y, 4, { fill: "accent" }));
  }
  for (const [g, tone] of [[0, "earth"], [180, "earth"], [90, "sun"], [270, "sun"]] as [number, Tone][]) {
    const p = polar(cx, cy, R + 6, g);
    shapes.push(circle(p.x, p.y, 3.5, { fill: tone }));
  }
  const S = polar(cx, cy, R - 30, sun);
  shapes.push(line(cx, cy, S.x, S.y, { stroke: "sun" }), circle(S.x, S.y, 6, { fill: "sun" }), text(S.x + 9, S.y + 4, L(lang, "सू", "Su"), "sun", 10.5, "start", true));
  const fromLibra = wrap(sun - 180);
  const steps: Step[] = [
    { say: L(lang, "तुलादेखि हरेक ८६ अंश (दिन) मा षडशीतिमुख (१४.४–५)", "From Libra, every 86 degrees (days) a gate (14.4–5)"), eq: [`${num(lang, 180)} + ${num(lang, 86)} = ${num(lang, 266)}° (${L(lang, "धनु", "Sag.")} ${num(lang, 26)}°), ${num(lang, 352)}°, ${num(lang, 78)}°, ${num(lang, 164)}°`] },
    { say: L(lang, "चारवटा: धनु, मीन, मिथुन, कन्यामा; कन्यामा १६ दिन बाँकी (१४.५–६)", "Four of them, in Sagittarius, Pisces, Gemini, Virgo; 16 days left in Virgo (14.5–6)"), eq: [`${num(lang, 4)} × ${num(lang, 86)} = ${num(lang, 344)} · ${num(lang, 360)} − ${num(lang, 344)} = ${num(lang, 16)}`] },
    { say: L(lang, "मकर संक्रान्तिदेखि उत्तरायण, कर्कदेखि दक्षिणायन; दुई राशिको एक ऋतु (१४.९–१०)", "Northern course from Capricorn, southern from Cancer; one season to two signs (14.9–10)"), eq: [`${L(lang, "सूर्य", "sun")} ${dms(lang, sun)} → ${sun >= 270 || sun < 90 ? L(lang, "उत्तरायण", "uttarāyaṇa") : L(lang, "दक्षिणायन", "dakṣiṇāyana")}`] },
    { say: L(lang, "तुलादेखि सूर्य कति अगाडि?", "How far past Libra?"), eq: [`${dms(lang, fromLibra)} → ${L(lang, "अर्को मुख", "next gate")} ${dms(lang, 86 - (fromLibra % 86))} ${L(lang, "पछि", "on")}`] },
  ];
  return { shapes, key: [key("sun", L(lang, "सू", "Su"), L(lang, "सूर्य", "Sun")), key("accent", "", L(lang, "षडशीतिमुख: तुलादेखि हरेक ८६°", "86-day gates: every 86° from Libra")), key("earth", "", L(lang, "विषुव: मेष ० र तुला ०", "Equinoxes: Aries 0 and Libra 0")), key("sun", "", L(lang, "अयन: कर्क ० र मकर ०", "Solstices: Cancer 0 and Capricorn 0"), "ring"), key("muted", "", L(lang, "अंक: राशि (१ मेष … १२ मीन)", "Numbers: the signs (1 Aries … 12 Pisces)"), "line")], readout: [`${L(lang, "सूर्य", "sun")} ${dms(lang, sun)}`, `${L(lang, "तुलादेखि", "from Libra")} ${dms(lang, fromLibra)}`], steps };
}

// ---------------------------------------------------------------- 14.11 the saṅkrānti window

function sankrantiPunya(t: number, lang: Lang): FigureFrame {
  const disc = 32.4;
  const motion = 59.14;
  const total = (disc * 60) / motion; // ghaṭīs for the disc to cross the boundary
  const half = total / 2;
  const at = (t * 2 - 1) * 30; // ghaṭīs from the moment
  const x0 = 30;
  const w = 300;
  const X = (g: number) => x0 + ((g + 30) / 60) * w;
  const shapes: Shape[] = [line(x0, 110, x0 + w, 110, { stroke: "muted" }), line(X(0), 60, X(0), 150, { stroke: "ink", w: 1.4 }), text(X(0), 54, L(lang, "क्ष", "S"), "ink", 10.5, "middle", true)];
  shapes.push(path(`M ${X(-half)} 100 H ${X(half)} v 20 H ${X(-half)} Z`, { fill: "accent", opacity: 0.35 }));
  for (let g = -30; g <= 30; g += 10) shapes.push(text(X(g), 136, num(lang, g), "muted", 8));
  shapes.push(circle(X(at), 110, 9, { fill: "sun" }));
  const steps: Step[] = [
    { say: L(lang, "सूर्यबिम्ब कला × ६० ÷ सूर्यगति = बिम्ब पार हुन लाग्ने घटी (१४.११)", "Sun's disc in minutes × 60 ÷ its motion = ghaṭīs for the disc to cross (14.11)"), eq: [fr(`${fmt(lang, disc, 1)} × ${num(lang, 60)}`, fmt(lang, motion, 2)), ` = ${fmt(lang, total, 1)} ${L(lang, "घटी", "gh.")}`] },
    { say: L(lang, "त्यसको आधा क्षणअघि र आधा पछि पुण्यकाल (१४.११)", "Half before and half after the moment is the merit window (14.11)"), eq: [`± ${fmt(lang, half, 1)} ${L(lang, "घटी", "gh.")} = ± ${fmt(lang, (half * 24) / 60, 1)} ${L(lang, "घण्टा", "hours")}`] },
    { say: L(lang, "चित्रको क्षण", "The drawing's moment"), eq: [`${fmt(lang, at, 1)} ${L(lang, "घटी", "gh.")} → ${Math.abs(at) <= half ? L(lang, "पुण्यकालभित्र", "inside the window") : L(lang, "बाहिर", "outside")}`] },
  ];
  return { shapes, key: [key("ink", L(lang, "क्ष", "S"), L(lang, "संक्रान्ति क्षण (सूर्यको केन्द्र राशिरेखामा)", "The saṅkrānti moment, the sun's centre on the boundary"), "line"), key("accent", "", L(lang, "पुण्यकाल: बिम्ब राशिरेखा पार गर्दासम्म", "Merit window: while the disc crosses the boundary")), key("sun", "", L(lang, "सूर्यबिम्ब; अंक: घटी", "The sun's disc; numbers: ghaṭīs"))], readout: [`${fmt(lang, at, 1)} ${L(lang, "घटी", "gh.")}`, Math.abs(at) <= half ? L(lang, "पुण्यकाल", "merit window") : ""], steps };
}

export const MORE_D = {
  "nakshatra-yuti": { chapter: 8, verse: 13, title: ["नक्षत्र–ग्रह युति र रोहिणी शकट", "Planet meets star: Rohiṇī's cart"], caption: ["दक्षिण शर २° भन्दा बढी भएको ग्रह वृष १७° मा रोहिणीको शकट भेद्छ।", "A planet more than 2° south at Taurus 17° pierces Rohiṇī's cart."], seconds: 24, still: 0.45, draw: nakshatraYuti },
  "kalamsha-calc": { chapter: 9, verse: 5, title: ["कालांश: अस्त र उदयको गणित", "Time-degrees: the arithmetic of setting"], caption: ["भोगान्तरलाई उदयासुले कालांशमा बदलेर ग्रहको सीमासँग तुलना।", "Turn the gap into time-degrees by rising times, then compare with the planet's limit."], seconds: 24, still: 0.1, draw: kalamshaCalc },
  "moon-setting": { chapter: 10, verse: 1, title: ["सूर्यास्तपछि चन्द्र", "The moon after sunset"], caption: ["औंसीपछि चन्द्र सूर्यबाट १२ कालांश टाढिएपछि पश्चिममा देखिन्छ।", "After new moon the moon shows in the west once 12 time-degrees from the sun."], seconds: 24, still: 0.3, draw: moonSetting },
  shringonnati: { chapter: 10, verse: 7, title: ["शृङ्गोन्नति: चन्द्रका सिङ", "Śṛṅgonnati: the moon's horns"], caption: ["भुज, कोटि र कर्णले कुन सिङ माथि उठ्छ भन्ने देखाउँछ।", "Bhuja, koṭi and karṇa show which horn is raised."], seconds: 24, still: 0.3, draw: shringonnati },
  "pata-time": { chapter: 11, verse: 9, title: ["पातको समय", "The time of a pāta"], caption: ["सूर्य र चन्द्रको क्रान्ति बराबर हुने क्षण र त्यसको अवधि।", "The moment the sun's and moon's declinations are equal, and how long it lasts."], seconds: 24, still: 0.5, draw: pataTime },
  gandanta: { chapter: 11, verse: 20, title: ["गण्डान्त र भसन्धि", "Gaṇḍānta and bha-sandhi"], caption: ["जल र अग्नि राशिका सन्धिमा पर्ने नक्षत्र–चरणहरू।", "The nakshatra quarters at the three junctions."], seconds: 30, still: 0.33, draw: gandanta },
  "earth-zones": { chapter: 12, verse: 56, title: ["पृथ्वीका पट्टी र दिनको लम्बाइ", "The earth's zones and day length"], caption: ["भूमध्यरेखा, कर्क–मकर रेखा र ध्रुवीय वृत्त योजनमा।", "Equator, tropics and polar circles in yojanas."], seconds: 24, still: 0.31, draw: earthZones },
  lords: { chapter: 12, verse: 78, title: ["होरा, वार, मास, वर्षका अधिपति", "Lords of hours, days, months and years"], caption: ["कक्षाक्रममा होरापति; हरेक २४ होरामा दिनपति तीन घर सर्छ।", "Hour lords in orbit order; every 24 hours the day lord moves three places."], seconds: 140, still: 0.02, draw: lords },
  "orbit-distance": { chapter: 12, verse: 82, title: ["कक्षाको गति र दूरी", "Motions and distances of the orbits"], caption: ["बराबर योजन, फरक कक्षा: त्यसैले फरक कला गति।", "Equal yojanas, different orbits: so different motions in minutes."], seconds: 42, still: 0.5, draw: orbitDistance },
  "diurnal-circles": { chapter: 13, verse: 7, title: ["गोलयन्त्रका अहोरात्रवृत्त", "The diurnal circles of the sphere"], caption: ["राशिका अन्त्यमा क्रान्तिअनुसार विषुवसँग समानान्तर वृत्त।", "Circles parallel to the equator at each sign end's declination."], seconds: 36, still: 0.22, draw: diurnalCircles },
  "water-clock": { chapter: 13, verse: 23, title: ["जलघटी", "The water clock"], caption: ["प्वाल भएको कटौरा दिनमा ६० पटक डुब्छ: एक डुबाइ एक घटी।", "A bowl with a hole sinks sixty times a day: once a ghaṭī."], seconds: 24, still: 0.5, draw: waterClock },
  shadashiti: { chapter: 14, verse: 3, title: ["षडशीतिमुख, अयन र विषुव", "The 86-day gates, solstices and equinoxes"], caption: ["तुलादेखि ८६–८६ अंशमा चार मुख; मकर र कर्कबाट अयन।", "Four gates 86° apart from Libra; the courses from Capricorn and Cancer."], seconds: 30, still: 0.24, draw: shadashiti },
  "sankranti-punya": { chapter: 14, verse: 11, title: ["संक्रान्तिको पुण्यकाल", "The saṅkrānti window"], caption: ["सूर्यबिम्ब राशिरेखा पार गर्दासम्म पुण्यकाल।", "The merit window lasts while the sun's disc crosses the boundary."], seconds: 20, still: 0.5, draw: sankrantiPunya },
} satisfies Record<string, FigureDef>;
