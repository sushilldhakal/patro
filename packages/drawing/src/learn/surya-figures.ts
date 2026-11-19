/**
 * Moving diagrams for the Surya Siddhanta reader. copy-ok-file
 *
 * Each figure is a pure function of time t (0..1, one loop) that returns
 * plain shapes and a few lines of live numbers. The website and the app draw
 * the same shapes, so a figure is written once. Every number comes from the
 * text: the revolutions of chapter 1, the sine table and epicycles of
 * chapter 2, the shadow of chapter 3, the disc sizes of chapter 4, the
 * nakshatra table of chapter 8, the orbits of chapter 12.
 *
 * The drawing box is 360 × 200.
 */
import { udayasta } from "./surya-figure";
import { CLASSICAL_DRAW } from "./surya-classical";
import { GANITA } from "./surya-ganita";
import { MORE, type MoreKey } from "./surya-more";
import {
  arc,
  circle,
  DEV,
  dms,
  fmt,
  H,
  L,
  line,
  num,
  path,
  polar,
  RAD,
  SURYA_SINES,
  suryaArc,
  suryaJya,
  text,
  tri,
  TRIJYA,
  W,
  wrap,
  type FigureFrame,
  type Lang,
  type Shape,
  type Tone,
} from "./surya-kit";

export { SURYA_SINES, suryaJya } from "./surya-kit";
export type { FigureFrame, Lang, MathPart, Shape, Step, Tone } from "./surya-kit";


export type FigureKey =
  | "time-units"
  | "yuga"
  | "mean-motion"
  | "earth-size"
  | "sine-table"
  | "declination"
  | "manda"
  | "sighra"
  | "day-length"
  | "gnomon"
  | "lunar-eclipse"
  | "parallax"
  | "solar-eclipse"
  | "projection"
  | "conjunction"
  | "nakshatra"
  | "udayasta"
  | "moon-phase"
  | "pata"
  | "bhugola"
  | "kaksha"
  | "armillary"
  | "measures"
  | "kalpa"
  | "ahargana"
  | "deshantara"
  | "sighra-construction"
  | "sighra-inferior"
  | "sighra-superior"
  | MoreKey;

type Meta = { title: [string, string]; caption: [string, string]; seconds: number; still: number };

/** [Nepali, English] pairs. */
const META: Record<Exclude<FigureKey, keyof typeof CLASSICAL_DRAW | MoreKey>, Meta> = {
  "time-units": {
    title: ["कालका एकाइ", "Units of time"],
    caption: ["६ प्राण = १ पल, ६० पल = १ घटी, ६० घटी = १ नाक्षत्र अहोरात्र।", "6 prāṇas make a pala, 60 palas a ghaṭī, 60 ghaṭīs a sidereal day."],
    seconds: 30,
    still: 0.37,
  },
  yuga: {
    title: ["महायुगको भाग", "The parts of a mahāyuga"],
    caption: ["कृत ४, त्रेता ३, द्वापर २, कलि १ भाग। हरेक युगका दुवैतिर छैटौँ भागको सन्धि।", "Kṛta 4, Tretā 3, Dvāpara 2, Kali 1 part. A sixth of each age is its twilight, half at each end."],
    seconds: 24,
    still: 0.93,
  },
  "mean-motion": {
    title: ["मध्यम गति", "Mean motion"],
    caption: ["महायुगका भगण अनुसार ग्रहको गति। चन्द्र सबैभन्दा छिटो, शनि सबैभन्दा ढिलो।", "Each planet moves by its revolutions in a mahāyuga. The moon is fastest, Saturn slowest."],
    seconds: 36,
    still: 0.3,
  },
  "earth-size": {
    title: ["पृथ्वीको परिधि", "The earth's circumference"],
    caption: ["व्यास १६०० योजन। परिधि = √(१० × १६००²) ≈ ५०५९। अक्षांशमा लम्बज्याले घट्छ।", "Diameter 1600 yojanas. Circumference = √(10 × 1600²) ≈ 5059, less by the cosine of latitude."],
    seconds: 16,
    still: 0.35,
  },
  "sine-table": {
    title: ["ज्यापिण्ड", "The sine table"],
    caption: ["त्रिज्या ३४३८ कला। चौथाइ वृत्तलाई २२५ कलाका २४ भागमा बाँडेर ज्या।", "Radius 3438′. The quadrant is cut into 24 arcs of 225′, each with its sine."],
    seconds: 24,
    still: 0.5,
  },
  declination: {
    title: ["क्रान्ति", "Declination"],
    caption: ["क्रान्तिज्या = भुजज्या × १३९७ ÷ ३४३८। परम क्रान्ति २४°।", "Sine of declination = sine of longitude × 1397 ÷ 3438. Greatest declination 24°."],
    seconds: 20,
    still: 0.18,
  },
  manda: {
    title: ["मन्दफल", "The equation of the centre"],
    caption: ["मन्दोच्चको वृत्त (सूर्यको परिधि १४°) ले मध्यम ग्रहलाई स्पष्ट स्थानमा सार्छ।", "The manda epicycle (14° for the sun) moves the mean planet to its true place."],
    seconds: 18,
    still: 0.18,
  },
  sighra: {
    title: ["शीघ्रफल र वक्रगति", "Śīghra equation and retrograde motion"],
    caption: ["मङ्गलको शीघ्र परिधि २३५°। शीघ्रोच्च नजिक आउँदा ग्रह वक्री देखिन्छ।", "Mars's śīghra epicycle is 235°. Near opposition the planet appears to go backwards."],
    seconds: 22,
    still: 0.47,
  },
  "day-length": {
    title: ["चरखण्ड र दिनमान", "Ascensional difference and day length"],
    caption: ["चरज्या = कुज्या × त्रिज्या ÷ द्युज्या। दिनमान = ३० घटी ± चर।", "Sine of ascensional difference from the earth-sine and day-radius. Day = 30 ghaṭīs ± twice the difference."],
    seconds: 20,
    still: 0.25,
  },
  gnomon: {
    title: ["शङ्कुको छाया", "The gnomon's shadow"],
    caption: ["१२ अङ्गुलको शङ्कु। छाया = १२ × नतांशको स्पर्शज्या, कर्ण = √(१४४ + छाया²)।", "A gnomon of 12 digits. Shadow = 12 × tan(zenith distance), hypotenuse = √(144 + shadow²)."],
    seconds: 18,
    still: 0.3,
  },
  "lunar-eclipse": {
    title: ["चन्द्रग्रहण", "Lunar eclipse"],
    caption: ["चन्द्र भूछायामा पस्छ। ग्रास = मानार्धयोग − शर।", "The moon enters the earth's shadow. Covered part = half the sum of the discs − the latitude."],
    seconds: 18,
    still: 0.5,
  },
  parallax: {
    title: ["लम्बन", "Parallax"],
    caption: ["पृथ्वीको सतहबाट हेर्दा चन्द्र केन्द्रबाट हेरेभन्दा तल देखिन्छ। परम लम्बन चन्द्रगतिको पन्ध्रौँ भाग।", "Seen from the surface the moon sits lower than from the centre. Greatest parallax is a fifteenth of its daily motion."],
    seconds: 18,
    still: 0.25,
  },
  "solar-eclipse": {
    title: ["सूर्यग्रहण", "Solar eclipse"],
    caption: ["चन्द्रबिम्ब सूर्यबिम्बमाथि सर्छ। ग्रास अङ्गुलमा।", "The moon's disc slides over the sun's. The covered part in digits."],
    seconds: 16,
    still: 0.5,
  },
  projection: {
    title: ["छेद्यक (परिलेख)", "The projection (parilekha)"],
    caption: ["ग्राहकको मार्ग स्पर्श, मध्य र मोक्षका बिन्दुबाट कोरिन्छ।", "The path of the eclipsing body is drawn through first contact, middle and release."],
    seconds: 16,
    still: 0.5,
  },
  conjunction: {
    title: ["ग्रहयुति", "Conjunction of planets"],
    caption: ["दुई ग्रह एउटै भोगमा पुग्दा तिनको शरको अन्तर देखिन्छ। एक अंशभन्दा नजिक भए युद्ध।", "At equal longitude the planets differ only by latitude. Closer than a degree is a planetary war."],
    seconds: 16,
    still: 0.5,
  },
  nakshatra: {
    title: ["नक्षत्रका ध्रुवक र शर", "Nakshatra longitudes and latitudes"],
    caption: ["अध्याय ८, श्लोक २–९ का ध्रुवक र विक्षेप।", "The polar longitudes and latitudes of chapter 8, verses 2–9."],
    seconds: 40,
    still: 0.14,
  },
  udayasta: {
    title: ["उदय र अस्त", "Rising and setting"],
    caption: ["भू पृथ्वी, र सूर्य। अ व स द य ग्रहकक्षा, ख क ग घ च नक्षत्रकक्षा। सूर्य नजिक ग्रह अस्त हुन्छ, दृष्टि पछाडि फर्कँदा वक्र।", "भू is the earth and र the sun. अ व स द य mark the planet's orbit, ख क ग घ च the nakshatras. Near the sun the planet sets; when the sight-line turns back, it is retrograde."],
    seconds: 18,
    still: 0.2,
  },
  "moon-phase": {
    title: ["शृङ्गोन्नति", "The moon's horns"],
    caption: ["सूर्यबाट चन्द्रको अन्तरले उज्यालो भाग बढ्छ।", "The bright part grows with the moon's distance from the sun."],
    seconds: 20,
    still: 0.18,
  },
  pata: {
    title: ["व्यतीपात र वैधृति", "Vyatīpāta and vaidhṛti"],
    caption: ["सूर्य र चन्द्रको भोगयोग १८० वा ३६० अंश हुँदा तिनको क्रान्ति बराबर हुन्छ।", "When the sun's and moon's longitudes add to 180° or 360°, their declinations are equal."],
    seconds: 20,
    still: 0.5,
  },
  bhugola: {
    title: ["भूगोल र चार पुरी", "The globe and its four cities"],
    caption: ["लङ्कामा सूर्योदय हुँदा यमकोटिमा मध्याह्न, सिद्धपुरमा सूर्यास्त र रोमकमा मध्यरात।", "Sunrise at Laṅkā is noon at Yamakoṭi, sunset at Siddhapura and midnight at Romaka."],
    seconds: 24,
    still: 0.08,
  },
  kaksha: {
    title: ["ग्रहकक्षा योजनमा", "The orbits in yojanas"],
    caption: ["सबै ग्रह दिनमा बराबर योजन हिँड्छन्, त्यसैले ठूलो कक्षाको ग्रह ढिलो देखिन्छ।", "Every planet travels the same yojanas a day, so the one on the larger orbit looks slower."],
    seconds: 30,
    still: 0.4,
  },
  armillary: {
    title: ["गोलयन्त्र", "The armillary sphere"],
    caption: ["क्षितिज, याम्योत्तर, विषुव र २४° ढल्केको क्रान्तिवृत्त।", "Horizon, meridian, equator and the ecliptic tilted 24°."],
    seconds: 24,
    still: 0.15,
  },
  measures: {
    title: ["कालका मान", "Measures of time"],
    caption: ["सौर वर्ष, चान्द्र मास, सावन र नाक्षत्र दिन एउटै आकाशबाट गनिन्छन्।", "Solar years, lunar months, civil and sidereal days are all read from the same sky."],
    seconds: 30,
    still: 0.3,
  },
};

/** The lettered constructions with their worked arithmetic (surya-classical.ts). */
const CLASSICAL_META: Record<keyof typeof CLASSICAL_DRAW, Meta> = {
  kalpa: {
    title: ["कल्प र सृष्टिदेखिका वर्ष", "The kalpa and the years since creation"],
    caption: [
      "१४ मनु र १५ सन्धिले एक कल्प। ६ मनु, ७ सन्धि, २७ महायुग र २८औँको कृत बितेपछि ग्रह गणना सुरु हुन्छ।",
      "Fourteen Manus and fifteen twilights make a kalpa. The count starts after 6 Manus, 7 twilights, 27 mahāyugas and the Kṛta of the 28th.",
    ],
    seconds: 30,
    still: 0.455,
  },
  ahargana: {
    title: ["अहर्गण: दिनको गन्ती", "Ahargaṇa: counting the days"],
    caption: [
      "सौर मासबाट अधिमास, चान्द्र मास, तिथि र क्षय तिथि निकालेर लङ्काका मध्यरात गनिन्छ।",
      "From solar months come the intercalary months, lunar months, tithis and omitted tithis, and so the midnights at Laṅkā.",
    ],
    seconds: 36,
    still: 0.6,
  },
  deshantara: {
    title: ["देशान्तर: आफ्नो ठाउँको संशोधन", "Deśāntara: correcting for one's own place"],
    caption: [
      "लङ्का–उज्जयिनी–मेरु रेखाबाट पूर्व वा पश्चिमको दूरी योजनमा, र त्यसले ग्रह र समयमा ल्याउने फरक।",
      "The distance east or west of the Laṅkā–Ujjayinī–Meru line in yojanas, and what it changes in the planets and the time.",
    ],
    seconds: 30,
    still: 0.05,
  },
  "sighra-construction": {
    title: ["शीघ्रफलको रचना", "Constructing the śīghra correction"],
    caption: [
      "मध्यम ग्रह म को परिधिमा स्पष्ट ग्रह ग। गल भुजफल, मल कोटिफल, भूग कर्ण। ∠मभूग शीघ्रफल हो।",
      "The true planet P rides the epicycle round the mean planet M. PF is bhujaphala, MF kotiphala, EP the hypotenuse; ∠MEP is the correction.",
    ],
    seconds: 30,
    still: 0.18,
  },
  "sighra-inferior": {
    title: ["भित्री ग्रहको शीघ्रफल (शुक्र)", "Śīghra of an inner planet (Venus)"],
    caption: [
      "सूर्यवरिपरि पृथ्वी र शुक्र। भूसू मध्यम ग्रह, सूशु शीघ्रोच्च। शुक्रको परिधि २६२° = दुई कक्षाको अनुपात।",
      "Earth and Venus round the sun. EH is the mean planet, HV the śīghrocca. Venus's 262° epicycle is the ratio of the two orbits.",
    ],
    seconds: 30,
    still: 0.2,
  },
  "sighra-superior": {
    title: ["बाहिरी ग्रहको शीघ्रफल (बृहस्पति)", "Śīghra of an outer planet (Jupiter)"],
    caption: [
      "सूर्यवरिपरि सानो वृत्तमा पृथ्वी, ठूलोमा बृहस्पति। सूबृ मध्यम ग्रह, सूभू शीघ्रोच्च। परिधि ७०° = पृथ्वी ÷ बृहस्पतिको कक्षा।",
      "Earth on the small circle round the sun, Jupiter on the large one. HJ is the mean planet, EH the śīghrocca. The 70° epicycle is the ratio of the orbits.",
    ],
    seconds: 30,
    still: 0.3,
  },
};

/** Where each figure stands: before the first verse of the passage it explains. */
export const SURYA_FIGURE_PLACES: { chapter: number; verse: number; key: FigureKey }[] = [
  { chapter: 1, verse: 10, key: "time-units" },
  { chapter: 1, verse: 15, key: "yuga" },
  { chapter: 1, verse: 19, key: "kalpa" },
  { chapter: 1, verse: 29, key: "mean-motion" },
  { chapter: 1, verse: 45, key: "ahargana" },
  { chapter: 1, verse: 59, key: "earth-size" },
  { chapter: 1, verse: 61, key: "deshantara" },
  { chapter: 2, verse: 1, key: "manda" },
  { chapter: 2, verse: 15, key: "sine-table" },
  { chapter: 2, verse: 28, key: "declination" },
  { chapter: 2, verse: 34, key: "sighra" },
  { chapter: 2, verse: 39, key: "sighra-construction" },
  { chapter: 2, verse: 41, key: "sighra-inferior" },
  { chapter: 2, verse: 41, key: "sighra-superior" },
  { chapter: 2, verse: 61, key: "day-length" },
  { chapter: 3, verse: 8, key: "gnomon" },
  { chapter: 4, verse: 10, key: "lunar-eclipse" },
  { chapter: 5, verse: 1, key: "parallax" },
  { chapter: 5, verse: 13, key: "solar-eclipse" },
  { chapter: 6, verse: 1, key: "projection" },
  { chapter: 7, verse: 12, key: "conjunction" },
  { chapter: 8, verse: 1, key: "nakshatra" },
  { chapter: 9, verse: 1, key: "udayasta" },
  { chapter: 10, verse: 9, key: "moon-phase" },
  { chapter: 11, verse: 1, key: "pata" },
  { chapter: 12, verse: 32, key: "bhugola" },
  { chapter: 12, verse: 75, key: "kaksha" },
  { chapter: 13, verse: 4, key: "armillary" },
  { chapter: 14, verse: 1, key: "measures" },
];

const MORE_PLACES: { chapter: number; verse: number; key: FigureKey }[] = (Object.keys(MORE) as MoreKey[]).map((key) => ({ chapter: MORE[key].chapter, verse: MORE[key].verse, key }));

export function suryaFiguresFor(chapter: number): { verse: number; key: FigureKey }[] {
  return [...SURYA_FIGURE_PLACES, ...MORE_PLACES].filter((p) => p.chapter === chapter).sort((a, b) => a.verse - b.verse);
}

export function figureInfo(key: FigureKey, lang: Lang): { title: string; caption: string; seconds: number; still: number } {
  const m: Meta = key in MORE ? MORE[key as MoreKey] : key in CLASSICAL_META ? CLASSICAL_META[key as keyof typeof CLASSICAL_META] : META[key as keyof typeof META];
  const i = lang === "en" ? 1 : 0;
  return { title: m.title[i], caption: m.caption[i], seconds: m.seconds, still: m.still };
}


// ---------------------------------------------------------------- chapter 1

const PLANETS_REV: { ne: string; en: string; rev: number; tone: Tone; r: number }[] = [
  { ne: "चन्द्र", en: "Moon", rev: 57753336, tone: "moon", r: 26 },
  { ne: "सूर्य", en: "Sun", rev: 4320000, tone: "sun", r: 44 },
  { ne: "मङ्गल", en: "Mars", rev: 2296832, tone: "accent", r: 60 },
  { ne: "गुरु", en: "Jupiter", rev: 364220, tone: "planet", r: 74 },
  { ne: "शनि", en: "Saturn", rev: 146568, tone: "muted", r: 88 },
];
/** Civil days in a mahāyuga (1.37). */
const CIVIL_DAYS = 1577917828;

function meanMotion(t: number, lang: Lang): FigureFrame {
  const days = t * 3 * 365.2588; // three sidereal years per loop
  const cx = 110;
  const cy = 100;
  const shapes: Shape[] = [circle(cx, cy, 6, { fill: "earth" }), text(cx, cy + 16, L(lang, "भू", "Earth"), "muted", 9)];
  const readout: string[] = [L(lang, `अहर्गण ${fmt(lang, days)} दिन`, `Ahargaṇa ${days.toFixed(0)} days`)];
  for (const p of PLANETS_REV) {
    shapes.push(circle(cx, cy, p.r, { stroke: "faint", w: 1 }));
    const lon = wrap((p.rev * days * 360) / CIVIL_DAYS);
    const at = polar(cx, cy, p.r, lon);
    shapes.push(circle(at.x, at.y, p.tone === "sun" ? 5.5 : 4, { fill: p.tone }));
    readout.push(`${L(lang, p.ne, p.en)} ${dms(lang, lon)}`);
  }
  shapes.push(line(cx, cy, cx + 96, cy, { stroke: "faint", dash: "2 3" }));
  shapes.push(text(cx + 100, cy + 3, L(lang, "मेष", "Aries 0°"), "muted", 9, "start"));
  shapes.push(text(250, 30, L(lang, "भोग = भगण × अहर्गण ÷ कुदिन", "Longitude = revolutions × days ÷ civil days"), "ink", 9.5));
  shapes.push(text(250, 46, L(lang, "कुदिन १५७७९१७८२८", "civil days 1577917828"), "muted", 9));
  return { shapes, readout };
}

function timeUnits(t: number, lang: Lang): FigureFrame {
  const cx = 100;
  const cy = 102;
  const shapes: Shape[] = [circle(cx, cy, 78, { stroke: "muted", w: 1.2 })];
  for (let g = 0; g < 60; g += 1) {
    const a = 90 - g * 6;
    const inner = g % 5 === 0 ? 68 : 73;
    const p = polar(cx, cy, inner, a);
    const q = polar(cx, cy, 78, a);
    shapes.push(line(p.x, p.y, q.x, q.y, { stroke: g % 5 === 0 ? "ink" : "faint", w: 1 }));
  }
  const ghati = t * 60;
  const hand = polar(cx, cy, 64, 90 - ghati * 6);
  const edge = polar(cx, cy, 78, 90 - ghati * 6);
  // clockwise from the top: sweep-flag 1 on screen
  shapes.push(path(`M ${cx} ${cy} L ${cx} ${cy - 78} A 78 78 0 ${ghati > 30 ? 1 : 0} 1 ${edge.x.toFixed(1)} ${edge.y.toFixed(1)} Z`, { fill: "sun", opacity: 0.18 }));
  shapes.push(line(cx, cy, hand.x, hand.y, { stroke: "accent", w: 2.5 }));
  shapes.push(circle(cx, cy, 3, { fill: "ink" }));
  const g = Math.floor(ghati);
  const palas = (ghati - g) * 60;
  const p = Math.floor(palas);
  const pranas = Math.floor((palas - p) * 6);
  shapes.push(text(250, 52, L(lang, "१ अहोरात्र = ६० घटी", "1 day = 60 ghaṭī"), "ink", 11));
  shapes.push(text(250, 72, L(lang, "१ घटी = ६० पल", "1 ghaṭī = 60 pala"), "ink", 11));
  shapes.push(text(250, 92, L(lang, "१ पल = ६ प्राण", "1 pala = 6 prāṇa"), "ink", 11));
  shapes.push(text(250, 112, L(lang, "१ प्राण = ४ सेकेन्ड", "1 prāṇa = 4 seconds"), "muted", 10));
  shapes.push(text(250, 138, L(lang, "= २१६०० प्राण", "= 21600 prāṇa"), "accent", 11, "middle", true));
  return {
    shapes,
    readout: [
      L(lang, `${num(lang, g)} घटी ${num(lang, p)} पल ${num(lang, pranas)} प्राण`, `${g} ghaṭī ${p} pala ${pranas} prāṇa`),
      L(lang, `= ${fmt(lang, t * 21600)} प्राण`, `= ${(t * 21600).toFixed(0)} prāṇa`),
    ],
  };
}

const YUGAS: { ne: string; en: string; years: number }[] = [
  { ne: "कृत", en: "Kṛta", years: 1728000 },
  { ne: "त्रेता", en: "Tretā", years: 1296000 },
  { ne: "द्वापर", en: "Dvāpara", years: 864000 },
  { ne: "कलि", en: "Kali", years: 432000 },
];

function yuga(t: number, lang: Lang): FigureFrame {
  const x0 = 20;
  const width = 320;
  const y = 70;
  const total = 4320000;
  const shapes: Shape[] = [];
  let x = x0;
  const tones: Tone[] = ["sun", "accent", "planet", "muted"];
  YUGAS.forEach((yg, i) => {
    const w = (yg.years / total) * width;
    const s = w / 12;
    shapes.push(path(`M ${x} ${y} h ${w} v 36 h ${-w} Z`, { fill: tones[i], opacity: 0.28, stroke: "ink", w: 0.8 }));
    shapes.push(path(`M ${x} ${y} h ${s} v 36 h ${-s} Z`, { fill: "shadow", opacity: 0.35 }));
    shapes.push(path(`M ${x + w - s} ${y} h ${s} v 36 h ${-s} Z`, { fill: "shadow", opacity: 0.35 }));
    shapes.push(text(x + w / 2, y + 22, L(lang, yg.ne, yg.en), "ink", 11, "middle", true));
    shapes.push(text(x + w / 2, y + 52, fmt(lang, yg.years), "muted", 9));
    x += w;
  });
  const cursorYears = t * total;
  const cx = x0 + t * width;
  shapes.push(line(cx, y - 14, cx, y + 40, { stroke: "accent", w: 2 }));
  shapes.push(text(180, 34, L(lang, "महायुग = ४३,२०,००० सौर वर्ष = १२,००० दिव्य वर्ष", "Mahāyuga = 4,320,000 solar years = 12,000 divine years"), "ink", 10));
  shapes.push(text(180, 150, L(lang, "छायाँ भाग: सन्ध्या र सन्ध्यांश", "Shaded ends: twilight (sandhyā, sandhyāṃśa)"), "muted", 9));
  let acc = 0;
  let which = YUGAS[0]!;
  let into = 0;
  for (const yg of YUGAS) {
    if (cursorYears < acc + yg.years) {
      which = yg;
      into = cursorYears - acc;
      break;
    }
    acc += yg.years;
  }
  const twilight = into < which.years / 12 || into > (which.years * 11) / 12;
  return {
    shapes,
    readout: [
      `${L(lang, which.ne, which.en)} · ${fmt(lang, into)} ${L(lang, "वर्ष", "years")}`,
      twilight ? L(lang, "सन्धिकाल", "twilight") : L(lang, `सन्धि ${fmt(lang, which.years / 12)} वर्ष दुवैतिर`, `twilight ${(which.years / 12).toFixed(0)} years at each end`),
    ],
  };
}

function earthSize(t: number, lang: Lang): FigureFrame {
  const lat = tri(t) * 60;
  const cx = 110;
  const cy = 100;
  const R = 70;
  const y = cy - R * Math.sin(lat * RAD);
  const rx = R * Math.cos(lat * RAD);
  const shapes: Shape[] = [
    circle(cx, cy, R, { fill: "earth", opacity: 0.18, stroke: "earth", w: 1.5 }),
    path(`M ${cx - R} ${cy} A ${R} ${R * 0.22} 0 0 0 ${cx + R} ${cy}`, { stroke: "muted", w: 1 }),
    path(`M ${cx - rx} ${y} A ${rx} ${rx * 0.22} 0 0 0 ${cx + rx} ${y}`, { stroke: "accent", w: 2 }),
    line(cx, cy, cx + rx, y, { stroke: "faint", dash: "3 3" }),
    line(cx, cy, cx + R, cy, { stroke: "faint", dash: "3 3" }),
    path(arc(cx, cy, 22, 0, lat), { stroke: "accent", w: 1 }),
    text(cx + 30, cy - 6 - lat / 6, dms(lang, lat), "accent", 9, "start"),
    text(cx, cy + R + 16, L(lang, "व्यास १६०० योजन", "diameter 1600 yojanas"), "muted", 9),
  ];
  const full = Math.sqrt(10 * 1600 * 1600);
  const local = full * Math.cos(lat * RAD);
  shapes.push(text(258, 50, L(lang, "परिधि = √(१० × व्यास²)", "circumference = √(10 × d²)"), "ink", 10));
  shapes.push(text(258, 68, `= ${fmt(lang, full, 1)} ${L(lang, "योजन", "yojanas")}`, "ink", 10));
  shapes.push(text(258, 96, L(lang, "स्फुट परिधि = परिधि × लम्बज्या ÷ त्रिज्या", "local = circumference × cos(latitude)"), "muted", 9));
  return {
    shapes,
    readout: [
      `${L(lang, "अक्षांश", "latitude")} ${dms(lang, lat)}`,
      `${L(lang, "स्फुट परिधि", "local circumference")} ${fmt(lang, local)} ${L(lang, "योजन", "yojanas")}`,
    ],
  };
}

// ---------------------------------------------------------------- chapter 2


function sineTable(t: number, lang: Lang): FigureFrame {
  const step = Math.min(23, Math.floor(tri(t) * 24));
  const deg = (step + 1) * 3.75;
  const ox = 40;
  const oy = 176;
  const R = 150;
  const shapes: Shape[] = [
    line(ox, oy, ox + R + 8, oy, { stroke: "muted", w: 1 }),
    line(ox, oy, ox, oy - R - 8, { stroke: "muted", w: 1 }),
    path(arc(ox, oy, R, 0, 90), { stroke: "ink", w: 1.2 }),
  ];
  for (let i = 1; i <= 24; i += 1) {
    const p = polar(ox, oy, R, i * 3.75);
    const q = polar(ox, oy, R - 5, i * 3.75);
    shapes.push(line(p.x, p.y, q.x, q.y, { stroke: i <= step + 1 ? "accent" : "faint", w: 1 }));
  }
  const p = polar(ox, oy, R, deg);
  shapes.push(path(arc(ox, oy, R, 0, deg), { stroke: "accent", w: 3 }));
  shapes.push(line(ox, oy, p.x, p.y, { stroke: "ink", w: 1, dash: "3 3" }));
  shapes.push(line(p.x, p.y, p.x, oy, { stroke: "sun", w: 3 }));
  shapes.push(circle(p.x, p.y, 3.5, { fill: "accent" }));
  shapes.push(text(p.x + 6, (p.y + oy) / 2, L(lang, "ज्या", "jyā"), "sun", 10, "start", true));
  shapes.push(text(ox + R / 2 - 20, oy + 14, L(lang, "त्रिज्या ३४३८′", "radius 3438′"), "muted", 9));
  const table = SURYA_SINES[step]!;
  const exact = TRIJYA * Math.sin(deg * RAD);
  const diff = step === 0 ? table : table - SURYA_SINES[step - 1]!;
  shapes.push(text(270, 46, L(lang, `${num(lang, step + 1)}औँ ज्या`, `sine no. ${step + 1}`), "ink", 11, "middle", true));
  shapes.push(text(270, 66, `${L(lang, "चाप", "arc")} ${num(lang, (step + 1) * 225)}′ = ${dms(lang, deg)}`, "ink", 10));
  shapes.push(text(270, 86, `${L(lang, "पिण्ड", "table")} ${num(lang, table)}`, "sun", 11, "middle", true));
  shapes.push(text(270, 106, `${L(lang, "खण्ड", "difference")} ${num(lang, diff)}`, "muted", 10));
  shapes.push(text(270, 126, `${num(lang, 3438)} × sin = ${num(lang, exact.toFixed(1))}`, "muted", 9));
  return {
    shapes,
    readout: [
      L(lang, `चाप ${dms(lang, deg)} → ज्या ${num(lang, table)}`, `arc ${dms(lang, deg)} → sine ${table}`),
      L(lang, `आधुनिक मान ${exact.toFixed(1)}`, `modern value ${exact.toFixed(1)}`).replace(/[0-9]/g, (d) => (lang === "ne" ? DEV[Number(d)]! : d)),
    ],
  };
}


function declination(t: number, lang: Lang): FigureFrame {
  const lon = t * 360;
  const jyaL = suryaJya(lon);
  const jyaD = (jyaL * 1397) / TRIJYA;
  const dec = suryaArc(jyaD);
  const x0 = 24;
  const width = 312;
  const mid = 104;
  const k = 2.4; // px per degree of declination
  const shapes: Shape[] = [
    line(x0, mid, x0 + width, mid, { stroke: "muted", w: 1.2 }),
    text(x0 + width, mid - 6, L(lang, "विषुव", "equator"), "muted", 9, "end"),
  ];
  let d = "";
  for (let i = 0; i <= 72; i += 1) {
    const l = i * 5;
    const y = mid - suryaArc((suryaJya(l) * 1397) / TRIJYA) * k;
    d += `${i === 0 ? "M" : "L"} ${(x0 + (l / 360) * width).toFixed(1)} ${y.toFixed(1)} `;
  }
  shapes.push(path(d, { stroke: "sun", w: 1.5 }));
  shapes.push(text(x0 + width / 4, mid - 24 * k - 8, L(lang, "क्रान्तिवृत्त", "ecliptic"), "sun", 9));
  shapes.push(line(x0, mid - 24 * k, x0 + width, mid - 24 * k, { stroke: "faint", dash: "2 4" }));
  shapes.push(line(x0, mid + 24 * k, x0 + width, mid + 24 * k, { stroke: "faint", dash: "2 4" }));
  shapes.push(text(x0 + 2, mid - 24 * k - 3, "+24°", "muted", 8, "start"));
  shapes.push(text(x0 + 2, mid + 24 * k + 10, "−24°", "muted", 8, "start"));
  const x = x0 + (lon / 360) * width;
  const y = mid - dec * k;
  shapes.push(line(x, mid, x, y, { stroke: "accent", w: 2 }));
  shapes.push(circle(x, y, 6, { fill: "sun" }));
  return {
    shapes,
    readout: [
      `${L(lang, "भोग", "longitude")} ${dms(lang, lon)} · ${L(lang, "भुजज्या", "sine")} ${fmt(lang, Math.abs(jyaL))}`,
      `${L(lang, "क्रान्तिज्या", "decl. sine")} = ${fmt(lang, Math.abs(jyaL))} × १३९७ ÷ ३४३८ = ${fmt(lang, Math.abs(jyaD))} → ${dms(lang, dec)}`.replace(
        "१३९७ ÷ ३४३८",
        lang === "en" ? "1397 ÷ 3438" : "१३९७ ÷ ३४३८",
      ),
    ],
  };
}

function epicycleBase(cx: number, cy: number, R: number, shapes: Shape[], lang: Lang) {
  shapes.push(circle(cx, cy, R, { stroke: "faint", w: 1 }));
  shapes.push(circle(cx, cy, 5, { fill: "earth" }));
  shapes.push(text(cx, cy + 15, L(lang, "भू", "Earth"), "muted", 9));
}

function manda(t: number, lang: Lang): FigureFrame {
  const kendra = t * 360; // mean anomaly from the apogee
  // Sun: 14° at the even quadrant ends, 13°40′ at the odd (2.34).
  const p = 14 - (20 / 60) * Math.abs(Math.sin(kendra * RAD));
  const bhuja = suryaJya(kendra);
  const phalaJya = (bhuja * p) / 360;
  const phala = suryaArc(phalaJya);
  const cx = 104;
  const cy = 100;
  const R = 70;
  const apogee = 120; // drawing direction of the mandocca
  const meanDir = apogee + kendra;
  const shapes: Shape[] = [];
  epicycleBase(cx, cy, R, shapes, lang);
  const up = polar(cx, cy, R + 14, apogee);
  shapes.push(line(cx, cy, up.x, up.y, { stroke: "faint", dash: "3 3" }));
  shapes.push(text(up.x, up.y - 6, L(lang, "मन्दोच्च", "apogee"), "muted", 9));
  const m = polar(cx, cy, R, meanDir);
  const r = R * (p / 360) * 4; // drawn four times larger so it can be seen
  shapes.push(circle(m.x, m.y, r, { stroke: "sun", w: 1 }));
  shapes.push(circle(m.x, m.y, 3, { fill: "muted" }));
  // the true planet lags the mean one when the kendra is in the first half
  const trueDir = meanDir - phala * 4;
  const tp = polar(cx, cy, R, trueDir);
  shapes.push(line(cx, cy, m.x, m.y, { stroke: "muted", w: 1 }));
  shapes.push(line(cx, cy, tp.x, tp.y, { stroke: "accent", w: 1.6 }));
  shapes.push(circle(tp.x, tp.y, 5, { fill: "sun" }));
  shapes.push(text(260, 40, L(lang, "भुजफल = भुजज्या × परिधि ÷ ३६०", "bhujaphala = sine(kendra) × epicycle ÷ 360"), "ink", 9));
  shapes.push(text(260, 56, L(lang, "मन्दफल = भुजफलको चाप", "equation = arc of bhujaphala"), "ink", 9));
  shapes.push(text(260, 72, L(lang, "(वृत्त ४ गुणा ठूलो कोरिएको)", "(epicycle drawn 4× larger)"), "muted", 8));
  return {
    shapes,
    readout: [
      `${L(lang, "केन्द्र", "kendra")} ${dms(lang, kendra)} · ${L(lang, "परिधि", "epicycle")} ${dms(lang, p)}`,
      `${fmt(lang, Math.abs(bhuja))} × ${dms(lang, p)} ÷ ३६० = ${fmt(lang, Math.abs(phalaJya), 1)} → ${dms(lang, Math.abs(phala))} ${kendra < 180 ? "−" : "+"}`.replace(
        "३६०",
        lang === "en" ? "360" : "३६०",
      ),
    ],
  };
}

/** Mars's śīghra epicycle: 235° at the even quadrant ends, 232° at the odd (2.35). */
function sighraEq(k: number): { eq: number; karna: number; p: number } {
  const p = 235 - 3 * Math.abs(Math.sin(k * RAD));
  const bhujaphala = (suryaJya(k) * p) / 360;
  const kotiphala = (suryaJya(k + 90) * p) / 360;
  const karna = Math.sqrt((TRIJYA + kotiphala) ** 2 + bhujaphala ** 2);
  const eq = suryaArc((bhujaphala * TRIJYA) / karna);
  return { eq, karna, p };
}

function sighra(t: number, lang: Lang): FigureFrame {
  const k = t * 360; // śīghra anomaly
  const { eq, karna, p } = sighraEq(k);
  const prev = sighraEq(k - 2).eq;
  const motion = 2 + (eq - prev); // apparent change for a 2° step of the anomaly
  const retro = motion < 0;
  const cx = 104;
  const cy = 100;
  const R = 46;
  const shapes: Shape[] = [];
  epicycleBase(cx, cy, R, shapes, lang);
  const meanDir = 90;
  const m = polar(cx, cy, R, meanDir);
  const er = (R * p) / 360;
  shapes.push(circle(m.x, m.y, er, { stroke: "accent", w: 1 }));
  const pl = polar(m.x, m.y, er, meanDir + k);
  shapes.push(line(m.x, m.y, pl.x, pl.y, { stroke: "faint" }));
  shapes.push(line(cx, cy, pl.x, pl.y, { stroke: retro ? "accent" : "ink", w: 1.6 }));
  const far = polar(cx, cy, 98, meanDir + eq);
  shapes.push(line(pl.x, pl.y, far.x, far.y, { stroke: "faint", dash: "2 3" }));
  shapes.push(circle(pl.x, pl.y, 5, { fill: "accent" }));
  shapes.push(circle(m.x, m.y, 2.5, { fill: "muted" }));
  if (retro) shapes.push(text(cx, 18, L(lang, "वक्र", "retrograde"), "accent", 13, "middle", true));
  shapes.push(text(262, 40, L(lang, "कर्ण = √((त्रि + कोटिफल)² + भुजफल²)", "K = √((R + kotiphala)² + bhujaphala²)"), "ink", 9));
  shapes.push(text(262, 56, L(lang, "शीघ्रफलज्या = भुजफल × त्रिज्या ÷ कर्ण", "sine of equation = bhujaphala × R ÷ K"), "ink", 9));
  return {
    shapes,
    readout: [
      `${L(lang, "शीघ्रकेन्द्र", "śīghra kendra")} ${dms(lang, k)} · ${L(lang, "कर्ण", "K")} ${fmt(lang, karna)}`,
      `${L(lang, "शीघ्रफल", "equation")} ${dms(lang, eq)} · ${retro ? L(lang, "वक्री", "retrograde") : L(lang, "मार्गी", "direct")}`,
    ],
  };
}

function dayLength(t: number, lang: Lang): FigureFrame {
  const lon = t * 360;
  const palabha = 6.3; // equinoctial shadow at about Kathmandu (27.7° N) in digits
  const jyaD = (suryaJya(lon) * 1397) / TRIJYA;
  const dec = suryaArc(jyaD);
  const dyujya = Math.sqrt(TRIJYA ** 2 - jyaD ** 2);
  const kujya = (jyaD * palabha) / 12; // earth-sine (3.34)
  const charaJya = (kujya * TRIJYA) / dyujya;
  const chara = suryaArc(charaJya); // degrees of right ascension = asus/6 → ghaṭī = deg/6
  const day = 30 + (2 * chara) / 6;
  const x0 = 24;
  const width = 312;
  const base = 150;
  const k = 4.2;
  const shapes: Shape[] = [line(x0, base - 30 * k + 90, x0 + width, base - 30 * k + 90, { stroke: "faint", dash: "2 4" })];
  let d = "";
  for (let i = 0; i <= 72; i += 1) {
    const l = i * 5;
    const jd = (suryaJya(l) * 1397) / TRIJYA;
    const dj = Math.sqrt(TRIJYA ** 2 - jd ** 2);
    const c = suryaArc((((jd * palabha) / 12) * TRIJYA) / dj);
    const y = base - (30 + (2 * c) / 6 - 30) * k * 2 - 30 * k + 90;
    d += `${i === 0 ? "M" : "L"} ${(x0 + (l / 360) * width).toFixed(1)} ${y.toFixed(1)} `;
  }
  shapes.push(path(d, { stroke: "sun", w: 1.8 }));
  const x = x0 + (lon / 360) * width;
  const y = base - (day - 30) * k * 2 - 30 * k + 90;
  shapes.push(circle(x, y, 5.5, { fill: "sun" }));
  shapes.push(text(x0, 22, L(lang, "दिनमान (घटी), पलभा ६.३ अङ्गुल", "Day length (ghaṭī), equinoctial shadow 6.3 digits"), "ink", 9.5, "start"));
  shapes.push(text(x0 + width, base - 30 * k + 86, L(lang, "३० घटी", "30 ghaṭī"), "muted", 8, "end"));
  return {
    shapes,
    readout: [
      `${L(lang, "भोग", "longitude")} ${dms(lang, lon)} · ${L(lang, "क्रान्ति", "decl.")} ${dms(lang, dec)}`,
      `${L(lang, "चरज्या", "chara sine")} ${fmt(lang, Math.abs(charaJya))} · ${L(lang, "दिनमान", "day")} ${fmt(lang, day, 2)} ${L(lang, "घटी", "ghaṭī")}`,
    ],
  };
}

// ---------------------------------------------------------------- chapter 3

function gnomon(t: number, lang: Lang): FigureFrame {
  const z = 10 + tri(t) * 65; // zenith distance of the sun
  const shadow = 12 * Math.tan(z * RAD);
  const karna = Math.sqrt(144 + shadow * shadow);
  const scale = 6;
  const bx = 70;
  const by = 160;
  const top = by - 12 * scale;
  const tipX = bx + shadow * scale;
  const shapes: Shape[] = [
    line(14, by, 346, by, { stroke: "muted", w: 1.2 }),
    line(bx, by, bx, top, { stroke: "ink", w: 3 }),
    line(bx, top, Math.min(346, tipX), by, { stroke: "sun", w: 1, dash: "4 3" }),
    line(bx, by, Math.min(346, tipX), by, { stroke: "shadow", w: 5 }),
    text(bx - 8, (by + top) / 2, L(lang, "१२", "12"), "ink", 10, "end"),
    text((bx + Math.min(346, tipX)) / 2, by + 14, L(lang, "छाया", "shadow"), "muted", 9),
  ];
  // the sun stands on the line from the shadow's tip through the gnomon's top
  const ux = bx - tipX;
  const uy = top - by;
  const ul = Math.hypot(ux, uy) || 1;
  const reach = Math.min(70, (bx - 18) / Math.max(0.01, -ux / ul), (top - 14) / Math.max(0.01, -uy / ul));
  shapes.push(circle(bx + (ux / ul) * reach, top + (uy / ul) * reach, 8, { fill: "sun" }));
  shapes.push(text(270, 40, L(lang, "छाया = १२ × ज्या(नत) ÷ कोज्या(नत)", "shadow = 12 × sin z ÷ cos z"), "ink", 9));
  shapes.push(text(270, 56, L(lang, "कर्ण = √(१२² + छाया²)", "hypotenuse = √(12² + shadow²)"), "ink", 9));
  return {
    shapes,
    readout: [
      `${L(lang, "नतांश", "zenith distance")} ${dms(lang, z)}`,
      `${L(lang, "छाया", "shadow")} ${fmt(lang, shadow, 2)} · ${L(lang, "कर्ण", "hypotenuse")} ${fmt(lang, karna, 2)} ${L(lang, "अङ्गुल", "digits")}`,
    ],
  };
}

// ---------------------------------------------------------------- chapters 4–7

/** Mean apparent sizes in minutes (4.1–6 with mean motions): moon 32′, earth's shadow 81′. */
const MOON_DISC = 32;
const SHADOW_DISC = 81;

function lunarEclipse(t: number, lang: Lang): FigureFrame {
  const beta = 22; // the moon's latitude at the middle, minutes
  const half = (MOON_DISC + SHADOW_DISC) / 2;
  const span = 140;
  const along = (t - 0.5) * span; // minutes from the middle
  const dist = Math.sqrt(along * along + beta * beta);
  const grasa = Math.max(0, half - dist);
  const cx = 180;
  const cy = 98;
  const k = 1.5; // px per minute
  const shapes: Shape[] = [
    circle(cx, cy, (SHADOW_DISC / 2) * k, { fill: "shadow", opacity: 0.55, stroke: "shadow" }),
    line(cx - 150, cy - beta * k, cx + 150, cy - beta * k, { stroke: "faint", dash: "3 3" }),
    text(cx, cy + (SHADOW_DISC / 2) * k + 14, L(lang, "भूछाया", "earth's shadow"), "muted", 9),
  ];
  const mx = cx + along * k;
  const my = cy - beta * k;
  shapes.push(circle(mx, my, (MOON_DISC / 2) * k, { fill: "moon", stroke: "ink", w: 0.8, opacity: grasa > 0 ? 0.65 : 1 }));
  const sthiti = (60 * Math.sqrt(half * half - beta * beta)) / (790.58 - 59.14);
  const phase =
    grasa <= 0 ? (along < 0 ? L(lang, "स्पर्शअघि", "before contact") : L(lang, "मोक्षपछि", "after release")) : grasa >= MOON_DISC ? L(lang, "पूर्ण ग्रास", "total") : L(lang, "खण्ड ग्रास", "partial");
  return {
    shapes,
    readout: [
      `${phase} · ${L(lang, "ग्रास", "covered")} ${fmt(lang, Math.min(grasa, MOON_DISC), 1)}′ / ${num(lang, MOON_DISC)}′`,
      L(
        lang,
        `स्थित्यर्ध = ६० × √(${num(lang, half.toFixed(1))}² − ${num(lang, beta)}²) ÷ ७३१.४ = ${fmt(lang, sthiti, 2)} घटी`,
        `half-duration = 60 × √(${half.toFixed(1)}² − ${beta}²) ÷ 731.4 = ${sthiti.toFixed(2)} ghaṭī`,
      ),
    ],
  };
}

function parallax(t: number, lang: Lang): FigureFrame {
  const alt = tri(t) * 90; // the moon's altitude
  // Moon's orbit 324000 yojanas → radius ≈ 51566; earth's radius 800 (1.59, 12.85).
  const horiz = Math.asin(800 / (324000 / (2 * Math.PI))) / RAD; // ≈ 0.889° ≈ 53′
  const p = horiz * Math.cos(alt * RAD);
  const cx = 70;
  const cy = 150;
  const shapes: Shape[] = [circle(cx, cy, 30, { fill: "earth", opacity: 0.35, stroke: "earth" })];
  const obs = polar(cx, cy, 30, 90);
  shapes.push(circle(obs.x, obs.y, 3, { fill: "ink" }));
  shapes.push(line(cx - 60, obs.y, cx + 280, obs.y, { stroke: "faint", dash: "2 4" }));
  const moon = polar(cx, cy, 165, alt * 0.9);
  shapes.push(circle(moon.x, moon.y, 9, { fill: "moon", stroke: "ink", w: 0.8 }));
  const fromCentre = polar(cx, cy, 260, alt * 0.9);
  const dx = moon.x - obs.x;
  const dy = moon.y - obs.y;
  const len = Math.hypot(dx, dy);
  shapes.push(line(cx, cy, fromCentre.x, fromCentre.y, { stroke: "muted", w: 1 }));
  shapes.push(line(obs.x, obs.y, obs.x + (dx / len) * 260, obs.y + (dy / len) * 260, { stroke: "accent", w: 1.4 }));
  shapes.push(text(cx, cy + 44, L(lang, "भूकेन्द्र र भूपृष्ठ", "centre and surface"), "muted", 9));
  return {
    shapes,
    readout: [
      `${L(lang, "चन्द्रको उन्नतांश", "moon's altitude")} ${dms(lang, alt)}`,
      `${L(lang, "लम्बन", "parallax")} ${fmt(lang, p * 60, 1)}′ (${L(lang, "परम", "greatest")} ${fmt(lang, horiz * 60, 1)}′ ≈ ७९०′ ÷ १५)`.replace("७९०′ ÷ १५", lang === "en" ? "790′ ÷ 15" : "७९०′ ÷ १५"),
    ],
  };
}

function solarEclipse(t: number, lang: Lang): FigureFrame {
  const sun = 32.4;
  const moon = 31.6;
  const beta = 9;
  const along = (t - 0.5) * 90;
  const dist = Math.sqrt(along * along + beta * beta);
  const grasa = Math.max(0, (sun + moon) / 2 - dist);
  const k = 2.2;
  const cx = 180;
  const cy = 100;
  const shapes: Shape[] = [
    circle(cx, cy, (sun / 2) * k, { fill: "sun" }),
    circle(cx + along * k, cy - beta * k, (moon / 2) * k, { fill: "shadow", opacity: 0.92 }),
  ];
  const digits = (grasa / sun) * 12;
  return {
    shapes,
    readout: [
      `${L(lang, "ग्रास", "covered")} ${fmt(lang, grasa, 1)}′ = ${fmt(lang, digits, 1)} ${L(lang, "अङ्गुल", "digits")} / १२`.replace("/ १२", lang === "en" ? "/ 12" : "/ १२"),
      L(lang, "अङ्गुल = ग्रास × १२ ÷ सूर्यबिम्ब", "digits = covered × 12 ÷ sun's disc"),
    ],
  };
}

function projection(t: number, lang: Lang): FigureFrame {
  const cx = 150;
  const cy = 100;
  const R = 62; // half the sum of the discs, drawn
  const beta1 = 24;
  const beta2 = 8; // the latitude changes between contact and release
  const shapes: Shape[] = [
    circle(cx, cy, R, { stroke: "muted", w: 1 }),
    circle(cx, cy, 34, { fill: "shadow", opacity: 0.45 }),
    line(cx - 90, cy, cx + 90, cy, { stroke: "faint" }),
    line(cx, cy - 80, cx, cy + 80, { stroke: "faint" }),
    text(cx + 94, cy + 3, L(lang, "पूर्व", "E"), "muted", 9, "start"),
    text(cx - 94, cy + 3, L(lang, "पश्चिम", "W"), "muted", 9, "end"),
  ];
  const ax = cx - Math.sqrt(R * R - beta1 * beta1);
  const ay = cy - beta1;
  const bx = cx + Math.sqrt(R * R - beta2 * beta2);
  const by = cy - beta2;
  shapes.push(line(ax, ay, bx, by, { stroke: "accent", w: 1.6 }));
  shapes.push(circle(ax, ay, 3, { fill: "accent" }));
  shapes.push(circle(bx, by, 3, { fill: "accent" }));
  shapes.push(text(ax - 4, ay - 6, L(lang, "स्पर्श", "contact"), "accent", 9, "end"));
  shapes.push(text(bx + 4, by - 6, L(lang, "मोक्ष", "release"), "accent", 9, "start"));
  const mx = ax + (bx - ax) * t;
  const my = ay + (by - ay) * t;
  shapes.push(circle(mx, my, 20, { fill: "moon", stroke: "ink", w: 0.8, opacity: 0.85 }));
  const d = Math.hypot(mx - cx, my - cy);
  return {
    shapes,
    readout: [
      L(lang, `केन्द्रबीचको अन्तर ${fmt(lang, (d / R) * 56.5, 1)}′`, `distance of centres ${((d / R) * 56.5).toFixed(1)}′`),
      L(lang, "वृत्तको अर्धव्यास = मानार्धयोग ५६.५′", "circle radius = half the sum of discs, 56.5′"),
    ],
  };
}

function conjunction(t: number, lang: Lang): FigureFrame {
  const x0 = 30;
  const width = 300;
  const mid = 100;
  const k = 18; // px per degree
  const a = { lon: 100 + t * 8, lat: 1.2 };
  const b = { lon: 108 - t * 4, lat: -0.6 };
  const shapes: Shape[] = [line(x0, mid, x0 + width, mid, { stroke: "muted", w: 1.2 }), text(x0 + width, mid - 6, L(lang, "क्रान्तिवृत्त", "ecliptic"), "muted", 9, "end")];
  const px = (lon: number) => x0 + (lon - 98) * k * 1.6;
  shapes.push(circle(px(a.lon), mid - a.lat * k * 2, 6, { fill: "planet" }));
  shapes.push(circle(px(b.lon), mid - b.lat * k * 2, 5, { fill: "accent" }));
  shapes.push(text(px(a.lon), mid - a.lat * k * 2 - 11, L(lang, "गुरु", "Jupiter"), "ink", 9));
  shapes.push(text(px(b.lon), mid - b.lat * k * 2 + 16, L(lang, "मङ्गल", "Mars"), "ink", 9));
  const gap = Math.abs(a.lon - b.lon);
  const latGap = Math.abs(a.lat - b.lat);
  const sep = Math.sqrt(gap * gap + latGap * latGap);
  return {
    shapes,
    readout: [
      `${L(lang, "भोगान्तर", "longitude gap")} ${dms(lang, gap)} · ${L(lang, "शरान्तर", "latitude gap")} ${dms(lang, latGap)}`,
      sep < 1 ? L(lang, "एक अंशभित्र: ग्रहयुद्ध", "within a degree: planetary war") : L(lang, `अन्तर ${dms(lang, sep)}`, `separation ${dms(lang, sep)}`),
    ],
  };
}

// ---------------------------------------------------------------- chapter 8

/** Chapter 8, verses 2–9: polar longitude and latitude (degrees, north +). */
export const SURYA_NAKSHATRAS: { ne: string; en: string; lon: number; lat: number }[] = [
  { ne: "अश्विनी", en: "Aśvinī", lon: 8, lat: 10 },
  { ne: "भरणी", en: "Bharaṇī", lon: 20, lat: 12 },
  { ne: "कृत्तिका", en: "Kṛttikā", lon: 37.5, lat: 5 },
  { ne: "रोहिणी", en: "Rohiṇī", lon: 49.5, lat: -5 },
  { ne: "मृगशिरा", en: "Mṛgaśiras", lon: 63, lat: -10 },
  { ne: "आर्द्रा", en: "Ārdrā", lon: 67 + 1 / 3, lat: -9 },
  { ne: "पुनर्वसु", en: "Punarvasu", lon: 93, lat: 6 },
  { ne: "पुष्य", en: "Puṣya", lon: 106, lat: 0 },
  { ne: "आश्लेषा", en: "Āśleṣā", lon: 109, lat: -7 },
  { ne: "मघा", en: "Maghā", lon: 129, lat: 0 },
  { ne: "पूर्वफाल्गुनी", en: "P. Phalgunī", lon: 144, lat: 12 },
  { ne: "उत्तरफाल्गुनी", en: "U. Phalgunī", lon: 155, lat: 13 },
  { ne: "हस्त", en: "Hasta", lon: 170, lat: -11 },
  { ne: "चित्रा", en: "Citrā", lon: 180, lat: -2 },
  { ne: "स्वाती", en: "Svātī", lon: 199, lat: 37 },
  { ne: "विशाखा", en: "Viśākhā", lon: 213, lat: -1.5 },
  { ne: "अनुराधा", en: "Anurādhā", lon: 224, lat: -3 },
  { ne: "ज्येष्ठा", en: "Jyeṣṭhā", lon: 229, lat: -4 },
  { ne: "मूल", en: "Mūla", lon: 241, lat: -9 },
  { ne: "पूर्वाषाढा", en: "P. Āṣāḍhā", lon: 254, lat: -5.5 },
  { ne: "उत्तराषाढा", en: "U. Āṣāḍhā", lon: 260, lat: -5 },
  { ne: "अभिजित्", en: "Abhijit", lon: 266 + 2 / 3, lat: 60 },
  { ne: "श्रवण", en: "Śravaṇa", lon: 280, lat: 30 },
  { ne: "धनिष्ठा", en: "Dhaniṣṭhā", lon: 290, lat: 36 },
  { ne: "शतभिषा", en: "Śatabhiṣaj", lon: 320, lat: -0.5 },
  { ne: "पूर्वभाद्रपदा", en: "P. Bhādrapadā", lon: 326, lat: 24 },
  { ne: "उत्तरभाद्रपदा", en: "U. Bhādrapadā", lon: 337, lat: 26 },
  { ne: "रेवती", en: "Revatī", lon: 359 + 50 / 60, lat: 0 },
];

function nakshatra(t: number, lang: Lang): FigureFrame {
  const x0 = 16;
  const width = 328;
  const mid = 112;
  const k = 1.3; // px per degree of latitude
  const shapes: Shape[] = [line(x0, mid, x0 + width, mid, { stroke: "muted", w: 1 })];
  for (let i = 0; i <= 12; i += 1) {
    const x = x0 + (i / 12) * width;
    shapes.push(line(x, mid - 3, x, mid + 3, { stroke: "faint" }));
  }
  const lon = t * 360;
  SURYA_NAKSHATRAS.forEach((n) => {
    const x = x0 + (n.lon / 360) * width;
    const y = mid - n.lat * k;
    const near = Math.abs(n.lon - lon) < 7;
    shapes.push(line(x, mid, x, y, { stroke: "faint", w: 0.6 }));
    shapes.push(circle(x, y, near ? 4 : 2.6, { fill: near ? "sun" : "ink", opacity: near ? 1 : 0.7 }));
    if (near) shapes.push(text(x, y - 9, L(lang, n.ne, n.en), "ink", 9.5, "middle", true));
  });
  const cx = x0 + (lon / 360) * width;
  shapes.push(line(cx, mid - 82, cx, mid + 40, { stroke: "accent", w: 1, dash: "3 3" }));
  shapes.push(circle(cx, mid, 5, { fill: "moon", stroke: "ink", w: 0.8 }));
  const best = SURYA_NAKSHATRAS.reduce((a, n) => (Math.abs(n.lon - lon) < Math.abs(a.lon - lon) ? n : a));
  const i = SURYA_NAKSHATRAS.indexOf(best);
  // Abhijit, Uttarāṣāḍhā, Śravaṇa and Dhaniṣṭhā are placed by rule (8.4–5), not by a bhoga.
  const special = i >= 20 && i <= 23;
  const passed = i > 21 ? i - 1 : i;
  const bhoga = (best.lon * 60 - 800 * passed) / 10;
  const side = best.lat > 0 ? L(lang, "उत्तर", "N") : best.lat < 0 ? L(lang, "दक्षिण", "S") : "";
  return {
    shapes,
    readout: [
      `${L(lang, best.ne, best.en)} · ${L(lang, "ध्रुवक", "polar long.")} ${dms(lang, best.lon)} · ${L(lang, "शर", "lat.")} ${dms(lang, Math.abs(best.lat))} ${side}`.trim(),
      special
        ? L(lang, "यो तारा भोगले होइन, नियमले राखिन्छ (८.४–५)", "this star is placed by rule, not by a bhoga (8.4–5)")
        : L(lang, `${fmt(lang, bhoga)} × १० + ८०० × ${num(lang, passed)} = ${fmt(lang, best.lon * 60)}′`, `${bhoga.toFixed(0)} × 10 + 800 × ${passed} = ${(best.lon * 60).toFixed(0)}′`),
    ],
  };
}

// ---------------------------------------------------------------- chapter 9

function rising(t: number, lang: Lang): FigureFrame {
  const f = udayasta(t);
  const shapes: Shape[] = [
    path(f.arc, { stroke: "muted", w: 1 }),
    circle(f.center.x, f.center.y, f.orbit, { stroke: "ink", w: 1, opacity: 0.7 }),
  ];
  for (const ray of f.rays) shapes.push(line(ray.a.x, ray.a.y, ray.b.x, ray.b.y, { stroke: "faint", w: 0.8 }));
  shapes.push(line(f.earth.x, f.earth.y, f.tangents[0].x, f.tangents[0].y, { stroke: "muted", w: 0.8 }));
  shapes.push(line(f.earth.x, f.earth.y, f.tangents[1].x, f.tangents[1].y, { stroke: "muted", w: 0.8 }));
  const out = (from: { x: number; y: number }, at: { x: number; y: number }, d: number) => {
    const dx = at.x - from.x;
    const dy = at.y - from.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: at.x + (dx / l) * d, y: at.y + (dy / l) * d };
  };
  for (const ray of f.rays) {
    const n = out(f.center, ray.at, 12);
    const fa = out(f.earth, ray.seen, 10);
    shapes.push(text(n.x, n.y + 4, ray.near, "ink", 10));
    shapes.push(text(fa.x, fa.y + 4, ray.far, "ink", 10));
  }
  for (const mark of f.extras) {
    const at = out(f.earth, mark.at, 10);
    shapes.push(text(at.x, at.y + 4, mark.label, "ink", 10));
  }
  shapes.push(circle(f.sun.x, f.sun.y, 6.5, { fill: "sun" }));
  shapes.push(text(f.sun.x + 14, f.sun.y + 4, "र", "ink", 10));
  shapes.push(circle(f.earth.x, f.earth.y, 3.5, { fill: "earth" }));
  shapes.push(text(f.earth.x, f.earth.y + 16, "भू", "ink", 10));
  shapes.push(line(f.earth.x, f.earth.y, f.sight.x, f.sight.y, { stroke: "accent", w: 1.6 }));
  shapes.push(circle(f.planet.x, f.planet.y, 5, { fill: "accent", opacity: f.setting ? 0.2 : 1 }));
  if (f.retrograde) shapes.push(text(180, 190, L(lang, "वक्र", "retrograde"), "accent", 12, "middle", true));
  return {
    shapes,
    readout: [f.setting ? L(lang, "सूर्य नजिक: अस्त", "near the sun: set") : L(lang, "उदित", "visible"), f.retrograde ? L(lang, "दृष्टिरेखा पछाडि: वक्र", "sight-line turning back: retrograde") : L(lang, "मार्गी", "direct")],
  };
}

// ---------------------------------------------------------------- chapters 10–11

function moonPhase(t: number, lang: Lang): FigureFrame {
  const e = t * 360; // elongation
  const lit = (1 - Math.cos(e * RAD)) / 2;
  const cx = 110;
  const cy = 100;
  const r = 52;
  const waxing = e <= 180;
  // terminator: half-ellipse with x-radius r·cos(e)
  const tx = r * Math.cos(e * RAD);
  const brightSide = waxing ? 1 : -1;
  const d = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${brightSide > 0 ? 1 : 0} ${cx} ${cy + r} A ${Math.abs(tx).toFixed(1)} ${r} 0 0 ${(tx > 0) === (brightSide > 0) ? 0 : 1} ${cx} ${cy - r} Z`;
  const shapes: Shape[] = [circle(cx, cy, r, { fill: "shadow", opacity: 0.6 }), path(d, { fill: "moon" }), circle(cx, cy, r, { stroke: "ink", w: 0.8 })];
  // the bright limb faces the sun: west of the moon while waxing
  shapes.push(circle(waxing ? cx + r + 26 : cx - r - 26, cy, 7, { fill: "sun" }));
  const digits = e <= 180 ? e / 15 : (360 - e) / 15;
  shapes.push(text(260, 50, L(lang, "शुक्ल = (चन्द्र − सूर्य) ÷ १५ अङ्गुल", "bright = (moon − sun) ÷ 15 digits"), "ink", 9));
  shapes.push(text(260, 66, L(lang, "पूर्णिमामा १२ अङ्गुल", "12 digits at full moon"), "muted", 9));
  return {
    shapes,
    readout: [
      `${L(lang, "चन्द्र − सूर्य", "moon − sun")} ${dms(lang, e)}`,
      `${L(lang, "शुक्ल", "bright")} ${fmt(lang, digits, 1)} ${L(lang, "अङ्गुल", "digits")} · ${fmt(lang, lit * 100)}%`,
    ],
  };
}

function pata(t: number, lang: Lang): FigureFrame {
  const sun = 60 + t * 60;
  const moon = 60 + t * 60 * 13.37;
  const sum = wrap(sun + moon);
  const decOf = (lon: number) => suryaArc((suryaJya(lon) * 1397) / TRIJYA);
  const ds = decOf(sun);
  const dm = decOf(moon);
  const x0 = 30;
  const width = 300;
  const mid = 100;
  const k = 2.6;
  const shapes: Shape[] = [line(x0, mid, x0 + width, mid, { stroke: "muted" }), text(x0 + width, mid - 6, L(lang, "विषुव", "equator"), "muted", 9, "end")];
  shapes.push(circle(120, mid - ds * k, 7, { fill: "sun" }));
  shapes.push(circle(240, mid - dm * k, 7, { fill: "moon", stroke: "ink", w: 0.8 }));
  shapes.push(line(120, mid, 120, mid - ds * k, { stroke: "sun", w: 1 }));
  shapes.push(line(240, mid, 240, mid - dm * k, { stroke: "muted", w: 1 }));
  const equal = Math.abs(Math.abs(ds) - Math.abs(dm)) < 1.2 && (Math.abs(sum - 180) < 8 || sum < 8 || sum > 352);
  if (equal) shapes.push(line(100, mid - ds * k, 260, mid - dm * k, { stroke: "accent", w: 1.5, dash: "4 3" }));
  return {
    shapes,
    readout: [
      `${L(lang, "भोगयोग", "sum of longitudes")} ${dms(lang, sum)}`,
      `${L(lang, "क्रान्ति", "declinations")} ${dms(lang, ds)} / ${dms(lang, dm)}${equal ? (Math.abs(sum - 180) < 8 ? L(lang, " · व्यतीपात", " · vyatīpāta") : L(lang, " · वैधृति", " · vaidhṛti")) : ""}`,
    ],
  };
}

// ---------------------------------------------------------------- chapters 12–14

const CITIES: { ne: string; en: string; at: number }[] = [
  { ne: "लङ्का", en: "Laṅkā", at: 0 },
  { ne: "यमकोटि", en: "Yamakoṭi", at: 90 },
  { ne: "सिद्धपुर", en: "Siddhapura", at: 180 },
  { ne: "रोमक", en: "Romaka", at: 270 },
];

function bhugola(t: number, lang: Lang): FigureFrame {
  const cx = 130;
  const cy = 104;
  const R = 62;
  // The sky turns westward: seen from above the north pole the sun goes clockwise.
  const sunDir = -360 * t;
  const shapes: Shape[] = [circle(cx, cy, R, { fill: "earth", opacity: 0.2, stroke: "earth", w: 1.5 })];
  // night half
  const a = sunDir + 90;
  const p = polar(cx, cy, R, a);
  const q = polar(cx, cy, R, a + 180);
  shapes.push(path(`M ${p.x.toFixed(1)} ${p.y.toFixed(1)} A ${R} ${R} 0 0 0 ${q.x.toFixed(1)} ${q.y.toFixed(1)} Z`, { fill: "shadow", opacity: 0.35 }));
  const s = polar(cx, cy, R + 26, sunDir);
  shapes.push(circle(s.x, s.y, 8, { fill: "sun" }));
  shapes.push(circle(cx, cy, 4, { fill: "accent" }));
  shapes.push(text(cx, cy + 15, L(lang, "मेरु", "Meru"), "accent", 9));
  const times: string[] = [];
  for (const c of CITIES) {
    const at = polar(cx, cy, R, c.at);
    shapes.push(circle(at.x, at.y, 3.5, { fill: "ink" }));
    const lab = polar(cx, cy, R + 10, c.at);
    const side = c.at === 0 ? "start" : c.at === 180 ? "end" : "middle";
    shapes.push(text(lab.x, lab.y + (c.at === 270 ? 10 : c.at === 90 ? -4 : 3), L(lang, c.ne, c.en), "ink", 9, side));
    // ghaṭīs since local noon: a city east (anticlockwise) of the sun has passed noon
    const h = wrap(c.at - sunDir);
    const ghati = (h / 360) * 60; // ghaṭīs after noon
    const label =
      Math.abs(ghati) < 2 || ghati > 58
        ? L(lang, "मध्याह्न", "noon")
        : Math.abs(ghati - 15) < 2
          ? L(lang, "सूर्यास्त", "sunset")
          : Math.abs(ghati - 30) < 2
            ? L(lang, "मध्यरात", "midnight")
            : Math.abs(ghati - 45) < 2
              ? L(lang, "सूर्योदय", "sunrise")
              : "";
    if (label) times.push(`${L(lang, c.ne, c.en)}: ${label}`);
  }
  shapes.push(text(274, 60, L(lang, "उत्तर ध्रुवमाथिबाट हेर्दा", "seen from above the north pole"), "muted", 9));
  shapes.push(text(274, 76, L(lang, "पुरीहरू ९०° को अन्तरमा", "the cities stand 90° apart"), "muted", 9));
  return { shapes, readout: times.length ? [times.slice(0, 2).join(" · "), times.slice(2).join(" · ")] : [L(lang, "पृथ्वी घुम्दैन, आकाश घुम्छ", "the sky turns around the earth"), ""] };
}

/** Orbits in yojanas (12.80–90). */
const KAKSHA: { ne: string; en: string; yojana: number; tone: Tone }[] = [
  { ne: "चन्द्र", en: "Moon", yojana: 324000, tone: "moon" },
  { ne: "बुध", en: "Mercury", yojana: 1043209, tone: "planet" },
  { ne: "शुक्र", en: "Venus", yojana: 2664637, tone: "accent" },
  { ne: "सूर्य", en: "Sun", yojana: 4331500, tone: "sun" },
  { ne: "मङ्गल", en: "Mars", yojana: 8146909, tone: "accent" },
  { ne: "गुरु", en: "Jupiter", yojana: 51375764, tone: "planet" },
  { ne: "शनि", en: "Saturn", yojana: 127668255, tone: "muted" },
];
/** Yojanas every planet travels in a day: the moon's orbit × its daily revolutions. */
const DAILY_YOJANA = (324000 * 57753336) / CIVIL_DAYS;

function kaksha(t: number, lang: Lang): FigureFrame {
  const cx = 104;
  const cy = 100;
  const days = t * 120;
  const shapes: Shape[] = [circle(cx, cy, 4, { fill: "earth" })];
  const lines: string[] = [];
  KAKSHA.forEach((k, i) => {
    const r = 14 + i * 12.5; // even spacing; the real ratio is in the readout
    shapes.push(circle(cx, cy, r, { stroke: "faint", w: 0.9 }));
    const deg = wrap((DAILY_YOJANA * days * 360) / k.yojana);
    const at = polar(cx, cy, r, deg);
    shapes.push(circle(at.x, at.y, 3.6, { fill: k.tone }));
    if (i === 0 || i === 3 || i === 6) lines.push(`${L(lang, k.ne, k.en)} ${fmt(lang, k.yojana)}`);
  });
  shapes.push(text(262, 44, L(lang, "दैनिक योजनगति", "yojanas a day"), "ink", 10));
  shapes.push(text(262, 62, `= ${fmt(lang, DAILY_YOJANA, 2)}`, "accent", 11, "middle", true));
  shapes.push(text(262, 80, L(lang, "चन्द्रकक्षा × चन्द्रभगण ÷ कुदिन", "moon's orbit × its revolutions ÷ civil days"), "muted", 8.5));
  return { shapes, readout: [`${L(lang, "दिन", "day")} ${fmt(lang, days)} · ${lines[0]}`, `${lines[1]} · ${lines[2]}`] };
}

function armillary(t: number, lang: Lang): FigureFrame {
  const cx = 150;
  const cy = 100;
  const R = 74;
  const spin = t * 360;
  // project a great circle with pole (lat, lon) onto a tilted view
  const tiltView = 20 * RAD;
  const proj = (x: number, y: number, z: number) => ({ x: cx + R * x, y: cy - R * (y * Math.cos(tiltView) - z * Math.sin(tiltView)) });
  const great = (tilt: number, rot: number): string => {
    let d = "";
    for (let i = 0; i <= 72; i += 1) {
      const a = (i * 5) * RAD;
      let x = Math.cos(a);
      let y = 0;
      let z = Math.sin(a);
      // tilt about x axis
      const y1 = y * Math.cos(tilt) - z * Math.sin(tilt);
      const z1 = y * Math.sin(tilt) + z * Math.cos(tilt);
      y = y1;
      z = z1;
      // rotate about y (vertical) axis
      const x2 = x * Math.cos(rot) + z * Math.sin(rot);
      const z2 = -x * Math.sin(rot) + z * Math.cos(rot);
      x = x2;
      z = z2;
      const p = proj(x, y, z);
      d += `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
    }
    return d;
  };
  const shapes: Shape[] = [
    path(great(0, 0), { stroke: "muted", w: 1.2 }), // horizon
    path(great(90 * RAD, 0), { stroke: "faint", w: 1 }), // meridian
    path(great(-62 * RAD, spin * RAD), { stroke: "earth", w: 1.6 }), // equator, tilted by colatitude at 28° N
    path(great((-62 + 24) * RAD, spin * RAD), { stroke: "sun", w: 1.6 }), // ecliptic
    circle(cx, cy, 4, { fill: "earth" }),
  ];
  shapes.push(text(cx + R + 8, cy + 4, L(lang, "क्षितिज", "horizon"), "muted", 9, "start"));
  shapes.push(text(290, 40, L(lang, "हरियो: विषुव", "green: equator"), "earth", 9));
  shapes.push(text(290, 56, L(lang, "पहेँलो: क्रान्तिवृत्त", "gold: ecliptic"), "sun", 9));
  return { shapes, readout: [L(lang, `आकाशको घुमाइ ${dms(lang, spin)}`, `turn of the sky ${dms(lang, spin)}`), L(lang, "अक्षांश २८° उत्तर", "latitude 28° N")] };
}

function measures(t: number, lang: Lang): FigureFrame {
  const days = t * 365.2588;
  const cx = 110;
  const cy = 100;
  const shapes: Shape[] = [circle(cx, cy, 70, { stroke: "faint" }), circle(cx, cy, 46, { stroke: "faint" }), circle(cx, cy, 4, { fill: "earth" })];
  const sun = polar(cx, cy, 70, (days / 365.2588) * 360);
  const moon = polar(cx, cy, 46, (days / 27.3217) * 360);
  shapes.push(circle(sun.x, sun.y, 6, { fill: "sun" }));
  shapes.push(circle(moon.x, moon.y, 4.5, { fill: "moon", stroke: "ink", w: 0.7 }));
  const solarYear = CIVIL_DAYS / 4320000;
  const lunarMonth = CIVIL_DAYS / (57753336 - 4320000);
  shapes.push(text(262, 40, L(lang, `सौर वर्ष ${fmt(lang, solarYear, 4)} दिन`, `solar year ${solarYear.toFixed(4)} days`), "sun", 9));
  shapes.push(text(262, 56, L(lang, `चान्द्र मास ${fmt(lang, lunarMonth, 4)} दिन`, `lunar month ${lunarMonth.toFixed(4)} days`), "ink", 9));
  shapes.push(text(262, 72, L(lang, "सावन मास ३० दिन", "civil month 30 days"), "muted", 9));
  shapes.push(text(262, 88, L(lang, "नाक्षत्र दिन ६० नाडी", "sidereal day 60 nāḍīs"), "muted", 9));
  return {
    shapes,
    readout: [
      `${L(lang, "सावन दिन", "civil days")} ${fmt(lang, days, 1)}`,
      `${L(lang, "चान्द्र मास", "lunar months")} ${fmt(lang, days / lunarMonth, 2)} · ${L(lang, "सौर मास", "solar months")} ${fmt(lang, (days / solarYear) * 12, 2)}`,
    ],
  };
}

// ---------------------------------------------------------------- entry

const DRAW: Record<FigureKey, (t: number, lang: Lang) => FigureFrame> = {
  "time-units": timeUnits,
  yuga,
  "mean-motion": meanMotion,
  "earth-size": earthSize,
  "sine-table": sineTable,
  declination,
  manda,
  sighra,
  "day-length": dayLength,
  gnomon,
  "lunar-eclipse": lunarEclipse,
  parallax,
  "solar-eclipse": solarEclipse,
  projection,
  conjunction,
  nakshatra,
  udayasta: rising,
  "moon-phase": moonPhase,
  pata,
  bhugola,
  kaksha,
  armillary,
  measures,
  ...CLASSICAL_DRAW,
  ...(Object.fromEntries((Object.keys(MORE) as MoreKey[]).map((k) => [k, MORE[k].draw])) as Record<MoreKey, (t: number, lang: Lang) => FigureFrame>),
};

/** One frame of a figure: its shapes, live numbers and, where written, the worked arithmetic. */
export function suryaFigure(key: FigureKey, t: number, lang: Lang): FigureFrame {
  const turn = ((t % 1) + 1) % 1;
  const frame = DRAW[key](turn, lang);
  const steps = frame.steps ?? GANITA[key]?.(turn, lang);
  return steps ? { ...frame, steps } : frame;
}

export const SURYA_FIGURE_BOX = { width: W, height: H };
